import { describe, expect, it } from 'vitest';
import { analyzeDnsRecords } from '../../src/domain/dns-analyzer.js';

describe('analyzeDnsRecords', () => {
  it('detects Google Workspace with full SPF + DMARC score 100', () => {
    const res = analyzeDnsRecords(
      'stripe.com',
      ['aspmx.l.google.com', 'alt1.aspmx.l.google.com'],
      ['v=spf1 include:_spf.google.com ~all'],
      ['v=DMARC1; p=reject;'],
    );

    expect(res).toEqual({
      domain: 'stripe.com',
      hasMx: true,
      mxRecords: ['aspmx.l.google.com', 'alt1.aspmx.l.google.com'],
      emailProvider: 'Google Workspace',
      hasSpf: true,
      hasDmarc: true,
      isDisposable: false,
      deliverabilityScore: 100,
    });
  });

  it('detects Microsoft 365 without DMARC (score 75)', () => {
    const res = analyzeDnsRecords(
      'contoso.com',
      ['contoso-com.mail.protection.outlook.com'],
      ['v=spf1 include:spf.protection.outlook.com -all'],
      [],
    );

    expect(res.emailProvider).toBe('Microsoft 365');
    expect(res.deliverabilityScore).toBe(75);
  });

  it('scores disposable domains and missing MX as 0', () => {
    const disposable = analyzeDnsRecords('mailinator.com', ['mx.mailinator.com'], [], []);
    const noMx = analyzeDnsRecords('nomx.org', [], [], []);

    expect(disposable.isDisposable).toBe(true);
    expect(disposable.deliverabilityScore).toBe(0);
    expect(noMx.emailProvider).toBe('None');
    expect(noMx.deliverabilityScore).toBe(0);
  });
});
