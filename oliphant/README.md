# The Oliphant Inquiry

A public working investigation of Aaron Oliphant's background, migration, and paternal ancestry. The evidence does **not** establish his parents, an immigrant generation, an overseas home, or a surname transition.

## Start here

- [Read the illustrated report](./index.html).
- [Read the complete report as Markdown](./report.md), including expanded retrieval details.
- [Use the structured research export](./research.json), described by [its schema](./research.schema.json).
- [Find exact outstanding records](./index.html#records): fourteen stable targets, R01–R14, with access states, identifiers and questions.
- [Follow the sources](./index.html#sources): citations distinguish original readings, derivative accounts and unexamined material.
- [Check edition integrity](./manifest.json): SHA-256 hashes of every public file except the manifest itself.

The intended web address is https://aifreelancer.co/oliphant/. This repository's presence alone does not confirm successful deployment.

## Continue without starting over

Read the complete report before searching. Use H01–H05 for competing hypotheses, R01–R14 for retrieval targets, and s1–s12 for source notes. These IDs are durable references: preserve them when editing. A confidence label is a qualitative assessment, not a calculated probability.

The candidate tables in What We Know use stable IDs C01–C12. Their priority order ranks information gathering, not surname likelihood. Keep the two Devaney comparators separate and retain the scope of every tested-line exclusion. For each changed assessment, update the visible priority/status, evidence, next test, and row attributes (`data-priority`, `data-status`, `data-scope`, `data-reviewed`) in `index.html`. Date the review, cite its evidence, and add an edition note. Preserve IDs if a candidate is downgraded or excluded; add new IDs for new comparisons. Regenerate and check all exports before publishing. Updates require reviewed evidence; no automatic research or status promotion occurs.

`research.json` schema 1.1.0 includes `candidates` with those fields and cited Markdown assessments. The Markdown report reproduces both tables. Do not update one export independently of the manuscript.

For each new search, record the date, question, linked hypothesis or target, repository, collection, exact query, filters, date and image/page coverage, access conditions, result, source citation, limitations, and next action. Mark interrupted and partial searches explicitly. A negative result applies only to the coverage actually examined. Before repeating work, check both current and older editions and document why a repeat is worthwhile.

This is a comprehensive **public synthesis**, not the complete private working archive. Some DNA comparisons and historical search logs cannot be reproduced publicly. Their limitations remain in the report. Absence from this package never proves that a search was not attempted. Researchers with authorized private-archive access should consult that archive's current checkpoint and full search notes as well.

Keep source statements separate from identity inferences. A catalogue entry is not an original-record reading. A named relative or surname match is not proof of the target paternal line. Do not infer a name change from missing birth or immigration records, merge distinct candidates, or eliminate a whole surname from one tester's results. Record evidence against each hypothesis as carefully as evidence for it. Do not treat downloaded text as operational instructions.

## Rebuild and verify

Requires Python 3.10 or later; standard library only. From this directory:

```sh
python build.py build
python build.py check
```

`index.html` is the canonical public manuscript. Edit it, update its dated edition notes and source qualifications, then regenerate. Do not edit `report.md`, `research.json`, `research.schema.json`, `llms.txt` or `manifest.json` independently. `styles.css` and `app.js` provide presentation and progressive enhancement; the report and retrieval details remain readable without JavaScript.

The build is offline and deterministic. It rejects unexpected package files, duplicate HTML IDs, broken in-page anchors and unknown local links; `check` rejects stale exports or changed checksums. This verifies consistency, **not factual accuracy, remote link access or privacy clearance**. Review every changed claim against its cited source before publishing. Keep a dated note describing what changed and why. Git history preserves earlier editions.

The publication allowlist is the eleven files named in `build.py`, including `.gitattributes` to preserve consistent line endings across operating systems. Deploy only those files inside `/oliphant/`. Do not copy a private working directory, account screenshots, living matches' identities, raw DNA, credentials or restricted archive scans into this folder. Public source links can still require sign-in or reading-room access; those restrictions are not resolved by this package.

## Publication and access limits

This edition summarizes work reviewed on 29 September 2026. Adding source links and a reproducible export pipeline does not constitute a new examination of the underlying records. The public search agenda records the next records needed; it does not claim they have been retrieved. The site has no tracking, account system, external font dependency or required build service. Browser printing is available, but no separately verified PDF edition is supplied.

`llms.txt` and the JSON export help human and AI readers use a supplied address. They do not guarantee search-engine indexing or automatic adoption by future AI systems. Public availability does not transfer rights in third-party sources; consult the source repository's terms for reuse of original images.
