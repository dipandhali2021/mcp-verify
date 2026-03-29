/**
 * Embedded static assets for the MCP Verify dashboard (S-4-04, FR-066).
 *
 * All HTML, CSS, and JavaScript are inlined as template strings.
 * Zero external network requests — no CDN, no external fonts, no external scripts.
 */

// ---------------------------------------------------------------------------
// Dashboard HTML
// ---------------------------------------------------------------------------

export const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="Content-Security-Policy"
        content="default-src 'self'; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline'" />
  <title>MCP Verify Dashboard</title>
  <style>
    /* ------------------------------------------------------------------ */
    /* Reset & base                                                         */
    /* ------------------------------------------------------------------ */
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:        #0d1117;
      --surface:   #161b22;
      --border:    #30363d;
      --text:      #c9d1d9;
      --text-dim:  #8b949e;
      --accent:    #58a6ff;
      --green:     #3fb950;
      --yellow:    #d29922;
      --red:       #f85149;
      --orange:    #e3935a;
      --blue:      #58a6ff;
      --font:      'Courier New', Courier, monospace;
    }

    html, body {
      background: var(--bg);
      color: var(--text);
      font-family: var(--font);
      font-size: 14px;
      min-height: 100vh;
    }

    a { color: var(--accent); text-decoration: none; }
    a:hover { text-decoration: underline; }

    /* ------------------------------------------------------------------ */
    /* Header                                                               */
    /* ------------------------------------------------------------------ */
    header {
      background: var(--surface);
      border-bottom: 1px solid var(--border);
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 16px;
    }
    header h1 {
      font-size: 16px;
      font-weight: bold;
      color: var(--accent);
      letter-spacing: 0.05em;
    }
    #back-link { display: none; font-size: 13px; }
    #back-link.visible { display: inline; }

    /* ------------------------------------------------------------------ */
    /* Main layout                                                          */
    /* ------------------------------------------------------------------ */
    main { padding: 24px; max-width: 1200px; margin: 0 auto; }

    /* ------------------------------------------------------------------ */
    /* Views                                                                */
    /* ------------------------------------------------------------------ */
    .view { display: none; }
    .view.active { display: block; }

    /* ------------------------------------------------------------------ */
    /* Portfolio table                                                      */
    /* ------------------------------------------------------------------ */
    #portfolio h2 {
      font-size: 15px;
      margin-bottom: 16px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }

    .table-wrap { overflow-x: auto; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
    }
    th {
      background: var(--surface);
      border: 1px solid var(--border);
      padding: 8px 12px;
      text-align: left;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      cursor: pointer;
      user-select: none;
      white-space: nowrap;
    }
    th:hover { color: var(--text); }
    th.sort-asc::after  { content: ' \u25b2'; }
    th.sort-desc::after { content: ' \u25bc'; }

    td {
      border: 1px solid var(--border);
      padding: 8px 12px;
      white-space: nowrap;
    }
    tr:hover td { background: var(--surface); }

    .score-green  { color: var(--green);  font-weight: bold; }
    .score-yellow { color: var(--yellow); font-weight: bold; }
    .score-red    { color: var(--red);    font-weight: bold; }

    .trend-up     { color: var(--green); }
    .trend-down   { color: var(--red); }
    .trend-stable { color: var(--text-dim); }

    .server-link { cursor: pointer; color: var(--accent); }
    .server-link:hover { text-decoration: underline; }

    .empty-state {
      padding: 40px;
      text-align: center;
      color: var(--text-dim);
      border: 1px dashed var(--border);
    }

    /* ------------------------------------------------------------------ */
    /* Detail view                                                          */
    /* ------------------------------------------------------------------ */
    #detail h2 {
      font-size: 15px;
      margin-bottom: 4px;
      color: var(--text);
      word-break: break-all;
    }
    #detail-subtitle {
      font-size: 12px;
      color: var(--text-dim);
      margin-bottom: 24px;
    }

    .chart-section {
      margin-bottom: 32px;
    }
    .chart-section h3 {
      font-size: 13px;
      color: var(--text-dim);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 12px;
    }

    .chart-container {
      background: var(--surface);
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 16px;
      overflow-x: auto;
    }

    svg.chart {
      display: block;
      overflow: visible;
    }

    /* Chart legend */
    .legend {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      margin-top: 10px;
      font-size: 12px;
    }
    .legend-item {
      display: flex;
      align-items: center;
      gap: 6px;
      cursor: pointer;
      opacity: 1;
      transition: opacity 0.15s;
    }
    .legend-item.hidden { opacity: 0.35; }
    .legend-swatch {
      width: 12px;
      height: 12px;
      border-radius: 2px;
      flex-shrink: 0;
    }

    /* Category toggle buttons */
    .category-toggles {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 10px;
    }
    .cat-toggle {
      background: var(--bg);
      border: 1px solid var(--border);
      border-radius: 3px;
      padding: 3px 8px;
      font-size: 11px;
      font-family: var(--font);
      color: var(--text-dim);
      cursor: pointer;
    }
    .cat-toggle.active {
      color: var(--text);
      border-color: var(--accent);
    }

    /* ------------------------------------------------------------------ */
    /* Loading / error states                                               */
    /* ------------------------------------------------------------------ */
    .loading {
      padding: 32px;
      text-align: center;
      color: var(--text-dim);
    }
    .error-msg {
      padding: 16px;
      background: #2d1a1a;
      border: 1px solid var(--red);
      border-radius: 4px;
      color: var(--red);
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <header>
    <h1>MCP Verify Dashboard</h1>
    <a id="back-link" href="#" onclick="showPortfolio(); return false;">&larr; All Servers</a>
  </header>

  <main>
    <!-- ---------------------------------------------------------------- -->
    <!-- Portfolio view                                                     -->
    <!-- ---------------------------------------------------------------- -->
    <section id="portfolio" class="view active">
      <h2>Tracked Servers</h2>
      <div id="portfolio-content"><div class="loading">Loading...</div></div>
    </section>

    <!-- ---------------------------------------------------------------- -->
    <!-- Detail view                                                        -->
    <!-- ---------------------------------------------------------------- -->
    <section id="detail" class="view">
      <h2 id="detail-title"></h2>
      <p id="detail-subtitle"></p>

      <div id="detail-content"></div>
    </section>
  </main>

  <script>
    /* ==================================================================
       State
       ================================================================== */
    let portfolioData = [];
    let sortKey = 'latestScore';
    let sortDir = 'desc';
    let currentTarget = null;
    let activeCategories = new Set();

    /* ==================================================================
       Navigation
       ================================================================== */
    function showPortfolio() {
      document.getElementById('portfolio').classList.add('active');
      document.getElementById('detail').classList.remove('active');
      document.getElementById('back-link').classList.remove('visible');
      currentTarget = null;
    }

    function showDetail(target) {
      currentTarget = target;
      document.getElementById('portfolio').classList.remove('active');
      document.getElementById('detail').classList.add('active');
      document.getElementById('back-link').classList.add('visible');
      document.getElementById('detail-title').textContent = target;
      document.getElementById('detail-subtitle').textContent = 'Loading history...';
      document.getElementById('detail-content').innerHTML = '<div class="loading">Loading...</div>';
      loadDetail(target);
    }

    /* ==================================================================
       Portfolio
       ================================================================== */
    async function loadPortfolio() {
      try {
        const resp = await fetch('/api/targets');
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        portfolioData = await resp.json();
        renderPortfolio();
      } catch (err) {
        document.getElementById('portfolio-content').innerHTML =
          '<div class="error-msg">Failed to load portfolio: ' + escHtml(String(err)) + '</div>';
      }
    }

    function renderPortfolio() {
      const container = document.getElementById('portfolio-content');
      if (!portfolioData.length) {
        container.innerHTML = '<div class="empty-state">No verification runs recorded yet.<br>Run <code>mcp-verify &lt;target&gt;</code> to get started.</div>';
        return;
      }

      const sorted = [...portfolioData].sort((a, b) => {
        let av = a[sortKey];
        let bv = b[sortKey];
        if (typeof av === 'string') av = av.toLowerCase();
        if (typeof bv === 'string') bv = bv.toLowerCase();
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });

      const cols = [
        { key: 'target',        label: 'Server URL' },
        { key: 'latestScore',   label: 'Latest Score' },
        { key: 'findingsCount', label: 'Findings' },
        { key: 'trend',         label: 'Trend' },
        { key: 'lastRun',       label: 'Last Run' },
      ];

      let html = '<div class="table-wrap"><table><thead><tr>';
      for (const col of cols) {
        let cls = '';
        if (sortKey === col.key) cls = sortDir === 'asc' ? 'sort-asc' : 'sort-desc';
        html += '<th class="' + cls + '" data-key="' + col.key + '">' + col.label + '</th>';
      }
      html += '</tr></thead><tbody>';

      for (const row of sorted) {
        const scoreCls = row.latestScore >= 80 ? 'score-green' : row.latestScore >= 60 ? 'score-yellow' : 'score-red';
        const trendCls = row.trend === 'up' ? 'trend-up' : row.trend === 'down' ? 'trend-down' : 'trend-stable';
        const trendSym = row.trend === 'up' ? '\u2191' : row.trend === 'down' ? '\u2193' : '\u2014';
        const dateStr = row.lastRun ? new Date(row.lastRun).toLocaleString() : 'N/A';

        html += '<tr>';
        html += '<td><span class="server-link" data-target="' + escAttr(row.target) + '">' + escHtml(row.target) + '</span></td>';
        html += '<td class="' + scoreCls + '">' + row.latestScore + '</td>';
        html += '<td>' + row.findingsCount + '</td>';
        html += '<td class="' + trendCls + '">' + trendSym + '</td>';
        html += '<td>' + escHtml(dateStr) + '</td>';
        html += '</tr>';
      }

      html += '</tbody></table></div>';
      container.innerHTML = html;

      // Column sort handlers
      container.querySelectorAll('th[data-key]').forEach(function(th) {
        th.addEventListener('click', function() {
          const key = this.getAttribute('data-key');
          if (sortKey === key) {
            sortDir = sortDir === 'asc' ? 'desc' : 'asc';
          } else {
            sortKey = key;
            sortDir = key === 'lastRun' ? 'desc' : (key === 'latestScore' ? 'desc' : 'asc');
          }
          renderPortfolio();
        });
      });

      // Row click → detail
      container.querySelectorAll('.server-link').forEach(function(el) {
        el.addEventListener('click', function() {
          showDetail(this.getAttribute('data-target'));
        });
      });
    }

    /* ==================================================================
       Detail
       ================================================================== */
    async function loadDetail(target) {
      try {
        const resp = await fetch('/api/history/' + encodeURIComponent(target));
        if (!resp.ok) throw new Error('HTTP ' + resp.status);
        const history = await resp.json();
        renderDetail(target, history);
      } catch (err) {
        document.getElementById('detail-content').innerHTML =
          '<div class="error-msg">Failed to load history: ' + escHtml(String(err)) + '</div>';
        document.getElementById('detail-subtitle').textContent = '';
      }
    }

    function renderDetail(target, history) {
      if (!history.length) {
        document.getElementById('detail-subtitle').textContent = 'No runs recorded.';
        document.getElementById('detail-content').innerHTML = '<div class="empty-state">No history available for this target.</div>';
        return;
      }

      const latest = history[history.length - 1];
      document.getElementById('detail-subtitle').textContent =
        history.length + ' run' + (history.length !== 1 ? 's' : '') +
        ' \u2022 Latest: ' + new Date(latest.timestamp).toLocaleString();

      // Collect all category names
      const catSet = new Set();
      for (const r of history) {
        for (const k of Object.keys(r.breakdown || {})) catSet.add(k);
      }
      const categories = Array.from(catSet);

      // Default active: all
      if (activeCategories.size === 0) {
        for (const c of categories) activeCategories.add(c);
      }

      let html = '';

      // -- Score over time chart --
      html += '<div class="chart-section">';
      html += '<h3>Conformance Score Over Time</h3>';
      html += '<div class="chart-container">';

      if (categories.length > 0) {
        html += '<div class="category-toggles" id="cat-toggles">';
        for (const cat of categories) {
          const isActive = activeCategories.has(cat);
          html += '<button class="cat-toggle ' + (isActive ? 'active' : '') + '" data-cat="' + escAttr(cat) + '">' + escHtml(cat) + '</button>';
        }
        html += '</div>';
      }

      html += buildScoreChart(history, categories);
      html += '</div></div>';

      // -- Security findings stacked bar chart --
      html += '<div class="chart-section">';
      html += '<h3>Security Findings by Severity</h3>';
      html += '<div class="chart-container">';
      html += buildFindingsChart(history);
      html += '</div></div>';

      document.getElementById('detail-content').innerHTML = html;

      // Category toggle handlers
      document.querySelectorAll('#cat-toggles .cat-toggle').forEach(function(btn) {
        btn.addEventListener('click', function() {
          const cat = this.getAttribute('data-cat');
          if (activeCategories.has(cat)) {
            activeCategories.delete(cat);
            this.classList.remove('active');
          } else {
            activeCategories.add(cat);
            this.classList.add('active');
          }
          // Re-render just the score chart SVG
          const chartContainer = this.closest('.chart-container');
          const oldSvg = chartContainer.querySelector('svg.chart');
          const newSvg = svgElementFromString(buildScoreChart(history, categories));
          if (oldSvg && newSvg) chartContainer.replaceChild(newSvg, oldSvg);
        });
      });
    }

    /* ==================================================================
       Score line chart (SVG)
       ================================================================== */
    function buildScoreChart(history, categories) {
      const W = 720, H = 220;
      const PAD = { top: 16, right: 20, bottom: 40, left: 44 };
      const innerW = W - PAD.left - PAD.right;
      const innerH = H - PAD.top - PAD.bottom;
      const n = history.length;

      function xPos(i) { return n <= 1 ? PAD.left + innerW / 2 : PAD.left + (i / (n - 1)) * innerW; }
      function yPos(v) { return PAD.top + innerH - (Math.max(0, Math.min(100, v)) / 100) * innerH; }

      let svg = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-label="Conformance score over time">';

      // Grid lines at 0, 25, 50, 75, 100
      for (const gv of [0, 25, 50, 75, 100]) {
        const gy = yPos(gv);
        svg += '<line x1="' + PAD.left + '" y1="' + gy + '" x2="' + (PAD.left + innerW) + '" y2="' + gy + '" stroke="#30363d" stroke-width="1" />';
        svg += '<text x="' + (PAD.left - 6) + '" y="' + (gy + 4) + '" fill="#8b949e" font-size="11" text-anchor="end" font-family="monospace">' + gv + '</text>';
      }

      // X-axis date labels (up to 6 labels)
      const labelStep = Math.max(1, Math.floor(n / 6));
      for (let i = 0; i < n; i += labelStep) {
        const rec = history[i];
        const lx = xPos(i);
        const label = rec ? new Date(rec.timestamp).toLocaleDateString() : '';
        svg += '<text x="' + lx + '" y="' + (H - 6) + '" fill="#8b949e" font-size="10" text-anchor="middle" font-family="monospace">' + escHtml(label) + '</text>';
      }

      // Regression markers — red dots when score drops >5 from previous run
      const regressionPoints = [];
      for (let i = 1; i < n; i++) {
        const prev = history[i - 1];
        const curr = history[i];
        if (prev && curr && (prev.conformanceScore - curr.conformanceScore) > 5) {
          regressionPoints.push({ x: xPos(i), y: yPos(curr.conformanceScore), score: curr.conformanceScore });
        }
      }

      // Category overlay lines
      const catColors = ['#58a6ff', '#3fb950', '#d29922', '#e3935a', '#bc8cff', '#79c0ff', '#56d364'];
      for (let ci = 0; ci < categories.length; ci++) {
        const cat = categories[ci];
        if (!activeCategories.has(cat)) continue;
        const color = catColors[ci % catColors.length];
        const points = history.map(function(r, i) {
          const v = (r.breakdown && r.breakdown[cat] !== undefined) ? r.breakdown[cat] : null;
          if (v === null) return null;
          return xPos(i) + ',' + yPos(v);
        }).filter(Boolean);
        if (points.length >= 2) {
          svg += '<polyline points="' + points.join(' ') + '" fill="none" stroke="' + color + '" stroke-width="1.5" stroke-dasharray="4,3" opacity="0.7" />';
        }
      }

      // Overall score line
      const scorePoints = history.map(function(r, i) { return xPos(i) + ',' + yPos(r.conformanceScore); }).join(' ');
      if (n >= 2) {
        svg += '<polyline points="' + scorePoints + '" fill="none" stroke="#58a6ff" stroke-width="2.5" />';
      }

      // Score dots
      for (let i = 0; i < n; i++) {
        const r = history[i];
        const cx = xPos(i);
        const cy = yPos(r.conformanceScore);
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="4" fill="#58a6ff" />';
        // Tooltip via title
        svg += '<circle cx="' + cx + '" cy="' + cy + '" r="8" fill="transparent"><title>' + escHtml(new Date(r.timestamp).toLocaleString()) + ': ' + r.conformanceScore + '</title></circle>';
      }

      // Regression markers (red dots, drawn on top)
      for (const pt of regressionPoints) {
        svg += '<circle cx="' + pt.x + '" cy="' + pt.y + '" r="6" fill="#f85149" stroke="#0d1117" stroke-width="1.5">';
        svg += '<title>Regression: score ' + pt.score + '</title>';
        svg += '</circle>';
      }

      svg += '</svg>';

      // Legend
      svg += '<div class="legend">';
      svg += '<div class="legend-item"><div class="legend-swatch" style="background:#58a6ff"></div><span>Overall Score</span></div>';
      for (let ci = 0; ci < categories.length; ci++) {
        const cat = categories[ci];
        const color = catColors[ci % catColors.length];
        const hiddenCls = activeCategories.has(cat) ? '' : ' hidden';
        svg += '<div class="legend-item' + hiddenCls + '"><div class="legend-swatch" style="background:' + color + ';opacity:0.7"></div><span>' + escHtml(cat) + '</span></div>';
      }
      if (regressionPoints.length > 0) {
        svg += '<div class="legend-item"><div class="legend-swatch" style="background:#f85149;border-radius:50%"></div><span>Regression (&gt;5pt drop)</span></div>';
      }
      svg += '</div>';

      return svg;
    }

    /* ==================================================================
       Findings stacked bar chart (SVG)
       ================================================================== */
    function buildFindingsChart(history) {
      const W = 720, H = 180;
      const PAD = { top: 16, right: 120, bottom: 40, left: 44 };
      const innerW = W - PAD.left - PAD.right;
      const innerH = H - PAD.top - PAD.bottom;
      const n = history.length;

      const severities = [
        { key: 'critical', color: '#f85149', label: 'Critical' },
        { key: 'high',     color: '#e3935a', label: 'High' },
        { key: 'medium',   color: '#d29922', label: 'Medium' },
        { key: 'low',      color: '#58a6ff', label: 'Low' },
      ];

      // Get per-run severity counts from securityFindingsCount (total only available)
      // We show securityFindingsCount as a single bar since severity breakdown isn't stored per-run
      // Use available breakdown data: securityFindingsCount is the total
      const maxFindings = Math.max(1, ...history.map(function(r) { return r.securityFindingsCount || 0; }));

      const barW = Math.max(4, Math.min(40, (innerW / n) - 4));

      let svg = '<svg class="chart" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '" aria-label="Security findings per run">';

      // Grid lines
      const maxGrid = Math.ceil(maxFindings / 5) * 5 || 5;
      for (let gv = 0; gv <= maxGrid; gv += Math.ceil(maxGrid / 4)) {
        const gy = PAD.top + innerH - (gv / maxGrid) * innerH;
        svg += '<line x1="' + PAD.left + '" y1="' + gy + '" x2="' + (PAD.left + innerW) + '" y2="' + gy + '" stroke="#30363d" stroke-width="1" />';
        svg += '<text x="' + (PAD.left - 6) + '" y="' + (gy + 4) + '" fill="#8b949e" font-size="11" text-anchor="end" font-family="monospace">' + gv + '</text>';
      }

      // Bars
      for (let i = 0; i < n; i++) {
        const r = history[i];
        const total = r.securityFindingsCount || 0;
        const bx = n <= 1
          ? PAD.left + innerW / 2 - barW / 2
          : PAD.left + (i / (n - 1)) * innerW - barW / 2;

        if (total === 0) {
          // Empty bar placeholder
          const barH = 2;
          svg += '<rect x="' + bx + '" y="' + (PAD.top + innerH - barH) + '" width="' + barW + '" height="' + barH + '" fill="#30363d" />';
        } else {
          const barH = (total / maxGrid) * innerH;
          const by = PAD.top + innerH - barH;
          // Single-color bar (total findings, no severity breakdown stored per-run)
          svg += '<rect x="' + bx + '" y="' + by + '" width="' + barW + '" height="' + barH + '" fill="#e3935a">';
          svg += '<title>' + escHtml(new Date(r.timestamp).toLocaleDateString()) + ': ' + total + ' finding' + (total !== 1 ? 's' : '') + '</title>';
          svg += '</rect>';
        }

        // X label
        if (n <= 12 || i % Math.max(1, Math.floor(n / 6)) === 0) {
          const lx = bx + barW / 2;
          svg += '<text x="' + lx + '" y="' + (H - 6) + '" fill="#8b949e" font-size="10" text-anchor="middle" font-family="monospace">' + escHtml(new Date(r.timestamp).toLocaleDateString()) + '</text>';
        }
      }

      svg += '</svg>';

      // Legend
      svg += '<div class="legend">';
      svg += '<div class="legend-item"><div class="legend-swatch" style="background:#e3935a"></div><span>Security Findings (total)</span></div>';
      svg += '</div>';

      return svg;
    }

    /* ==================================================================
       Utilities
       ================================================================== */
    function escHtml(str) {
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function escAttr(str) {
      return String(str).replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    }

    function svgElementFromString(htmlStr) {
      const div = document.createElement('div');
      div.innerHTML = htmlStr;
      return div.querySelector('svg.chart');
    }

    /* ==================================================================
       Bootstrap
       ================================================================== */
    loadPortfolio();
  </script>
</body>
</html>`;
