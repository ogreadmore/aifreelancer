# AIFreelancer Tools

Static, browser-only utilities for `AIFreelancer.co`, designed to deploy cleanly on GitHub Pages without a build step.

## Included tools

- `Diff Check` for line-by-line text comparisons with inline highlights.
- `Image Paste Downloader` for instant screenshot and clipboard image downloads.
- `Stopwatch` with laps and a built-in countdown timer.
- `Color Studio` for palette extraction, color conversion, and contrast checks.
- `Brick Calculator` for masonry quantity estimates.
- `Unit Converter` for common construction and web-work conversions.
- `JSON Formatter` for validating, formatting, minifying, and sorting JSON.

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
