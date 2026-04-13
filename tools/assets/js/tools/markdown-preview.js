import { escapeHtml, formatNumber, initCommon } from "../common.js";

initCommon("markdown-preview");

const inputNode = document.querySelector("#markdown-input");
const previewNode = document.querySelector("#markdown-preview");
const statusNode = document.querySelector("#markdown-status");
const wordCountNode = document.querySelector("#markdown-word-count");
const charCountNode = document.querySelector("#markdown-char-count");
const sampleButton = document.querySelector("#markdown-sample");
const copyButton = document.querySelector("#markdown-copy");
const downloadButton = document.querySelector("#markdown-download");
const clearButton = document.querySelector("#markdown-clear");

const SAMPLE_MARKDOWN = `# Markdown Preview

Use this tool to draft **docs**, *release notes*, and AI prompt fragments without leaving the browser.

> Raw HTML is escaped first, then the preview is sanitized with a small allowlist before it is rendered.

## What it supports

- Headings
- Lists
- Blockquotes
- \`inline code\`
- [Useful links](https://aifreelancer.co)
- Tables

### Tiny code sample

\`\`\`js
const message = "Hello from browser-only Markdown Preview";
console.log(message);
\`\`\`

| Tool | Use case |
| --- | --- |
| Diff Check | Review edits before a launch |
| JSON Formatter | Clean payloads locally |
| Regex Tester | Validate patterns fast |

That is the whole loop: write, preview, copy, or download.`;

const state = {
  timer: 0,
  previewHtml: "",
  visibleText: "",
  outputFilename: "markdown-preview.html",
};

sampleButton.addEventListener("click", loadSample);
copyButton.addEventListener("click", copyHtml);
downloadButton.addEventListener("click", downloadHtml);
clearButton.addEventListener("click", clearAll);
inputNode.addEventListener("input", scheduleRender);

loadSample();

function loadSample() {
  inputNode.value = SAMPLE_MARKDOWN;
  renderPreview("Sample Markdown loaded and rendered locally.");
}

function clearAll() {
  inputNode.value = "";
  state.previewHtml = "";
  state.visibleText = "";
  previewNode.innerHTML = emptyStateMarkup();
  copyButton.disabled = true;
  downloadButton.disabled = true;
  updateMetrics("");
  setStatus("Markdown cleared. Paste content or load the sample to render a safe preview.");
}

function scheduleRender() {
  window.clearTimeout(state.timer);
  state.timer = window.setTimeout(() => {
    renderPreview();
  }, 120);
}

function renderPreview(forcedStatus) {
  const source = normalizeNewlines(inputNode.value);

  if (!source.trim()) {
    clearPreview("Paste Markdown or load the sample to see the safe preview.");
    return;
  }

  try {
    const rendered = renderMarkdown(source);
    previewNode.innerHTML = rendered;
    state.previewHtml = previewNode.innerHTML;
    state.visibleText = normalizeVisibleText(previewNode.textContent || "");
    copyButton.disabled = !state.previewHtml;
    downloadButton.disabled = !state.previewHtml;
    updateMetrics(state.visibleText);
    setStatus(
      forcedStatus ?? "Markdown rendered locally. Raw HTML stays escaped and the preview is sanitized before display.",
      true,
    );
  } catch (error) {
    clearPreview(error.message);
  }
}

function clearPreview(message) {
  state.previewHtml = "";
  state.visibleText = "";
  previewNode.innerHTML = emptyStateMarkup();
  copyButton.disabled = true;
  downloadButton.disabled = true;
  updateMetrics("");
  setStatus(message);
}

function emptyStateMarkup() {
  return `
    <div class="preview-empty">
      <div>
        <strong>No preview yet</strong>
        <p>Paste Markdown or load the sample to render the result safely in the browser.</p>
      </div>
    </div>
  `;
}

function setStatus(message, isValid = false) {
  statusNode.className = isValid ? "json-status is-valid" : "json-status";
  statusNode.textContent = message;
}

function updateMetrics(text) {
  const words = countWords(text);
  const chars = text.length;
  wordCountNode.textContent = formatNumber(words, { maximumFractionDigits: 0 });
  charCountNode.textContent = formatNumber(chars, { maximumFractionDigits: 0 });
}

async function copyHtml() {
  if (!state.previewHtml) {
    setStatus("There is no rendered HTML to copy yet.");
    return;
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(state.previewHtml);
    } else {
      const temp = document.createElement("textarea");
      temp.value = state.previewHtml;
      temp.setAttribute("readonly", "true");
      temp.style.position = "fixed";
      temp.style.top = "-9999px";
      document.body.append(temp);
      temp.select();
      document.execCommand("copy");
      temp.remove();
    }

    setStatus("Rendered HTML copied to your clipboard.", true);
  } catch {
    setStatus("Clipboard copy was blocked by the browser.");
  }
}

