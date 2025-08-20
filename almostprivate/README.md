Purpose: make this folder hard to discover and non-indexable while keeping direct links shareable.

What’s implemented here
- Meta noindex: All playbooks in this folder include `<meta name="robots" content="noindex, follow">` so compliant crawlers (Google, Bing) don’t index these pages.
- Folder robots.txt: Added `robots.txt` as defense-in-depth. Most crawlers only read the root-level robots.txt, but this can help with some bots.

Recommended site‑root changes (for best results)
- Root robots.txt: At the site root (`https://aifreelancer.co/robots.txt`), add:

  User-agent: *
  Disallow: /almostprivate/

- Sitemap exclusion: If you generate a sitemap (e.g., Jekyll `jekyll-sitemap`), exclude this folder so URLs aren’t advertised. In Jekyll, add to `_config.yml`:

  exclude:
    - almostprivate

- Avoid public links: Don’t link to this folder from public navigation or indexed pages. Sharing direct URLs is fine.

Optional hardening
- Obscure URL: Consider renaming the folder to something non‑guessable (e.g., `almostprivate-8f3e7c`), then update your links. This reduces accidental discovery.
- Stronger protection: If you need true access control, host these pages somewhere that supports auth (e.g., behind basic auth on Netlify/Vercel or a password‑protected server). GitHub Pages does not support authentication or custom `X-Robots-Tag` headers for non‑HTML assets.

Note
- If any non‑HTML files (PDFs, etc.) live here, meta tags won’t apply to them. The root `robots.txt` Disallow for `/almostprivate/` is important to discourage crawlers from fetching those assets.

