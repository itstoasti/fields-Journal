export function renderAdminDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover">
  <title>Fields · Studio Telemetry</title>
  <link rel="icon" href="/favicon.png" type="image/png">
  <link rel="apple-touch-icon" href="/assets/icon.png">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <meta name="theme-color" content="#141210">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Courier+Prime:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg: #141210;
      --card-bg: #1E1B18;
      --card-border: rgba(255, 255, 255, 0.08);
      --amber: #FFC480;
      --amber-dim: rgba(255, 196, 128, 0.15);
      --green: #4ADE80;
      --green-dim: rgba(74, 222, 128, 0.15);
      --red: #F87171;
      --red-dim: rgba(248, 113, 113, 0.15);
      --text: #F4EFE6;
      --text-muted: #A8A29E;
      --font-mono: 'Courier Prime', monospace;
      --font-sans: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }

    body {
      background-color: var(--bg);
      color: var(--text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: env(safe-area-inset-top, 20px) 16px env(safe-area-inset-bottom, 24px);
      -webkit-font-smoothing: antialiased;
    }

    .container {
      max-width: 600px;
      margin: 0 auto;
    }

    /* Header */
    header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 16px 0 24px;
      border-bottom: 1px solid var(--card-border);
      margin-bottom: 20px;
    }

    .brand {
      display: flex;
      align-items: center;
      gap: 12px;
    }

    .brand-icon {
      width: 36px;
      height: 36px;
      border-radius: 8px;
      background: var(--amber-dim);
      border: 1px solid rgba(255, 196, 128, 0.3);
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: var(--font-mono);
      font-weight: 700;
      color: var(--amber);
      font-size: 16px;
    }

    .brand-title {
      font-family: var(--font-mono);
      font-size: 16px;
      font-weight: 700;
      letter-spacing: 1.5px;
      color: var(--text);
      text-transform: uppercase;
    }

    .brand-subtitle {
      font-size: 11px;
      color: var(--text-muted);
      letter-spacing: 0.5px;
    }

    .refresh-btn {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      color: var(--amber);
      font-family: var(--font-mono);
      font-size: 12px;
      padding: 8px 14px;
      border-radius: 8px;
      cursor: pointer;
      display: flex;
      align-items: center;
      gap: 6px;
      transition: all 0.2s;
    }

    .refresh-btn:active {
      transform: scale(0.96);
      background: var(--amber-dim);
    }

    /* Platform Filter Tabs */
    .tab-bar {
      display: flex;
      gap: 6px;
      margin-bottom: 16px;
      background: rgba(0, 0, 0, 0.35);
      padding: 4px;
      border-radius: 10px;
      border: 1px solid var(--card-border);
    }

    .tab-btn {
      flex: 1;
      background: transparent;
      border: 1px solid transparent;
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 8px 6px;
      border-radius: 7px;
      cursor: pointer;
      transition: all 0.2s ease;
      text-align: center;
      white-space: nowrap;
    }

    .tab-btn:hover {
      color: var(--text);
    }

    .tab-btn.active {
      background: var(--card-bg);
      color: var(--amber);
      border-color: rgba(255, 196, 128, 0.3);
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.4);
    }

    /* Stats Grid */
    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 12px;
      margin-bottom: 20px;
    }

    .card {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 12px;
      padding: 16px;
      position: relative;
      overflow: hidden;
    }

    .card.full-width {
      grid-column: span 2;
    }

    .card-label {
      font-family: var(--font-mono);
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 1px;
      color: var(--text-muted);
      margin-bottom: 8px;
    }

    .card-value {
      font-family: var(--font-mono);
      font-size: 32px;
      font-weight: 700;
      color: var(--text);
      line-height: 1;
      margin-bottom: 8px;
    }

    .card-meta {
      font-size: 12px;
      color: var(--text-muted);
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
    }

    .badge-pill {
      display: inline-flex;
      align-items: center;
      padding: 2px 8px;
      border-radius: 12px;
      font-size: 11px;
      font-family: var(--font-mono);
      font-weight: 600;
    }

    .badge-green { background: var(--green-dim); color: var(--green); }
    .badge-amber { background: var(--amber-dim); color: var(--amber); }
    .badge-red { background: var(--red-dim); color: var(--red); }

    /* Section Titles */
    .section-title {
      font-family: var(--font-mono);
      font-size: 12px;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      color: var(--amber);
      margin: 24px 0 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }

    /* Destinations Pills */
    .destinations-list {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 24px;
    }

    .dest-pill {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      padding: 6px 12px;
      border-radius: 20px;
      font-size: 12px;
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .dest-count {
      color: var(--amber);
      font-family: var(--font-mono);
      font-weight: 700;
      font-size: 11px;
    }

    /* Funnel Styles */
    .funnel-container {
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-top: 10px;
    }

    .funnel-step {
      display: flex;
      flex-direction: column;
    }

    .funnel-step-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 12px;
    }

    .funnel-step-title {
      display: flex;
      align-items: center;
      gap: 6px;
      color: var(--text);
      font-weight: 500;
    }

    .funnel-step-meta {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
    }

    .funnel-step-count {
      color: var(--amber);
      font-weight: 700;
    }

    .funnel-bar-bg {
      width: 100%;
      height: 7px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 4px;
      overflow: hidden;
      margin-top: 6px;
    }

    .funnel-bar-fill {
      height: 100%;
      border-radius: 4px;
      background: linear-gradient(90deg, #FFC480, #F59E0B);
      transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1);
    }

    .funnel-bottleneck {
      background: rgba(248, 113, 113, 0.08);
      border: 1px solid rgba(248, 113, 113, 0.25);
      border-radius: 10px;
      padding: 12px 14px;
      margin-top: 14px;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    .funnel-bottleneck-icon {
      font-size: 18px;
      line-height: 1;
    }

    .funnel-bottleneck-title {
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 700;
      color: var(--red);
      letter-spacing: 0.5px;
      text-transform: uppercase;
      margin-bottom: 2px;
    }

    .funnel-bottleneck-text {
      font-size: 12px;
      color: var(--text);
      line-height: 1.4;
    }

    /* Stream Feed Switcher */
    .stream-tab-bar {
      display: flex;
      gap: 6px;
    }

    .stream-tab {
      background: rgba(0, 0, 0, 0.25);
      border: 1px solid var(--card-border);
      color: var(--text-muted);
      font-family: var(--font-mono);
      font-size: 11px;
      font-weight: 600;
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.2s;
    }

    .stream-tab.active {
      background: var(--amber-dim);
      color: var(--amber);
      border-color: rgba(255, 196, 128, 0.4);
    }

    /* Activity Stream */
    .activity-list {
      display: flex;
      flex-direction: column;
      gap: 10px;
      margin-bottom: 32px;
    }

    .activity-item {
      background: var(--card-bg);
      border: 1px solid var(--card-border);
      border-radius: 10px;
      padding: 12px 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 13px;
    }

    .activity-left {
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

    .activity-title {
      font-weight: 500;
      color: var(--text);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      max-width: 260px;
    }

    .activity-sub {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      margin-top: 2px;
    }

    .activity-time {
      font-family: var(--font-mono);
      font-size: 11px;
      color: var(--text-muted);
      text-align: right;
      white-space: nowrap;
      flex-shrink: 0;
    }

    /* PIN Modal */
    .pin-modal {
      position: fixed;
      inset: 0;
      background: rgba(10, 8, 7, 0.94);
      backdrop-filter: blur(8px);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 20px;
      z-index: 1000;
    }

    .pin-box {
      background: var(--card-bg);
      border: 1px solid rgba(255, 196, 128, 0.3);
      border-radius: 16px;
      padding: 28px 24px;
      width: 100%;
      max-width: 340px;
      text-align: center;
    }

    .pin-input {
      background: #12100E;
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
      border-color: var(--amber);
    }

    .pin-submit {
      background: var(--amber);
      color: #141210;
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
      border: 2px solid rgba(255, 196, 128, 0.3);
      border-top-color: var(--amber);
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
    <header>
      <div class="brand">
        <div class="brand-icon">F</div>
        <div>
          <div class="brand-title">FIELDS STUDIO</div>
          <div class="brand-subtitle">Live Cloud Telemetry</div>
        </div>
      </div>
      <button class="refresh-btn" onclick="fetchStats()">
        <span id="spinner" class="spinner" style="display: none;"></span>
        <span>REFRESH</span>
      </button>
    </header>

    <!-- Platform Filter Tabs -->
    <div class="tab-bar">
      <button id="tabAndroid" onclick="setPlatform('android')" class="tab-btn active">🤖 Android</button>
      <button id="tabIos" onclick="setPlatform('ios')" class="tab-btn">🍏 iOS</button>
      <button id="tabAll" onclick="setPlatform('all')" class="tab-btn">📱 All Stores</button>
      <button id="tabWeb" onclick="setPlatform('web')" class="tab-btn">🌐 Web</button>
    </div>

    <!-- Top KPI Grid -->
    <div class="grid">
      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div id="statInstallsTitle" class="card-label" style="margin-bottom: 0;">Play Store Installs</div>
          <span id="statPlatformBadge" class="badge-pill badge-green" style="font-size: 10px;">Android</span>
        </div>
        <div id="statInstallsTotal" class="card-value">-</div>
        <div class="card-meta">
          <span>Today: <strong id="statInstallsToday" style="color: var(--text);">-</strong></span>
          <span id="statInstalls3dWrapper">3d: <strong id="statInstalls3d" style="color: var(--text);">-</strong></span>
          <span>7d: <strong id="statInstalls7d" style="color: var(--text);">-</strong></span>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div id="statActiveTitle" class="card-label" style="margin-bottom: 0;">Active Devices</div>
          <span id="statActiveBadge" class="badge-pill badge-green" style="font-size: 10px;">Google Play</span>
        </div>
        <div id="statActiveTotal" class="card-value">-</div>
        <div class="card-meta">
          <span id="statActiveSub">Active audience (retained)</span>
        </div>
      </div>

      <div class="card">
        <div class="card-label">Notes Pressed</div>
        <div id="statGensTotal" class="card-value">-</div>
        <div class="card-meta">
          <span>Today: <strong id="statGensToday" style="color: var(--text);">-</strong></span>
          <span>Success: <span id="statSuccessRate" class="badge-pill badge-green">100%</span></span>
        </div>
      </div>

      <div class="card">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div class="card-label" style="margin-bottom: 0;">Web Visitors</div>
          <span class="badge-pill" style="font-size: 10px; background: rgba(255,255,255,0.08); color: var(--text-muted);">Web App</span>
        </div>
        <div id="statWebTotal" class="card-value">-</div>
        <div class="card-meta">
          <span>Today: <strong id="statWebToday" style="color: var(--text);">-</strong></span>
          <span>7d: <strong id="statWeb7d" style="color: var(--text);">-</strong></span>
        </div>
      </div>

      <div class="card full-width">
        <div class="card-label">Monetization & Quota Flow</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-top: 6px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Starter Notes Used</div>
            <div id="statFreeUsed" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--amber);">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Ads Watched</div>
            <div id="statAdsWatched" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--green);">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Credit Balance</div>
            <div id="statCreditsBalance" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: #60A5FA;">-</div>
          </div>
        </div>
      </div>

      <!-- User Engagement & Retention Overview -->
      <div class="card full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <div class="card-label" style="margin-bottom: 0;">Audience Engagement & Retention</div>
          <span class="badge-pill badge-green" style="font-size: 10px;">Live Telemetry</span>
        </div>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-top: 6px;">
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">DAU (24h)</div>
            <div id="statDau" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--text);">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">WAU (7d)</div>
            <div id="statWau" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--text);">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">App Sessions</div>
            <div id="statSessions" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--amber);">-</div>
          </div>
          <div>
            <div style="font-size: 11px; color: var(--text-muted);">Funnel Conv.</div>
            <div id="statConversion" style="font-family: var(--font-mono); font-size: 20px; font-weight: 700; color: var(--green);">-</div>
          </div>
        </div>
      </div>

      <!-- Conversion Funnel & Drop-off Diagnostics -->
      <div class="card full-width">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
          <div class="card-label" style="margin-bottom: 0;">Conversion Funnel · User Drop-off</div>
          <span id="funnelConvBadge" class="badge-pill badge-amber">0% Conversion</span>
        </div>
        <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
          Step-by-step user retention from opening the app to completing a pressed field note.
        </p>

        <div id="funnelContainer" class="funnel-container">
          <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Loading funnel metrics...</div>
        </div>

        <div id="funnelBottleneck" class="funnel-bottleneck" style="display: none;">
          <div class="funnel-bottleneck-icon">⚠️</div>
          <div>
            <div class="funnel-bottleneck-title">Primary Drop-off Bottleneck: <span id="bottleneckStep">-</span> (<span id="bottleneckPct">-</span>)</div>
            <div id="bottleneckAdvice" class="funnel-bottleneck-text">-</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Active AI Printmaker Model Control -->
    <div class="card full-width" style="margin-bottom: 20px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div class="card-label" style="margin-bottom: 0;">Active AI Printmaker Engine</div>
        <span id="activeModelBadge" class="badge-pill badge-amber">Loading...</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
        Controls the engine used to carve and press field notes store-wide. Only you can change this.
      </p>

      <div style="display: flex; flex-direction: column; gap: 8px;">
        <label style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="grok-imagine-image-2.0" id="modelGrok2" style="accent-color: var(--amber);">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text);">xAI Grok Imagine 2.0 (Recommended)</div>
            <div style="font-size: 11px; color: var(--text-muted);">Standard 2K linocut print carving (~5-6¢)</div>
          </div>
        </label>

        <label style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="grok-imagine-image-quality" id="modelGrokUltra" style="accent-color: var(--amber);">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text);">xAI Grok Imagine Ultra HD</div>
            <div style="font-size: 11px; color: var(--text-muted);">Maximum linocut detail and texture (~7-8¢)</div>
          </div>
        </label>

        <label style="display: flex; align-items: center; gap: 10px; background: rgba(0,0,0,0.25); border: 1px solid var(--card-border); padding: 10px 12px; border-radius: 8px; cursor: pointer;">
          <input type="radio" name="aiModel" value="gemini-2.5-flash-image" id="modelGemini" style="accent-color: var(--amber);">
          <div>
            <div style="font-size: 13px; font-weight: 600; color: var(--text);">Google Gemini 2.5 Flash</div>
            <div style="font-size: 11px; color: var(--text-muted);">Google fast image tier (~3¢)</div>
          </div>
        </label>
      </div>

      <div style="margin-top: 12px; display: flex; align-items: center; justify-content: space-between;">
        <button onclick="handleSaveModel()" id="saveModelBtn" style="background: var(--amber); color: #141210; border: none; border-radius: 6px; font-family: var(--font-mono); font-weight: 700; font-size: 12px; padding: 8px 16px; cursor: pointer;">
          APPLY ACTIVE MODEL
        </button>
        <span id="modelSaveNotice" style="font-size: 11px; color: var(--green); font-family: var(--font-mono); display: none;">✓ Saved & Active!</span>
      </div>
    </div>

    <!-- Developer Test Credits Control -->
    <div class="card" style="margin-top: 16px;">
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--amber); letter-spacing: 1px; text-transform: uppercase;">
          Grant Test Credits
        </span>
        <span style="font-size: 10px; color: var(--text-muted);">Developer Access</span>
      </div>
      <p style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px; line-height: 1.4;">
        Add test credits to your device by entering your <b>Account Key</b> (found in Settings &rarr; Account Key in the app) or Device ID.
      </p>

      <div style="display: flex; gap: 8px; margin-bottom: 10px;">
        <input 
          type="text" 
          id="grantTargetInput" 
          placeholder="e.g. FIELD-XXXX-YYYY" 
          style="flex: 2; background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 12px; text-transform: uppercase;"
        />
        <input 
          type="number" 
          id="grantAmountInput" 
          value="20" 
          min="1" 
          max="100" 
          style="flex: 1; max-width: 70px; background: rgba(0,0,0,0.3); border: 1px solid var(--card-border); color: var(--text); padding: 8px 10px; border-radius: 6px; font-family: var(--font-mono); font-size: 12px;"
        />
        <button 
          onclick="handleGrantCredits()" 
          id="grantCreditsBtn" 
          style="background: var(--green); color: #141210; border: none; border-radius: 6px; font-family: var(--font-mono); font-weight: 700; font-size: 12px; padding: 8px 14px; cursor: pointer;"
        >
          GRANT
        </button>
      </div>
      <div id="grantResultNotice" style="font-size: 11px; font-family: var(--font-mono); display: none;"></div>
    </div>

    <!-- Top Destinations -->
    <div class="section-title">
      <span>Top Travel Destinations</span>
      <span style="font-size: 10px; color: var(--text-muted);">All time</span>
    </div>
    <div id="destinationsList" class="destinations-list">
      <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Loading destinations...</div>
    </div>

    <!-- Live Activity & Telemetry Feeds -->
    <div class="section-title">
      <span>Live Activity Stream</span>
      <div class="stream-tab-bar">
        <button id="streamTabEvents" class="stream-tab active" onclick="switchStreamTab('events')">⚡ Telemetry Actions</button>
        <button id="streamTabGens" class="stream-tab" onclick="switchStreamTab('generations')">🖨️ AI Generations</button>
      </div>
    </div>
    
    <!-- User Telemetry Feed -->
    <div id="eventsList" class="activity-list">
      <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Fetching user telemetry...</div>
    </div>

    <!-- AI Generations Feed -->
    <div id="activityList" class="activity-list" style="display: none;">
      <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Fetching latest generations...</div>
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

    function setPlatform(platform) {
      currentPlatform = platform;
      ['android', 'ios', 'all', 'web'].forEach(p => {
        const btn = document.getElementById('tab' + (p.charAt(0).toUpperCase() + p.slice(1)));
        if (btn) btn.className = 'tab-btn' + (p === platform ? ' active' : '');
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
        badgeEl.className = 'badge-pill badge-green';
        totalEl.textContent = android.total;
        todayEl.textContent = '+' + android.last24h;
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + android.last3d;
        sevenDEl.textContent = '+' + android.last7d;

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'Google Play';
        activeBadgeEl.className = 'badge-pill badge-green';
        activeTotalEl.textContent = android.activeDevices;
        activeSubEl.textContent = 'Active audience (retained)';
      } else if (currentPlatform === 'ios') {
        titleEl.textContent = 'App Store Installs';
        badgeEl.textContent = 'Apple iOS';
        badgeEl.className = 'badge-pill badge-amber';
        totalEl.textContent = ios.total;
        todayEl.textContent = '+' + ios.last24h;
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + ios.last3d;
        sevenDEl.textContent = '+' + ios.last7d;

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'App Store';
        activeBadgeEl.className = 'badge-pill badge-amber';
        activeTotalEl.textContent = ios.activeDevices;
        activeSubEl.textContent = ios.total === 0 ? 'Ready for iOS launch' : 'Active audience (retained)';
      } else if (currentPlatform === 'all') {
        titleEl.textContent = 'Total Store Installs';
        badgeEl.textContent = 'Android + iOS';
        badgeEl.className = 'badge-pill badge-green';
        totalEl.textContent = android.total + ios.total;
        todayEl.textContent = '+' + (android.last24h + ios.last24h);
        threeDWrapper.style.display = 'inline';
        threeDEl.textContent = '+' + (android.last3d + ios.last3d);
        sevenDEl.textContent = '+' + (android.last7d + ios.last7d);

        activeTitleEl.textContent = 'Active Devices';
        activeBadgeEl.textContent = 'Combined';
        activeBadgeEl.className = 'badge-pill badge-green';
        activeTotalEl.textContent = android.activeDevices + ios.activeDevices;
        activeSubEl.textContent = 'Total retained store audience';
      } else if (currentPlatform === 'web') {
        titleEl.textContent = 'Web App Visitors';
        badgeEl.textContent = 'Web';
        badgeEl.className = 'badge-pill';
        totalEl.textContent = web.total;
        todayEl.textContent = '+' + web.last24h;
        threeDWrapper.style.display = 'none';
        sevenDEl.textContent = '+' + web.last7d;

        activeTitleEl.textContent = 'Web Sessions';
        activeBadgeEl.textContent = 'Online';
        activeBadgeEl.className = 'badge-pill';
        activeTotalEl.textContent = web.total;
        activeSubEl.textContent = 'Browser visitors (Safari/Chrome)';
      }
    }

    let currentStreamTab = 'events';

    function switchStreamTab(tab) {
      currentStreamTab = tab;
      const tabEv = document.getElementById('streamTabEvents');
      const tabGen = document.getElementById('streamTabGens');
      const listEv = document.getElementById('eventsList');
      const listGen = document.getElementById('activityList');

      if (tab === 'events') {
        if (tabEv) tabEv.className = 'stream-tab active';
        if (tabGen) tabGen.className = 'stream-tab';
        if (listEv) listEv.style.display = 'flex';
        if (listGen) listGen.style.display = 'none';
      } else {
        if (tabEv) tabEv.className = 'stream-tab';
        if (tabGen) tabGen.className = 'stream-tab active';
        if (listEv) listEv.style.display = 'none';
        if (listGen) listGen.style.display = 'flex';
      }
    }

    function getBottleneckAdvice(stepName) {
      if (!stepName) return 'Audience is progressing smoothly through the creation flow.';
      if (stepName.includes('New Note')) {
        return 'Users launch the app but do not tap "New Note". Consider adding an empty library welcome prompt or card.';
      }
      if (stepName.includes('Selected Photo')) {
        return 'Users open the compose screen but do not select a photo. Verify camera and library permissions are clear and frictionless.';
      }
      if (stepName.includes('Clicked "Press"')) {
        return 'Users select a photo but leave without pressing. Check if photo metadata or date confirmations are confusing.';
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
              <div class="funnel-step-header">
                <div class="funnel-step-title">
                  <span>\${step.icon}</span>
                  <span>\${step.label}</span>
                </div>
                <div class="funnel-step-meta">
                  <span class="funnel-step-count">\${step.count}</span>
                  <span style="color: var(--text-muted); margin-left: 3px;">(\${pctOfTotal}%)</span>
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
          return { icon: '✨', title: 'Tapped Auto-Detect Keywords' };
        case 'press_clicked':
          return { icon: '🖨️', title: 'Tapped "Press Field Note"' };
        case 'privacy_modal_shown':
          return { icon: '🛡️', title: 'AI Transparency Modal Prompted' };
        case 'privacy_modal_accepted':
          return { icon: '🤝', title: 'AI Transparency Accepted' };
        case 'paywall_shown':
          return { icon: '💳', title: 'Paywall Prompted' };
        case 'pressing_started':
          return { icon: '⚙️', title: 'Linocut Plate Carving Started' };
        case 'pressing_success':
          return { icon: '🏆', title: 'Note Pressed & Saved' };
        case 'pressing_failed':
          return { icon: '⚠️', title: meta.isModeration ? 'Pressing Flagged (Moderation)' : 'Pressing Failed' };
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

    function renderRecentEvents(events) {
      const container = document.getElementById('eventsList');
      if (!container) return;

      if (!events || events.length === 0) {
        container.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">No user telemetry events recorded yet.</div>';
        return;
      }

      container.innerHTML = events.map(ev => {
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
          <div class="activity-item">
            <div class="activity-left">
              <div style="font-size: 18px; line-height: 1; flex-shrink: 0;">\${info.icon}</div>
              <div>
                <div class="activity-title">\${info.title}</div>
                <div class="activity-sub">\${platformBadge} · id:\${devSnippet}\${metaText}</div>
              </div>
            </div>
            <div class="activity-time">\${timeAgo(ev.createdAt)}</div>
          </div>
        \`;
      }).join('');
    }

    function renderStats(data) {
      cachedStats = data;
      updatePlatformCards(data);

      // Web Visitors (Dedicated Card)
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
          badge.className = 'badge-pill ' + (data.funnel.conversionRate >= 15 ? 'badge-green' : 'badge-amber');
        }
        renderFunnel(data.funnel);
      }

      // Live Telemetry Events
      renderRecentEvents(data.recentEvents);

      // Generations
      document.getElementById('statGensTotal').textContent = data.generations.total;
      document.getElementById('statGensToday').textContent = '+' + data.generations.last24h;
      
      const rateEl = document.getElementById('statSuccessRate');
      rateEl.textContent = data.generations.successRate + '%';
      rateEl.className = 'badge-pill ' + (data.generations.successRate >= 90 ? 'badge-green' : 'badge-amber');

      document.getElementById('statFreeUsed').textContent = data.users.freeUsedTotal;
      document.getElementById('statAdsWatched').textContent = data.users.adsWatchedTotal;
      document.getElementById('statCreditsBalance').textContent = data.users.creditsBalanceTotal;

      // Active Model Selection
      if (data.activeModel) {
        updateModelBadge(data.activeModel);
        const radio = document.querySelector('input[name="aiModel"][value="' + data.activeModel + '"]');
        if (radio) radio.checked = true;
      }

      // Destinations
      const destContainer = document.getElementById('destinationsList');
      if (data.topDestinations && data.topDestinations.length > 0) {
        destContainer.innerHTML = data.topDestinations.map(d => \`
          <div class="dest-pill">
            <span>\${d.place}</span>
            <span class="dest-count">×\${d.count}</span>
          </div>
        \`).join('');
      } else {
        destContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic;">No destinations stamped yet.</div>';
      }

      // Recent Activity
      const actContainer = document.getElementById('activityList');
      if (data.recentActivity && data.recentActivity.length > 0) {
        actContainer.innerHTML = data.recentActivity.map(item => {
          const isSuccess = item.status === 'success';
          const dotClass = isSuccess ? 'status-dot success' : 'status-dot failed';
          const modelClean = (item.costInfo || '').replace('grok-imagine-image-2.0', 'Grok 2.0').replace('gemini-2.5-flash-image', 'Gemini Flash');
          const devTag = item.isDev 
            ? ' <span style="font-size: 9px; padding: 1px 5px; border-radius: 4px; background: rgba(255, 196, 128, 0.2); color: var(--amber); border: 1px solid rgba(255, 196, 128, 0.4); margin-left: 6px; font-weight: 600;">INTERNAL DEV</span>' 
            : '';

          return \`
            <div class="activity-item">
              <div class="activity-left">
                <div class="\${dotClass}"></div>
                <div>
                  <div class="activity-title">\${item.place || 'Current Location'} · No. \${item.number || '01'}\${devTag}</div>
                  <div class="activity-sub">\${isSuccess ? (modelClean || 'Success') : ('Failed: ' + (item.costInfo || 'Error'))}</div>
                </div>
              </div>
              <div class="activity-time">\${timeAgo(item.createdAt)}</div>
            </div>
          \`;
        }).join('');
      } else {
        actContainer.innerHTML = '<div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">No recent events recorded.</div>';
      }
    }

    function updateModelBadge(modelId) {
      const badge = document.getElementById('activeModelBadge');
      if (!badge) return;
      if (modelId === 'grok-imagine-image-quality') {
        badge.textContent = 'Grok Ultra HD';
        badge.className = 'badge-pill badge-green';
      } else if (modelId.startsWith('gemini')) {
        badge.textContent = 'Gemini 2.5 Flash';
        badge.className = 'badge-pill badge-amber';
      } else {
        badge.textContent = 'Grok Imagine 2.0';
        badge.className = 'badge-pill badge-amber';
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

    document.getElementById('pinField').addEventListener('keypress', function(e) {
      if (e.key === 'Enter') handlePinSubmit();
    });

    // Auto-fetch on boot
    window.addEventListener('DOMContentLoaded', () => {
      fetchStats();
      // Auto refresh every 30 seconds
      setInterval(fetchStats, 30000);
    });
  </script>
</body>
</html>`;
}
