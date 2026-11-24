# Miniguida Operativa: Lancio & SEO su Apify Store — `domain-intel-mcp-server`

Guida rapida per configurare **Publication**, **Icona**, **256 MB RAM** e **Pay-Per-Event (PPE)** su Apify Console per `mr.wolf/domain-intel-mcp-server`.

---

## 1. Configurazione `Publication` (SEO Apify Store)

- **Title (SEO):**
  ```text
  B2B Domain Intelligence & Email Verifier (Tech Stack, DNS/MX + MCP)
  ```
- **Short description:**
  ```text
  Enrich B2B domains in milliseconds: detect tech stack, verify DNS/MX/SPF/DMARC email readiness, and extract emails, social links & key pages. 256 MB HTTP/DNS-only Actor + Standby MCP Server.
  ```
- **Categories:** `Lead generation`, `Business`, `AI`
- **Icona:** carica `assets/actor-icon.png` (alto contrasto, leggibile a 48×48 px).
- **Visibility:** `Public`

---

## 2. Default Run Options (Massimo Margine PPE)

- **Memory:** `256 MB`
- **Timeout:** `120` secondi
- **Build tag:** `latest`

---

## 3. Monetizzazione Pay-Per-Event (PPE)

1. Mantieni `apify-actor-start` (`$0.00005`).
2. Rimuovi `apify-default-dataset-item` (`Result`).
3. Configura gli eventi custom:
   - `domain-enriched` — *Title:* `Domain enriched` — *Description:* `Single B2B domain enriched with tech stack, contacts, and DNS/MX check.` — *Price:* `$0.005` – `$0.01`
   - `mcp-query` — *Title:* `MCP tool query` — *Description:* `Single MCP tool invocation (enrich_domain, batch_enrich_domains, or verify_email_domain) in Standby mode.` — *Price:* `$0.02`
4. Attiva gli sconti automatici Store (`Bronze` / `Silver` / `Gold`).
5. **Primary event:** `domain-enriched`.
