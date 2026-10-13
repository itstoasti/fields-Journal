export function renderAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>FIELDS Studio · Mobile Telemetry</title>
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#09090B">
  <style>
    :root {
      --bg: #09090B;
      --card-bg: #121216;
      --card-inner: #16161C;
      --card-border: rgba(255, 255, 255, 0.08);
      --card-hover: rgba(255, 255, 255, 0.12);
      --cyan: #00F0FF;
      --cyan-dim: rgba(0, 240, 255, 0.12);
      --green: #10B981;
      --green-dim: rgba(16, 185, 129, 0.15);
      --amber: #F59E0B;
      --amber-dim: rgba(245, 158, 11, 0.15);
      --red: #EF4444;
      --red-dim: rgba(239, 68, 68, 0.15);
      --purple: #A855F7;
      --purple-dim: rgba(168, 85, 247, 0.15);
      --text: #F4F4F5;
      --text-muted: #71717A;
      --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
      --font-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: env(safe-area-inset-top, 16px) 14px env(safe-area-inset-bottom, 24px);
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 520px;
      margin: 0 auto;
      display: flex;
      flex-direction: column;
      gap: 14px;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 6px 0 10px;
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
      box-shadow: 0 0 16px rgba(0, 240, 255, 0.3);
    }

    .brand-title {
      font-size: 15px;
      font-weight: 700;
      letter-spacing: 0.5px;
      color: var(--text);
    }

    .brand-sub {
      font-size: 10px;
      color: var(--text-muted);
      letter-spacing: 0.3px;
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
      padding: 4px 9px;
      border-radius: 14px;
      background: var(--green-dim);
      border: 1px solid rgba(16, 185, 129, 0.3);
      color: var(--green);
      font-size: 10px;
      font-weight: 700;
      letter-spacing: 0.4px;
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
      color: var(--text);
      font-size: 11px;
      font-weight: 600;
      padding: 6px 10px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 5px;
      transition: all 0.2s;
    }

    .refresh-btn:active {
      transform: scale(0.96);
      background: var(--card-inner);
    }

    /* Search Filter Input */
    .search-box {
      width: 100%;
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 9px 12px 9px 34px;
      font-size: 12px;
      color: var(--text);
      outline: none;
      position: relative;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2371717A'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: 10px center;
      background-size: 15px;
      transition: all 0.2s;
    }

    .search-box:focus {
      border-color: var(--cyan);
      box-shadow: 0 0 14px rgba(0, 240, 255, 0.2);
    }

    /* Platform Switcher Chips */
    .tab-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .tab-strip::-webkit-scrollbar { display: none; }

    .tab-chip {
      flex: 1;
      min-width: 70px;
      padding: 8px 10px;
      border-radius: 10px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      white-space: nowrap;
    }

    .tab-chip.active {
      background: var(--cyan-dim);
      color: var(--cyan);
      border-color: rgba(0, 240, 255, 0.4);
      box-shadow: 0 0 12px rgba(0, 240, 255, 0.15);
    }

    /* KPI Grid 2x2 */
    .kpi-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px;
    }

    .kpi-card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 12px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      position: relative;
      overflow: hidden;
    }

    .kpi-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 6px;
    }

    .kpi-title {
      font-size: 11px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: var(--text-muted);
    }

    .kpi-badge {
      font-size: 10px;
      font-weight: 700;
      padding: 2px 6px;
      border-radius: 6px;
    }

    .badge-green { background: var(--green-dim); color: var(--green); border: 1px solid rgba(16, 185, 129, 0.3); }
    .badge-cyan { background: var(--cyan-dim); color: var(--cyan); border: 1px solid rgba(0, 240, 255, 0.3); }
    .badge-amber { background: var(--amber-dim); color: var(--amber); border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-red { background: var(--red-dim); color: var(--red); border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-muted { background: rgba(255, 255, 255, 0.05); color: var(--text-muted); border: 1px solid var(--card-border); }

    .kpi-value {
      font-size: 24px;
      font-weight: 800;
      color: var(--text);
      line-height: 1.1;
      margin-bottom: 6px;
      font-family: var(--font-mono);
    }

    .kpi-meta {
      font-size: 11px;
      color: var(--text-muted);
      display: flex;
      gap: 6px;
      flex-wrap: wrap;
      align-items: center;
    }

    /* Sparkline SVG */
    .sparkline {
      width: 100%;
      height: 24px;
      margin-top: 4px;
    }

    /* Panels */
    .panel {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 14px;
      padding: 14px;
    }

    .panel-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 10px;
    }

    .panel-title {
      font-size: 12px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: var(--text);
      display: flex;
      align-items: center;
      gap: 6px;
    }

    /* Top Travel Destinations */
    .dest-chips {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }

    .dest-chip {
      background: var(--card-inner);
      border: 1px solid var(--card-border);
      padding: 5px 10px;
      border-radius: 20px;
      font-size: 11px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dest-rank {
      font-family: var(--font-mono);
      font-size: 10px;
      font-weight: 700;
      color: var(--cyan);
    }

    .dest-name {
      color: var(--text);
      font-weight: 500;
    }

    .dest-count {
      color: var(--green);
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 10px;
      background: var(--green-dim);
      padding: 1px 5px;
      border-radius: 8px;
    }

    /* Funnel Waterfall */
    .funnel-step {
      display: flex;
      flex-direction: column;
      margin-bottom: 10px;
    }

    .funnel-step:last-child { margin-bottom: 0; }

    .funnel-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 11px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .funnel-label {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
    }

    .funnel-count {
      font-family: var(--font-mono);
      color: var(--cyan);
    }

    .funnel-bar-bg {
      width: 100%;
      height: 6px;
      background: rgba(255, 255, 255, 0.05);
      border-radius: 3px;
      overflow: hidden;
    }

    .funnel-bar-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, #00F0FF, #10B981);
      transition: width 0.5s ease;
    }

    .bottleneck-box {
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 10px 12px;
      margin-top: 12px;
      display: flex;
      align-items: flex-start;
      gap: 8px;
    }

    .bottleneck-title {
      font-size: 11px;
      font-weight: 700;
      color: var(--red);
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .bottleneck-text {
      font-size: 11px;
      color: var(--text);
      line-height: 1.4;
    }

    /* Stream Feed Switcher */
    .stream-strip {
      display: flex;
      gap: 6px;
      overflow-x: auto;
      scrollbar-width: none;
    }

    .stream-strip::-webkit-scrollbar { display: none; }

    .stream-btn {
      flex: 1;
      padding: 7px 10px;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      color: var(--text-muted);
      background: var(--card-inner);
      border: 1px solid var(--card-border);
      cursor: pointer;
      white-space: nowrap;
      text-align: center;
      transition: all 0.2s;
    }

    .stream-btn.active {
      background: var(--cyan-dim);
      color: var(--cyan);
      border-color: rgba(0, 240, 255, 0.4);
      box-shadow: 0 0 10px rgba(0, 240, 255, 0.15);
    }

    /* Activity Stream Cards */
    .stream-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }

    .stream-card {
      background: var(--card-inner);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 10px 12px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      transition: all 0.2s;
    }

    .stream-left {
      display: flex;
      align-items: center;
      gap: 10px;
      overflow: hidden;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .status-dot.success { background: var(--green); box-shadow: 0 0 8px var(--green); }
    .status-dot.failed { background: var(--red); box-shadow: 0 0 8px var(--red); }

    .stream-title {
      font-size: 12px;
      font-weight: 600;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 250px;
    }

    .stream-sub {
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .stream-time {
      font-family: var(--font-mono);
      font-size: 10px;
      color: var(--text-muted);
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* Modal */
    .pin-modal {
      position: fixed;
      inset: 0;
      background: rgba(5, 5, 7, 0.94);
      backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 1000;
    }

    .pin-box {
      background: var(--card-bg);
      border: 1px solid rgba(0, 240, 255, 0.3);
      border-radius: 18px;
      padding: 24px;
      width: 100%;
      max-width: 320px;
      text-align: center;
      box-shadow: 0 0 30px rgba(0, 240, 255, 0.1);
    }

    .pin-input {
      background: var(--card-inner);
      border: 1px solid var(--card-border);
      color: var(--text);
      font-family: var(--font-mono);
      font-size: 18px;
      text-align: center;
      letter-spacing: 4px;
      padding: 10px;
      border-radius: 8px;
      width: 100%;
      margin: 16px 0;
      outline: none;
    }

    .pin-input:focus {
      border-color: var(--cyan);
    }

    .pin-submit {
      background: linear-gradient(135deg, #00F0FF, #10B981);
      color: #09090B;
      font-weight: 700;
      font-size: 13px;
      padding: 11px;
      border: none;
      border-radius: 8px;
      width: 100%;
      cursor: pointer;
    }

    .spinner {
      display: inline-block;
      width: 11px;
      height: 11px;
      border: 2px solid rgba(0, 240, 255, 0.3);
      border-top-color: var(--cyan);
      border-radius: 50%;
      animation: spin 0.8s linear infinite;
    }

    @keyframes spin { to { transform: rotate(360deg); } }
  </style>
</head>
<body>
  <!-- PIN Prompt -->
  <div id="pinModal" class="pin-modal" style="display: none;">
    <div class="pin-box">
      <div style="font-size: 26px; margin-bottom: 6px;">🔐</div>
      <h3 style="font-size: 15px; font-weight: 700; letter-spacing: 0.5px;">FIELDS TELEMETRY</h3>
      <p style="font-size: 11px; color: var(--text-muted); margin-top: 4px;">Enter admin PIN to view live mobile telemetry.</p>
      <input id="pinField" type="password" class="pin-input" placeholder="••••••••" autocomplete="off" autofocus />
      <button onclick="handlePinSubmit()" class="pin-submit">UNLOCK STUDIO</button>
      <div id="pinError" style="color: var(--red); font-size: 11px; margin-top: 8px; display: none;">Invalid PIN. Try again.</div>
    </div>
  </div>

  <div class="container">
    <!-- Header -->
    <header>
      <div class="brand-row">
        <div class="brand-logo">F</div>
        <div>
          <div class="brand-title">FIELDS STUDIO</div>
          <div class="brand-sub">Mobile Cloud Telemetry</div>
        </div>
      </div>
      <div class="header-actions">
        <div class="live-pill">
          <div class="pulse-dot"></div>
          <span>LIVE</span>
        </div>
        <button class="refresh-btn" onclick="fetchStats()">
          <span id="spinner" class="spinner" style="display: none;"></span>
          <span>Refresh</span>
        </button>
      </div>
    </header>

    <!-- Search Box (Instant Live Filtering) -->
    <input 
      id="searchFilter" 
      type="text" 
      class="search-box" 
      placeholder="Search Device ID or FIELD-XXXX-YYYY..." 
      oninput="handleSearchFilter(this.value)" 
    />

    <!-- Platform Filter Tabs -->
    <div class="tab-strip">
      <button id="tabAndroid" onclick="setPlatform('android')" class="tab-chip active">🤖 Android</button>
      <button id="tabIos" onclick="setPlatform('ios')" class="tab-chip">🍏 iOS</button>
      <button id="tabAll" onclick="setPlatform('all')" class="tab-chip">📱 All Stores</button>
      <button id="tabWeb" onclick="setPlatform('web')" class="tab-chip">🌐 Web</button>
    </div>

    <!-- Core 2x2 KPI Grid -->
    <div class="kpi-grid">
      <!-- Card 1: Installs -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span id="statInstallsTitle" class="kpi-title">Play Store Installs</span>
          <span id="statPlatformBadge" class="kpi-badge badge-green">Android</span>
        </div>
        <div id="statInstallsTotal" class="kpi-value">-</div>
        <div class="kpi-meta">
          <span>Today: <strong id="statInstallsToday" style="color: var(--text);">-</strong></span>
          <span id="statInstalls3dWrapper">3d: <strong id="statInstalls3d" style="color: var(--text);">-</strong></span>
          <span>7d: <strong id="statInstalls7d" style="color: var(--text);">-</strong></span>
        </div>
        <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d="M0,20 Q20,16 40,12 T80,8 T100,4" fill="none" stroke="#00F0FF" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Card 2: Active Audience -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span id="statActiveTitle" class="kpi-title">Active Devices</span>
          <span id="statActiveBadge" class="kpi-badge badge-green">Google Play</span>
        </div>
        <div id="statActiveTotal" class="kpi-value">-</div>
        <div class="kpi-meta">
          <span id="statActiveSub">Retained audience</span>
        </div>
        <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d="M0,18 Q30,12 60,14 T100,6" fill="none" stroke="#10B981" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Card 3: Notes Pressed -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Notes Pressed</span>
          <span id="statSuccessRate" class="kpi-badge badge-green">100%</span>
        </div>
        <div id="statGensTotal" class="kpi-value">-</div>
        <div class="kpi-meta">
          <span>Today: <strong id="statGensToday" style="color: var(--text);">-</strong></span>
          <span>Success: <strong id="statSuccessSub" style="color: var(--green);">100%</strong></span>
        </div>
        <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d="M0,22 Q25,18 50,14 T100,5" fill="none" stroke="#F59E0B" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>

      <!-- Card 4: Web Visitors -->
      <div class="kpi-card">
        <div class="kpi-header">
          <span class="kpi-title">Web Visitors</span>
          <span class="kpi-badge badge-muted">Online</span>
        </div>
        <div id="statWebTotal" class="kpi-value">-</div>
        <div class="kpi-meta">
          <span>Today: <strong id="statWebToday" style="color: var(--text);">-</strong></span>
          <span>7d: <strong id="statWeb7d" style="color: var(--text);">-</strong></span>
        </div>
        <svg class="sparkline" viewBox="0 0 100 24" preserveAspectRatio="none">
          <path d="M0,16 Q35,20 70,10 T100,8" fill="none" stroke="#A855F7" stroke-width="2" stroke-linecap="round"/>
        </svg>
      </div>
    </div>

    <!-- Monetization & Quota Flow -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Monetization & Quota Flow</div>
        <span class="kpi-badge badge-cyan">Store Real-time</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
        <div style="background: var(--card-inner); padding: 10px; border-radius: 10px; border: 1px solid var(--card-border);">
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Starter Used</div>
          <div id="statFreeUsed" style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--amber); margin-top: 2px;">-</div>
        </div>
        <div style="background: var(--card-inner); padding: 10px; border-radius: 10px; border: 1px solid var(--card-border);">
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Ads Watched</div>
          <div id="statAdsWatched" style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--green); margin-top: 2px;">-</div>
        </div>
        <div style="background: var(--card-inner); padding: 10px; border-radius: 10px; border: 1px solid var(--card-border);">
          <div style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">Credit Balance</div>
          <div id="statCreditsBalance" style="font-family: var(--font-mono); font-size: 18px; font-weight: 700; color: var(--cyan); margin-top: 2px;">-</div>
        </div>
      </div>
    </div>

    <!-- Audience Engagement & Retention -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Audience Engagement & Retention</div>
        <span class="kpi-badge badge-green">Live Telemetry</span>
      </div>
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 6px;">
        <div style="background: var(--card-inner); padding: 8px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase;">DAU (24h)</div>
          <div id="statDau" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text); margin-top: 2px;">-</div>
        </div>
        <div style="background: var(--card-inner); padding: 8px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase;">WAU (7d)</div>
          <div id="statWau" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--text); margin-top: 2px;">-</div>
        </div>
        <div style="background: var(--card-inner); padding: 8px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase;">Sessions</div>
          <div id="statSessions" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--amber); margin-top: 2px;">-</div>
        </div>
        <div style="background: var(--card-inner); padding: 8px; border-radius: 8px; border: 1px solid var(--card-border); text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); text-transform: uppercase;">Funnel %</div>
          <div id="statConversion" style="font-family: var(--font-mono); font-size: 16px; font-weight: 700; color: var(--green); margin-top: 2px;">-</div>
        </div>
      </div>
    </div>

    <!-- Conversion Funnel Waterfall -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Conversion Funnel · Drop-off</div>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span id="funnelConvBadge" class="kpi-badge badge-amber">0% Conversion</span>
          <button onclick="handleResetFunnel()" id="resetFunnelBtn" title="Reset conversion funnel stats to zero for a fresh start" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: var(--red); font-size: 10px; font-weight: 700; padding: 2px 7px; border-radius: 6px; cursor: pointer;">
            Reset
          </button>
        </div>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
        Audience retention from launching the app to completing a pressed field note. <span id="funnelResetNotice" style="display: none; color: var(--cyan); font-weight: 600;">(Fresh start active)</span>
      </p>

      <div id="funnelContainer">
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">Loading funnel metrics...</div>
      </div>

      <div id="funnelBottleneck" class="bottleneck-box" style="display: none;">
        <div style="font-size: 16px; line-height: 1;">⚠️</div>
        <div>
          <div class="bottleneck-title">Primary Bottleneck: <span id="bottleneckStep">-</span> (<span id="bottleneckPct">-</span>)</div>
          <div id="bottleneckAdvice" class="bottleneck-text">-</div>
        </div>
      </div>
    </div>

    <!-- Top Travel Destinations -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Top Travel Destinations</div>
        <span style="font-size: 10px; color: var(--text-muted);">Popular locations stamped</span>
      </div>
      <div id="destinationsList" class="dest-chips">
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic;">Loading destinations...</div>
      </div>
    </div>

    <!-- Live Activity & Telemetry Feeds -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Live Studio Activity</div>
        <span id="streamCounterBadge" class="kpi-badge badge-cyan">Live</span>
      </div>

      <!-- Stream Switcher Strip -->
      <div class="stream-strip" style="margin-bottom: 12px;">
        <button id="streamTabGens" class="stream-btn active" onclick="switchStreamTab('generations')">🖨️ AI Generations</button>
        <button id="streamTabEvents" class="stream-btn" onclick="switchStreamTab('events')">⚡ Telemetry Actions</button>
        <button id="streamTabJourneys" class="stream-btn" onclick="switchStreamTab('journeys')">🧭 Traveler Journeys</button>
      </div>

      <!-- AI Generations Stream (DEFAULT FRONT PAGE) -->
      <div id="activityList" class="stream-list">
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">Fetching generations...</div>
      </div>

      <!-- Telemetry Actions Stream -->
      <div id="eventsList" class="stream-list" style="display: none;">
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">Fetching telemetry...</div>
      </div>

      <!-- Traveler Journeys Stream -->
      <div id="journeysList" class="stream-list" style="display: none;">
        <div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">Fetching user journeys...</div>
      </div>
    </div>

    <!-- AI Printmaker Model Control -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Active AI Engine</div>
        <span id="activeModelBadge" class="kpi-badge badge-amber">Loading...</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
        Select the linocut carving model used store-wide for all users.
      </p>

      <div style="display: flex; flex-direction: column; gap: 6px;">
        <label style="display: flex; align-items: center; gap: 8px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px 10px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="grok-imagine-image-2.0" id="modelGrok2" style="accent-color: var(--cyan);">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: var(--text);">xAI Grok Imagine 2.0 (Recommended)</div>
            <div style="font-size: 10px; color: var(--text-muted);">Standard 2K linocut print carving (~5-6¢)</div>
          </div>
        </label>

        <label style="display: flex; align-items: center; gap: 8px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px 10px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="grok-imagine-image-quality" id="modelGrokUltra" style="accent-color: var(--cyan);">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: var(--text);">xAI Grok Imagine Ultra HD</div>
            <div style="font-size: 10px; color: var(--text-muted);">Maximum linocut detail and texture (~7-8¢)</div>
          </div>
        </label>

        <label style="display: flex; align-items: center; gap: 8px; background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px 10px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="gemini-2.5-flash-image" id="modelGemini" style="accent-color: var(--cyan);">
          <div>
            <div style="font-size: 12px; font-weight: 600; color: var(--text);">Google Gemini 2.5 Flash</div>
            <div style="font-size: 10px; color: var(--text-muted);">Google fast image tier (~3¢)</div>
          </div>
        </label>
      </div>

      <div style="margin-top: 10px; display: flex; align-items: center; justify-content: space-between;">
        <button onclick="handleSaveModel()" id="saveModelBtn" style="background: linear-gradient(135deg, #00F0FF, #10B981); color: #09090B; border: none; border-radius: 6px; font-weight: 700; font-size: 11px; padding: 8px 14px; cursor: pointer;">
          APPLY ACTIVE MODEL
        </button>
        <span id="modelSaveNotice" style="font-size: 11px; color: var(--green); display: none;">✓ Saved & Active!</span>
      </div>
    </div>

    <!-- Developer Test Credits Control -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Grant Test Credits</div>
        <span class="kpi-badge badge-muted">Developer</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 10px;">
        Add test credits using your Account Key (Settings &rarr; Account Key) or Device ID.
      </p>

      <div style="display: flex; gap: 6px; margin-bottom: 8px;">
        <input 
          type="text" 
          id="grantTargetInput" 
          placeholder="FIELD-XXXX-YYYY" 
          style="flex: 2; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 7px 9px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px; text-transform: uppercase;"
        />
        <input 
          type="number" 
          id="grantAmountInput" 
          value="20" 
          min="1" 
          max="100" 
          style="flex: 1; max-width: 60px; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 7px 9px; border-radius: 6px; font-family: var(--font-mono); font-size: 11px;"
        />
        <button 
          onclick="handleGrantCredits()" 
          id="grantCreditsBtn" 
          style="background: var(--green); color: #09090B; border: none; border-radius: 6px; font-weight: 700; font-size: 11px; padding: 7px 12px; cursor: pointer;"
        >
          GRANT
        </button>
      </div>
      <div id="grantResultNotice" style="font-size: 10px; font-family: var(--font-mono); display: none;"></div>
    </div>

    <!-- Autonomous SEO & Blog Management Panel -->
    <div class="panel">
      <div class="panel-head">
        <div class="panel-title">Autonomous SEO &amp; Blog</div>
        <span id="statBlogBadge" class="kpi-badge badge-green">Live Engine</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
        Headless publishing endpoint for AI agents (Muse, Grokbot, OpenClaw, Hermes) with RankMath/Yoast scoring and instant IndexNow search indexing.
      </p>

      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 12px;">
        <div style="background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase;">Published</div>
          <div id="statBlogPublished" style="font-size: 16px; font-weight: 700; color: var(--cyan);">-</div>
        </div>
        <div style="background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase;">Blog Views</div>
          <div id="statBlogViews" style="font-size: 16px; font-weight: 700; color: var(--green);">-</div>
        </div>
        <div style="background: var(--card-inner); border: 1px solid var(--card-border); padding: 8px; border-radius: 6px; text-align: center;">
          <div style="font-size: 9px; color: var(--text-muted); font-family: var(--font-mono); text-transform: uppercase;">Avg SEO</div>
          <div id="statBlogSeoScore" style="font-size: 16px; font-weight: 700; color: var(--amber);">-</div>
        </div>
      </div>

      <!-- Quick Navigation -->
      <div style="display: flex; gap: 6px; margin-bottom: 12px; flex-wrap: wrap;">
        <a href="/blog" target="_blank" style="flex: 1; min-width: 100px; text-align: center; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 7px 10px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); text-decoration: none;">
          📖 View Blog
        </a>
        <a href="/sitemap.xml" target="_blank" style="flex: 1; min-width: 100px; text-align: center; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 7px 10px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); text-decoration: none;">
          🗺️ sitemap.xml
        </a>
        <a href="/llms.txt" target="_blank" style="flex: 1; min-width: 100px; text-align: center; background: var(--card-inner); border: 1px solid var(--card-border); color: var(--text); padding: 7px 10px; border-radius: 6px; font-size: 11px; font-family: var(--font-mono); text-decoration: none;">
          🤖 llms.txt
        </a>
      </div>

      <!-- Agent Setup Box -->
      <div style="background: var(--card-inner); border: 1px solid var(--card-border); border-radius: 6px; padding: 10px; font-size: 11px;">
        <div style="font-weight: 600; color: var(--cyan); margin-bottom: 4px; font-family: var(--font-mono);">🤖 Autonomous Agent Publish Endpoint</div>
        <div style="color: var(--text-muted); font-size: 10px; margin-bottom: 6px;">Give this endpoint to Muse / OpenClaw / Hermes:</div>
        <code style="display: block; background: #09090B; padding: 7px; border-radius: 4px; color: #10B981; font-family: var(--font-mono); font-size: 10px; word-break: break-all; margin-bottom: 6px;">
          https://travel-scrapbook.com/v1/blog/publish
        </code>
        <div style="color: var(--text-muted); font-size: 10px;">Header: <code style="color: var(--text);">Authorization: Bearer &lt;AGENT_API_KEY&gt;</code></div>
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
        renderStats(data);
      } catch (err) {
        console.error('Failed to fetch stats:', err);
      } finally {
        if (spinner) spinner.style.display = 'none';
      }
    }

    let currentPlatform = 'android';
    let cachedStats = null;
    let searchQuery = '';

    function handleSearchFilter(val) {
      searchQuery = (val || '').toLowerCase().trim();
      if (cachedStats) {
        renderFilteredStreams();
      }
    }

    function setPlatform(platform) {
      currentPlatform = platform;
      ['android', 'ios', 'all', 'web'].forEach(p => {
        const btn = document.getElementById('tab' + (p.charAt(0).toUpperCase() + p.slice(1)));
        if (btn) btn.className = 'tab-chip' + (p === platform ? ' active' : '');
      });
      if (cachedStats) {
        updatePlatformCards(cachedStats);
      }
    }

    function updatePlatformCards(data) {
      const android = data.android || { total: 0, last24h: 0, last3d: 0, last7d: 0, activeDevices: 0 };
      const ios = data.ios || { total: 0, last24h: 0, last3d: 0, last7d: 0, activeDevices: 0 };
      const web = data.web || { total: 0, last24h: 0, last7d: 0 };

      const titleEl = document.getElementById('statInstallsTitle');
      const badgeEl = document.getElementById('statPlatformBadge');
      const totalEl = document.getElementById('statInstallsTotal');
      const todayEl = document.getElementById('statInstallsToday');
      const threeDEl = document.getElementById('statInstalls3d');
      const threeDWrapper = document.getElementById('statInstalls3dWrapper');
      const sevenDEl = document.getElementById('statInstalls7d');

      const activeTitleEl = document.getElementById('statActiveTitle');
      const activeBadgeEl = document.getElementById('statActiveBadge');
      const activeTotalEl = document.getElementById('statActiveTotal');
      const activeSubEl = document.getElementById('statActiveSub');

      if (currentPlatform === 'android') {
        titleEl.textContent = 'Play Store Installs';
        badgeEl.textContent = 'Android';
        badgeEl.className = 'kpi-badge badge-green';
        totalEl.textContent = android.total;
        todayEl.textContent = '+' + android.last24h;
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + android.last3d;
        sevenDEl.textContent = '+' + android.last7d;

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'Google Play';
        activeBadgeEl.className = 'kpi-badge badge-green';
        activeTotalEl.textContent = android.activeDevices;
        activeSubEl.textContent = 'Retained audience';
      } else if (currentPlatform === 'ios') {
        titleEl.textContent = 'App Store Installs';
        badgeEl.textContent = 'Apple iOS';
        badgeEl.className = 'kpi-badge badge-amber';
        totalEl.textContent = ios.total;
        todayEl.textContent = '+' + ios.last24h;
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + ios.last3d;
        sevenDEl.textContent = '+' + ios.last7d;

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'App Store';
        activeBadgeEl.className = 'kpi-badge badge-amber';
        activeTotalEl.textContent = ios.activeDevices;
        activeSubEl.textContent = ios.total === 0 ? 'Ready for launch' : 'Retained audience';
      } else if (currentPlatform === 'all') {
        titleEl.textContent = 'Total Store Installs';
        badgeEl.textContent = 'Android + iOS';
        badgeEl.className = 'kpi-badge badge-green';
        totalEl.textContent = android.total + ios.total;
        todayEl.textContent = '+' + (android.last24h + ios.last24h);
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + (android.last3d + ios.last3d);
        sevenDEl.textContent = '+' + (android.last7d + ios.last7d);

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'Combined';
        activeBadgeEl.className = 'kpi-badge badge-green';
        activeTotalEl.textContent = android.activeDevices + ios.activeDevices;
        activeSubEl.textContent = 'Combined audience';
      } else if (currentPlatform === 'web') {
        titleEl.textContent = 'Web Visitors';
        badgeEl.textContent = 'Web';
        badgeEl.className = 'kpi-badge badge-muted';
        totalEl.textContent = web.total;
        todayEl.textContent = '+' + web.last24h;
        threeDWrapper.style.display = 'none';
        sevenDEl.textContent = '+' + web.last7d;

        activeTitleEl.textContent = 'Web Sessions';
        activeBadgeEl.textContent = 'Online';
        activeBadgeEl.className = 'kpi-badge badge-muted';
        activeTotalEl.textContent = web.total;
        activeSubEl.textContent = 'Browser visitors';
      }
    }

    let currentStreamTab = 'generations';

    function switchStreamTab(tab) {
      currentStreamTab = tab;
      const tabs = ['generations', 'events', 'journeys'];
      const tabBtns = {
        generations: document.getElementById('streamTabGens'),
        events: document.getElementById('streamTabEvents'),
        journeys: document.getElementById('streamTabJourneys'),
      };
      const listContainers = {
        generations: document.getElementById('activityList'),
        events: document.getElementById('eventsList'),
        journeys: document.getElementById('journeysList'),
      };

      tabs.forEach(t => {
        if (tabBtns[t]) tabBtns[t].className = 'stream-btn' + (t === tab ? ' active' : '');
        if (listContainers[t]) listContainers[t].style.display = (t === tab ? 'flex' : 'none');
      });
    }

    function getBottleneckAdvice(stepName) {
      if (!stepName) return 'Audience is progressing smoothly through the creation flow.';
      if (stepName.includes('New Note')) {
        return 'Users launch the app but do not tap "New Note". Consider adding an empty library welcome prompt or card.';
      }
      if (stepName.includes('Selected Photo')) {
        return 'Users open the compose screen but do not select a photo. Verify photo picker permissions and clarity.';
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

    function renderFunnel(funnel) {
      if (!funnel) return;
      const baseOpens = funnel.appOpens || 1;

      const steps = [
        { label: '1. App Opened', count: funnel.appOpens || 0, icon: '📱' },
        { label: '2. Compose Opened', count: funnel.composeOpened || 0, icon: '✍️' },
        { label: '3. Photo Selected', count: funnel.photoSelected || 0, icon: '📷' },
        { label: '4. Press Clicked', count: funnel.pressClicked || 0, icon: '🖨️' },
        { label: '5. Carving Started', count: funnel.pressingStarted || 0, icon: '⚙️' },
        { label: '6. Stamp Created', count: funnel.generatedSuccess || 0, icon: '🏆' },
      ];

      const container = document.getElementById('funnelContainer');
      if (container) {
        container.innerHTML = steps.map((step, idx) => {
          const pctOfTotal = baseOpens > 0 ? Math.min(100, Math.round((step.count / baseOpens) * 100)) : 0;
          const prevCount = idx > 0 ? steps[idx - 1].count : baseOpens;
          const stepDrop = prevCount > 0 && idx > 0 ? Math.max(0, Math.round(((prevCount - step.count) / prevCount) * 100)) : 0;
          const dropLabel = idx > 0 && stepDrop > 0 ? \`<span style="color: var(--red); font-size: 10px; font-family: var(--font-mono); margin-left: 6px;">(-\${stepDrop}% drop)</span>\` : '';

          return \`
            <div class="funnel-step">
              <div class="funnel-info">
                <div class="funnel-label">
                  <span>\${step.icon}</span>
                  <span>\${step.label}</span>
                </div>
                <div>
                  <span class="funnel-count">\${step.count}</span>
                  <span style="color: var(--text-muted); font-size: 10px; margin-left: 2px;">(\${pctOfTotal}%)</span>
                  \${dropLabel}
                </div>
              </div>
              <div class="funnel-bar-bg">
                <div class="funnel-bar-fill" style="width: \${pctOfTotal}%;"></div>
              </div>
            </div>
          \`;
        }).join('');
      }

      const bottleneckBox = document.getElementById('funnelBottleneck');
      if (bottleneckBox) {
        if (funnel.biggestDropoff && funnel.biggestDropoff !== 'None' && funnel.biggestDropoffPct > 0) {
          bottleneckBox.style.display = 'flex';
          const stepEl = document.getElementById('bottleneckStep');
          const pctEl = document.getElementById('bottleneckPct');
          const adviceEl = document.getElementById('bottleneckAdvice');
          if (stepEl) stepEl.textContent = funnel.biggestDropoff;
          if (pctEl) pctEl.textContent = funnel.biggestDropoffPct + '% drop-off';
          if (adviceEl) adviceEl.textContent = getBottleneckAdvice(funnel.biggestDropoff);
        } else {
          bottleneckBox.style.display = 'none';
        }
      }

      const resetNotice = document.getElementById('funnelResetNotice');
      if (resetNotice) {
        resetNotice.style.display = funnel.resetAt ? 'inline' : 'none';
      }
    }

    function formatEventDetails(eventName, meta) {
      meta = meta || {};
      switch (eventName) {
        case 'app_open':
          return { icon: '📱', title: 'App Opened' };
        case 'compose_opened':
          return { icon: '✍️', title: 'Opened Compose Desk' };
        case 'photo_selected':
          return { icon: '📷', title: 'Photo Selected (' + (meta.source || 'library') + ')' };
        case 'photo_picker_cancelled':
          return { icon: '↩️', title: 'Photo Picker Cancelled' };
        case 'keywords_suggest_clicked':
          return { icon: '✨', title: 'Auto-Detect Keywords' };
        case 'press_clicked':
          return { icon: '🖨️', title: 'Tapped "Press Field Note"' };
        case 'privacy_modal_shown':
          return { icon: '🛡️', title: 'AI Transparency Shown' };
        case 'privacy_modal_accepted':
          return { icon: '🤝', title: 'AI Transparency Accepted' };
        case 'paywall_shown':
          return { icon: '💳', title: 'Paywall Prompted' };
        case 'pressing_started':
          return { icon: '⚙️', title: 'Linocut Carving Started' };
        case 'pressing_success':
          return { icon: '🏆', title: 'Note Pressed & Saved' };
        case 'pressing_failed':
          return { icon: '⚠️', title: meta.isModeration ? 'Safety Guardrail Flagged' : 'Pressing Failed' };
        case 'note_opened':
          return { icon: '📖', title: 'Viewed Saved Note' };
        case 'settings_opened':
          return { icon: '⚙️', title: 'Opened Settings' };
        case 'screen_view':
          return { icon: '👁️', title: 'Viewed ' + (meta.screen || 'Screen') };
        default:
          return { icon: '⚡', title: eventName.replace(/_/g, ' ') };
      }
    }

    function renderFilteredStreams() {
      if (!cachedStats) return;

      // 1. AI Generations (DEFAULT STREAM)
      const actContainer = document.getElementById('activityList');
      if (actContainer) {
        let gens = cachedStats.recentActivity || [];
        if (searchQuery) {
          gens = gens.filter(g => 
            (g.place || '').toLowerCase().includes(searchQuery) ||
            (g.deviceId || '').toLowerCase().includes(searchQuery) ||
            (g.costInfo || '').toLowerCase().includes(searchQuery)
          );
        }

        if (gens.length > 0) {
          actContainer.innerHTML = gens.map(item => {
            const isSuccess = item.status === 'success';
            const dotClass = isSuccess ? 'status-dot success' : 'status-dot failed';
            const modelClean = (item.costInfo || '').replace('grok-imagine-image-2.0', 'Grok 2.0').replace('gemini-2.5-flash-image', 'Gemini Flash');
            const devTag = item.isDev 
              ? ' <span style="font-size: 9px; padding: 1px 4px; border-radius: 4px; background: rgba(0, 240, 255, 0.2); color: var(--cyan); border: 1px solid rgba(0, 240, 255, 0.4); margin-left: 4px; font-weight: 700;">DEV</span>' 
              : '';

            let statusDetail = isSuccess ? (modelClean || 'Success') : ('Failed: ' + (item.costInfo || 'Error'));
            if (!isSuccess && statusDetail.includes('content-moderated')) {
              statusDetail = '⚠️ Flagged by Safety Guardrails (Portrait / Clothing)';
            } else if (!isSuccess && statusDetail.includes('invalid_image')) {
              statusDetail = '⚠️ Image Format Error (Unreadable dimensions)';
            } else if (!isSuccess && statusDetail.includes('timeout')) {
              statusDetail = '⏱️ Timed out (>35s carving limit)';
            }

            return \`
              <div class="stream-card">
                <div class="stream-left">
                  <div class="\${dotClass}"></div>
                  <div>
                    <div class="stream-title">📍 \${item.place || 'Unknown Destination'} · No. \${item.number || '01'}\${devTag}</div>
                    <div class="stream-sub" style="color: \${isSuccess ? 'var(--text-muted)' : '#FCA5A5'};">\${statusDetail}</div>
                  </div>
                </div>
                <div class="stream-time">\${timeAgo(item.createdAt)}</div>
              </div>
            \`;
          }).join('');
        } else {
          actContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">No matching generations found.</div>';
        }
      }

      // 2. Telemetry Actions
      const evContainer = document.getElementById('eventsList');
      if (evContainer) {
        let events = cachedStats.recentEvents || [];
        if (searchQuery) {
          events = events.filter(e => 
            (e.eventName || '').toLowerCase().includes(searchQuery) ||
            (e.deviceId || '').toLowerCase().includes(searchQuery) ||
            JSON.stringify(e.metadata || {}).toLowerCase().includes(searchQuery)
          );
        }

        if (events.length > 0) {
          evContainer.innerHTML = events.map(ev => {
            const info = formatEventDetails(ev.eventName, ev.metadata);
            const platformBadge = ev.platform === 'android' ? '🤖 Android' : ev.platform === 'ios' ? '🍏 iOS' : '🌐 ' + ev.platform;
            const devSnippet = ev.deviceId ? ev.deviceId.slice(-6) : (ev.installationId ? ev.installationId.slice(0, 6) : 'anon');

            let metaText = '';
            if (ev.metadata && Object.keys(ev.metadata).length > 0) {
              if (ev.metadata.place) metaText = ' · ' + ev.metadata.place;
              else if (ev.metadata.screen) metaText = ' · ' + ev.metadata.screen;
              else if (ev.metadata.source) metaText = ' · ' + ev.metadata.source;
              else if (ev.metadata.model) metaText = ' · ' + (ev.metadata.model.includes('grok') ? 'Grok' : 'Gemini');
            }

            return \`
              <div class="stream-card">
                <div class="stream-left">
                  <div style="font-size: 16px; line-height: 1; flex-shrink: 0;">\${info.icon}</div>
                  <div>
                    <div class="stream-title">\${info.title}</div>
                    <div class="stream-sub">\${platformBadge} · id:\${devSnippet}\${metaText}</div>
                  </div>
                </div>
                <div class="stream-time">\${timeAgo(ev.createdAt)}</div>
              </div>
            \`;
          }).join('');
        } else {
          evContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">No matching telemetry found.</div>';
        }
      }

      // 3. User Journeys
      const jContainer = document.getElementById('journeysList');
      if (jContainer) {
        let journeys = cachedStats.userJourneys || [];
        if (searchQuery) {
          journeys = journeys.filter(j => 
            (j.deviceId || '').toLowerCase().includes(searchQuery) ||
            (j.platform || '').toLowerCase().includes(searchQuery)
          );
        }

        if (journeys.length > 0) {
          jContainer.innerHTML = journeys.map(j => {
            const devShort = j.deviceId.length > 12 ? '...' + j.deviceId.slice(-8) : j.deviceId;
            const outcomeBadge = j.completedStamp 
              ? '<span class="kpi-badge badge-green">🏆 Stamped ' + (j.notesCreated || 1) + '</span>'
              : (j.abandonedScreen 
                  ? '<span class="kpi-badge badge-red">Exited: ' + j.abandonedScreen + '</span>'
                  : '<span class="kpi-badge badge-amber">Browsed</span>');

            const eventsHtml = (j.events || []).map((ev) => {
              let dotColor = 'var(--cyan)';
              if (ev.status === 'green') dotColor = 'var(--green)';
              else if (ev.status === 'red') dotColor = 'var(--red)';
              else if (ev.status === 'amber') dotColor = 'var(--amber)';

              const timeStr = ev.time ? new Date(ev.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
              return \`
                <div style="display: flex; gap: 8px; align-items: flex-start; margin-bottom: 5px;">
                  <span style="width: 6px; height: 6px; border-radius: 50%; background: \${dotColor}; margin-top: 5px; flex-shrink: 0; box-shadow: 0 0 6px \${dotColor};"></span>
                  <div style="flex: 1;">
                    <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 500; color: var(--text);">
                      <span>\${ev.label}</span>
                      <span style="font-family: var(--font-mono); font-size: 9px; color: var(--text-muted);">\${timeStr}</span>
                    </div>
                    \${ev.detail ? '<div style="font-size: 10px; color: var(--text-muted);">' + ev.detail + '</div>' : ''}
                  </div>
                </div>
              \`;
            }).join('');

            return \`
              <div style="background: var(--card-inner); border: 1px solid var(--card-border); border-radius: 10px; padding: 10px; margin-bottom: 6px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 5px;">
                  <div>
                    <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--cyan);">\${devShort}</span>
                    <span style="font-size: 10px; color: var(--text-muted); margin-left: 4px;">\${j.platform} · \${timeAgo(j.lastSeen)}</span>
                  </div>
                  <div>\${outcomeBadge}</div>
                </div>
                <div style="margin-top: 5px;">
                  \${eventsHtml}
                </div>
              </div>
            \`;
          }).join('');
        } else {
          jContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic; text-align: center; padding: 14px;">No matching user journeys found.</div>';
        }
      }
    }

    function renderStats(data) {
      cachedStats = data;
      updatePlatformCards(data);

      // Web Visitors
      const web = data.web || { total: 0, last24h: 0, last7d: 0 };
      document.getElementById('statWebTotal').textContent = web.total;
      document.getElementById('statWebToday').textContent = '+' + web.last24h;
      document.getElementById('statWeb7d').textContent = '+' + web.last7d;

      // Engagement & Retention Metrics
      if (data.engagement) {
        document.getElementById('statDau').textContent = data.engagement.dau;
        document.getElementById('statWau').textContent = data.engagement.wau;
        document.getElementById('statSessions').textContent = data.engagement.totalSessions;
      }
      if (data.funnel) {
        document.getElementById('statConversion').textContent = (data.funnel.conversionRate || 0) + '%';
        const badge = document.getElementById('funnelConvBadge');
        if (badge) {
          badge.textContent = (data.funnel.conversionRate || 0) + '% Conversion';
          badge.className = 'kpi-badge ' + (data.funnel.conversionRate >= 15 ? 'badge-green' : 'badge-amber');
        }
        renderFunnel(data.funnel);
      }

      // Quota & Monetization
      document.getElementById('statFreeUsed').textContent = data.users.freeUsedTotal;
      document.getElementById('statAdsWatched').textContent = data.users.adsWatchedTotal;
      document.getElementById('statCreditsBalance').textContent = data.users.creditsBalanceTotal;

      // Notes Pressed
      document.getElementById('statGensTotal').textContent = data.generations.total;
      document.getElementById('statGensToday').textContent = '+' + data.generations.last24h;
      const rateEl = document.getElementById('statSuccessRate');
      rateEl.textContent = data.generations.successRate + '%';
      rateEl.className = 'kpi-badge ' + (data.generations.successRate >= 90 ? 'badge-green' : 'badge-amber');
      document.getElementById('statSuccessSub').textContent = data.generations.successRate + '%';

      // Active Model Selection
      if (data.activeModel) {
        updateModelBadge(data.activeModel);
        const radio = document.querySelector('input[name="aiModel"][value="' + data.activeModel + '"]');
        if (radio) radio.checked = true;
      }

      // Top Travel Destinations with Ranks and Counts
      const destContainer = document.getElementById('destinationsList');
      if (data.topDestinations && data.topDestinations.length > 0) {
        destContainer.innerHTML = data.topDestinations.map((d, idx) => \`
          <div class="dest-chip">
            <span class="dest-rank">#\${idx + 1}</span>
            <span class="dest-name">📍 \${d.place}</span>
            <span class="dest-count">×\${d.count}</span>
          </div>
        \`).join('');
      } else {
        destContainer.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); font-style: italic;">No destinations stamped yet.</div>';
      }

      // Autonomous Blog & SEO Stats
      if (data.blogStats) {
        const blogPub = document.getElementById('statBlogPublished');
        const blogViews = document.getElementById('statBlogViews');
        const blogSeo = document.getElementById('statBlogSeoScore');
        if (blogPub) blogPub.textContent = data.blogStats.publishedPosts || 0;
        if (blogViews) blogViews.textContent = data.blogStats.totalViews || 0;
        if (blogSeo) blogSeo.textContent = (data.blogStats.avgSeoScore || 0) + '/100';
      }

      // Render Streams
      renderFilteredStreams();
    }

    function updateModelBadge(modelId) {
      const badge = document.getElementById('activeModelBadge');
      if (!badge) return;
      if (modelId === 'grok-imagine-image-quality') {
        badge.textContent = 'Grok Ultra HD';
        badge.className = 'kpi-badge badge-green';
      } else if (modelId.startsWith('gemini')) {
        badge.textContent = 'Gemini 2.5 Flash';
        badge.className = 'kpi-badge badge-cyan';
      } else {
        badge.textContent = 'Grok Imagine 2.0';
        badge.className = 'kpi-badge badge-amber';
      }
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
          updateModelBadge(selected);
        } else {
          alert('Failed to update active model. Please check PIN.');
        }
      } catch (e) {
        alert('Error saving model: ' + e.message);
      } finally {
        btn.textContent = 'APPLY ACTIVE MODEL';
      }
    }

    async function handleResetFunnel() {
      if (!confirm('Reset conversion funnel stats to zero for a fresh start?\\n\\n(This will NOT affect installs, notes pressed, credits, or any other data.)')) {
        return;
      }

      const pin = getStoredPin();
      if (!pin) return;

      const btn = document.getElementById('resetFunnelBtn');
      if (btn) btn.textContent = '...';

      try {
        const res = await fetch('/v1/admin/settings', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer ' + pin,
          },
          body: JSON.stringify({ key: 'funnel_reset_at', value: new Date().toISOString() }),
        });

        if (res.ok) {
          fetchStats();
        } else {
          alert('Failed to reset funnel. Please check PIN.');
        }
      } catch (err) {
        alert('Error resetting funnel: ' + err.message);
      } finally {
        if (btn) btn.textContent = 'Reset';
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
          notice.textContent = '✓ Added ' + amount + ' credits to ' + (data.accountKey || target) + '! New balance: ' + data.credits + '. Tap "Sync Balance" in app.';
          fetchStats();
        } else {
          notice.style.display = 'block';
          notice.style.color = 'var(--red)';
          notice.textContent = '✗ ' + (data.message || 'Failed to grant credits. Check PIN or Account Key.');
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