function downloadHtml() {
  if (!state.previewHtml) {
    setStatus("There is no rendered HTML to download yet.");
    return;
  }

  const blob = new Blob([buildStandaloneDocument(state.previewHtml)], {
    type: "text/html;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = state.outputFilename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  setStatus("Standalone HTML downloaded locally.", true);
}

function buildStandaloneDocument(bodyHtml) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markdown Preview</title>
  <style>
    :root {
      color-scheme: light;
      --text: #182235;
      --muted: #5b6474;
      --accent: #cc7a00;
      --surface: #fcfbf8;
      --surface-2: #f5efe6;
      --line: rgba(15, 23, 42, 0.12);
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem;
      font-family: "DM Sans", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: var(--text);
      background: linear-gradient(180deg, var(--surface), var(--surface-2));
    }
    main {
      max-width: 900px;
      margin: 0 auto;
    }
    article {
      padding: 1.5rem;
      border-radius: 1.15rem;
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid var(--line);
      box-shadow: 0 1rem 3rem rgba(15, 23, 42, 0.08);
    }
    article h1,
    article h2,
    article h3,
    article h4,
    article h5,
    article h6 {
      margin: 1.35rem 0 0.65rem;
      color: #101828;
      font-family: "Source Serif 4", Georgia, serif;
      letter-spacing: -0.02em;
      line-height: 1.15;
    }
    article p,
    article ul,
    article ol,
    article blockquote,
    article table,
    article pre,
    article hr {
      margin: 0 0 1rem;
    }
    article p { line-height: 1.75; }
    article ul, article ol { padding-left: 1.35rem; }
    article li + li { margin-top: 0.45rem; }
    article blockquote {
      padding: 1rem 1.1rem;
      border-left: 4px solid var(--accent);
      border-radius: 1rem;
      background: rgba(245, 158, 11, 0.09);
      color: #344054;
    }
    article pre {
      padding: 1rem 1.1rem;
      border-radius: 1rem;
      background: #101828;
      color: #f8fafc;
      overflow: auto;
    }
    article pre code {
      background: transparent;
      color: inherit;
      padding: 0;
    }
    article code {
      padding: 0.15rem 0.35rem;
      border-radius: 0.45rem;
      background: rgba(15, 23, 42, 0.08);
      font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace;
      font-size: 0.94em;
    }
    article a {
      color: #0f62fe;
      text-decoration: underline;
      text-decoration-thickness: 2px;
      text-underline-offset: 0.15em;
    }
    article table {
      width: 100%;
      border-collapse: collapse;
      overflow: hidden;
      border-radius: 0.85rem;
    }
    article th,
    article td {
      padding: 0.8rem 0.85rem;
      border: 1px solid var(--line);
      text-align: left;
      vertical-align: top;
    }
    article th { background: rgba(15, 23, 42, 0.05); }
    article hr { border: 0; border-top: 1px solid var(--line); }
  </style>
</head>
<body>
  <main>
    <article>
      ${bodyHtml}
    </article>
  </main>
</body>
</html>`;
}

function renderMarkdown(source) {
  const lines = normalizeNewlines(source).replaceAll("\t", "  ").split("\n");
  const blocks = [];
  let index = 0;

  while (index < lines.length) {
    const line = lines[index];

    if (!line.trim()) {
      index += 1;
      continue;
    }

    const fenced = parseFence(lines, index);
    if (fenced) {
      blocks.push(fenced.html);
      index = fenced.nextIndex;
      continue;
    }

    const heading = parseHeading(line);
    if (heading) {
      blocks.push(heading);
      index += 1;
      continue;
    }

    if (isHorizontalRule(line)) {
      blocks.push("<hr>");
      index += 1;
      continue;
    }

    const table = parseTable(lines, index);
    if (table) {
      blocks.push(table.html);
      index = table.nextIndex;
      continue;
    }

    const list = parseList(lines, index);
    if (list) {
      blocks.push(list.html);
      index = list.nextIndex;
      continue;
    }

    const quote = parseBlockquote(lines, index);
    if (quote) {
      blocks.push(quote.html);
      index = quote.nextIndex;
      continue;
    }

    const paragraph = parseParagraph(lines, index);
    blocks.push(paragraph.html);
    index = paragraph.nextIndex;
  }

  return sanitizeGeneratedHtml(blocks.join(""));
}

function parseFence(lines, startIndex) {
  const match = lines[startIndex].match(/^\s*(```+|~~~+)\s*([\w-]+)?\s*$/);
  if (!match) {
    return null;
  }

  const fence = match[1];
  const language = match[2] ? escapeHtml(match[2].toLowerCase()) : "";
  const fenceChar = fence[0];
  const fenceLength = fence.length;
  const body = [];
  let index = startIndex + 1;

  while (index < lines.length) {
    const line = lines[index];
    if (new RegExp(`^\\s*${escapeRegExp(fenceChar)}{${fenceLength},}\\s*$`).test(line)) {
      index += 1;
      break;
    }

    body.push(line);
    index += 1;
  }

  return {
    html: `<pre><code${language ? ` data-language="${language}"` : ""}>${escapeHtml(body.join("\n"))}</code></pre>`,
    nextIndex: index,
  };
}

