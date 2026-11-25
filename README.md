# B2B Domain & Company Intelligence + Email Verifier (Tech Stack, DNS/MX, Contacts + MCP)

[![Mr-Wolf-Dev/domain-intel-mcp-server MCP server](https://glama.ai/mcp/servers/Mr-Wolf-Dev/domain-intel-mcp-server/badges/score.svg)](https://glama.ai/mcp/servers/Mr-Wolf-Dev/domain-intel-mcp-server)

Enrich **B2B company domains**, detect **website tech stacks**, verify **DNS/MX/SPF/DMARC email readiness**, and extract **public contact emails, social links, and key company pages** — available both as a fast **HTTP & DNS-only Apify Actor** and as a **Standby MCP Server** for AI agents.

Designed for **Pay-Per-Event (PPE)** cost efficiency with **zero headless browsers** and **no proxies required** (runs smoothly on **256 MB RAM**).

---

## Why Use This B2B Domain Intelligence & Email Verifier?

- **HTTP + Native DNS Only (256 MB RAM):** Zero Playwright/Puppeteer overhead — enriches domains in milliseconds with maximum PPE margin.
- **Email Provider & Deliverability Score (`0–100`):** Resolves live MX, SPF, and DMARC records to detect **Google Workspace**, **Microsoft 365**, **Proton Mail**, **Zoho**, **Fastmail**, **Proofpoint**, **Mimecast**, and disposable domains.
- **Tech Stack Detector:** Identifies **Cloudflare, Vercel, Netlify, Next.js, Nuxt, Webflow, Shopify, WordPress, HubSpot, Intercom, Zendesk, Stripe, Segment, PostHog, Greenhouse, Lever, Ashby**, and more.
- **Lead Enrichment & Contact Discovery:** Extracts public emails (filtering out image/asset false positives), social profiles (LinkedIn, X/Twitter, GitHub, YouTube, Instagram, Facebook), and key pages (`/contact`, `/about`, `/careers`, `/pricing`, `/privacy`, `/blog`).
- **Dual Mode (Batch + Standby MCP):** Connect **n8n**, **Make**, **Claude Desktop**, or **Cursor** directly.

---

## Input Examples (Copy-Paste)

### 1. Enrich Target B2B Accounts
```json
{
  "domains": ["stripe.com", "https://www.openai.com/pricing", "alice@figma.com"],
  "includeDns": true,
  "includeHtmlAnalysis": true,
  "maxItems": 50
}
```

### 2. Fast DNS-Only Email Domain Verification
```json
{
  "domains": ["stripe.com", "mailinator.com"],
  "includeDns": true,
  "includeHtmlAnalysis": false
}
```

---

## Standby MCP Server for AI Agents

Connect **Cursor**, **Claude Desktop**, or any Streamable HTTP MCP client to:

```text
https://mr-wolf-1--domain-intel-mcp-server.apify.actor/mcp
```

### Exposed MCP Tools
- `enrich_domain(domain, includeDns, includeHtmlAnalysis)`
- `batch_enrich_domains(domains, includeDns, includeHtmlAnalysis)`
- `verify_email_domain(domainOrEmail)`

See [`docs/integrations/mcp-clients.md`](./docs/integrations/mcp-clients.md) for client configuration snippets.

---

## Automation Integrations (n8n & Make)

- **n8n workflow template:** [`docs/integrations/n8n-workflow.json`](./docs/integrations/n8n-workflow.json)
- **Make.com scenario blueprint:** [`docs/integrations/make-scenario.json`](./docs/integrations/make-scenario.json)

---

## Pay-Per-Event (PPE) Pricing

- `apify-actor-start`: Standard Actor startup event.
- `domain-enriched`: Charged once per enriched domain pushed to the dataset in batch mode.
- `mcp-query`: Charged once per MCP tool invocation in Standby mode.

---

## Frequently Asked Questions (FAQ)

**Can I pass full URLs or email addresses instead of bare domains?**
Yes. Inputs such as `https://www.stripe.com/pricing` or `alice@stripe.com` are automatically normalized to `stripe.com` and deduplicated.

**How is `deliverabilityScore` (0–100) calculated?**
Disposable domains or domains without MX records score `0`. Valid domains receive `50` points for MX records, `+25` for SPF (`v=spf1`), and `+25` for DMARC (`v=DMARC1`).

**Does this Actor require proxies or a headless browser?**
No. It uses native Node.js DNS resolution and lightweight HTTP requests via `got-scraping`, keeping memory usage around 256 MB.

---

## Local Development

```bash
npm run typecheck && npm run lint && npm test && npm run build
apify run --purge
```


---

## Related Actors by mrWolf

- **[Tech & Startup Jobs Scraper (Greenhouse, Lever, Ashby, SmartRecruiters + MCP)](https://apify.com/mr.wolf/ats-jobs-mcp-server)** — Spot companies actively hiring before enriching their domains.
- **[EU Public Tenders & Grants Monitor (TED Europa + MCP)](https://apify.com/mr.wolf/eu-tenders-mcp-server)** — Extract and filter active European public procurement notices.
- **[SAM.gov US Federal Contracts & Grants + MCP](https://apify.com/mr.wolf/us-sam-tenders-mcp-server)** — Keyless US federal contract opportunities, NAICS codes, and contracting officer contacts.

---

## Quick REST API Call

```bash
curl -X POST "https://api.apify.com/v2/acts/mr.wolf~domain-intel-mcp-server/run-sync-get-dataset-items?token=YOUR_APIFY_TOKEN" \
  -H "Content-Type: application/json" \
  -d {}
```

## Related HTTP-Only MCP Actors by Mr. Wolf

All Actors run HTTP-only (< 512 MB RAM, zero headless browsers) with Pay-Per-Event pricing and Streamable HTTP Standby MCP endpoints:

| Actor | Use Case | Apify Store | Source |
| --- | --- | --- | --- |
| **Shopify Store Intel, Apps & Catalog** | Themes, 28+ apps & pixels, BNPL payments, /products.json | [Apify Store](https://apify.com/mr.wolf/shopify-store-intel-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/shopify-store-intel-mcp-server) |
| **Global KYB Entity, LEI & EU VAT** | GLEIF LEI parent trees, EU VIES VAT, French SIRENE | [Apify Store](https://apify.com/mr.wolf/global-kyb-entity-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/global-kyb-entity-mcp-server) |
| **FDA Recalls, 510(k) & Clinical Trials** | openFDA recalls, 510(k) clearances, ClinicalTrials.gov v2 | [Apify Store](https://apify.com/mr.wolf/pharma-regulatory-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/pharma-regulatory-mcp-server) |
| **SEC EDGAR Filings & XBRL Financials** | 10-K, 10-Q, 8-K, Form 4 & US-GAAP XBRL metrics | [Apify Store](https://apify.com/mr.wolf/sec-edgar-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/sec-edgar-mcp-server) |
| **Tech & Startup Jobs (4 ATS APIs)** | Greenhouse, Lever, Ashby, SmartRecruiters + hiring signals | [Apify Store](https://apify.com/mr.wolf/ats-jobs-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/ats-jobs-mcp-server) |
| **EU Public Tenders & Grants (TED Europa)** | European procurement notices by CPV, country & budget | [Apify Store](https://apify.com/mr.wolf/eu-tenders-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/eu-tenders-mcp-server) |
| **SAM.gov US Federal Contracts** | Keyless US federal RFPs, NAICS & contracting officers | [Apify Store](https://apify.com/mr.wolf/us-sam-tenders-mcp-server) | [GitHub](https://github.com/Mr-Wolf-Dev/us-sam-tenders-mcp-server) |
