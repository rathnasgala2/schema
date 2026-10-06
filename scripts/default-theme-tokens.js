import { THEME_TOKEN_CATALOG } from './internal-semantics/theme-token-grammar.js';

/**
 * The Default theme's contract-3 values, as `[light, dark]` pairs. They were
 * converted from the approved preview's `tokens.css` (base block = light,
 * `data-gala-resolved-color-mode="dark"` block = dark) by resolving every
 * `var()` and `color-mix()`, converting `rgb(r g b / a)` to `#rrggbbaa`, and
 * rewriting `transparent` borders as `#00000000`. Font stacks drop
 * `-apple-system` and quote marks, which the font-family grammar cannot hold.
 */
const SANS = 'ui-sans-serif, system-ui, Segoe UI, Roboto, sans-serif';
/**
 * @param {string} value mode-invariant value
 * @returns {readonly [string, string]} light and dark pair
 */
const SAME = (value) => [value, value];

/** @type {Record<string, readonly [string, string]>} */
const VALUES = {
  'border-button': SAME('1px solid #00000000'),
  'border-card': ['1px solid #e2e6ec', '1px solid #232a34'],
  'border-chip': SAME('1px solid #00000000'),
  'border-code': ['1px solid #00000000', '1px solid #232a34'],
  'border-media-divider': SAME('none'),
  'border-quote': ['4px solid #2b59ff', '4px solid #7b97ff'],
  'border-row-divider': SAME('none'),
  'border-section-rule': SAME('none'),
  'border-width': SAME('1px'),
  'card-inset': SAME('0.5rem'),
  'card-pad': SAME('0.75rem 0.9rem 1.1rem'),
  'card-title-size': SAME('1.25rem'),
  'chip-pad': SAME('0.28rem 0.65rem'),
  'color-accent': ['#2b59ff', '#7b97ff'],
  'color-accent-2': ['#00a3a3', '#3fd0c9'],
  'color-border': ['#e2e6ec', '#232a34'],
  'color-btn-panel': SAME('#ffffff'),
  'color-btn-panel-text': ['#2b59ff', '#18245c'],
  'color-btn-text': ['#ffffff', '#0b1020'],
  'color-canvas': ['#f7f8fa', '#0b0d11'],
  'color-chip-text': ['#1d3fc4', '#b5c6ff'],
  'color-code-canvas': ['#0f1520', '#0f1319'],
  'color-code-text': SAME('#e6edf6'),
  'color-danger': ['#a8241c', '#ff8f8a'],
  'color-focus': ['#2b59ff', '#9db2ff'],
  'color-footer': ['#ffffff', '#12161c'],
  'color-header': ['#f7f8fac7', '#0b0d11b8'],
  'color-icon-accent': ['#2b59ff', '#7b97ff'],
  'color-input': SAME('#ffffff1a'),
  'color-input-border': SAME('#ffffff4d'),
  'color-link': ['#2148e0', '#9db2ff'],
  'color-link-underline': ['#2148e059', '#9db2ff59'],
  'color-link-underline-hover': ['#2148e0', '#9db2ff'],
  'color-link-visited': ['#6b2d8f', '#caa6f0'],
  'color-on-accent': ['#ffffff', '#0b1020'],
  'color-overlay': ['#0a0e1473', '#00000099'],
  'color-panel-muted': SAME('#ffffffc7'),
  'color-panel-text': SAME('#ffffff'),
  'color-selection': ['#cfdbff', '#2a3a7a'],
  'color-success': ['#256b3a', '#7fe0a0'],
  'color-surface': ['#ffffff', '#12161c'],
  'color-surface-raised': ['#eef1f5', '#1a1f27'],
  'color-syntax-comment': SAME('#7d8aa0'),
  'color-syntax-function': SAME('#7cc7ff'),
  'color-syntax-keyword': SAME('#c4a7ff'),
  'color-syntax-number': SAME('#ffc27a'),
  'color-syntax-string': SAME('#9be3a5'),
  'color-text': ['#0f1419', '#e8ecf2'],
  'color-text-faint': ['#8a94a3', '#6b7686'],
  'color-text-muted': ['#556070', '#9aa5b5'],
  'color-toc-active': SAME('#00000000'),
  'color-toc-active-text': ['#0f1419', '#e8ecf2'],
  'color-warning': ['#7a4b00', '#ffcf66'],
  'content-measure': SAME('42rem'),
  'decor-size': SAME('100% 46rem'),
  'display-max': SAME('4rem'),
  'display-style': SAME('normal'),
  'duration-base': SAME('320ms'),
  'duration-fast': SAME('160ms'),
  'duration-slow': SAME('700ms'),
  'ease-spring': SAME('cubic-bezier(0.34, 1.4, 0.64, 1)'),
  'ease-standard': SAME('cubic-bezier(0.2, 0.8, 0.2, 1)'),
  'focus-width': SAME('2px'),
  'font-body': SAME(SANS),
  'font-display': SAME(SANS),
  'font-label': SAME(SANS),
  'font-mono': SAME('ui-monospace, SF Mono, Menlo, Consolas, monospace'),
  'font-ui': SAME(SANS),
  'label-transform': SAME('uppercase'),
  'lift-x': SAME('0'),
  'lift-y': SAME('-4px'),
  'link-offset': SAME('0.22em'),
  'link-offset-hover': SAME('0.3em'),
  'link-skip-ink': SAME('auto'),
  'link-thickness': SAME('0.08em'),
  'media-filter': SAME('none'),
  'media-filter-hover': SAME('none'),
  'media-zoom': SAME('1.045'),
  'paint-button': ['#2b59ff', '#7b97ff'],
  'paint-chip': ['#e8eeff', '#1a2346'],
  'paint-page-decor': [
    'radial-gradient(60rem 28rem at 88% -8%, #dfe7ff 0%, transparent 62%)',
    'radial-gradient(60rem 28rem at 88% -8%, #17204a 0%, transparent 62%)',
  ],
  'paint-panel': [
    'linear-gradient(135deg, #1d3fc4, #2b59ff 55%, #00a3a3)',
    'linear-gradient(135deg, #18245c, #2a3f9e 55%, #0f6f6c)',
  ],
  'prose-leading': SAME('1.75'),
  'prose-size': SAME('1.125rem'),
  'quote-align': SAME('start'),
  'quote-mark': SAME('none'),
  'quote-pad': SAME('0.25em 0 0.25em 1.25em'),
  'quote-style': SAME('normal'),
  'quote-transform': SAME('none'),
  'radius-avatar': SAME('50%'),
  'radius-large': SAME('22px'),
  'radius-media': SAME('10px'),
  'radius-medium': SAME('14px'),
  'radius-pill': SAME('999px'),
  'radius-small': SAME('8px'),
  'row-pad': SAME('0'),
  'shadow-avatar-ring': [
    '0 0 0 2px #f7f8fa, 0 0 0 3px #e2e6ec',
    '0 0 0 2px #0b0d11, 0 0 0 3px #232a34',
  ],
  'shadow-button': [
    '0 1px 2px #1018281f, 0 6px 16px -8px #2b59ff8c',
    '0 6px 18px -8px #7b97ff99',
  ],
  'shadow-card': [
    '0 1px 2px #1018280d, 0 10px 24px -14px #1018282e',
    'inset 0 1px 0 #ffffff08, 0 12px 28px -16px #000000b3',
  ],
  'shadow-card-hover': [
    '0 2px 4px #1018280f, 0 28px 48px -22px #10182852',
    'inset 0 1px 0 #ffffff0d, 0 30px 50px -24px #000000d9',
  ],
  'shadow-dialog': [
    '0 40px 80px -20px #0a0e1473',
    '0 40px 80px -20px #000000cc',
  ],
  'space-1': SAME('0.25rem'),
  'space-2': SAME('0.5rem'),
  'space-3': SAME('0.75rem'),
  'space-4': SAME('1rem'),
  'space-6': SAME('1.5rem'),
  'space-8': SAME('2rem'),
  'title-transform': SAME('none'),
  'tracking-display': SAME('-0.035em'),
  'tracking-label': SAME('0.08em'),
  'tracking-title': SAME('-0.015em'),
  'weight-display': SAME('760'),
  'weight-normal': SAME('400'),
  'weight-strong': SAME('700'),
  'weight-title': SAME('680'),
  'weight-ui': SAME('560'),
};

/**
 * Build the Default theme's complete, ordered token rows.
 *
 * @returns {Array<{key: string, type: string, light: string, dark: string}>}
 *   one row per catalog position
 */
export function defaultThemeTokens() {
  if (Object.keys(VALUES).length !== THEME_TOKEN_CATALOG.length) {
    throw new Error('DEFAULT_THEME_TOKENS_INCOMPLETE');
  }
  return THEME_TOKEN_CATALOG.map(([key, type]) => {
    const pair = VALUES[key];
    if (pair === undefined)
      throw new Error(`DEFAULT_THEME_TOKEN_MISSING:${key}`);
    return { key, type, light: pair[0], dark: pair[1] };
  });
}