function parseHeading(line) {
  const match = line.match(/^(#{1,6})\s+(.+?)\s*#*\s*$/);
  if (!match) {
    return null;
  }

  const level = match[1].length;
  return `<h${level}>${renderInline(match[2])}</h${level}>`;
}

function parseTable(lines, startIndex) {
  if (startIndex + 1 >= lines.length) {
    return null;
  }

  const headerLine = lines[startIndex];
  const delimiterLine = lines[startIndex + 1];

  if (!headerLine.includes("|") || !isTableDelimiter(delimiterLine)) {
    return null;
  }

  const rows = [splitTableRow(headerLine)];
  let index = startIndex + 2;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || !line.includes("|")) {
      break;
    }

    if (isTableDelimiter(line)) {
      index += 1;
      continue;
    }

    rows.push(splitTableRow(line));
    index += 1;
  }

  if (rows.length < 2) {
    return null;
  }

  const [headers, ...bodyRows] = rows;
  const headerHtml = headers.map((cell) => `<th>${renderInline(cell)}</th>`).join("");
  const bodyHtml = bodyRows
    .map((cells) => `<tr>${cells.map((cell) => `<td>${renderInline(cell)}</td>`).join("")}</tr>`)
    .join("");

  return {
    html: `<table><thead><tr>${headerHtml}</tr></thead><tbody>${bodyHtml}</tbody></table>`,
    nextIndex: index,
  };
}

function parseList(lines, startIndex) {
  const firstLine = lines[startIndex];
  const orderedMatch = firstLine.match(/^\s*(\d+)\.\s+(.+)$/);
  const unorderedMatch = firstLine.match(/^\s*[-*+]\s+(.+)$/);

  if (!orderedMatch && !unorderedMatch) {
    return null;
  }

  const ordered = Boolean(orderedMatch);
  const startNumber = ordered ? Number(orderedMatch[1]) : null;
  const items = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    const match = ordered
      ? line.match(/^\s*(\d+)\.\s+(.+)$/)
      : line.match(/^\s*[-*+]\s+(.+)$/);

    if (!match) {
      break;
    }

    const content = ordered ? match[2] : match[1];
    const itemLines = [content];
    index += 1;

    while (index < lines.length) {
      const nextLine = lines[index];
      if (!nextLine.trim()) {
        index += 1;
        break;
      }

      if (isBlockStart(nextLine)) {
        break;
      }

      const continuation = nextLine.match(/^\s{2,}(.+)$/);
      if (!continuation) {
        break;
      }

      itemLines.push(continuation[1]);
      index += 1;
    }

    items.push(`<li>${itemLines.map((part) => renderInline(part)).join("<br>")}</li>`);

    while (index < lines.length && !lines[index].trim()) {
      index += 1;
    }
  }

  if (!items.length) {
    return null;
  }

  const startAttr = ordered && startNumber && startNumber !== 1 ? ` start="${startNumber}"` : "";
  return {
    html: `<${ordered ? "ol" : "ul"}${startAttr}>${items.join("")}</${ordered ? "ol" : "ul"}>`,
    nextIndex: index,
  };
}

function parseBlockquote(lines, startIndex) {
  if (!/^\s*>/.test(lines[startIndex])) {
    return null;
  }

  const quoteLines = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!/^\s*>/.test(line)) {
      break;
    }

    quoteLines.push(line.replace(/^\s*>\s?/, ""));
    index += 1;
  }

  return {
    html: `<blockquote>${renderMarkdown(quoteLines.join("\n"))}</blockquote>`,
    nextIndex: index,
  };
}

function parseParagraph(lines, startIndex) {
  const content = [];
  let index = startIndex;

  while (index < lines.length) {
    const line = lines[index];
    if (!line.trim() || isBlockStart(line)) {
      break;
    }

    content.push(line.trim());
    index += 1;
  }

  return {
    html: `<p>${renderInline(content.join(" "))}</p>`,
    nextIndex: index,
  };
}

