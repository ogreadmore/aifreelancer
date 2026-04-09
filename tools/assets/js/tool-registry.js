export const tools = [
  {
    slug: "diff-check",
    title: "Diff Check",
    category: "Dev",
    description: "Compare two text blocks with line-level and inline highlights for fast edits review.",
    features: ["Whitespace and case controls", "Inline change highlighting", "Built for prompts, code, copy, and contracts"],
  },
  {
    slug: "image-paste-downloader",
    title: "Image Paste Downloader",
    category: "Imaging",
    description: "Paste or drop screenshots, instantly preview them, and auto-download each image locally.",
    features: ["Clipboard paste support", "Auto-download toggle", "Local preview gallery"],
  },
  {
    slug: "stopwatch",
    title: "Stopwatch",
    category: "Time",
    description: "Track focused sessions with a big stopwatch, lap capture, and a built-in countdown timer.",
    features: ["Laps and splits", "Countdown presets", "Runs entirely in the browser"],
  },
  {
    slug: "color-studio",
    title: "Color Studio",
    category: "Web",
    description: "Match colors, extract palettes from images, and check contrast before you ship designs.",
    features: ["HEX, RGB, and HSL conversion", "Image palette extraction", "Contrast ratio checks"],
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
    description: "Convert length, area, volume, weight, temperature, and speed with construction-friendly units.",
    features: ["Instant category switching", "Common building units", "Quick comparison table"],
  },
  {
    slug: "json-formatter",
    title: "JSON Formatter",
    category: "Dev",
    description: "Validate, format, minify, and alphabetize JSON without sending it to another site.",
    features: ["Pretty print or minify", "Deep key sorting", "Fast validation feedback"],
  },
];

export const categories = ["All", ...new Set(tools.map((tool) => tool.category))];

export function getToolBySlug(slug) {
  return tools.find((tool) => tool.slug === slug);
}

export function getRelatedTools(currentSlug, count = 3) {
  const current = getToolBySlug(currentSlug);
  const sameCategory = tools.filter(
    (tool) => tool.slug !== currentSlug && current && tool.category === current.category,
  );
  const others = tools.filter(
    (tool) => tool.slug !== currentSlug && (!current || tool.category !== current.category),
  );

  return [...sameCategory, ...others].slice(0, count);
}
