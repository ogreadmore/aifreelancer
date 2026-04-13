import { escapeHtml, formatNumber, initCommon } from "../common.js";

initCommon("word-counter");

const inputNode = document.querySelector("#word-counter-input");
const sampleButton = document.querySelector("#word-counter-sample");
const trimButton = document.querySelector("#word-counter-trim");
const collapseButton = document.querySelector("#word-counter-collapse");
const stripButton = document.querySelector("#word-counter-strip");
const clearButton = document.querySelector("#word-counter-clear");

const metricNodes = {
  words: document.querySelector("#word-counter-words"),
  characters: document.querySelector("#word-counter-characters"),
  charactersNoSpaces: document.querySelector("#word-counter-characters-no-spaces"),
  sentences: document.querySelector("#word-counter-sentences"),
  paragraphs: document.querySelector("#word-counter-paragraphs"),
  readingTime: document.querySelector("#word-counter-reading-time"),
  speakingTime: document.querySelector("#word-counter-speaking-time"),
  longestWord: document.querySelector("#word-counter-longest-word"),
  averageWordLength: document.querySelector("#word-counter-average-word-length"),
};

const keywordBody = document.querySelector("#word-counter-keyword-body");
const keywordTable = document.querySelector("#word-counter-keyword-table");
const keywordEmpty = document.querySelector("#word-counter-keyword-empty");

const sampleText = `AIFreelancer builds practical browser tools for busy teams.

The word counter helps you count words, characters, sentences, and paragraphs before you publish.
It also estimates reading time, speaking time, and repeated words so you can tighten copy faster.

Use the word counter to clean drafts, check length, and spot the words you keep repeating.`;

const STOP_WORDS = new Set([
  "a",
  "about",
  "after",
  "all",
  "also",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "because",
  "been",
  "before",
  "but",
  "by",
  "can",
  "could",
  "do",
  "does",
  "doing",
  "for",
  "from",
  "had",
  "has",
  "have",
  "he",
  "her",
  "here",
  "him",
  "his",
  "how",
  "i",
  "if",
  "in",
  "into",
  "is",
  "it",
  "its",
  "just",
  "like",
  "make",
  "me",
  "more",
  "most",
  "my",
  "no",
  "not",
  "of",
  "on",
  "or",
  "our",
  "out",
  "over",
  "s",
  "so",
  "some",
  "than",
  "that",
  "the",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "to",
  "too",
  "up",
  "use",
  "used",
  "very",
  "was",
  "we",
  "were",
  "what",
  "when",
  "which",
  "who",
  "will",
  "with",
  "you",
  "your",
]);

inputNode.addEventListener("input", render);
sampleButton.addEventListener("click", loadSample);
trimButton.addEventListener("click", trimLines);
collapseButton.addEventListener("click", collapseSpaces);
stripButton.addEventListener("click", stripLineBreaks);
clearButton.addEventListener("click", clearText);

loadSample();

function loadSample() {
  inputNode.value = sampleText;
  render();
}

function trimLines() {
  inputNode.value = normalizeNewlines(inputNode.value)
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  render();
}

function collapseSpaces() {
  inputNode.value = normalizeNewlines(inputNode.value).replace(/[^\S\r\n]+/g, " ");
  render();
}

function stripLineBreaks() {
  inputNode.value = normalizeNewlines(inputNode.value)
    .replace(/\n+/g, " ")
    .replace(/[^\S\r\n]+/g, " ")
    .trim();
  render();
}

function clearText() {
  inputNode.value = "";
  render();
}

function render() {
  const analysis = analyzeText(inputNode.value);

  metricNodes.words.textContent = formatNumber(analysis.wordCount, { maximumFractionDigits: 0 });
  metricNodes.characters.textContent = formatNumber(analysis.characterCount, { maximumFractionDigits: 0 });
  metricNodes.charactersNoSpaces.textContent = formatNumber(analysis.charactersNoSpaces, { maximumFractionDigits: 0 });
  metricNodes.sentences.textContent = formatNumber(analysis.sentenceCount, { maximumFractionDigits: 0 });
  metricNodes.paragraphs.textContent = formatNumber(analysis.paragraphCount, { maximumFractionDigits: 0 });
  metricNodes.readingTime.textContent = formatDuration(analysis.wordCount / 200);
  metricNodes.speakingTime.textContent = formatDuration(analysis.wordCount / 130);
  metricNodes.longestWord.textContent = analysis.longestWord || "None";
  metricNodes.averageWordLength.textContent = formatNumber(analysis.averageWordLength, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  });

  renderKeywords(analysis.keywordRows);
}

