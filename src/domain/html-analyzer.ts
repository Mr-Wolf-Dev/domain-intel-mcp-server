import type { DomainIntelligence } from './domain-schema.js';

export interface HtmlAnalysisInput {
  domain: string;
  finalUrl: string;
  httpStatus: number;
  headers: Record<string, string>;
  html: string;
}

export type HtmlAnalysisResult = Pick<
  DomainIntelligence,
  'title' | 'metaDescription' | 'language' | 'techStack' | 'emails' | 'socialLinks' | 'keyPages'
>;

const ENTITY_MAP: Record<string, string> = {
  '&amp;': '&',
  '&lt;': '<',
  '&gt;': '>',
  '&quot;': '"',
  '&#39;': "'",
  '&apos;': "'",
  '&nbsp;': ' ',
};

function decodeEntities(value: string): string {
  return value
    .replace(
      /&(?:amp|lt|gt|quot|#39|apos|nbsp);/gi,
      (entity) => ENTITY_MAP[entity.toLowerCase()] ?? entity,
    )
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html: string): string | null {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const text = match?.[1] ? decodeEntities(match[1].replace(/<[^>]+>/g, '')) : '';
  return text.length > 0 ? text : null;
}

function extractMetaDescription(html: string): string | null {
  const patterns = [
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["'][^>]*>/i,
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const val = match?.[1] ? decodeEntities(match[1]) : '';
    if (val.length > 0) {
      return val;
    }
  }
  return null;
}

function extractLanguage(html: string): string | null {
  const match = html.match(/<html[^>]+lang=["']([a-zA-Z-]+)["']/i);
  return match?.[1] ? match[1].trim().toLowerCase() : null;
}

interface TechSignature {
  name: string;
  headerCheck?: (headers: Record<string, string>) => boolean;
  htmlPattern?: RegExp;
}

const TECH_SIGNATURES: TechSignature[] = [
  {
    name: 'Cloudflare',
    headerCheck: (h) => Boolean(h['cf-ray']) || (h['server'] ?? '').toLowerCase().includes('cloudflare'),
  },
  { name: 'Vercel', headerCheck: (h) => Boolean(h['x-vercel-id']) },
  { name: 'Netlify', headerCheck: (h) => Boolean(h['x-nf-request-id']) },
  { name: 'AWS CloudFront', headerCheck: (h) => Boolean(h['x-amz-cf-id']) },
  { name: 'Next.js', htmlPattern: /__NEXT_DATA__|\/_next\/static\//i },
  { name: 'Nuxt', htmlPattern: /__NUXT__|\/_nuxt\//i },
  { name: 'Webflow', htmlPattern: /webflow\.com|w-webflow-badge/i },
  { name: 'Shopify', htmlPattern: /cdn\.shopify\.com|Shopify\.theme/i },
  { name: 'WordPress', htmlPattern: /wp-content\/|wp-includes\//i },
  { name: 'Wix', htmlPattern: /wixstatic\.com/i },
  { name: 'Framer', htmlPattern: /framerusercontent\.com/i },
  { name: 'Google Tag Manager', htmlPattern: /googletagmanager\.com\/gtm\.js/i },
  { name: 'Google Analytics', htmlPattern: /google-analytics\.com|gtag\(/i },
  { name: 'Segment', htmlPattern: /cdn\.segment\.com/i },
  { name: 'PostHog', htmlPattern: /posthog\.com/i },
  { name: 'Mixpanel', htmlPattern: /mixpanel\.com/i },
  { name: 'HubSpot', htmlPattern: /js\.hs-scripts\.com|hubspot\.com/i },
  { name: 'Intercom', htmlPattern: /widget\.intercom\.io/i },
  { name: 'Zendesk', htmlPattern: /zdassets\.com/i },
  { name: 'Crisp', htmlPattern: /client\.crisp\.chat/i },
  { name: 'Stripe', htmlPattern: /js\.stripe\.com/i },
  { name: 'Sentry', htmlPattern: /sentry\.io/i },
  { name: 'Greenhouse', htmlPattern: /boards\.greenhouse\.io/i },
  { name: 'Lever', htmlPattern: /jobs\.lever\.co/i },
  { name: 'Ashby', htmlPattern: /jobs\.ashbyhq\.com/i },
];

function detectTechStack(headers: Record<string, string>, html: string): string[] {
  const detected = new Set<string>();
  for (const sig of TECH_SIGNATURES) {
    if (sig.headerCheck?.(headers) || (sig.htmlPattern && sig.htmlPattern.test(html))) {
      detected.add(sig.name);
    }
  }
  return Array.from(detected).sort();
}

const JUNK_EMAIL_DOMAINS = new Set(['example.com', 'sentry.io', 'wixpress.com', 'domain.com']);
const ASSET_EXT_REGEX = /\.(?:png|jpe?g|gif|svg|webp|ico|css|js|woff2?)$/i;

function extractEmails(html: string): string[] {
  const matches = html.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const valid = new Set<string>();

  for (const raw of matches) {
    const email = raw.toLowerCase();
    const domain = email.split('@')[1] ?? '';
    if (ASSET_EXT_REGEX.test(email) || JUNK_EMAIL_DOMAINS.has(domain)) {
      continue;
    }
    valid.add(email);
  }

  return Array.from(valid).slice(0, 20);
}

function extractHrefs(html: string): string[] {
  const hrefs: string[] = [];
  const regex = /href=["']([^"'#]+)["']/gi;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(html)) !== null) {
    if (match[1]) {
      hrefs.push(match[1].trim());
    }
  }
  return hrefs;
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

/**
 * Pure HTML & response header analyzer for B2B domain intelligence.
 */
export function analyzeHtmlResponse(input: HtmlAnalysisInput): HtmlAnalysisResult {
  const hrefs = extractHrefs(input.html);

  const socialLinks: HtmlAnalysisResult['socialLinks'] = {
    linkedin: null,
    twitter: null,
    github: null,
    youtube: null,
    instagram: null,
    facebook: null,
  };

  const keyPages: HtmlAnalysisResult['keyPages'] = {
    contact: null,
    about: null,
    careers: null,
    pricing: null,
    privacy: null,
    blog: null,
  };

  for (const href of hrefs) {
    const resolved = resolveUrl(href, input.finalUrl);
    if (!resolved) {
      continue;
    }
    const lower = resolved.toLowerCase();

    if (!socialLinks.linkedin && /linkedin\.com\/(?:company|in)\//i.test(lower)) {
      socialLinks.linkedin = resolved;
    } else if (!socialLinks.twitter && /(?:twitter\.com|x\.com)\/[a-z0-9_]+/i.test(lower)) {
      socialLinks.twitter = resolved;
    } else if (!socialLinks.github && /github\.com\/[a-z0-9_-]+/i.test(lower)) {
      socialLinks.github = resolved;
    } else if (!socialLinks.youtube && /youtube\.com\/(?:@|channel\/|c\/)/i.test(lower)) {
      socialLinks.youtube = resolved;
    } else if (!socialLinks.instagram && /instagram\.com\/[a-z0-9_.]+/i.test(lower)) {
      socialLinks.instagram = resolved;
    } else if (!socialLinks.facebook && /facebook\.com\/[a-z0-9_.]+/i.test(lower)) {
      socialLinks.facebook = resolved;
    }

    let pathname: string;
    try {
      const parsed = new URL(resolved);
      if (!parsed.hostname.toLowerCase().includes(input.domain.toLowerCase())) {
        continue;
      }
      pathname = parsed.pathname.toLowerCase();
    } catch {
      continue;
    }

    if (!keyPages.contact && /\/(contact|contact-us|contatti)\b/.test(pathname)) {
      keyPages.contact = resolved;
    } else if (!keyPages.about && /\/(about|about-us|company|chi-siamo)\b/.test(pathname)) {
      keyPages.about = resolved;
    } else if (!keyPages.careers && /\/(careers|jobs|hiring|lavora-con-noi)\b/.test(pathname)) {
      keyPages.careers = resolved;
    } else if (!keyPages.pricing && /\/(pricing|plans|prezzi)\b/.test(pathname)) {
      keyPages.pricing = resolved;
    } else if (!keyPages.privacy && /\/(privacy|privacy-policy)\b/.test(pathname)) {
      keyPages.privacy = resolved;
    } else if (!keyPages.blog && /\/(blog|news|insights)\b/.test(pathname)) {
      keyPages.blog = resolved;
    }
  }

  return {
    title: extractTitle(input.html),
    metaDescription: extractMetaDescription(input.html),
    language: extractLanguage(input.html),
    techStack: detectTechStack(input.headers, input.html),
    emails: extractEmails(input.html),
    socialLinks,
    keyPages,
  };
}
