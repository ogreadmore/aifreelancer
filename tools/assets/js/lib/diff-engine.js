const MAX_LINE_SIMILARITY_CELLS = 12_000;
const MIN_CHANGE_SIMILARITY = 0.35;

export function normalizeNewlines(value) {
  return value.replaceAll("\r\n", "\n");
}

export function splitLines(value) {
  return value === "" ? [] : value.split("\n");
}

export function normalizeComparable(value, options = {}) {
  let nextValue = value;

  if (options.ignoreWhitespace) {
    nextValue = nextValue.trim().replace(/\s+/g, " ");
  }

  if (options.ignoreCase) {
    nextValue = nextValue.toLowerCase();
  }

  return nextValue;
}

export function createLineComparator(options = {}) {
  return (left, right) => normalizeComparable(left, options) === normalizeComparable(right, options);
}

export function diffSequence(leftItems, rightItems, isEqual) {
  const directions = Array.from({ length: leftItems.length + 1 }, () => new Uint8Array(rightItems.length + 1));
  let previousRow = new Uint32Array(rightItems.length + 1);

  for (let leftIndex = 1; leftIndex <= leftItems.length; leftIndex += 1) {
    const currentRow = new Uint32Array(rightItems.length + 1);

    for (let rightIndex = 1; rightIndex <= rightItems.length; rightIndex += 1) {
      if (isEqual(leftItems[leftIndex - 1], rightItems[rightIndex - 1])) {
        currentRow[rightIndex] = previousRow[rightIndex - 1] + 1;
        directions[leftIndex][rightIndex] = 3;
      } else if (previousRow[rightIndex] >= currentRow[rightIndex - 1]) {
        currentRow[rightIndex] = previousRow[rightIndex];
        directions[leftIndex][rightIndex] = 1;
      } else {
        currentRow[rightIndex] = currentRow[rightIndex - 1];
        directions[leftIndex][rightIndex] = 2;
      }
    }

    previousRow = currentRow;
  }

  const operations = [];
  let leftIndex = leftItems.length;
  let rightIndex = rightItems.length;

  while (leftIndex > 0 || rightIndex > 0) {
    if (leftIndex > 0 && rightIndex > 0 && directions[leftIndex][rightIndex] === 3) {
      operations.push({
        type: "equal",
        leftValue: leftItems[leftIndex - 1],
        rightValue: rightItems[rightIndex - 1],
      });
      leftIndex -= 1;
      rightIndex -= 1;
    } else if (rightIndex > 0 && (leftIndex === 0 || directions[leftIndex][rightIndex] === 2)) {
      operations.push({
        type: "insert",
        rightValue: rightItems[rightIndex - 1],
      });
      rightIndex -= 1;
    } else {
      operations.push({
        type: "delete",
        leftValue: leftItems[leftIndex - 1],
      });
      leftIndex -= 1;
    }
  }

  return operations.reverse();
}

export function buildRows(operations, options = {}) {
  const rows = [];
  let leftNumber = 1;
  let rightNumber = 1;

  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index];

    if (operation.type === "equal") {
      rows.push({
        type: "equal",
        leftNumber,
        rightNumber,
        leftText: operation.leftValue,
        rightText: operation.rightValue,
      });
      leftNumber += 1;
      rightNumber += 1;
      continue;
    }

    const deleted = [];
    const inserted = [];

    while (index < operations.length && operations[index].type !== "equal") {
      if (operations[index].type === "delete") {
        deleted.push(operations[index].leftValue);
      } else {
        inserted.push(operations[index].rightValue);
      }
      index += 1;
    }

    index -= 1;

    const alignedRows = alignChangedBlock(deleted, inserted, options);
    alignedRows.forEach((row) => {
      const hasLeft = row.leftText !== null;
      const hasRight = row.rightText !== null;

      rows.push({
        type: row.type,
        leftNumber: hasLeft ? leftNumber : null,
        rightNumber: hasRight ? rightNumber : null,
        leftText: hasLeft ? row.leftText : "",
        rightText: hasRight ? row.rightText : "",
      });

      if (hasLeft) {
        leftNumber += 1;
      }

      if (hasRight) {
        rightNumber += 1;
      }
    });
  }

  return rows;
}

export function tokenize(value) {
  return value.match(/(\s+|[A-Za-z0-9_]+|[^\sA-Za-z0-9_])/g) ?? [];
}

