import { resolveMx, resolveTxt } from 'node:dns/promises';
import { gotScraping } from 'got-scraping';
import { analyzeDnsRecords } from '../domain/dns-analyzer.js';
import type { DomainIntelligence } from '../domain/domain-schema.js';
import { analyzeHtmlResponse } from '../domain/html-analyzer.js';
import type { DomainInspector, RawDnsData, RawHomepageData } from '../ports/domain-inspector.js';

const MAX_HTML_BYTES = 500_000;

export class NodeDomainInspector implements DomainInspector {
  async inspectDns(domain: string): Promise<RawDnsData> {
    const [mxRaw, txtRaw, dmarcRaw] = await Promise.all([
      resolveMx(domain).catch(() => []),
      resolveTxt(domain).catch(() => []),
      resolveTxt(`_dmarc.${domain}`).catch(() => []),
    ]);

    return {
      mxRecords: mxRaw.map((entry) => entry.exchange),
      txtRecords: txtRaw.map((chunks) => chunks.join('')),
      dmarcRecords: dmarcRaw.map((chunks) => chunks.join('')),
    };
  }

  async fetchHomepage(domain: string): Promise<RawHomepageData | null> {
    try {
      const response = await gotScraping.get(`https://${domain}`, {
        http2: false,
        timeout: { request: 10_000 },
        retry: { limit: 1 },
        throwHttpErrors: false,
        followRedirect: true,
      });

      const headers: Record<string, string> = {};
      for (const [key, value] of Object.entries(response.headers)) {
        if (typeof value === 'string') {
          headers[key.toLowerCase()] = value;
        } else if (Array.isArray(value)) {
          headers[key.toLowerCase()] = value.join(', ');
        }
      }

      return {
        finalUrl: response.url || `https://${domain}`,
        httpStatus: response.statusCode,
        headers,
        html: response.body.slice(0, MAX_HTML_BYTES),
      };
    } catch {
      return null;
    }
  }
}

export async function enrichSingleDomain(
  domain: string,
  inspector: DomainInspector,
  options: { includeDns: boolean; includeHtmlAnalysis: boolean },
): Promise<DomainIntelligence> {
  const [dnsRaw, homepageRaw] = await Promise.all([
    options.includeDns ? inspector.inspectDns(domain) : Promise.resolve(null),
    options.includeHtmlAnalysis ? inspector.fetchHomepage(domain) : Promise.resolve(null),
  ]);

  const dns = dnsRaw
    ? analyzeDnsRecords(domain, dnsRaw.mxRecords, dnsRaw.txtRecords, dnsRaw.dmarcRecords)
    : null;

  const htmlAnalysis = homepageRaw
    ? analyzeHtmlResponse({
        domain,
        finalUrl: homepageRaw.finalUrl,
        httpStatus: homepageRaw.httpStatus,
        headers: homepageRaw.headers,
        html: homepageRaw.html,
      })
    : null;

  return {
    domain,
    finalUrl: homepageRaw?.finalUrl ?? null,
    httpStatus: homepageRaw?.httpStatus ?? null,
    reachable: homepageRaw !== null && homepageRaw.httpStatus < 500,
    title: htmlAnalysis?.title ?? null,
    metaDescription: htmlAnalysis?.metaDescription ?? null,
    language: htmlAnalysis?.language ?? null,
    techStack: htmlAnalysis?.techStack ?? [],
    emails: htmlAnalysis?.emails ?? [],
    socialLinks: htmlAnalysis?.socialLinks ?? {
      linkedin: null,
      twitter: null,
      github: null,
      youtube: null,
      instagram: null,
      facebook: null,
    },
    keyPages: htmlAnalysis?.keyPages ?? {
      contact: null,
      about: null,
      careers: null,
      pricing: null,
      privacy: null,
      blog: null,
    },
    dns,
    enrichedAt: new Date().toISOString(),
  };
}
