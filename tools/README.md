# AI Freelancer Tools

Static, browser-only utilities for `AIFreelancer.co`, designed to deploy cleanly on GitHub Pages without a build step.

## Popular Utilities

- `Diff Check` for line-by-line text comparisons with inline highlights.
- `JSON Formatter` for validating, formatting, minifying, and sorting JSON.
- `Regex Tester` for live JavaScript regex matching, captures, and replacement previews.
- `CSV / JSON Converter` for browser-only spreadsheet and API fixture conversion.
- `Password Generator` for strong passwords with crypto randomness.
- `JWT Decoder` for local token header/payload inspection and timing checks.
- `Image Paste Downloader` for instant screenshot and clipboard image downloads.
- `Image Resizer` for resizing and re-exporting images locally in the browser.
- `Image Compressor` for reducing image size with quality and max-dimension controls.
- `Timestamp Converter` for Unix and human-readable date-time conversions.
- `Color Studio` for palette extraction, color conversion, and contrast checks.
- `Unit Converter` and `Percentage Calculator` for fast operational math.

## More Utilities

- `Word Counter` for writing metrics, reading time, and keyword frequency.
- `Markdown Preview` for safe browser-only rendering with copyable and downloadable HTML output.
- `Case Converter` for text transformations across common naming and formatting styles.
- `List Cleaner` for deduping, sorting, and normalizing pasted line lists.
- `Encoding Lab` for URL, Base64, HTML, and query-string transforms.
- `Hash Generator` for Web Crypto SHA hashing.
- `UUID Generator` for UUID v4 generation in single or batch mode.
- `Aspect Ratio Calculator` for width/height sizing from common ratios.
- `QR Generator` for local text, URL, email, phone, and Wi-Fi QR exports.
- `URL Inspector` for parsing, editing, and rebuilding links locally.
- `Slug Generator` for turning titles into clean URL slugs.
- `UTM Builder` for generating campaign-tagged URLs.
- `Stopwatch` with laps and a built-in countdown timer.
- `Brick Calculator` for masonry quantity estimates.

## Arcade Extras

- `Block Drop` for falling-block puzzle play with ghost and hold support.
- `Connect Four` for local multiplayer or simple-AI board play with stats.
- `Merge 2048` for swipe-and-merge number play with local best score tracking.
- `Mine Grid` for mine-clearing puzzle play with best-time tracking.
- `Word Sprint` for daily or unlimited five-letter word rounds.
- `Neon Snake` for a polished browser-based arcade snake game.
- `Paddle Duel` for a polished paddle-vs-AI arcade match.
- `Brick Blitz` for neon brick-breaking with power-ups.
- `Orbit Drift` for vector-style asteroid blasting.
- `Star Defender` for fixed-screen lane shooting with waves and bosses.
- `Signal Memory` for arcade memory-sequence play with pulse feedback.
- `Sky Command` for interceptor defense and wave survival.
- `Road Hopper` for lane-crossing arcade runs with touch and swipe support.
- `Pixel Racer` for neon highway dodging with pseudo-3D speed climbs.

## Run locally

Because this site is plain HTML, CSS, and JavaScript, any static file server works.

Examples:

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Deploy on GitHub Pages

1. Create a GitHub repository and push this folder.
2. In GitHub, open `Settings` -> `Pages`.
3. Choose `Deploy from a branch`.
4. Select your default branch and the `/ (root)` folder.
5. Save and wait for the site to publish.

If you later want this on a custom domain such as `tools.aifreelancer.co`, add a `CNAME` file after the domain is ready.

## Architecture

- `index.html` is the tools hub.
- `tools/<slug>/index.html` contains each utility page.
- `assets/css/styles.css` is the shared design system.
- `assets/js/tool-registry.js` defines the site-wide tool list.
- `assets/js/common.js` renders shared footer and related tool links.
- `assets/js/tools/*.js` contains the interactive logic for each tool.
