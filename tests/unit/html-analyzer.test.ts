import { describe, expect, it } from 'vitest';
import { analyzeHtmlResponse } from '../../src/domain/html-analyzer.js';

describe('analyzeHtmlResponse', () => {
  it('extracts title, meta, language, tech stack, emails, social links, and key pages', () => {
    const html = `
      <!doctype html>
      <html lang="en-US">
        <head>
          <title>Acme AI &amp; Cloud</title>
          <meta name="description" content="Enterprise AI infrastructure." />
          <script src="https://js.stripe.com/v3/"></script>
          <script src="https://js.hs-scripts.com/123.js"></script>
        </head>
        <body>
          <div id="__NEXT_DATA__">{}</div>
          <a href="/contact-us">Contact</a>
          <a href="/careers">Careers</a>
          <a href="/pricing">Pricing</a>
          <a href="https://www.linkedin.com/company/acme-ai">LinkedIn</a>
          <a href="https://github.com/acme-ai">GitHub</a>
          <a href="https://boards.greenhouse.io/acme">Jobs</a>
          <p>Reach us at sales@acme.com or support@acme.com. Ignore logo@2x.png and test@example.com.</p>
        </body>
      </html>
    `;

    const result = analyzeHtmlResponse({
      domain: 'acme.com',
      finalUrl: 'https://acme.com/',
      httpStatus: 200,
      headers: { 'cf-ray': '12345-FRA', server: 'cloudflare' },
      html,
    });

    expect(result.title).toBe('Acme AI & Cloud');
    expect(result.metaDescription).toBe('Enterprise AI infrastructure.');
    expect(result.language).toBe('en-us');
    expect(result.techStack).toEqual(['Cloudflare', 'Greenhouse', 'HubSpot', 'Next.js', 'Stripe']);
    expect(result.emails).toEqual(['sales@acme.com', 'support@acme.com']);
    expect(result.socialLinks.linkedin).toBe('https://www.linkedin.com/company/acme-ai');
    expect(result.socialLinks.github).toBe('https://github.com/acme-ai');
    expect(result.keyPages.contact).toBe('https://acme.com/contact-us');
    expect(result.keyPages.careers).toBe('https://acme.com/careers');
    expect(result.keyPages.pricing).toBe('https://acme.com/pricing');
  });
});