function alignChangedBlock(deleted, inserted, options) {
  if (!deleted.length) {
    return inserted.map((value) => ({ type: "insert", leftText: null, rightText: value }));
  }

  if (!inserted.length) {
    return deleted.map((value) => ({ type: "delete", leftText: value, rightText: null }));
  }

  const costTable = Array.from({ length: deleted.length + 1 }, () => new Float64Array(inserted.length + 1));
  const choiceTable = Array.from({ length: deleted.length + 1 }, () => new Uint8Array(inserted.length + 1));

  for (let deleteIndex = 1; deleteIndex <= deleted.length; deleteIndex += 1) {
    costTable[deleteIndex][0] = deleteIndex;
    choiceTable[deleteIndex][0] = 1;
  }

  for (let insertIndex = 1; insertIndex <= inserted.length; insertIndex += 1) {
    costTable[0][insertIndex] = insertIndex;
    choiceTable[0][insertIndex] = 2;
  }

  for (let deleteIndex = 1; deleteIndex <= deleted.length; deleteIndex += 1) {
    for (let insertIndex = 1; insertIndex <= inserted.length; insertIndex += 1) {
      const deleteCost = costTable[deleteIndex - 1][insertIndex] + 1;
      const insertCost = costTable[deleteIndex][insertIndex - 1] + 1;
      const similarity = getLineSimilarity(
        deleted[deleteIndex - 1],
        inserted[insertIndex - 1],
        options,
      );
      const changeCost = similarity >= MIN_CHANGE_SIMILARITY
        ? costTable[deleteIndex - 1][insertIndex - 1] + (1 - similarity)
        : Number.POSITIVE_INFINITY;

      let bestCost = deleteCost;
      let bestChoice = 1;

      if (insertCost < bestCost) {
        bestCost = insertCost;
        bestChoice = 2;
      }

      if (changeCost < bestCost) {
        bestCost = changeCost;
        bestChoice = 3;
      }

      costTable[deleteIndex][insertIndex] = bestCost;
      choiceTable[deleteIndex][insertIndex] = bestChoice;
    }
  }

  const rows = [];
  let deleteIndex = deleted.length;
  let insertIndex = inserted.length;

  while (deleteIndex > 0 || insertIndex > 0) {
    const choice = choiceTable[deleteIndex][insertIndex];

    if (deleteIndex > 0 && insertIndex > 0 && choice === 3) {
      rows.push({
        type: "change",
        leftText: deleted[deleteIndex - 1],
        rightText: inserted[insertIndex - 1],
      });
      deleteIndex -= 1;
      insertIndex -= 1;
      continue;
    }

    if (insertIndex > 0 && (deleteIndex === 0 || choice === 2)) {
      rows.push({
        type: "insert",
        leftText: null,
        rightText: inserted[insertIndex - 1],
      });
      insertIndex -= 1;
      continue;
    }

    rows.push({
      type: "delete",
      leftText: deleted[deleteIndex - 1],
      rightText: null,
    });
    deleteIndex -= 1;
  }

  const orderedRows = rows.reverse();

  if (!orderedRows.some((row) => row.type === "change")) {
    return [
      ...orderedRows.filter((row) => row.type === "delete"),
      ...orderedRows.filter((row) => row.type === "insert"),
    ];
  }

  return orderedRows;
}

function getLineSimilarity(left, right, options) {
  const normalizedLeft = normalizeComparable(left, options);
  const normalizedRight = normalizeComparable(right, options);

  if (normalizedLeft === normalizedRight) {
    return 1;
  }

  if (!normalizedLeft || !normalizedRight) {
    return 0;
  }

  const leftTokens = tokenize(normalizedLeft).filter((token) => !options.ignoreWhitespace || !/^\s+$/.test(token));
  const rightTokens = tokenize(normalizedRight).filter((token) => !options.ignoreWhitespace || !/^\s+$/.test(token));

  if (!leftTokens.length || !rightTokens.length) {
    return 0;
  }

  if (leftTokens.length * rightTokens.length > MAX_LINE_SIMILARITY_CELLS) {
    return getPrefixSimilarity(normalizedLeft, normalizedRight);
  }

  const tokenOperations = diffSequence(leftTokens, rightTokens, (leftToken, rightToken) => leftToken === rightToken);
  const equalLength = tokenOperations.reduce(
    (total, operation) => total + (operation.type === "equal" ? operation.leftValue.length : 0),
    0,
  );

  return equalLength / Math.max(normalizedLeft.length, normalizedRight.length);
}

function getPrefixSimilarity(left, right) {
  const limit = Math.min(left.length, right.length);
  let shared = 0;

  while (shared < limit && left[shared] === right[shared]) {
    shared += 1;
  }

  return shared / Math.max(left.length, right.length);
}
