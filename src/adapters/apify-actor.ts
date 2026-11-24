import { Actor } from 'apify';
import { parseActorInput, type DomainIntelligence } from '../domain/domain-schema.js';
import type { DomainInspector } from '../ports/domain-inspector.js';
import type { BillingMeter } from '../shared/billing-meter.js';
import { enrichSingleDomain } from './node-domain-inspector.js';

export type DomainBillingEvent = 'domain-enriched' | 'mcp-query';

export interface EnrichmentDependencies {
  inspector: DomainInspector;
  billing: BillingMeter<DomainBillingEvent>;
  pushData: (items: DomainIntelligence[]) => Promise<void>;
}

/**
 * Validates input, enriches each domain with fault isolation, pushes to dataset, and charges PPE events.
 */
export async function runDomainEnrichment(
  rawInput: unknown,
  deps: EnrichmentDependencies,
): Promise<DomainIntelligence[]> {
  const criteria = parseActorInput(rawInput);
  if (criteria.normalizedDomains.length === 0) {
    return [];
  }

  const results: DomainIntelligence[] = [];
  for (const domain of criteria.normalizedDomains) {
    const intel = await enrichSingleDomain(domain, deps.inspector, {
      includeDns: criteria.includeDns,
      includeHtmlAnalysis: criteria.includeHtmlAnalysis,
    });
    results.push(intel);
  }

  if (results.length > 0) {
    await deps.pushData(results);
    await deps.billing.charge('domain-enriched', results.length);
  }

  return results;
}

/**
 * Runs the standard batch Apify Actor enrichment mode.
 */
export async function runActorBatch(
  inspector: DomainInspector,
  billing: BillingMeter<DomainBillingEvent>,
): Promise<void> {
  const input = await Actor.getInput();
  await runDomainEnrichment(input, {
    inspector,
    billing,
    pushData: async (items) => {
      await Actor.pushData(items);
    },
  });
}
