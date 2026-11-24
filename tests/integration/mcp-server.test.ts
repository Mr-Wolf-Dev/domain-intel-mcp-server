import type { AddressInfo } from 'node:net';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StreamableHTTPClientTransport } from '@modelcontextprotocol/sdk/client/streamableHttp.js';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { DomainBillingEvent } from '../../src/adapters/apify-actor.js';
import { createDomainMcpHttpServer } from '../../src/adapters/mcp-server.js';
import type { DomainInspector } from '../../src/ports/domain-inspector.js';
import type { BillingMeter } from '../../src/shared/billing-meter.js';

const fakeInspector: DomainInspector = {
  async inspectDns() {
    return {
      mxRecords: ['aspmx.l.google.com'],
      txtRecords: ['v=spf1 include:_spf.google.com ~all'],
      dmarcRecords: ['v=DMARC1; p=reject;'],
    };
  },
  async fetchHomepage(domain) {
    return {
      finalUrl: `https://${domain}/`,
      httpStatus: 200,
      headers: { 'cf-ray': '123' },
      html: `<html lang="en"><head><title>${domain} Home</title></head><body><a href="/pricing">Pricing</a></body></html>`,
    };
  },
};

describe('createDomainMcpHttpServer', () => {
  const charges: Array<{ eventName: DomainBillingEvent; count: number }> = [];
  const billing: BillingMeter<DomainBillingEvent> = {
    async charge(eventName, count = 1) {
      charges.push({ eventName, count });
    },
  };

  let baseUrl = '';
  let closeServer: () => Promise<void>;

  beforeAll(async () => {
    const server = createDomainMcpHttpServer({
      inspector: fakeInspector,
      billing,
    });

    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', () => {
        const addr = server.address() as AddressInfo;
        baseUrl = `http://127.0.0.1:${addr.port}`;
        resolve();
      });
    });

    closeServer = () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      });
  });

  afterAll(async () => {
    await closeServer();
  });

  it('responds 200 on GET /health', async () => {
    const res = await fetch(`${baseUrl}/health`);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      status: 'ok',
      service: 'domain-intel-mcp-server',
    });
  });

  it('exposes enrich_domain, batch_enrich_domains, and verify_email_domain and charges mcp-query', async () => {
    const client = new Client({ name: 'test-mcp-client', version: '1.0.0' });
    const transport = new StreamableHTTPClientTransport(new URL(`${baseUrl}/mcp`));
    await client.connect(transport);

    const { tools } = await client.listTools();
    expect(tools.map((t) => t.name).sort()).toEqual([
      'batch_enrich_domains',
      'enrich_domain',
      'verify_email_domain',
    ]);

    const enrichRes = await client.callTool({
      name: 'enrich_domain',
      arguments: { domain: 'https://www.stripe.com/docs' },
    });
    const enrichParsed = JSON.parse(
      (enrichRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { domain: string; techStack: string[] };
    expect(enrichParsed.domain).toBe('stripe.com');
    expect(enrichParsed.techStack).toEqual(['Cloudflare']);

    const batchRes = await client.callTool({
      name: 'batch_enrich_domains',
      arguments: { domains: ['stripe.com', 'openai.com'] },
    });
    const batchParsed = JSON.parse(
      (batchRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { count: number };
    expect(batchParsed.count).toBe(2);

    const verifyRes = await client.callTool({
      name: 'verify_email_domain',
      arguments: { domainOrEmail: 'alice@stripe.com' },
    });
    const verifyParsed = JSON.parse(
      (verifyRes.content as Array<{ type: string; text: string }>)[0]?.text ?? '',
    ) as { domain: string; emailProvider: string; deliverabilityScore: number };
    expect(verifyParsed.domain).toBe('stripe.com');
    expect(verifyParsed.emailProvider).toBe('Google Workspace');
    expect(verifyParsed.deliverabilityScore).toBe(100);

    expect(charges).toEqual([
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
      { eventName: 'mcp-query', count: 1 },
    ]);

    await transport.close();
  });
});
