import { describe, expect, it } from 'vitest';
import { runDomainEnrichment, type DomainBillingEvent } from '../../src/adapters/apify-actor.js';
import type { DomainIntelligence } from '../../src/domain/domain-schema.js';
import type { DomainInspector } from '../../src/ports/domain-inspector.js';
import type { BillingMeter } from '../../src/shared/billing-meter.js';

const fakeInspector: DomainInspector = {
  async inspectDns(domain) {
    return {
      mxRecords: [`mx.${domain}`],
      txtRecords: ['v=spf1 ~all'],
      dmarcRecords: ['v=DMARC1; p=none;'],
    };
  },
  async fetchHomepage(domain) {
    return {
      finalUrl: `https://${domain}/`,
      httpStatus: 200,
      headers: { 'x-vercel-id': 'iad1::123' },
      html: `<html lang="en"><head><title>${domain}</title></head><body>hello@${domain}</body></html>`,
    };
  },
};

describe('runDomainEnrichment', () => {
  it('enriches domains, pushes dataset items, and charges domain-enriched PPE events', async () => {
    const pushed: DomainIntelligence[] = [];
    const charges: Array<{ eventName: DomainBillingEvent; count: number }> = [];

    const billing: BillingMeter<DomainBillingEvent> = {
      async charge(eventName, count = 1) {
        charges.push({ eventName, count });
      },
    };

    const results = await runDomainEnrichment(
      { domains: ['https://www.stripe.com', 'openai.com'] },
      {
        inspector: fakeInspector,
        billing,
        pushData: async (items) => {
          pushed.push(...items);
        },
      },
    );

    expect(results).toHaveLength(2);
    expect(pushed[0]?.techStack).toEqual(['Vercel']);
    expect(pushed[0]?.dns?.deliverabilityScore).toBe(100);
    expect(charges).toEqual([{ eventName: 'domain-enriched', count: 2 }]);
  });
});