function renderInline(rawText, { allowLinks = true } = {}) {
  if (!rawText) {
    return "";
  }

  const tokens = [];
  let text = String(rawText);

  text = text.replace(/`([^`]+?)`/g, (_, code) => {
    const token = `@@MD${tokens.length}@@`;
    tokens.push(`<code>${escapeHtml(code)}</code>`);
    return token;
  });

  if (allowLinks) {
    text = text.replace(/\[([^\]\n]+?)\]\(([^)\n]+?)\)/g, (match, label, href) => {
      const safeHref = sanitizeHref(href);
      if (!safeHref) {
        return match;
      }

      const token = `@@MD${tokens.length}@@`;
      tokens.push(`<a href="${escapeHtml(safeHref)}" target="_blank" rel="noopener noreferrer">${renderInline(label, { allowLinks: false })}</a>`);
      return token;
    });
  }

  let html = escapeHtml(text);
  html = html.replace(/\*\*(?!\s)([\s\S]*?\S)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(?!\s)([\s\S]*?\S)__/g, "<strong>$1</strong>");
  html = html.replace(/\*(?!\s)([\s\S]*?\S)\*/g, "<em>$1</em>");
  html = html.replace(/_(?!\s)([\s\S]*?\S)_/g, "<em>$1</em>");

  return html.replace(/@@MD(\d+)@@/g, (_, tokenIndex) => tokens[Number(tokenIndex)] ?? "");
}

function sanitizeGeneratedHtml(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div id="markdown-root">${html}</div>`, "text/html");
  const root = doc.querySelector("#markdown-root");

  if (!root) {
    return "";
  }

  cleanNode(root);
  return root.innerHTML;
}

function cleanNode(node) {
  Array.from(node.children).forEach((child) => {
    const tag = child.tagName.toLowerCase();

    if (!ALLOWED_TAGS.has(tag)) {
      const children = Array.from(child.childNodes);
      child.replaceWith(...children);
      return;
    }

    Array.from(child.attributes).forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (!getAllowedAttributes(tag).has(name)) {
        child.removeAttribute(attribute.name);
      }
    });

    if (tag === "a") {
      const href = child.getAttribute("href") ?? "";
      if (!sanitizeHref(href)) {
        child.removeAttribute("href");
      } else {
        child.setAttribute("target", "_blank");
        child.setAttribute("rel", "noopener noreferrer");
      }
    }

    cleanNode(child);
  });
}

function getAllowedAttributes(tag) {
  if (tag === "a") {
    return new Set(["href", "target", "rel"]);
  }

  if (tag === "ol") {
    return new Set(["start"]);
  }

  return new Set();
}

function isTableDelimiter(line) {
  return /^\s*\|?(?:\s*:?-{3,}:?\s*\|)+\s*:?-{3,}:?\s*\|?\s*$/.test(line);
}

function splitTableRow(line) {
  let value = line.trim();
  if (value.startsWith("|")) {
    value = value.slice(1);
  }
  if (value.endsWith("|")) {
    value = value.slice(0, -1);
  }

  return value.split("|").map((cell) => cell.trim());
}

function isHorizontalRule(line) {
  return /^\s*(?:---|\*\*\*|___)\s*$/.test(line);
}

function isBlockStart(line) {
  return Boolean(
    parseHeading(line) ||
    isHorizontalRule(line) ||
    /^\s*(```+|~~~+)/.test(line) ||
    /^\s*>/.test(line) ||
    /^\s*(?:[-*+]\s+|\d+\.\s+)/.test(line)
  );
}

function sanitizeHref(rawHref) {
  const href = String(rawHref ?? "").trim();
  if (!href) {
    return "";
  }

  try {
    const url = new URL(href, window.location.href);
    const allowedProtocols = new Set(["http:", "https:", "mailto:", "tel:"]);
    return allowedProtocols.has(url.protocol) ? url.toString() : "";
  } catch {
    return "";
  }
}

function normalizeNewlines(value) {
  return String(value ?? "").replace(/\r\n?/g, "\n");
}

function normalizeVisibleText(value) {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function countWords(value) {
  if (!value) {
    return 0;
  }

  if (window.Intl?.Segmenter) {
    const segmenter = new Intl.Segmenter("en", { granularity: "word" });
    let count = 0;
    for (const segment of segmenter.segment(value)) {
      if (segment.isWordLike) {
        count += 1;
      }
    }
    return count;
  }

  return value.match(/\S+/g)?.length ?? 0;
}

function escapeRegExp(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const ALLOWED_TAGS = new Set([
  "a",
  "blockquote",
  "br",
  "code",
  "em",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "hr",
  "li",
  "ol",
  "p",
  "pre",
  "strong",
  "table",
  "tbody",
  "td",
  "th",
  "thead",
  "tr",
  "ul",
]);
