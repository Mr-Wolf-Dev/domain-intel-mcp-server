import { z } from 'zod';

const DOMAIN_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]*[a-z0-9])?)+$/;

/**
 * Normalizes a URL, email address, or domain string into a lowercase bare domain (no www.).
 */
export function normalizeDomain(raw: string): string {
  let candidate = raw.trim().toLowerCase();
  if (candidate.length === 0) {
    throw new Error('Domain cannot be empty.');
  }

  if (candidate.includes('@') && !candidate.includes('://')) {
    const atParts = candidate.split('@');
    candidate = atParts[atParts.length - 1] ?? '';
  } else {
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(candidate)) {
      candidate = `https://${candidate}`;
    }
    try {
      const parsed = new URL(candidate);
      candidate = parsed.hostname.toLowerCase();
    } catch {
      throw new Error(`Invalid domain or URL: "${raw}"`);
    }
  }

  candidate = candidate.replace(/^www\./, '').replace(/\.+$/, '');
  if (!DOMAIN_REGEX.test(candidate)) {
    throw new Error(`Invalid domain format: "${raw}"`);
  }

  return candidate;
}

export const ActorInputSchema = z.object({
  domains: z.array(z.string().trim().min(1)).default([]),
  includeDns: z.boolean().default(true),
  includeHtmlAnalysis: z.boolean().default(true),
  maxItems: z.number().int().min(1).max(1000).default(100),
});

export type ActorInput = z.infer<typeof ActorInputSchema>;

export interface ParsedActorInput extends ActorInput {
  normalizedDomains: string[];
}

/**
 * Validates raw Actor/MCP input and deduplicates normalized domains.
 */
export function parseActorInput(raw: unknown): ParsedActorInput {
  const parsed = ActorInputSchema.parse(raw ?? {});
  const seen = new Set<string>();
  const normalizedDomains: string[] = [];

  for (const rawDomain of parsed.domains) {
    const domain = normalizeDomain(rawDomain);
    if (!seen.has(domain)) {
      seen.add(domain);
      normalizedDomains.push(domain);
    }
  }

  return {
    ...parsed,
    normalizedDomains: normalizedDomains.slice(0, parsed.maxItems),
  };
}

export const EmailDomainCheckSchema = z.object({
  domain: z.string().min(1),
  hasMx: z.boolean(),
  mxRecords: z.array(z.string()),
  emailProvider: z.string(),
  hasSpf: z.boolean(),
  hasDmarc: z.boolean(),
  isDisposable: z.boolean(),
  deliverabilityScore: z.number().int().min(0).max(100),
});

export type EmailDomainCheck = z.infer<typeof EmailDomainCheckSchema>;

export const DomainIntelligenceSchema = z.object({
  domain: z.string().min(1),
  finalUrl: z.string().nullable(),
  httpStatus: z.number().int().nullable(),
  reachable: z.boolean(),
  title: z.string().nullable(),
  metaDescription: z.string().nullable(),
  language: z.string().nullable(),
  techStack: z.array(z.string()),
  emails: z.array(z.string()),
  socialLinks: z.object({
    linkedin: z.string().nullable(),
    twitter: z.string().nullable(),
    github: z.string().nullable(),
    youtube: z.string().nullable(),
    instagram: z.string().nullable(),
    facebook: z.string().nullable(),
  }),
  keyPages: z.object({
    contact: z.string().nullable(),
    about: z.string().nullable(),
    careers: z.string().nullable(),
    pricing: z.string().nullable(),
    privacy: z.string().nullable(),
    blog: z.string().nullable(),
  }),
  dns: EmailDomainCheckSchema.nullable(),
  enrichedAt: z.string(),
});

export type DomainIntelligence = z.infer<typeof DomainIntelligenceSchema>;
