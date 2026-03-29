/**
 * Tests for embedded dashboard static assets (S-4-04, FR-066).
 *
 * Validates that the HTML is self-contained with no external requests, has the
 * expected structural elements, and meets CSP requirements.
 */

import { describe, it, expect } from 'vitest';
import { DASHBOARD_HTML } from '../../src/dashboard/static.js';

// ---------------------------------------------------------------------------
// Suite: no external resources
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — no external resources', () => {
  it('contains no external <script src> tags pointing to external hosts', () => {
    // Disallow script tags with an http(s):// src attribute
    const externalScriptPattern = /<script[^>]+src\s*=\s*["']https?:\/\//i;
    expect(externalScriptPattern.test(DASHBOARD_HTML)).toBe(false);
  });

  it('contains no external <link href> tags pointing to external hosts', () => {
    const externalLinkPattern = /<link[^>]+href\s*=\s*["']https?:\/\//i;
    expect(externalLinkPattern.test(DASHBOARD_HTML)).toBe(false);
  });

  it('contains no <img src> references to external hosts', () => {
    const externalImgPattern = /<img[^>]+src\s*=\s*["']https?:\/\//i;
    expect(externalImgPattern.test(DASHBOARD_HTML)).toBe(false);
  });

  it('contains no @import url() pointing to external hosts', () => {
    const importPattern = /@import\s+url\s*\(\s*["']?https?:\/\//i;
    expect(importPattern.test(DASHBOARD_HTML)).toBe(false);
  });

  it('does not load Google Fonts or any CDN font', () => {
    expect(DASHBOARD_HTML).not.toContain('fonts.googleapis.com');
    expect(DASHBOARD_HTML).not.toContain('fonts.gstatic.com');
    expect(DASHBOARD_HTML).not.toContain('cdnjs.cloudflare.com');
    expect(DASHBOARD_HTML).not.toContain('cdn.jsdelivr.net');
    expect(DASHBOARD_HTML).not.toContain('unpkg.com');
  });

  it('does not reference any CDN libraries (React, Vue, etc.)', () => {
    expect(DASHBOARD_HTML).not.toContain('react.development.js');
    expect(DASHBOARD_HTML).not.toContain('vue.global.js');
    expect(DASHBOARD_HTML).not.toContain('angular.min.js');
  });
});

// ---------------------------------------------------------------------------
// Suite: CSP meta tag
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — CSP meta tag', () => {
  it('includes a Content-Security-Policy meta tag', () => {
    expect(DASHBOARD_HTML).toContain('Content-Security-Policy');
  });

  it('CSP meta tag disallows external default-src', () => {
    expect(DASHBOARD_HTML).toContain("default-src 'self'");
  });

  it('CSP allows unsafe-inline styles (needed for inline CSS)', () => {
    expect(DASHBOARD_HTML).toContain("style-src 'self' 'unsafe-inline'");
  });

  it('CSP allows unsafe-inline scripts (needed for inline JS)', () => {
    expect(DASHBOARD_HTML).toContain("script-src 'self' 'unsafe-inline'");
  });
});

// ---------------------------------------------------------------------------
// Suite: portfolio table structure
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — portfolio table structure', () => {
  it('contains a section or div with portfolio content area', () => {
    expect(DASHBOARD_HTML).toContain('portfolio');
  });

  it('references the /api/targets endpoint in JavaScript', () => {
    expect(DASHBOARD_HTML).toContain('/api/targets');
  });

  it('references the /api/history/ endpoint in JavaScript', () => {
    expect(DASHBOARD_HTML).toContain('/api/history/');
  });

  it('has a table element in HTML structure', () => {
    expect(DASHBOARD_HTML).toContain('<table>');
  });

  it('has table headers defined in the JavaScript render logic', () => {
    // The portfolio table headers are generated dynamically in JS
    expect(DASHBOARD_HTML).toContain('Server URL');
    expect(DASHBOARD_HTML).toContain('Latest Score');
    expect(DASHBOARD_HTML).toContain('Findings');
    expect(DASHBOARD_HTML).toContain('Trend');
    expect(DASHBOARD_HTML).toContain('Last Run');
  });

  it('applies color-coding class names for scores', () => {
    expect(DASHBOARD_HTML).toContain('score-green');
    expect(DASHBOARD_HTML).toContain('score-yellow');
    expect(DASHBOARD_HTML).toContain('score-red');
  });

  it('applies trend indicator class names', () => {
    expect(DASHBOARD_HTML).toContain('trend-up');
    expect(DASHBOARD_HTML).toContain('trend-down');
    expect(DASHBOARD_HTML).toContain('trend-stable');
  });
});

