import assert from "node:assert/strict";
import {
  buildRows,
  createLineComparator,
  diffSequence,
  normalizeComparable,
  splitLines,
} from "../assets/js/lib/diff-engine.js";

function getRows(leftText, rightText, options = {}) {
  const leftLines = splitLines(leftText);
  const rightLines = splitLines(rightText);
  const operations = diffSequence(leftLines, rightLines, createLineComparator(options));
  return buildRows(operations, options);
}

{
  const rows = getRows("a\nb\nc", "a\nx\ny\nc");
  assert.equal(rows[1].type, "delete");
  assert.equal(rows[1].leftText, "b");
  assert.equal(rows[2].type, "insert");
  assert.equal(rows[2].rightText, "x");
  assert.equal(rows[3].type, "insert");
  assert.equal(rows[3].rightText, "y");
}

{
  const rows = getRows(
    "AI Freelancer Tools\nShip practical utilities fast.\nEvery tool runs locally in the browser.",
    "AI Freelancer Tools\nShip practical utilities faster.\nEvery tool runs locally in the browser.",
  );
  assert.equal(rows[1].type, "change");
  assert.equal(rows[1].leftText, "Ship practical utilities fast.");
  assert.equal(rows[1].rightText, "Ship practical utilities faster.");
}

{
  const rows = getRows("Header\nFoo\nBar", "Header\nBar");
  assert.equal(rows[1].type, "delete");
  assert.equal(rows[1].leftText, "Foo");
}

{
  assert.equal(
    normalizeComparable("  Hello   World  ", { ignoreWhitespace: true, ignoreCase: true }),
    "hello world",
  );
}

console.log("diff-engine tests passed");
