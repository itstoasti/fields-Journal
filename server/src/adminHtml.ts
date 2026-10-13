export function renderAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>FIELDS Studio · Telemetry & Analytics</title>
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#09090B">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Inter:wght@400;500;600;700;800&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #09090B;
      --card-bg: #121216;
      --card-inner: #16161C;
      --card-border: rgba(255, 255, 255, 0.08);
      --cyan: #00F0FF;
      --cyan-dim: rgba(0, 240, 255, 0.12);
      --green: #10B981;
      --green-dim: rgba(16, 185, 129, 0.15);
      --amber: #F59E0B;
      --amber-dim: rgba(245, 158, 11, 0.15);
      --red: #EF4444;
      --red-dim: rgba(239, 68, 68, 0.15);
      --text: #F4F4F5;
      --text-muted: #71717A;
      --font-mono: 'Courier Prime', monospace;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: env(safe-area-inset-top, 14px) 14px env(safe-area-inset-bottom, 24px);
      -webkit-font-smoothing: antialiased;
      display: flex;
      justify-content: center;
    }

    .container {
      width: 100%;
      max-width: 620px;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Top App Bar */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 10px 0 14px;
      border-bottom: 1px solid var(--card-border);
    }

    .brand-row {
      display: flex;
      align-items: center;
      gap: 10px;
    }

    .brand-logo {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: linear-gradient(135deg, #00F0FF, #10B981);
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 16px;
      color: #09090B;
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.25);
    }

    .brand-title {
      font-size: 15px;
      font-weight: 800;
      letter-spacing: 0.5px;
      color: var(--text);
    }

    .header-actions {
      display: flex;
      align-items: center;
      gap: 8px;
    }

    .live-pill {
      display: inline-flex;
      align-items: center;
      gap: 5px;
      padding: 3px 8px;
      border-radius: 12px;
      background: var(--green-dim);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--green);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.5px;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: var(--green);
      box-shadow: 0 0 8px var(--green);
      animation: pulse 1.8s infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.4; transform: scale(0.85); }
    }

    .refresh-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--cyan);
      font-family: var(--font-mono);
      font-size: 11px;
      padding: 6px 12px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .refresh-btn:active {
      transform: scale(0.96);
      background: var(--cyan-dim);
    }

    /* Global Search Box */
    .search-bar-wrap {
      position: relative;
      width: 100%;
    }

    .search-input {
      width: 100%;
      background: #141419;
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 14px 10px 38px;
      font-size: 12px;
      color: var(--text);
      outline: none;
      transition: all 0.2s;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 12px center;
      background-size: 16px;
    }

    .search-input:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 14px rgba(0, 240, 255, 0.2);
    }

    /* One-Thumb Horizontally Scrollable Tabs */
    .tab-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
      -ms-overflow-style: none;
      padding: 2px 0 4px;
    }

    .tab-strip::-webkit-scrollbar { display: none; }

    .tab-chip {
      flex-shrink: 0;
      padding: 8px 14px;
      border-radius: 20px;
      font-size: 12px;
      font-weight: 600;
      color: var(--text-muted);
      background: #141419;
      border: 1px solid var(--card-border);
      cursor: pointer;
      transition: all 0.2s ease;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tab-chip.active {
      background: rgba(0, 240, 255, 0.12);
      color: var(--cyan);
      border-color: rgba(0, 240, 255, 0.4);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.15);
    }

    /* KPI 2x2 Grid */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 12px 14px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .kpi-label-row {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text-muted);
      margin-bottom: 6px;
    }

    .kpi-delta {
      font-size: 10px;
      font-weight: 700;
    }
    .kpi-delta.pos { color: var(--green); }
    .kpi-delta.neg { color: var(--red); }
    .kpi-delta.neu { color: var(--amber); }

    .kpi-val {
      font-size: 24px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.1;
      margin-bottom: 8px;
    }

    .sparkline-svg {
      width: 100%;
      height: 26px;
      overflow: visible;
    }

    /* Card Panels */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 16px;
      padding: 16px;
    }

    .panel-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 12px;
    }

    .panel-title {
      font-size: 13px;
      font-weight: 700;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .panel-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 8px;
    }

    /* Timeline Flight Recorder */
    .timeline-list {
      display: flex;
      flex-direction: column;
      gap: 12px;
      position: relative;
    }

    .timeline-item {
      display: flex;
      gap: 10px;
      align-items: flex-start;
      position: relative;
    }

    .timeline-item:not(:last-child)::after {
      content: '';
      position: absolute;
      left: 7px;
      top: 18px;
      bottom: -12px;
      width: 2px;
      background: rgba(255, 255, 255, 0.08);
    }

    .timeline-dot {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 8px;
      flex-shrink: 0;
      z-index: 2;
    }

    .dot-cyan { background: var(--cyan-dim); border: 2px solid var(--cyan); color: var(--cyan); }
    .dot-green { background: var(--green-dim); border: 2px solid var(--green); color: var(--green); }
    .dot-amber { background: var(--amber-dim); border: 2px solid var(--amber); color: var(--amber); }
    .dot-red { background: var(--red-dim); border: 2px solid var(--red); color: var(--red); }

    .timeline-body {
      flex: 1;
      background: var(--card-inner);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 8px 11px;
    }

    .timeline-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2px;
    }

    .timeline-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
    }

    .timeline-time {
      font-size: 10px;
      font-family: var(--font-mono);
      color: var(--text-muted);
    }

    .timeline-sub {
      font-size: 11px;
      color: var(--text-muted);
    }

    /* Customer Journey Card */
    .journey-card {
      background: var(--card-inner);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 12px;
      margin-bottom: 12px;
    }

    .journey-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 8px;
    }

    .journey-dev {
      font-family: var(--font-mono);
      font-size: 12px;
      font-weight: 700;
      color: var(--cyan);
    }

    .journey-meta-pills {
      display: flex;
      gap: 6px;
      align-items: center;
    }

    /* Issue Item */
    .issue-item {
      background: var(--card-inner);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-left: 3px solid var(--red);
      border-radius: 10px;
      padding: 10px 12px;
      margin-bottom: 10px;
    }

    .issue-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 4px;
    }

    .issue-title {
      font-size: 12px;
      font-weight: 700;
      color: #FCA5A5;
      font-family: var(--font-mono);
    }

    .issue-meta {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      justify-content: space-between;
      margin-top: 6px;
    }

    /* Funnel Waterfall */
    .funnel-bar-wrap {
      margin-bottom: 12px;
    }

    .funnel-meta-row {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .funnel-bar-track {
      width: 100%;
      height: 7px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
    }

    .funnel-bar-prog {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #00F0FF, #10B981);
    }

    .drop-alert-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 10px 12px;
      font-size: 11px;
      color: #FCA5A5;
      display: flex;
      gap: 8px;
      align-items: flex-start;
      margin-top: 10px;
    }

    /* PIN Modal */
    .pin-modal {
      position: fixed;
      inset: 0;
      background: rgba(9, 9, 11, 0.95);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 1000;
    }

    .pin-box {
      background: var(--card-bg);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 16px;
      padding: 28px 24px;
      width: 100%;
      max-width: 340px;
      text-align: center;
    }

    .pin-input {
      background: #09090B;
      border: 1px solid var(--card-border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 20px;
      text-align: center;
      letter-spacing: 4px;
      padding: 12px;
      border-radius: 8px;
      width: 100%;
      margin: 18px 0;
      outline: none;
    }

    .pin-input:focus {
      border-color: var(--cyan);
    }

    .pin-submit {
      background: var(--cyan);
      color: #09090B;
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 14px;
      padding: 12px;
      border: none;
      border-radius: 8px;
      width: 100%;
      cursor: pointer;
    }

    .spinner {
      display: inline-block;
      width: 12px;
      height: 12px;
      border: 2px solid rgba(0, 240, 255, 0.3);
      border-top-color: var(--cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <!-- PIN Prompt -->
  <div id="pinModal" class="pin-modal" style="display: none;">
    <div class="pin-box">
      <div style="font-size: 28px; margin-bottom: 8px;">🔐</div>
      <h3 style="font-family: var(--font-mono); font-size: 16px; letter-spacing: 1px;">FIELDS TELEMETRY</h3>
      <p style="font-size: 12px; color: var(--text-muted); margin-top: 6px;">Enter your admin PIN to view live metrics.</p>
      <input id="pinField" type="password" class="pin-input" placeholder="••••••••" autocomplete="off" autofocus />
      <button onclick="handlePinSubmit()" class="pin-submit">UNLOCK STUDIO</button>
      <div id="pinError" style="color: var(--red); font-size: 11px; font-family: var(--font-mono); margin-top: 10px; display: none;">Invalid PIN. Please try again.</div>
    </div>
  </div>

  <div class="container">
    <!-- Top Header -->
    <header>
      <div class="brand-row">
        <div class="brand-logo">F</div>
        <div>
          <div class="brand-title">FIELDS STUDIO</div>
          <div style="font-size: 10px; color: var(--text-muted); letter-spacing: 0.3px;">Mobile Telemetry & Analytics</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="live-pill">
          <div class="pulse-dot"></div>
          <span>LIVE</span>
        </div>
        <button class="refresh-btn" onclick="fetchStats()">
          <span id="spinner" class="spinner" style="display: none;"></span>
          <span>REFRESH</span>
        </button>
      </div>
    </header>

    <!-- Global Search -->
    <div class="search-bar-wrap">
      <input 
        type="text" 
        id="globalSearchInput" 
        class="search-input" 
        placeholder="Filter by Device ID or FIELD-XXXX-YYYY..." 
        oninput="handleSearchFilter(this.value)"
      />
    </div>

    <!-- Segmented Thumb Tabs -->
    <div class="tab-strip">
      <button id="chipOverview" class="tab-chip active" onclick="switchTab('overview')">📊 Overview</button>
      <button id="chipJourneys" class="tab-chip" onclick="switchTab('journeys')">🧭 User Journeys</button>
      <button id="chipErrors" class="tab-chip" onclick="switchTab('errors')">⚠️ Error Diagnostics</button>
      <button id="chipFunnel" class="tab-chip" onclick="switchTab('funnel')">🔻 Drop-offs</button>
      <button id="chipControls" class="tab-chip" onclick="switchTab('controls')">⚙️ Studio Controls</button>
    </div>

    <!-- ==================== TAB 1: OVERVIEW ==================== -->
    <div id="tabOverview">
      <!-- 2x2 Glowing KPI Grid -->
      <div class="kpi-grid">
        <!-- Active Sessions -->
        <div class="kpi-card">
          <div class="kpi-label-row">
            <span>Active Sessions</span>
            <span id="deltaSessions" class="kpi-delta pos">+5.2%</span>
          </div>
          <div id="statActiveSessions" class="kpi-val">-</div>
          <svg class="sparkline-svg" viewBox="0 0 100 26">
            <path d="M0,20 Q25,6 50,14 T100,4" fill="none" stroke="#00F0FF" stroke-width="2.5" />
            <path d="M0,20 Q25,6 50,14 T100,4 L100,26 L0,26 Z" fill="rgba(0, 240, 255, 0.12)" />
          </svg>
        </div>

        <!-- Error Rate -->
        <div class="kpi-card">
          <div class="kpi-label-row">
            <span>Error Rate</span>
            <span id="deltaError" class="kpi-delta neu">-1.1%</span>
          </div>
          <div id="statErrorRate" class="kpi-val" style="color: var(--amber);">-</div>
          <svg class="sparkline-svg" viewBox="0 0 100 26">
            <path d="M0,8 Q30,22 60,12 T100,18" fill="none" stroke="#F59E0B" stroke-width="2.5" />
            <path d="M0,8 Q30,22 60,12 T100,18 L100,26 L0,26 Z" fill="rgba(245, 158, 11, 0.12)" />
          </svg>
        </div>

        <!-- Avg Carve Latency -->
        <div class="kpi-card">
          <div class="kpi-label-row">
            <span>Avg Latency</span>
            <span id="deltaLatency" class="kpi-delta pos">+0.8%</span>
          </div>
          <div id="statLatency" class="kpi-val" style="color: var(--green);">4.8s</div>
          <svg class="sparkline-svg" viewBox="0 0 100 26">
            <path d="M0,16 Q35,5 65,14 T100,8" fill="none" stroke="#10B981" stroke-width="2.5" />
            <path d="M0,16 Q35,5 65,14 T100,8 L100,26 L0,26 Z" fill="rgba(16, 185, 129, 0.12)" />
          </svg>
        </div>

        <!-- Conversion Rate -->
        <div class="kpi-card">
          <div class="kpi-label-row">
            <span>Conversion</span>
            <span id="deltaConversion" class="kpi-delta pos">+1.5%</span>
          </div>
          <div id="statConversion" class="kpi-val" style="color: var(--cyan);">-</div>
          <svg class="sparkline-svg" viewBox="0 0 100 26">
            <path d="M0,18 Q20,15 50,7 T100,4" fill="none" stroke="#00F0FF" stroke-width="2.5" />
            <path d="M0,18 Q20,15 50,7 T100,4 L100,26 L0,26 Z" fill="rgba(0, 240, 255, 0.12)" />
          </svg>
        </div>
      </div>

      <!-- Quick Platform Summary Pills -->
      <div class="panel" style="margin-top: 10px;">
        <div class="panel-header" style="margin-bottom: 8px;">
          <div class="panel-title">📱 Store Audience Breakdown</div>
          <span id="activeModelBadgeOverview" class="panel-badge" style="background: var(--amber-dim); color: var(--amber);">Grok 2.0</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          <div style="background: var(--card-inner); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-size: 10px; color: var(--text-muted);">Android Installs</div>
            <div id="overviewAndroidTotal" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--green);">-</div>
            <div id="overviewAndroidToday" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+0 today</div>
          </div>
          <div style="background: var(--card-inner); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-size: 10px; color: var(--text-muted);">iOS Installs</div>
            <div id="overviewIosTotal" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--cyan);">-</div>
            <div id="overviewIosToday" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+0 today</div>
          </div>
          <div style="background: var(--card-inner); padding: 8px 10px; border-radius: 8px; border: 1px solid var(--card-border);">
            <div style="font-size: 10px; color: var(--text-muted);">Web Visitors</div>
            <div id="overviewWebTotal" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text);">-</div>
            <div id="overviewWebToday" style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">+0 today</div>
          </div>
        </div>
      </div>

      <!-- Live Flight Recorder Snippet -->
      <div class="panel" style="margin-top: 10px;">
        <div class="panel-header">
          <div class="panel-title">⚡ Live Flight Recorder</div>
          <span class="panel-badge" style="background: var(--cyan-dim); color: var(--cyan);">Real-time</span>
        </div>
        <div id="overviewStreamList" class="timeline-list">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">Loading user telemetry...</div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 2: USER JOURNEYS ==================== -->
    <div id="tabJourneys" style="display: none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🧭 Step-by-Step User Journeys</div>
          <span id="journeysCountBadge" class="panel-badge" style="background: var(--cyan-dim); color: var(--cyan);">0 Journeys</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
          Chronological sessions showing exact clicks, onboarding slide exits, and print completions:
        </p>

        <div id="userJourneysList">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Fetching user journeys...</div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 3: ERROR DIAGNOSTICS ==================== -->
    <div id="tabErrors" style="display: none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">⚠️ Error & Incident Center</div>
          <span id="issuesCountBadge" class="panel-badge" style="background: var(--red-dim); color: var(--red);">0 Issues</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 14px; line-height: 1.4;">
          Grouped failure reports from xAI & Gemini model calls and client error logs:
        </p>

        <div id="issuesList">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Fetching issues...</div>
        </div>

        <div class="panel-header" style="margin-top: 18px;">
          <div class="panel-title">🖨️ Recent AI Generation Logs</div>
        </div>
        <div id="recentActivityErrorsList" class="timeline-list">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">Loading generation logs...</div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 4: FUNNEL DROP-OFFS ==================== -->
    <div id="tabFunnel" style="display: none;">
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🔻 User Drop-off Waterfall</div>
          <span id="funnelPercentBadge" class="panel-badge" style="background: var(--cyan-dim); color: var(--cyan);">0% Conv.</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Step-by-step retention from app launch to completed linocut print:
        </p>

        <div id="funnelWaterfallContainer">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Computing funnel...</div>
        </div>

        <div id="funnelBottleneckAlert" class="drop-alert-box" style="display: none;">
          <span style="font-size: 16px;">⚠️</span>
          <div>
            <div id="bottleneckTitle" style="font-weight: 700; text-transform: uppercase;">Primary Bottleneck</div>
            <div id="bottleneckAdvice" style="color: var(--text); margin-top: 2px;">Analyzing user drop-off...</div>
          </div>
        </div>
      </div>
    </div>

    <!-- ==================== TAB 5: STUDIO CONTROLS ==================== -->
    <div id="tabControls" style="display: none;">
      <!-- Active Model Selection -->
      <div class="panel" style="margin-bottom: 12px;">
        <div class="panel-header">
          <div class="panel-title">🤖 Active AI Printmaker Engine</div>
          <span id="activeModelControlsBadge" class="panel-badge" style="background: var(--amber-dim); color: var(--amber);">Loading...</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Controls the model used to carve field notes store-wide.
        </p>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <label style="display: flex; align-items: center; gap: 10px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
            <input type="radio" name="aiModel" value="grok-imagine-image-2.0" id="modelGrok2" style="accent-color: var(--cyan);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text);">xAI Grok Imagine 2.0 (Recommended)</div>
              <div style="font-size: 11px; color: var(--text-muted);">Standard 2K linocut print carving (~5-6¢)</div>
            </div>
          </label>

          <label style="display: flex; align-items: center; gap: 10px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
            <input type="radio" name="aiModel" value="grok-imagine-image-quality" id="modelGrokUltra" style="accent-color: var(--cyan);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text);">xAI Grok Imagine Ultra HD</div>
              <div style="font-size: 11px; color: var(--text-muted);">Maximum linocut detail and texture (~7-8¢)</div>
            </div>
          </label>

          <label style="display: flex; align-items: center; gap: 10px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
            <input type="radio" name="aiModel" value="gemini-2.5-flash-image" id="modelGemini" style="accent-color: var(--cyan);">
            <div>
              <div style="font-size: 12px; font-weight: 600; color: var(--text);">Google Gemini 2.5 Flash</div>
              <div style="font-size: 11px; color: var(--text-muted);">Google fast image tier (~3¢)</div>
            </div>
          </label>
        </div>

        <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
          <button onclick="handleSaveModel()" id="saveModelBtn" style="background: var(--cyan); color: #09090B; border: none; border-radius: 6px; font-family: var(--font-mono); font-weight: 700; font-size: 12px; padding: 8px 16px; cursor: pointer;">
            APPLY ACTIVE MODEL
          </button>
          <span id="modelSaveNotice" style="font-size: 11px; color: var(--green); font-family: var(--font-mono); display: none;">✓ Saved & Active!</span>
        </div>
      </div>

      <!-- Developer Test Credits Control -->
      <div class="panel">
        <div class="panel-header">
          <div class="panel-title">🎟️ Grant Test Credits</div>
          <span class="panel-badge" style="background: var(--green-dim); color: var(--green);">Dev Access</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
          Add test credits to any device by entering an <b>Account Key</b> (e.g. FIELD-XXXX-YYYY) or Device ID:
        </p>

        <div style="display: flex; gap: 8px; margin-bottom: 10px;">
          <input 
            type="text" 
            id="grantTargetInput" 
            placeholder="FIELD-XXXX-YYYY" 
            style="flex: 2; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;"
          />
          <input 
            type="number" 
            id="grantAmountInput" 
            value="20" 
            min="1" 
            max="100" 
            style="flex: 1; max-width: 65px; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 12px;"
          />
          <button 
            onclick="handleGrantCredits()" 
            id="grantCreditsBtn" 
            style="background: var(--green); color: #09090B; border: none; border-radius: 6px; font-family: var(--font-mono); font-weight: 700; font-size: 12px; padding: 8px 14px; cursor: pointer;"
          >
            GRANT
          </button>
        </div>
        <div id="grantResultNotice" style="font-size: 11px; font-family: var(--font-mono); display: none;"></div>
      </div>
    </div>
  </div>

  <script>
    const PIN_KEY = 'fields_admin_pin';

    function getStoredPin() {
      return localStorage.getItem(PIN_KEY) || '';
    }

    function timeAgo(dateString) {
      if (!dateString) return '';
      const now = new Date();
      const past = new Date(dateString);
      const diffSec = Math.floor((now - past) / 1000);
      if (diffSec < 60) return 'just now';
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return diffMin + 'm ago';
      const diffHr = Math.floor(diffMin / 60);
      if (diffHr < 24) return diffHr + 'h ago';
      const diffDays = Math.floor(diffHr / 24);
      return diffDays + 'd ago';
    }

    let cachedStats = null;
    let currentTab = 'overview';
    let searchQuery = '';

    function switchTab(tabName) {
      currentTab = tabName;
      const tabs = ['overview', 'journeys', 'errors', 'funnel', 'controls'];
      tabs.forEach(t => {
        const el = document.getElementById('tab' + t.charAt(0).toUpperCase() + t.slice(1));
        const chip = document.getElementById('chip' + t.charAt(0).toUpperCase() + t.slice(1));
        if (el) el.style.display = t === tabName ? 'block' : 'none';
        if (chip) {
          if (t === tabName) chip.classList.add('active');
          else chip.classList.remove('active');
        }
      });
    }

    function handleSearchFilter(query) {
      searchQuery = (query || '').toLowerCase().trim();
      if (cachedStats) {
        renderUserJourneys(cachedStats.userJourneys || []);
      }
    }

    async function fetchStats() {
      const pin = getStoredPin();
      if (!pin) {
        document.getElementById('pinModal').style.display = 'flex';
        return;
      }

      const spinner = document.getElementById('spinner');
      if (spinner) spinner.style.display = 'inline-block';

      try {
        const res = await fetch('/v1/admin/stats', {
          headers: {
            'Authorization': 'Bearer ' + pin,
          }
        });

        if (res.status === 401 || res.status === 403) {
          localStorage.removeItem(PIN_KEY);
          document.getElementById('pinModal').style.display = 'flex';
          document.getElementById('pinError').style.display = 'block';
          return;
        }

        const data = await res.json();
        cachedStats = data;
        renderAll(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        if (spinner) spinner.style.display = 'none';
      }
    }

    function renderAll(data) {
      renderOverviewKPIs(data);
      renderOverviewStream(data.recentEvents || []);
      renderUserJourneys(data.userJourneys || []);
      renderIssues(data.issues || []);
      renderActivityLogs(data.recentActivity || []);
      renderFunnelWaterfall(data.funnel);
      updateModelBadges(data.activeModel);
    }

    function renderOverviewKPIs(data) {
      const m = data.metrics || { activeSessions: 0, errorRatePct: 0, avgLatencySec: 4.8, funnelConversionPct: 0 };
      document.getElementById('statActiveSessions').textContent = m.activeSessions || data.engagement?.dau || 0;
      document.getElementById('statErrorRate').textContent = (m.errorRatePct || 0) + '%';
      document.getElementById('statLatency').textContent = (m.avgLatencySec || 4.8) + 's';
      document.getElementById('statConversion').textContent = (m.funnelConversionPct || 0) + '%';

      // Store Audience Breakdown
      const android = data.android || { total: 0, last24h: 0 };
      const ios = data.ios || { total: 0, last24h: 0 };
      const web = data.web || { total: 0, last24h: 0 };

      document.getElementById('overviewAndroidTotal').textContent = android.total;
      document.getElementById('overviewAndroidToday').textContent = '+' + android.last24h + ' today';
      document.getElementById('overviewIosTotal').textContent = ios.total;
      document.getElementById('overviewIosToday').textContent = '+' + ios.last24h + ' today';
      document.getElementById('overviewWebTotal').textContent = web.total;
      document.getElementById('overviewWebToday').textContent = '+' + web.last24h + ' today';
    }

    function renderOverviewStream(events) {
      const listEl = document.getElementById('overviewStreamList');
      if (!listEl) return;

      if (!events || events.length === 0) {
        listEl.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">No telemetry events recorded yet.</div>';
        return;
      }

      const topEvents = events.slice(0, 6);
      listEl.innerHTML = topEvents.map(e => {
        let dotClass = 'dot-cyan';
        let icon = '▶';
        let title = e.eventName.replace(/_/g, ' ');
        const devSnippet = e.deviceId ? e.deviceId.slice(-6) : (e.installationId ? e.installationId.slice(0, 6) : 'anon');

        if (e.eventName === 'pressing_success') {
          dotClass = 'dot-green';
          icon = '✓';
          title = 'Note Pressed & Saved';
        } else if (e.eventName === 'pressing_failed') {
          dotClass = 'dot-red';
          icon = '⚠️';
          title = 'Pressing Interrupted';
        } else if (e.eventName === 'photo_selected' || e.eventName === 'demo_photo_used') {
          dotClass = 'dot-amber';
          icon = '📷';
          title = 'Photo Selected';
        } else if (e.eventName === 'photo_picker_cancelled') {
          dotClass = 'dot-red';
          icon = '↩️';
          title = 'Cancelled Photo Picker';
        }

        return \`
          <div class="timeline-item">
            <div class="timeline-dot \${dotClass}">\${icon}</div>
            <div class="timeline-body">
              <div class="timeline-head">
                <span class="timeline-title">\${title}</span>
                <span class="timeline-time">\${timeAgo(e.createdAt)}</span>
              </div>
              <div class="timeline-sub">\${e.platform} · id:...\${devSnippet}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderUserJourneys(journeys) {
      const container = document.getElementById('userJourneysList');
      const badge = document.getElementById('journeysCountBadge');
      if (!container) return;

      let filtered = journeys || [];
      if (searchQuery) {
        filtered = filtered.filter(j => 
          j.deviceId.toLowerCase().includes(searchQuery) || 
          j.platform.toLowerCase().includes(searchQuery) ||
          (j.abandonedScreen && j.abandonedScreen.toLowerCase().includes(searchQuery))
        );
      }

      if (badge) badge.textContent = filtered.length + ' Journeys';

      if (filtered.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">No user journeys match your filter.</div>';
        return;
      }

      container.innerHTML = filtered.map(j => {
        const devShort = j.deviceId.length > 14 ? '...' + j.deviceId.slice(-10) : j.deviceId;
        const outcomeBadge = j.completedStamp 
          ? '<span style="font-size: 10px; font-weight: 700; color: var(--green); background: var(--green-dim); padding: 2px 7px; border-radius: 6px;">🏆 Stamped ' + (j.notesCreated || 1) + '</span>'
          : (j.abandonedScreen 
              ? '<span style="font-size: 10px; font-weight: 700; color: var(--red); background: var(--red-dim); padding: 2px 7px; border-radius: 6px;">Exited: ' + j.abandonedScreen + '</span>'
              : '<span style="font-size: 10px; font-weight: 700; color: var(--amber); background: var(--amber-dim); padding: 2px 7px; border-radius: 6px;">Browsed</span>');

        const eventsHtml = (j.events || []).map((ev, idx) => {
          const dotClass = 'dot-' + (ev.status || 'cyan');
          const timeFormatted = ev.time ? new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
          return \`
            <div class="timeline-item">
              <div class="timeline-dot \${dotClass}">\${idx + 1}</div>
              <div class="timeline-body">
                <div class="timeline-head">
                  <span class="timeline-title">\${ev.label}</span>
                  <span class="timeline-time">\${timeFormatted}</span>
                </div>
                <div class="timeline-sub">\${ev.detail || ''}</div>
              </div>
            </div>
          \`;
        }).join('');

        return \`
          <div class="journey-card">
            <div class="journey-header">
              <div>
                <span class="journey-dev">\${devShort}</span>
                <span style="font-size: 10px; color: var(--text-muted); margin-left: 6px;">\${j.platform} · \${timeAgo(j.lastSeen)}</span>
              </div>
              <div class="journey-meta-pills">\${outcomeBadge}</div>
            </div>
            <div class="timeline-list" style="margin-top: 8px;">
              \${eventsHtml}
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderIssues(issues) {
      const container = document.getElementById('issuesList');
      const badge = document.getElementById('issuesCountBadge');
      if (!container) return;

      if (badge) badge.textContent = (issues.length) + ' Issues';

      if (!issues || issues.length === 0) {
        container.innerHTML = \`
          <div style="background: var(--green-dim); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 10px; padding: 14px; text-align: center;">
            <div style="font-size: 20px; margin-bottom: 4px;">✓</div>
            <div style="font-size: 12px; font-weight: 700; color: var(--green);">All Systems Running Smoothly</div>
            <div style="font-size: 11px; color: var(--text-muted); margin-top: 2px;">Zero model carving errors recorded in this period.</div>
          </div>
        \`;
        return;
      }

      container.innerHTML = issues.map(iss => {
        const catBadge = iss.category === 'moderation'
          ? '<span style="font-size: 10px; font-weight: 700; color: var(--red); background: var(--red-dim); padding: 1px 6px; border-radius: 4px;">SAFETY GUARD</span>'
          : (iss.category === 'format'
              ? '<span style="font-size: 10px; font-weight: 700; color: var(--amber); background: var(--amber-dim); padding: 1px 6px; border-radius: 4px;">FORMAT ERROR</span>'
              : '<span style="font-size: 10px; font-weight: 700; color: var(--cyan); background: var(--cyan-dim); padding: 1px 6px; border-radius: 4px;">TIMEOUT</span>');

        return \`
          <div class="issue-item">
            <div class="issue-head">
              <span class="issue-title">\${iss.code}</span>
              \${catBadge}
            </div>
            <div style="font-size: 11px; color: var(--text); line-height: 1.3;">\${iss.description}</div>
            <div class="issue-meta">
              <span>\${iss.affectedDevices} affected device\${iss.affectedDevices === 1 ? '' : 's'} (\${iss.count} hits)</span>
              <span>\${timeAgo(iss.lastSeen)}</span>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderActivityLogs(activity) {
      const container = document.getElementById('recentActivityErrorsList');
      if (!container) return;

      if (!activity || activity.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">No generation activity logged yet.</div>';
        return;
      }

      container.innerHTML = activity.slice(0, 10).map(item => {
        const isSuccess = item.status === 'success';
        const dotClass = isSuccess ? 'dot-green' : 'dot-red';
        const icon = isSuccess ? '✓' : '✗';
        const title = (item.place || 'Unknown Destination') + ' · No. ' + (item.number || '01');

        return \`
          <div class="timeline-item">
            <div class="timeline-dot \${dotClass}">\${icon}</div>
            <div class="timeline-body">
              <div class="timeline-head">
                <span class="timeline-title">\${title}</span>
                <span class="timeline-time">\${timeAgo(item.createdAt)}</span>
              </div>
              <div class="timeline-sub">\${isSuccess ? 'Successfully Stamped' : ('Failed: ' + (item.costInfo || 'Error'))}</div>
            </div>
          </div>
        \`;
      }).join('');
    }

    function renderFunnelWaterfall(funnel) {
      if (!funnel) return;
      const baseOpens = funnel.appOpens || 1;

      const steps = [
        { label: '1. App Opened', count: funnel.appOpens || 0 },
        { label: '2. Tapped "New Note"', count: funnel.composeOpened || 0 },
        { label: '3. Photo Selected', count: funnel.photoSelected || 0 },
        { label: '4. Tapped "Press"', count: funnel.pressClicked || 0 },
        { label: '5. Carving Started', count: funnel.pressingStarted || 0 },
        { label: '6. Stamp Created & Saved', count: funnel.generatedSuccess || 0 },
      ];

      const container = document.getElementById('funnelWaterfallContainer');
      const badge = document.getElementById('funnelPercentBadge');
      if (badge) badge.textContent = (funnel.conversionRate || 0) + '% Conv.';

      if (container) {
        container.innerHTML = steps.map((step, idx) => {
          const pctOfTotal = baseOpens > 0 ? Math.min(100, Math.round((step.count / baseOpens) * 100)) : 0;
          const prevCount = idx > 0 ? steps[idx - 1].count : baseOpens;
          const stepDrop = prevCount > 0 && idx > 0 ? Math.max(0, Math.round(((prevCount - step.count) / prevCount) * 100)) : 0;
          const dropLabel = idx > 0 && stepDrop > 0 ? \`<span style="color: var(--red); font-size: 10px; font-family: var(--font-mono); margin-left: 6px;">(-\${stepDrop}% drop)</span>\` : '';

          return \`
            <div class="funnel-bar-wrap">
              <div class="funnel-meta-row">
                <span>\${step.label}</span>
                <span>\${step.count} (\${pctOfTotal}%)\${dropLabel}</span>
              </div>
              <div class="funnel-bar-track">
                <div class="funnel-bar-prog" style="width: \${pctOfTotal}%;"></div>
              </div>
            </div>
          \`;
        }).join('');
      }

      const alertBox = document.getElementById('funnelBottleneckAlert');
      if (alertBox) {
        if (funnel.biggestDropoff && funnel.biggestDropoff !== 'None' && funnel.biggestDropoffPct > 0) {
          alertBox.style.display = 'flex';
          const titleEl = document.getElementById('bottleneckTitle');
          const adviceEl = document.getElementById('bottleneckAdvice');
          if (titleEl) titleEl.textContent = 'Primary Bottleneck: ' + funnel.biggestDropoff + ' (-' + funnel.biggestDropoffPct + '%)';
          if (adviceEl) adviceEl.textContent = getBottleneckAdviceText(funnel.biggestDropoff);
        } else {
          alertBox.style.display = 'none';
        }
      }
    }

    function getBottleneckAdviceText(stepName) {
      if (!stepName) return 'Audience is progressing smoothly through the creation flow.';
      if (stepName.includes('New Note')) {
        return 'Users launch the app but do not tap "New Note". Consider adding an empty library welcome prompt or card.';
      }
      if (stepName.includes('Selected Photo')) {
        return 'Users open the compose screen but do not select a photo. Verify photo picker permissions and options are clear.';
      }
      if (stepName.includes('Clicked "Press"')) {
        return 'Users select a photo but leave without pressing. Check if metadata fields or keywords are confusing.';
      }
      if (stepName.includes('Started Processing')) {
        return 'Users click Press but do not reach processing. They might be declining the AI safety consent modal or bouncing on paywall.';
      }
      if (stepName.includes('Successfully Created')) {
        return 'Generations are failing during AI plate carving. Check backend model timeouts and content safety flags.';
      }
      return 'Audience is progressing smoothly through the creation flow.';
    }

    function updateModelBadges(modelId) {
      const overviewBadge = document.getElementById('activeModelBadgeOverview');
      const controlsBadge = document.getElementById('activeModelControlsBadge');
      let name = 'Grok Imagine 2.0';
      if (modelId === 'grok-imagine-image-quality') name = 'Grok Ultra HD';
      else if (modelId && modelId.startsWith('gemini')) name = 'Gemini 2.5 Flash';

      if (overviewBadge) overviewBadge.textContent = name;
      if (controlsBadge) controlsBadge.textContent = name;

      const radio = document.querySelector('input[name="aiModel"][value="' + modelId + '"]');
      if (radio) radio.checked = true;
    }

    async function handleSaveModel() {
      const pin = getStoredPin();
      const selected = document.querySelector('input[name="aiModel"]:checked')?.value;
      if (!selected || !pin) return;

      const btn = document.getElementById('saveModelBtn');
      btn.textContent = 'SAVING...';

      try {
        const res = await fetch('/v1/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + pin,
          },
          body: JSON.stringify({ key: 'active_model', value: selected }),
        });

        if (res.ok) {
          const notice = document.getElementById('modelSaveNotice');
          notice.style.display = 'inline';
          setTimeout(() => { notice.style.display = 'none'; }, 3000);
          updateModelBadges(selected);
        } else {
          alert('Failed to update active model. Please check PIN.');
        }
      } catch (e) {
        alert('Error saving model: ' + e.message);
      } finally {
        btn.textContent = 'APPLY ACTIVE MODEL';
      }
    }

    async function handleGrantCredits() {
      const pin = getStoredPin();
      const target = document.getElementById('grantTargetInput').value.trim();
      const amount = parseInt(document.getElementById('grantAmountInput').value, 10) || 20;
      const notice = document.getElementById('grantResultNotice');
      const btn = document.getElementById('grantCreditsBtn');

      if (!target) {
        alert('Please enter your Account Key or Device ID.');
        return;
      }

      btn.disabled = true;
      btn.textContent = '...';

      try {
        const res = await fetch('/v1/admin/credits', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + pin,
          },
          body: JSON.stringify({ target, amount }),
        });

        const data = await res.json();
        if (res.ok && data.success) {
          notice.style.display = 'block';
          notice.style.color = 'var(--green)';
          notice.textContent = '✓ Added ' + amount + ' credits to ' + (data.accountKey || target) + '! New balance: ' + data.credits + '.';
          fetchStats();
        } else {
          notice.style.display = 'block';
          notice.style.color = 'var(--red)';
          notice.textContent = '✗ ' + (data.message || 'Failed to grant credits.');
        }
      } catch (err) {
        notice.style.display = 'block';
        notice.style.color = 'var(--red)';
        notice.textContent = '✗ Error: ' + err.message;
      } finally {
        btn.disabled = false;
        btn.textContent = 'GRANT';
      }
    }

    function handlePinSubmit() {
      const pin = document.getElementById('pinField').value.trim();
      if (!pin) return;
      localStorage.setItem(PIN_KEY, pin);
      document.getElementById('pinModal').style.display = 'none';
      document.getElementById('pinError').style.display = 'none';
      fetchStats();
    }

    document.getElementById('pinField')?.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handlePinSubmit();
    });

    window.addEventListener('DOMContentLoaded', () => {
      fetchStats();
      setInterval(fetchStats, 30000);
    });
  </script>
</body>
</html>`;
}
