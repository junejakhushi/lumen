/**
 * Quiet Heritage — Tailwind theme extension (Tailwind v3 config / v4 via @config).
 *
 *   // tailwind.config.js
 *   const qh = require('./tailwind.theme.js');
 *   module.exports = { content: [...], theme: { extend: qh } };
 *
 * Load exports/tokens.css once, globally. Semantic colours (surface, text,
 * control-line, action …) resolve through CSS variables, so wrapping a subtree
 * in data-theme="evening" switches it to the AR camera mode with no extra classes.
 * Primitives (ivory, ink, gold, ruby …) are literal hex, so opacity modifiers work
 * on them — but gold is a line colour: use border-gold / decoration-gold, never bg-gold.
 *
 * Type: -d = 1440 desktop, -m = 390 mobile.  e.g.  class="text-display-l-m lg:text-display-l-d"
 * Labels need small caps: add  [font-variant-caps:all-small-caps]  or use the .label-* classes in tokens.css.
 */
module.exports = {
  "colors": {
    "ivory": "#f5f0e8",
    "ink": "#1b1916",
    "pearl": "#e8e2d8",
    "gold": "#a8844a",
    "gold-deep": "#8c6c3a",
    "ruby": "#6e1e2a",
    "emerald": "#1e4638",
    "stone": "#8a8378",
    "stone-deep": "#655e54",
    "surface": "var(--surface)",
    "surface-alt": "var(--surface-alt)",
    "surface-control": "var(--surface-control)",
    "scrim": "var(--scrim)",
    "text": "var(--text)",
    "text-muted": "var(--text-muted)",
    "text-disabled": "var(--text-disabled)",
    "text-inverse": "var(--text-inverse)",
    "hairline": "var(--hairline)",
    "hairline-quiet": "var(--hairline-quiet)",
    "control-line": "var(--control-line)",
    "focus-ring": "var(--focus-ring)",
    "action": "var(--action)",
    "action-hover": "var(--action-hover)",
    "action-pressed": "var(--action-pressed)",
    "on-action": "var(--on-action)",
    "secondary": "var(--secondary)",
    "on-secondary": "var(--on-secondary)",
    "status-positive": "var(--status-positive)",
    "status-attention": "var(--status-attention)",
    "status-error": "var(--status-error)",
    "metal-yellow": "#d2ae68",
    "metal-white": "#d8d8d4",
    "metal-rose": "#d3a08a",
    "gem-diamond": "#eef0f1",
    "gem-ruby": "#9b1b30",
    "gem-emerald": "#1f6b4e",
    "gem-sapphire": "#233f73",
    "gem-pearl": "#efe7da",
    "gem-polki": "#cdc4ae"
  },
  "fontFamily": {
    "display": [
      "Cormorant Garamond",
      "Cormorant",
      "Garamond",
      "Times New Roman",
      "serif"
    ],
    "ui": [
      "Jost",
      "Futura PT",
      "Futura",
      "Century Gothic",
      "system-ui",
      "sans-serif"
    ],
    "accent": [
      "Tiro Devanagari Hindi",
      "Noto Serif Devanagari",
      "serif"
    ]
  },
  "fontSize": {
    "display-xl-d": [
      "80px",
      {
        "lineHeight": "84px",
        "letterSpacing": "-0.015em",
        "fontWeight": "400"
      }
    ],
    "display-l-d": [
      "60px",
      {
        "lineHeight": "64px",
        "letterSpacing": "-0.01em",
        "fontWeight": "400"
      }
    ],
    "display-m-d": [
      "44px",
      {
        "lineHeight": "50px",
        "letterSpacing": "-0.005em",
        "fontWeight": "400"
      }
    ],
    "title-l-d": [
      "32px",
      {
        "lineHeight": "40px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "title-m-d": [
      "24px",
      {
        "lineHeight": "32px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "title-s-d": [
      "20px",
      {
        "lineHeight": "28px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "display-xl-m": [
      "48px",
      {
        "lineHeight": "52px",
        "letterSpacing": "-0.015em",
        "fontWeight": "400"
      }
    ],
    "display-l-m": [
      "40px",
      {
        "lineHeight": "44px",
        "letterSpacing": "-0.01em",
        "fontWeight": "400"
      }
    ],
    "display-m-m": [
      "32px",
      {
        "lineHeight": "38px",
        "letterSpacing": "-0.005em",
        "fontWeight": "400"
      }
    ],
    "title-l-m": [
      "26px",
      {
        "lineHeight": "32px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "title-m-m": [
      "21px",
      {
        "lineHeight": "28px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "title-s-m": [
      "18px",
      {
        "lineHeight": "24px",
        "letterSpacing": "0",
        "fontWeight": "500"
      }
    ],
    "label-l": [
      "17px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.14em",
        "fontWeight": "600"
      }
    ],
    "label-m": [
      "15px",
      {
        "lineHeight": "18px",
        "letterSpacing": "0.16em",
        "fontWeight": "600"
      }
    ],
    "label-s": [
      "13px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.18em",
        "fontWeight": "600"
      }
    ],
    "body-l-d": [
      "18px",
      {
        "lineHeight": "30px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ],
    "body-m-d": [
      "16px",
      {
        "lineHeight": "26px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ],
    "body-s-d": [
      "14px",
      {
        "lineHeight": "22px",
        "letterSpacing": "0.005em",
        "fontWeight": "400"
      }
    ],
    "ui-m-d": [
      "15px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.04em",
        "fontWeight": "500"
      }
    ],
    "ui-s-d": [
      "13px",
      {
        "lineHeight": "18px",
        "letterSpacing": "0.03em",
        "fontWeight": "500"
      }
    ],
    "numeric-d": [
      "16px",
      {
        "lineHeight": "24px",
        "letterSpacing": "0.01em",
        "fontWeight": "500"
      }
    ],
    "caption-d": [
      "12px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.02em",
        "fontWeight": "400"
      }
    ],
    "body-l-m": [
      "17px",
      {
        "lineHeight": "28px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ],
    "body-m-m": [
      "16px",
      {
        "lineHeight": "24px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ],
    "body-s-m": [
      "14px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.005em",
        "fontWeight": "400"
      }
    ],
    "ui-m-m": [
      "15px",
      {
        "lineHeight": "20px",
        "letterSpacing": "0.04em",
        "fontWeight": "500"
      }
    ],
    "ui-s-m": [
      "13px",
      {
        "lineHeight": "18px",
        "letterSpacing": "0.03em",
        "fontWeight": "500"
      }
    ],
    "numeric-m": [
      "15px",
      {
        "lineHeight": "22px",
        "letterSpacing": "0.01em",
        "fontWeight": "500"
      }
    ],
    "caption-m": [
      "12px",
      {
        "lineHeight": "16px",
        "letterSpacing": "0.02em",
        "fontWeight": "400"
      }
    ],
    "accent-d": [
      "32px",
      {
        "lineHeight": "44px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ],
    "accent-m": [
      "24px",
      {
        "lineHeight": "34px",
        "letterSpacing": "0",
        "fontWeight": "400"
      }
    ]
  },
  "spacing": {
    "1": "4px",
    "2": "8px",
    "3": "12px",
    "4": "16px",
    "5": "20px",
    "6": "24px",
    "8": "32px",
    "10": "40px",
    "12": "48px",
    "16": "64px",
    "20": "80px",
    "24": "96px",
    "30": "120px",
    "touch": "44px",
    "control": "48px",
    "margin-m": "24px",
    "margin-d": "120px",
    "gutter-m": "16px",
    "gutter-d": "24px"
  },
  "borderRadius": {
    "none": "0",
    "sm": "2px",
    "DEFAULT": "2px",
    "pill": "999px",
    "round": "50%"
  },
  "transitionTimingFunction": {
    "quiet": "cubic-bezier(0.2, 0, 0, 1)",
    "draw": "cubic-bezier(0.65, 0, 0.35, 1)",
    "exit": "cubic-bezier(0.4, 0, 1, 1)"
  },
  "transitionDuration": {
    "fast": "120ms",
    "base": "200ms",
    "slow": "320ms",
    "draw": "480ms"
  },
  "maxWidth": {
    "content": "1200px",
    "measure": "34em"
  },
  "outlineColor": {
    "focus": "var(--focus-ring)"
  }
};