function analyzeText(value) {
  const text = normalizeNewlines(value);
  const trimmed = text.trim();
  const words = extractWords(text);
  const characterCount = value.length;
  const charactersNoSpaces = value.replace(/\s/g, "").length;
  const sentenceCount = countSentences(text);
  const paragraphCount = trimmed ? trimmed.split(/\n\s*\n+/).filter(Boolean).length : 0;
  const longestWord = words.reduce((longest, word) => (word.length > longest.length ? word : longest), "");
  const averageWordLength = words.length
    ? words.reduce((sum, word) => sum + word.length, 0) / words.length
    : 0;
  const keywordWords = words.filter((word) => !STOP_WORDS.has(word.toLowerCase()));

  const keywordFrequency = new Map();
  for (const rawWord of keywordWords) {
    const word = rawWord.toLowerCase();
    keywordFrequency.set(word, (keywordFrequency.get(word) ?? 0) + 1);
  }

  const keywordRows = [...keywordFrequency.entries()]
    .map(([word, count]) => ({
      word,
      count,
      share: keywordWords.length ? (count / keywordWords.length) * 100 : 0,
    }))
    .filter((row) => row.count > 1)
    .sort((left, right) => right.count - left.count || left.word.localeCompare(right.word))
    .slice(0, 10);

  return {
    wordCount: words.length,
    characterCount,
    charactersNoSpaces,
    sentenceCount,
    paragraphCount,
    longestWord,
    averageWordLength,
    keywordRows,
  };
}

function renderKeywords(rows) {
  if (!rows.length) {
    keywordBody.innerHTML = "";
    keywordTable.classList.add("hidden");
    keywordEmpty.classList.remove("hidden");
    return;
  }

  keywordTable.classList.remove("hidden");
  keywordEmpty.classList.add("hidden");
  keywordBody.innerHTML = rows
    .map(
      (row) => `
        <tr>
          <td>${escapeHtml(row.word)}</td>
          <td>${formatNumber(row.count, { maximumFractionDigits: 0 })}</td>
          <td>${formatNumber(row.share, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%</td>
        </tr>
      `,
    )
    .join("");
}

function extractWords(text) {
  const matches = text.match(/[\p{L}\p{N}][\p{L}\p{N}\p{M}'’\-]*/gu);
  return matches ?? [];
}

function countSentences(text) {
  const trimmed = text.trim();
  if (!trimmed) {
    return 0;
  }

  if (typeof Intl !== "undefined" && typeof Intl.Segmenter === "function") {
    try {
      const segmenter = new Intl.Segmenter("en", { granularity: "sentence" });
      let count = 0;
      for (const segment of segmenter.segment(trimmed)) {
        if (segment.segment.trim()) {
          count += 1;
        }
      }
      return count;
    } catch {
      // Fallback to a punctuation-based estimate if the browser rejects segmentation.
    }
  }

  const segments = trimmed.match(/[^.!?]+[.!?]+(?=\s|$)|[^.!?]+$/g);
  return segments ? segments.filter((segment) => segment.trim()).length : 0;
}

function formatDuration(minutes) {
  const totalSeconds = Math.max(0, Math.round(minutes * 60));

  if (totalSeconds === 0) {
    return "0s";
  }

  const wholeMinutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = totalSeconds % 60;

  if (!wholeMinutes) {
    return `${totalSeconds}s`;
  }

  return remainingSeconds ? `${wholeMinutes}m ${remainingSeconds}s` : `${wholeMinutes}m`;
}

function normalizeNewlines(text) {
  return text.replace(/\r\n?/g, "\n");
}
