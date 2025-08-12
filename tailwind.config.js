/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './index.html',
    './*.html',
    './assets/**/*.html',
    './assets/**/*.js'
  ],
  safelist: [
    // General utilities used dynamically in JS/chat
    { pattern: /^(sm:|md:|lg:|xl:)?(p|px|py|pt|pr|pb|pl|m|mx|my|mt|mr|mb|ml)-(0|0\.5|1|1\.5|2|2\.5|3|3\.5|4|5|6|7|8|9|10|11|12)$/ },
    { pattern: /^(w|h|max-w|max-h|min-w|min-h)-(\w|\[.*\])+$/ },
    { pattern: /^(flex|inline-flex|block|inline|hidden|items-\w+|justify-\w+|gap-\d+)$/ },
    { pattern: /^(rounded|rounded-(sm|md|lg|xl|2xl|3xl|full))$/ },
    { pattern: /^(border|border-(0|2)|border-(gray|blue|white|black)-(100|200|300|400|500|600|700)?|outline-none)$/ },
    { pattern: /^(bg|bg-(white|black|gray|blue|slate|zinc|neutral|red|green|yellow|purple|pink)-(50|100|200|300|400|500|600|700|800|900))$/ },
    { pattern: /^(text|text-(white|black|gray|blue|slate|zinc|neutral|red|green|yellow|purple|pink)-(50|100|200|300|400|500|600|700|800|900)|text-(xs|sm|base|lg|xl|2xl))$/ },
    { pattern: /^(font-(thin|extralight|light|normal|medium|semibold|bold|extrabold|black))$/ },
    { pattern: /^(shadow|shadow-(sm|md|lg|xl|2xl))$/ },
    { pattern: /^(transition|transition-all|duration-\d+|ease-(in|out|in-out))$/ },
    { pattern: /^(transform|hover:scale-\d+|hover:shadow(?:-\w+)?)$/ },
    { pattern: /^(underline|no-underline|cursor-pointer)$/ },
    // Colors seen in strings
    'text-gray-900','text-gray-800','text-gray-700','text-gray-600','text-blue-600','text-blue-800','text-blue-200',
    'bg-white','bg-gray-100','bg-gray-50','border-gray-200','border-white','gemini-gradient-bg','gemini-gradient-text',
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};

