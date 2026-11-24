import { describe, expect, it } from 'vitest';
import { normalizeDomain, parseActorInput } from '../../src/domain/domain-schema.js';

describe('normalizeDomain', () => {
  it('normalizes bare domains, URLs, www prefixes, and emails', () => {
    expect(normalizeDomain('Stripe.COM')).toBe('stripe.com');
    expect(normalizeDomain('https://www.stripe.com/pricing?ref=1')).toBe('stripe.com');
    expect(normalizeDomain('alice@docs.openai.com')).toBe('docs.openai.com');
  });

  it('rejects empty or invalid domains', () => {
    expect(() => normalizeDomain('')).toThrow();
    expect(() => normalizeDomain('not_a_domain')).toThrow();
  });
});

describe('parseActorInput', () => {
  it('deduplicates normalized domains and applies defaults', () => {
    const parsed = parseActorInput({
      domains: ['stripe.com', 'https://www.stripe.com/about', 'alice@stripe.com', 'openai.com'],
    });

    expect(parsed.normalizedDomains).toEqual(['stripe.com', 'openai.com']);
    expect(parsed.includeDns).toBe(true);
    expect(parsed.includeHtmlAnalysis).toBe(true);
    expect(parsed.maxItems).toBe(100);
  });
});
