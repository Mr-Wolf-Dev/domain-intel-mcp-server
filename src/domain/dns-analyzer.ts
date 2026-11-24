import type { EmailDomainCheck } from './domain-schema.js';

const DISPOSABLE_DOMAINS = new Set([
  'mailinator.com',
  'guerrillamail.com',
  '10minutemail.com',
  'tempmail.com',
  'yopmail.com',
  'trashmail.com',
  'sharklasers.com',
  'getnada.com',
  'throwawaymail.com',
]);

const MX_PROVIDER_RULES: Array<{ pattern: RegExp; provider: string }> = [
  { pattern: /(google\.com|googlemail\.com)$/i, provider: 'Google Workspace' },
  { pattern: /(outlook\.com|protection\.outlook\.com)$/i, provider: 'Microsoft 365' },
  { pattern: /(protonmail\.ch|proton\.me)$/i, provider: 'Proton Mail' },
  { pattern: /\.zoho\./i, provider: 'Zoho Mail' },
  { pattern: /(fastmail\.|messagingengine\.com$)/i, provider: 'Fastmail' },
  { pattern: /pphosted\.com$/i, provider: 'Proofpoint' },
  { pattern: /mimecast\.com$/i, provider: 'Mimecast' },
  { pattern: /yahoodns\.net$/i, provider: 'Yahoo' },
  { pattern: /icloud\.com$/i, provider: 'iCloud' },
];

export function detectEmailProvider(mxRecords: string[]): string {
  if (mxRecords.length === 0) {
    return 'None';
  }

  for (const mx of mxRecords) {
    const normalized = mx.trim().replace(/\.+$/, '');
    for (const rule of MX_PROVIDER_RULES) {
      if (rule.pattern.test(normalized)) {
        return rule.provider;
      }
    }
  }

  return 'Custom / Other';
}

/**
 * Pure DNS/MX/SPF/DMARC analyzer computing email readiness and deliverability score (0-100).
 */
export function analyzeDnsRecords(
  domain: string,
  mxRecords: string[],
  txtRecords: string[],
  dmarcRecords: string[],
): EmailDomainCheck {
  const cleanMx = Array.from(new Set(mxRecords.map((m) => m.trim().toLowerCase()).filter(Boolean)));
  const hasMx = cleanMx.length > 0;
  const emailProvider = detectEmailProvider(cleanMx);

  const hasSpf = txtRecords.some((txt) => /v=spf1/i.test(txt));
  const hasDmarc =
    dmarcRecords.some((txt) => /v=dmarc1/i.test(txt)) ||
    txtRecords.some((txt) => /v=dmarc1/i.test(txt));

  const isDisposable = DISPOSABLE_DOMAINS.has(domain.toLowerCase());

  let deliverabilityScore = 0;
  if (!isDisposable && hasMx) {
    deliverabilityScore = 50 + (hasSpf ? 25 : 0) + (hasDmarc ? 25 : 0);
  }

  return {
    domain,
    hasMx,
    mxRecords: cleanMx,
    emailProvider,
    hasSpf,
    hasDmarc,
    isDisposable,
    deliverabilityScore,
  };
}
