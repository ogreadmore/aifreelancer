export const tools = [
  {
    slug: "word-counter",
    title: "Word Counter",
    category: "Writing",
    popular: true,
    description: "Measure words, characters, reading time, speaking time, and top repeated keywords from a text block.",
    features: ["Live writing metrics", "Keyword frequency table", "Cleanup actions for pasted text"],
  },
  {
    slug: "markdown-preview",
    title: "Markdown Preview",
    category: "Writing",
    isNew: true,
    description: "Preview Markdown locally with safe rendering, copyable HTML, downloadable output, and a live split workspace.",
    features: ["Split editor and preview", "Safe rendered HTML", "Copy and download output"],
  },
  {
    slug: "case-converter",
    title: "Case Converter",
    category: "Text",
    description: "Convert text into title case, sentence case, snake_case, kebab-case, camelCase, and more.",
    features: ["10 conversion styles", "Copy and swap actions", "Quick text stats"],
  },
  {
    slug: "list-cleaner",
    title: "List Cleaner",
    category: "Text",
    description: "Trim, dedupe, sort, prefix, suffix, and normalize multi-line lists before you reuse them.",
    features: ["Natural or alphabetical sorting", "Trim and blank-line removal", "Prefix and suffix transforms"],
  },
  {
    slug: "diff-check",
    title: "Diff Check",
    category: "Dev",
    popular: true,
    description: "Compare two text blocks with line-level and inline highlights for fast edits review.",
    features: ["Whitespace and case controls", "Inline change highlighting", "Built for prompts, code, copy, and contracts"],
  },
  {
    slug: "json-formatter",
    title: "JSON Formatter",
    category: "Dev",
    popular: true,
    description: "Validate, format, minify, and alphabetize JSON without sending it to another site.",
    features: ["Pretty print or minify", "Deep key sorting", "Fast validation feedback"],
  },
  {
    slug: "regex-tester",
    title: "Regex Tester",
    category: "Dev",
    popular: true,
    isNew: true,
    description: "Test JavaScript regular expressions with live matches, capture groups, and replacement previews that stay local.",
    features: ["Live match list", "Capture group inspection", "Replacement preview"],
  },
  {
    slug: "csv-json-converter",
    title: "CSV / JSON Converter",
    category: "Dev",
    popular: true,
    isNew: true,
    description: "Convert CSV exports to JSON arrays of objects and JSON arrays back to CSV with quoted-cell handling.",
    features: ["CSV to JSON objects", "JSON array to CSV", "Copy and download output"],
  },
  {
    slug: "encoding-lab",
    title: "Encoding Lab",
    category: "Dev",
    description: "Encode and decode URLs, Base64, HTML entities, and query strings with browser-only transforms.",
    features: ["Unicode-safe Base64", "HTML escape and unescape", "Query-string pretty parsing"],
  },
  {
    slug: "hash-generator",
    title: "Hash Generator",
    category: "Dev",
    description: "Generate SHA hashes for text with the Web Crypto API and copy results in lower or upper hex.",
    features: ["SHA-1, SHA-256, SHA-384, SHA-512", "UTF-8 aware hashing", "Per-hash copy buttons"],
  },
  {
    slug: "uuid-generator",
    title: "UUID Generator",
    category: "Dev",
    description: "Generate UUID v4 values in single or batch mode with copy helpers and format toggles.",
    features: ["Crypto-based UUID generation", "Uppercase and hyphenless options", "Copy-one or copy-all actions"],
  },
  {
    slug: "password-generator",
    title: "Password Generator",
    category: "Security",
    popular: true,
    description: "Generate strong browser-side passwords with crypto randomness, batch output, and strength guidance.",
    features: ["Configurable character sets", "Exclude ambiguous characters", "Batch generate and copy"],
  },
  {
    slug: "jwt-decoder",
    title: "JWT Decoder",
    category: "Security",
    popular: true,
    isNew: true,
    description: "Decode JWT headers and payloads locally, inspect timing claims, and copy structured reports without verifying signatures.",
    features: ["Header and payload decode", "exp/nbf/iat timing checks", "Signature caveat and copy helpers"],
  },
  {
    slug: "image-paste-downloader",
    title: "Image Paste Downloader",
    category: "Imaging",
    popular: true,
    description: "Paste or drop screenshots, instantly preview them, and auto-download each image locally.",
    features: ["Clipboard paste support", "Auto-download toggle", "Local preview gallery"],
  },
  {
    slug: "image-resizer",
    title: "Image Resizer",
    category: "Imaging",
    popular: true,
    description: "Resize a single image in the browser, preserve aspect ratio, and export as PNG, JPEG, or WebP.",
    features: ["Drag-and-drop upload", "Aspect lock and scale controls", "Format and quality export options"],
  },
  {
    slug: "image-compressor",
    title: "Image Compressor",
    category: "Imaging",
    popular: true,
    isNew: true,
    description: "Compress one image locally with PNG, JPEG, or WebP export, quality controls, max-dimension scaling, and size checks.",
    features: ["Quality and format controls", "Max-dimension scaling", "Before and after size preview"],
  },
  {
    slug: "aspect-ratio-calculator",
    title: "Aspect Ratio Calculator",
    category: "Imaging",
    description: "Solve width and height from common or custom aspect ratios with scaling and orientation metadata.",
    features: ["Preset and custom ratios", "Width or height solving", "Scale multiplier and rounding"],
  },
  {
    slug: "color-studio",
    title: "Color Studio",
    category: "Web",
    popular: true,
    description: "Match colors, extract palettes from images, and check contrast before you ship designs.",
    features: ["HEX, RGB, and HSL conversion", "Image palette extraction", "Contrast ratio checks"],
  },
  {
    slug: "qr-generator",
    title: "QR Generator",
    category: "Web",
    popular: true,
    isNew: true,
    description: "Generate QR codes locally for text, URLs, email, phone, and Wi-Fi payloads with export-ready previews.",
    features: ["Multiple payload types", "Color and size controls", "PNG and SVG export"],
  },
  {
    slug: "url-inspector",
    title: "URL Inspector",
    category: "Web",
    isNew: true,
    description: "Break URLs into origin, path, query, and hash parts, decode repeated params, and rebuild links locally.",
    features: ["Decoded query groups", "Editable URL parts", "Copy URL reports"],
  },
  {
    slug: "slug-generator",
    title: "Slug Generator",
    category: "Content",
    description: "Turn headlines or filenames into clean URL slugs with batch mode, cleanup, and preview paths.",
    features: ["Separator and lowercase controls", "Accent stripping", "Batch line conversion"],
  },
  {
    slug: "utm-builder",
    title: "UTM Builder",
    category: "Marketing",
    description: "Build campaign links that preserve existing query strings and safely encode UTM parameters.",
    features: ["Live campaign URL preview", "Copy and sample actions", "Parameter summary snapshot"],
  },
  {
    slug: "stopwatch",
    title: "Stopwatch",
    category: "Time",
    description: "Track focused sessions with a big stopwatch, lap capture, and a built-in countdown timer.",
    features: ["Laps and splits", "Countdown presets", "Runs entirely in the browser"],
  },
  {
    slug: "timestamp-converter",
    title: "Timestamp Converter",
    category: "Time",
    popular: true,
    description: "Convert Unix seconds and milliseconds into local or UTC date-time values and back again.",
    features: ["Live bidirectional conversion", "Now buttons", "Copy actions for each output"],
  },
  {
    slug: "brick-calculator",
    title: "Brick Calculator",
    category: "Trades",
    description: "Estimate bricks, blocks, courses, pallets, and mortar volume for quick masonry planning.",
    features: ["Imperial and metric inputs", "Multiple masonry formats", "Waste and pallet estimates"],
  },
  {
    slug: "unit-converter",
    title: "Unit Converter",
    category: "Trades",
    popular: true,
    description: "Convert length, area, volume, weight, temperature, and speed with construction-friendly units.",
    features: ["Instant category switching", "Common building units", "Quick comparison table"],
  },
  {
    slug: "percentage-calculator",
    title: "Percentage Calculator",
    category: "Math",
    popular: true,
    description: "Handle percent-of, percent change, percent-of-total, and reverse percentage calculations quickly.",
    features: ["Four calculation modes", "Live plain-language formulas", "Zero-division safety"],
  },
  {
    slug: "block-drop",
    title: "Block Drop",
    category: "Puzzle",
    type: "game",
    description: "Stack falling blocks with ghost previews, hold and next pieces, touch controls, and a persistent best score.",
    features: ["Ghost placement", "Hold and next previews", "Score, lines, and level tracking"],
  },
  {
    slug: "connect-four",
    title: "Connect Four",
    category: "Puzzle",
    type: "game",
    isNew: true,
    description: "Play polished local Connect Four with player-vs-player, a simple AI opponent, keyboard support, and local stats.",
    features: ["PvP and simple AI", "Win and draw detection", "Responsive board controls"],
  },
  {
    slug: "merge-2048",
    title: "Merge 2048",
    category: "Puzzle",
    type: "game",
    isNew: true,
    description: "Slide and merge numbered tiles with keyboard and swipe controls, score tracking, move count, and local best score.",
    features: ["Keyboard and swipe play", "Score, moves, and best score", "Responsive 4x4 board"],
  },
  {
    slug: "mine-grid",
    title: "Mine Grid",
    category: "Puzzle",
    type: "game",
    description: "Clear a minefield with first-click safety, difficulty presets, flag mode, and per-preset best times.",
    features: ["Beginner to expert presets", "Desktop and touch flagging", "Best-time records"],
  },
  {
    slug: "word-sprint",
    title: "Word Sprint",
    category: "Puzzle",
    type: "game",
    isNew: true,
    description: "Guess five-letter words in daily or unlimited mode with keyboard play, local stats, and quick restarts.",
    features: ["Daily and unlimited modes", "On-screen keyboard", "Local stats and reveal flow"],
  },
  {
    slug: "brick-blitz",
    title: "Brick Blitz",
    category: "Arcade",
    type: "game",
    description: "Smash through neon brick fields with combo scoring, power-ups, lives, and level progression.",
    features: ["Power-up drops", "Combo scoring", "Keyboard and touch play"],
  },
  {
    slug: "neon-snake",
    title: "Neon Snake",
    category: "Arcade",
    type: "game",
    description: "Guide a glowing snake through a neon grid with speed ramps, touch controls, and persistent best score.",
    features: ["Keyboard and touch controls", "Speed ramping", "Local best score"],
  },
  {
    slug: "orbit-drift",
    title: "Orbit Drift",
    category: "Arcade",
    type: "game",
    description: "Pilot a vector ship through asteroid fields with thrust, rotation, splitting rocks, and wave progression.",
    features: ["Thrust and rotation flight", "Asteroid splitting", "High-score persistence"],
  },
  {
    slug: "paddle-duel",
    title: "Paddle Duel",
    category: "Arcade",
    type: "game",
    description: "Play a polished paddle-vs-AI rally game with difficulty settings, mobile controls, and neon court visuals.",
    features: ["Player vs AI matchups", "Difficulty and pace controls", "Best streak tracking"],
  },
  {
    slug: "pixel-racer",
    title: "Pixel Racer",
    category: "Arcade",
    type: "game",
    description: "Dodge through a neon pseudo-3D highway with rising speed, distance scoring, and browser-local best tracking.",
    features: ["Pseudo-3D lane racing", "Keyboard and touch controls", "Distance and dodge scoring"],
  },
  {
    slug: "road-hopper",
    title: "Road Hopper",
    category: "Arcade",
    type: "game",
    description: "Cross neon traffic lanes with swipe, touch, and keyboard controls while hazards speed up each stage.",
    features: ["Keyboard, swipe, and touch play", "Lives and stage progression", "Browser-local best score"],
  },
  {
    slug: "signal-memory",
    title: "Signal Memory",
    category: "Arcade",
    type: "game",
    description: "Repeat rising neon signal sequences with audio cues, mobile pads, tempo ramps, and best-score tracking.",
    features: ["Audio and visual pulse feedback", "Round and score tracking", "Mobile-friendly signal pads"],
  },
  {
    slug: "sky-command",
    title: "Sky Command",
    category: "Arcade",
    type: "game",
    description: "Defend your skyline with tap-to-target interceptor blasts, wave progression, and local high-score tracking.",
    features: ["Tap and click targeting", "Wave-based defense", "City and core survival gameplay"],
  },
  {
    slug: "star-defender",
    title: "Star Defender",
    category: "Arcade",
    type: "game",
    description: "Hold the line against enemy waves in a neon lane shooter with bosses, lives, and touch controls.",
    features: ["Enemy waves and bosses", "Touch-friendly shooting", "Local high score"],
  },
];