// ---------------------------------------------------------------------------
// Suite: server detail view
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — server detail view', () => {
  it('contains a detail view section', () => {
    expect(DASHBOARD_HTML).toContain('detail');
  });

  it('has SVG-based chart generation code', () => {
    // The JS builds SVG charts — check for svg element creation
    expect(DASHBOARD_HTML).toContain('<svg');
  });

  it('generates polyline elements for line charts', () => {
    expect(DASHBOARD_HTML).toContain('polyline');
  });

  it('generates rect elements for bar charts', () => {
    expect(DASHBOARD_HTML).toContain('<rect');
  });

  it('marks regression points with circle elements', () => {
    // Regression markers are circles
    expect(DASHBOARD_HTML).toContain('<circle');
  });

  it('references regression detection logic', () => {
    // The JS checks for score drops > 5
    expect(DASHBOARD_HTML).toContain('Regression');
  });

  it('includes category score overlay toggle logic', () => {
    expect(DASHBOARD_HTML).toContain('breakdown');
  });
});

// ---------------------------------------------------------------------------
// Suite: navigation
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — navigation', () => {
  it('contains the MCP Verify Dashboard title', () => {
    expect(DASHBOARD_HTML).toContain('MCP Verify Dashboard');
  });

  it('contains a back-to-portfolio navigation element', () => {
    expect(DASHBOARD_HTML).toContain('back-link');
  });

  it('has a header element', () => {
    expect(DASHBOARD_HTML).toContain('<header>');
  });
});

// ---------------------------------------------------------------------------
// Suite: styling
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — dark theme styling', () => {
  it('uses a dark background color', () => {
    // Dark-themed: check for dark hex colors in CSS
    expect(DASHBOARD_HTML).toMatch(/#0d1117|#161b22|#21262d/);
  });

  it('uses monospace font', () => {
    expect(DASHBOARD_HTML).toContain('monospace');
  });

  it('has responsive viewport meta tag', () => {
    expect(DASHBOARD_HTML).toContain('viewport');
    expect(DASHBOARD_HTML).toContain('width=device-width');
  });

  it('contains inline CSS (no external stylesheet link)', () => {
    expect(DASHBOARD_HTML).toContain('<style>');
    // Should not have external stylesheet
    const externalCss = /<link[^>]+rel\s*=\s*["']stylesheet["'][^>]+href\s*=\s*["']https?:\/\//i;
    expect(externalCss.test(DASHBOARD_HTML)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Suite: HTML validity basics
// ---------------------------------------------------------------------------

describe('DASHBOARD_HTML — HTML structure basics', () => {
  it('starts with a DOCTYPE declaration', () => {
    expect(DASHBOARD_HTML.trimStart()).toMatch(/^<!DOCTYPE html>/i);
  });

  it('contains an <html> element', () => {
    expect(DASHBOARD_HTML).toContain('<html');
  });

  it('contains a <head> element', () => {
    expect(DASHBOARD_HTML).toContain('<head>');
  });

  it('contains a <body> element', () => {
    expect(DASHBOARD_HTML).toContain('<body>');
  });

  it('contains a <title> element', () => {
    expect(DASHBOARD_HTML).toContain('<title>');
  });

  it('contains a charset meta tag', () => {
    expect(DASHBOARD_HTML).toContain('charset');
  });

  it('is a non-empty string', () => {
    expect(typeof DASHBOARD_HTML).toBe('string');
    expect(DASHBOARD_HTML.length).toBeGreaterThan(100);
  });
});
