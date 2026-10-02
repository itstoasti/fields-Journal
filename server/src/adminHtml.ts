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

    <!-- Top KPI Grid -->
    <div class="grid">
      <div class="card">
        <div class="card-label">Total Installs</div>
        <div id="statUsersTotal" class="card-value">-</div>
        <div class="card-meta">
          <span>Today: <strong id="statUsersToday" style="color: var(--text);">-</strong></span>
          <span>7d: <strong id="statUsers7d" style="color: var(--text);">-</strong></span>
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
    </div>

    <!-- Top Destinations -->
    <div class="section-title">
      <span>Top Travel Destinations</span>
      <span style="font-size: 10px; color: var(--text-muted);">All time</span>
    </div>
    <div id="destinationsList" class="destinations-list">
      <div style="font-size: 12px; color: var(--text-muted); font-style: italic;">Loading destinations...</div>
    </div>

    <!-- Live Activity Feed -->
    <div class="section-title">
      <span>Live Generation Stream</span>
      <span id="activityCount" style="font-size: 10px; color: var(--text-muted);">Latest 20</span>
    </div>
    <div id="activityList" class="activity-list">
      <div style="font-size: 12px; color: var(--text-muted); font-style: italic; text-align: center; padding: 20px;">Fetching latest events...</div>
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

    function renderStats(data) {
      document.getElementById('statUsersTotal').textContent = data.users.total;
      document.getElementById('statUsersToday').textContent = '+' + data.users.last24h;
      document.getElementById('statUsers7d').textContent = '+' + data.users.last7d;

      document.getElementById('statGensTotal').textContent = data.generations.total;
      document.getElementById('statGensToday').textContent = '+' + data.generations.last24h;
      
      const rateEl = document.getElementById('statSuccessRate');
      rateEl.textContent = data.generations.successRate + '%';
      rateEl.className = 'badge-pill ' + (data.generations.successRate >= 90 ? 'badge-green' : 'badge-amber');

      document.getElementById('statFreeUsed').textContent = data.users.freeUsedTotal;
      document.getElementById('statAdsWatched').textContent = data.users.adsWatchedTotal;
      document.getElementById('statCreditsBalance').textContent = data.users.creditsBalanceTotal;

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

          return \`
            <div class="activity-item">
              <div class="activity-left">
                <div class="\${dotClass}"></div>
                <div>
                  <div class="activity-title">\${item.place || 'Unknown Location'} · No. \${item.number || '01'}</div>
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
