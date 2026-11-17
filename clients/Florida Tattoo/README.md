# Florida Tattoo report library

Client-facing reports prepared by AI Freelancer for Brissa Behrens. Version 1.1, November 16, 2026.

Live entry point: https://aifreelancer.co/clients/Florida%20Tattoo/

## Contents

- index.html — report index; start here.
- coaching.html / coaching.md — practical PR coaching report.
- expert-strategy.html / expert-strategy.md — unlimited-budget professional strategy.
- pr-options.html / pr-options.md — limits of PR and alternatives, including sale and closure.
- evidence.html — readable source library, context, and review resources.
- brief.md — case context and agreed scope.
- sources.json — structured evidence ledger.
- reviewer-guide.md — handoff for human and LLM reviewers.
- review-bundle.md — all report text, source notes, and review instructions in one file.
- llms.txt — links to the text resources.
- reports.json — report catalog for future additions.
- build.mjs — dependency-free static generator.
- styles.css / site.js — presentation and progressive enhancements.
- manifest.json — file hashes for release verification.

## Maintenance

Edit the Markdown and sources.json, then run `node build.mjs` from this directory. The build regenerates the HTML, combined review bundle, and manifest. Add future reports through reports.json and the generator. Preserve stable report and source links. Rebuild after any content change so HTML and downloadable text agree.

The pages are static, mobile-friendly, and printable. JavaScript only adds copy buttons, active section tracking, and the print action. No analytics, tracking, form submissions, or third-party runtime dependencies are included. Noindex metadata requests exclusion from search indexing; this is a public URL, not access control.

Source observations are dated November 16, 2026. This package is advice for the owner; none of its draft statements has been posted on the shops’ behalf by this project. Only public source material and report context are included. Private chats, correspondence, credentials, customer records, and employment records are excluded.

## Release history

- 1.1 — Added the PR viability and alternatives report, four supporting sources, and updated reviewer guidance. The index remains a title and report cards.

- 1.0 — Two reports, shared evidence library, downloadable review bundle, and responsive presentation.
