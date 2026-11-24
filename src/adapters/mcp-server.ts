import type { Server } from 'node:http';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { analyzeDnsRecords } from '../domain/dns-analyzer.js';
import { normalizeDomain } from '../domain/domain-schema.js';
import type { DomainInspector } from '../ports/domain-inspector.js';
import type { BillingMeter } from '../shared/billing-meter.js';
import { createMcpHttpServer } from '../shared/mcp-http-server.js';
import type { DomainBillingEvent } from './apify-actor.js';
import { enrichSingleDomain } from './node-domain-inspector.js';

export interface McpServerDependencies {
  inspector: DomainInspector;
  billing: BillingMeter<DomainBillingEvent>;
}

function createConfiguredMcpServer(deps: McpServerDependencies): McpServer {
  const server = new McpServer({
    name: 'domain-intel-mcp-server',
    version: '0.1.0',
  });

  server.registerTool(
    'enrich_domain',
    {
      description:
        'Enrich a single B2B company domain with tech stack, DNS/MX/SPF/DMARC email readiness, social links, emails, and key pages.',
      inputSchema: {
        domain: z.string().min(1).describe('Company domain, URL, or email (e.g. "stripe.com")'),
        includeDns: z.boolean().optional().describe('Run DNS/MX/SPF/DMARC inspection (default true)'),
        includeHtmlAnalysis: z
          .boolean()
          .optional()
          .describe('Fetch homepage to detect tech stack, emails, and links (default true)'),
      },
    },
    async ({ domain, includeDns, includeHtmlAnalysis }) => {
      const normalized = normalizeDomain(domain);
      const result = await enrichSingleDomain(normalized, deps.inspector, {
        includeDns: includeDns ?? true,
        includeHtmlAnalysis: includeHtmlAnalysis ?? true,
      });
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
      };
    },
  );

  server.registerTool(
    'batch_enrich_domains',
    {
      description: 'Enrich up to 25 B2B domains in a single MCP call.',
      inputSchema: {
        domains: z.array(z.string().min(1)).min(1).max(25).describe('List of domains or URLs'),
        includeDns: z.boolean().optional(),
        includeHtmlAnalysis: z.boolean().optional(),
      },
    },
    async ({ domains, includeDns, includeHtmlAnalysis }) => {
      const unique = Array.from(new Set(domains.map((d) => normalizeDomain(d)))).slice(0, 25);
      const results = [];
      for (const domain of unique) {
        results.push(
          await enrichSingleDomain(domain, deps.inspector, {
            includeDns: includeDns ?? true,
            includeHtmlAnalysis: includeHtmlAnalysis ?? true,
          }),
        );
      }
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ count: results.length, domains: results }, null, 2),
          },
        ],
      };
    },
  );

  server.registerTool(
    'verify_email_domain',
    {
      description:
        'Fast DNS-only check verifying MX records, email provider (Google Workspace/Microsoft 365), SPF, DMARC, and disposable status.',
      inputSchema: {
        domainOrEmail: z.string().min(1).describe('Email address or domain (e.g. "alice@stripe.com")'),
      },
    },
    async ({ domainOrEmail }) => {
      const domain = normalizeDomain(domainOrEmail);
      const dnsRaw = await deps.inspector.inspectDns(domain);
      const check = analyzeDnsRecords(
        domain,
        dnsRaw.mxRecords,
        dnsRaw.txtRecords,
        dnsRaw.dmarcRecords,
      );
      await deps.billing.charge('mcp-query', 1);

      return {
        content: [{ type: 'text', text: JSON.stringify(check, null, 2) }],
      };
    },
  );

  return server;
}

/**
 * Creates a stateless Streamable HTTP MCP server compatible with Apify Standby mode.
 */
export function createDomainMcpHttpServer(deps: McpServerDependencies): Server {
  return createMcpHttpServer({
    serviceName: 'domain-intel-mcp-server',
    createServer: () => createConfiguredMcpServer(deps),
  });
}