const preferredCategoryOrder = [
  "Writing",
  "Text",
  "Dev",
  "Security",
  "Imaging",
  "Web",
  "Content",
  "Marketing",
  "Time",
  "Trades",
  "Math",
  "Arcade",
  "Puzzle",
];

export const categories = [
  "All",
  ...preferredCategoryOrder.filter((category) => tools.some((tool) => tool.category === category)),
  ...new Set(tools.map((tool) => tool.category).filter((category) => !preferredCategoryOrder.includes(category))),
];

export function getToolBySlug(slug) {
  return tools.find((tool) => tool.slug === slug);
}

export function getRelatedTools(currentSlug, count = 3) {
  const current = getToolBySlug(currentSlug);
  const currentIsGame = current ? isGameTool(current) : false;
  const sameCategory = tools.filter(
    (tool) => tool.slug !== currentSlug && current && tool.category === current.category,
  );
  const others = tools.filter(
    (tool) => tool.slug !== currentSlug && (!current || tool.category !== current.category),
  );

  const rankedOthers = others.slice().sort((left, right) => {
    const leftSameType = Number(isGameTool(left) === currentIsGame);
    const rightSameType = Number(isGameTool(right) === currentIsGame);
    if (leftSameType !== rightSameType) {
      return rightSameType - leftSameType;
    }

    const leftPopular = Number(Boolean(left.popular));
    const rightPopular = Number(Boolean(right.popular));
    if (leftPopular !== rightPopular) {
      return rightPopular - leftPopular;
    }

    return left.title.localeCompare(right.title);
  });

  return [...sameCategory, ...rankedOthers].slice(0, count);
}

function isGameTool(tool) {
  return tool.type === "game" || tool.category === "Arcade" || tool.category === "Puzzle";
}
