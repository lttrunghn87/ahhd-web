const CURRENT_ACCOUNT_STORAGE_KEY = "ahhd_current_account";
const LITE_VIDEO_PROGRESS_KEY = "ahhd_lite_video_10_20_progress";
const LITE_VIDEO_SEQUENCE = [
  "https://lite.tiktok.com/t/ZSuDtQ4N8/",
  "https://lite.tiktok.com/t/ZSyDJgyPD/",
  "https://lite.tiktok.com/t/ZSux1Atfy/",
  "https://lite.tiktok.com/t/ZSmbYWoHk/",
  "https://lite.tiktok.com/t/ZSuaQKbvV/",
  "https://lite.tiktok.com/t/ZSjm5439S/",
  "https://lite.tiktok.com/t/ZSxeAEEtN/",
  "https://lite.tiktok.com/t/ZSyFS95VK/",
  "https://lite.tiktok.com/t/ZSmdeGmCj/",
  "https://lite.tiktok.com/t/ZSjARxpPT/",
  "https://lite.tiktok.com/t/ZSrEfkbvo/",
  "https://lite.tiktok.com/t/ZSMaPg99o/",
  "https://lite.tiktok.com/t/ZS9E7e1L5/",
  "https://lite.tiktok.com/t/ZShYALDLA/",
  "https://lite.tiktok.com/t/ZSH1YHVsk/",
  "https://lite.tiktok.com/t/ZS2qdAuor/",
  "https://lite.tiktok.com/t/ZSQyFL91C/",
  "https://lite.tiktok.com/t/ZSHQSqsGq/",
  "https://lite.tiktok.com/t/ZSa7W2pEN/",
  "https://lite.tiktok.com/t/ZSrJxNmCK/",
  "https://lite.tiktok.com/t/ZSM43sfyA/",
  "https://lite.tiktok.com/t/ZSrJxakog/",
  "https://lite.tiktok.com/t/ZSSqEvkXF/",
  "https://lite.tiktok.com/t/ZSry3KYu7/",
  "https://lite.tiktok.com/t/ZSrjqdo5Q/",
  "https://lite.tiktok.com/t/ZShX3CRbr/",
  "https://lite.tiktok.com/t/ZShVmu2pc/",
  "https://lite.tiktok.com/t/ZS6rUywGN/",
  "https://lite.tiktok.com/t/ZSrGTDx7a/",
  "https://lite.tiktok.com/t/ZS6rUtJ2s/"
];

const state = {
  page: location.pathname.includes("settings") ? "settings" : "home",
  data: null,
  settingsData: null,
  selectedSettingsPanel: "general",
  selectedManagerPanel: null,
  currentAccount: loadStoredCurrentAccount()
};

const app = document.getElementById("app");
const navbar = document.getElementById("navbar");
const modalRoot = document.getElementById("modal-root");

init().catch((error) => {
  app.innerHTML = `
    <section class="panel" style="max-width: 720px; margin: 30px auto;">
      <div class="panel-header">Không tải được ứng dụng</div>
      <div class="panel-body">
        <p>API đang báo lỗi nên trang chưa mở được.</p>
        <div class="output-box">${escapeHtml(error.message)}</div>
        <p class="muted">Nếu lỗi liên quan DB, hãy kiểm tra Cloudflare Pages Production Bindings có D1 binding tên DB chưa, rồi redeploy.</p>
      </div>
    </section>
  `;
});

async function init() {
  await loadInitialData();
  render();
}

async function loadInitialData() {
  state.data = await api("get_initial_data", {}, "GET");
}

async function loadSettingsData() {
  state.settingsData = await api("get_settings_data", {}, "GET");
}

async function api(action, data = {}, method = "POST") {
  const url = new URL("/api", location.origin);
  url.searchParams.set("action", action);
  const options = { method, headers: {} };
  if (method !== "GET") {
    options.headers["Content-Type"] = "application/json";
    options.body = JSON.stringify(data);
  } else {
    Object.entries(data).forEach(([key, value]) => url.searchParams.set(key, value));
  }
  const res = await fetch(url, options);
  const json = await res.json().catch(() => ({ ok: false, message: "API không trả JSON." }));
  if (!res.ok || json.ok === false) throw new Error(json.message || "Có lỗi xảy ra.");
  return json;
}

function render() {
  renderNavbar();
  if (!state.data) {
    app.innerHTML = `<div class="loading">Đang tải dữ liệu...</div>`;
    return;
  }
  if (state.data.requiresAuth && state.page !== "settings") {
    renderLogin();
    bindPageEvents();
    return;
  }
  if (state.page === "settings") {
    if (!state.data.isSettingsUnlocked) renderSettingsPrompt();
    else renderSettings();
  } else {
    renderHome();
  }
  bindPageEvents();
}

function renderLogin() {
  app.innerHTML = `
    <section class="panel" style="max-width: 520px; margin: 30px auto;">
      <div class="panel-header">Yêu cầu xác thực</div>
      <div class="panel-body">
        <p class="muted">Vui lòng nhập mật khẩu để tiếp tục.</p>
        <form id="login-form">
          <div class="form-group"><input type="password" name="password" placeholder="Mật khẩu..." required /></div>
          <button class="btn-primary" type="submit">Đăng nhập</button>
        </form>
      </div>
    </section>
  `;
}

function renderNavbar() {
  navbar.innerHTML = `
    <div class="navbar">
      <div class="brand">Hệ Thống Cấp Tài Khoản</div>
      <div class="nav-actions">
        <a href="/home" class="nav-link ${state.page === "home" ? "active" : ""}" data-route="home">Trang Chính</a>
        <a href="/settings" class="nav-link ${state.page === "settings" ? "active" : ""}" data-route="settings">Settings</a>
        ${state.data?.isSettingsUnlocked ? `<a href="#" class="btn-logout" data-action="logout">Đăng xuất</a>` : ""}
      </div>
    </div>
  `;
}

function renderHome() {
  const settings = state.data.settings;
  const order = (settings.display.display_panel_order || "").split(",").filter(Boolean);
  const panels = {
    account_panel: renderAccountPanel,
    search_old_accounts_panel: renderSearchPanel,
    video_panel: renderVideoPanel,
    icloud_panel: renderIcloudPanel,
    withdrawal_email_panel: renderWithdrawalPanel,
    link_submission_panel: renderLinkSubmissionPanel
  };
  const html = order.map((id) => panels[id]?.(settings)).filter(Boolean).join("");
  const showQuickLiteVideo = settings.display.display_video_panel === "true" && settings.display.display_video_lite_60 === "true";
  app.innerHTML = `
    <div class="page-head">
      <div>
        <p class="page-eyebrow">Bảng điều khiển</p>
        <h1>Hệ thống cấp tài khoản</h1>
      </div>
      <div class="head-actions">
        <div class="head-meta">
          <span>Mail: ${state.data.stats.remainingMail}</span>
          <span>TK thường: ${state.data.stats.remainingNormal}</span>
          <span>2FA: ${state.data.stats.remaining2FA}</span>
        </div>
        ${showQuickLiteVideo ? renderLiteVideoButton("head-video-button") : ""}
      </div>
    </div>
    <div class="dashboard-grid">${html || `<section class="panel"><div class="empty">Chưa bật panel nào.</div></section>`}</div>
  `;
}

function renderAccountPanel(settings) {
  if (settings.display.display_account_panel !== "true") return "";
  const stats = state.data.stats;
  const issued = state.currentAccount?.account || {};
  const issuedRaw = state.currentAccount?.raw || "";
  const issuedEmail = issued.email || "";
  const issuedUsername = issued.username || "";
  const issuedPassword = issued.password || "";
  const issuedSecret = issued.twofaSecret || "";
  const issued2FACode = issued.twofaCode || "";
  const issuedType = state.currentAccount?.issuedType || "mail";
  const displayedUsername = issuedUsername || issuedEmail;
  const displayedPassword = issuedType === "mail" ? issuedPassword : (settings.defaultPasswordEnabled ? settings.defaultPassword : issuedPassword);
  const displayed2FA = issuedType === "2fa" && issued2FACode ? issued2FACode : issuedSecret;
  const twofaInputName = issuedType === "2fa" && issued2FACode ? "twofa_code" : "secret";
  const emptyState = `
    <div class="account-choice">
      <p class="muted">Chọn loại tài khoản bạn muốn lấy:</p>
      <div class="account-choice-actions">
        <button class="btn-refresh" data-action="get-account" data-type="mail">${settingsIcon("mail")}<span>Lấy Mail Đăng ký</span></button>
        <button class="btn-refresh" data-action="get-account" data-type="normal">${settingsIcon("users")}<span>Lấy Tài khoản Thường</span></button>
        <button class="btn-green" data-action="get-account" data-type="2fa">${settingsIcon("shield")}<span>Lấy Tài khoản 2FA</span></button>
      </div>
    </div>
  `;
  const issuedState = `
    <form id="save-2fa-client-form" class="issued-card">
      <input type="hidden" name="email" value="${escapeAttr(issuedEmail || displayedUsername)}" />
      <input type="hidden" name="mail_password" value="${escapeAttr(issuedPassword)}" />
      <div class="issued-actions two-col">
        <button type="button" class="btn-green" data-action="get-mail-code"># Get Code</button>
        <button type="button" class="btn-teal" data-action="open-mailbox">Đọc Hòm Thư</button>
      </div>
      <div class="issued-divider"></div>
      ${issuedType === "2fa" && issuedSecret ? `<input type="hidden" name="secret" value="${escapeAttr(issuedSecret)}" />` : ""}
      <div class="form-group">
        <label>User TikTok:</label>
        <div class="copy-field">
          <input name="username" value="${escapeAttr(displayedUsername)}" placeholder="Nhập User TikTok mới tạo" />
          <button type="button" class="copy-icon-btn" data-copy="${escapeAttr(displayedUsername)}" aria-label="Copy user TikTok">Copy</button>
        </div>
      </div>
      <div class="form-group">
        <label>Password:</label>
        <div class="copy-field">
          <input name="password" value="${escapeAttr(displayedPassword)}" placeholder="Password..." />
          <button type="button" class="copy-icon-btn" data-copy="${escapeAttr(displayedPassword)}" aria-label="Copy password">Copy</button>
        </div>
      </div>
      <div class="form-group">
        <label>Mã 2FA:</label>
        <div class="copy-field">
          <input name="${twofaInputName}" value="${escapeAttr(displayed2FA)}" placeholder="Để trống nếu không có 2FA" />
          <button type="button" class="copy-icon-btn" data-copy="${escapeAttr(displayed2FA)}" aria-label="Copy 2FA">Copy</button>
        </div>
      </div>
      <button class="btn-save wide" type="submit">Lưu Tài Khoản</button>
      <div class="account-switch">
        <p class="muted">Đổi loại tài khoản:</p>
        <div class="account-switch-actions">
          <button type="button" class="btn-refresh" data-action="get-account" data-type="mail">Mail ĐK</button>
          <button type="button" class="btn-refresh" data-action="get-account" data-type="normal">TK Thường</button>
          <button type="button" class="btn-green" data-action="get-account" data-type="2fa">TK 2FA</button>
        </div>
      </div>
      <button type="button" class="wide" data-action="clear-account">Chọn loại tài khoản khác</button>
    </form>
  `;
  return `
    <section class="panel account-panel">
      <div class="panel-header account-header">
        <span>Tài Khoản</span>
        <div class="account-header-stats">
          <span>Mail ĐK: <strong>${stats.remainingMail}</strong></span>
          <span>TK Thường: <strong>${stats.remainingNormal}</strong></span>
          <span>2FA: <strong>${stats.remaining2FA}</strong></span>
          <span>H.nay: <strong>${stats.usedToday}</strong></span>
        </div>
      </div>
      <div class="panel-body">
        ${state.currentAccount ? issuedState : emptyState}
      </div>
    </section>
  `;
}

function renderSearchPanel(settings) {
  if (settings.display.display_search_old_accounts_panel !== "true") return "";
  return `
    <section class="panel search-panel">
      <div class="panel-header"><span>Tra Cứu Tài Khoản Cũ</span><small>Tìm theo STT hoặc tài khoản</small></div>
      <div class="panel-body">
        <input id="old-account-search" placeholder="Gõ #STT hoặc tên tài khoản để tìm..." />
        <div id="search-results" class="search-results">Gõ để tìm kiếm...</div>
      </div>
    </section>
  `;
}

function renderVideoPanel(settings) {
  if (settings.display.display_video_panel !== "true") return "";
  return `
    <section class="panel video-panel">
      <div class="panel-header"><span>Xem Video</span><small>Mở nhóm video nhanh</small></div>
      <div class="panel-body">
        <div class="button-row">
          ${settings.display.display_video_normal_60 === "true" ? `<button data-video-group="normal">Video Thường 60p</button>` : ""}
          ${settings.display.display_video_lite_180 === "true" ? `<button data-video-group="lite180">Video Lite 180p</button>` : ""}
        </div>
      </div>
    </section>
  `;
}

function renderLiteVideoButton(extraClass = "") {
  const liteProgress = getLiteVideoProgress();
  const nextIndex = liteProgress % LITE_VIDEO_SEQUENCE.length;
  return `
    <form class="lite-video-form ${extraClass}" action="${escapeAttr(LITE_VIDEO_SEQUENCE[nextIndex])}" method="get">
      <button type="submit" data-lite-sequence-button class="video-sequence-button">Video Lite 10-20p</button>
    </form>
  `;
}

function renderIcloudPanel(settings) {
  if (settings.display.display_icloud_panel !== "true") return "";
  return `
    <section class="panel utility-panel icloud-panel">
      <div class="panel-header"><span>Thông tin iCloud</span><small>Copy nhanh</small></div>
      <div class="panel-body">
        <div class="form-group"><label>Tài khoản:</label><div class="button-row"><input readonly value="${escapeAttr(settings.icloudAccount || "")}" /><button data-copy="${escapeAttr(settings.icloudAccount || "")}">Copy</button></div></div>
        <div class="form-group"><label>Mật khẩu:</label><div class="button-row"><input readonly value="${escapeAttr(settings.icloudPassword || "")}" /><button data-copy="${escapeAttr(settings.icloudPassword || "")}">Copy</button></div></div>
      </div>
    </section>
  `;
}

function renderWithdrawalPanel(settings) {
  if (settings.display.display_withdrawal_email_panel !== "true") return "";
  const email = randomEmail(settings.withdrawalDomain || "ahhd.pages.dev");
  return `
    <section class="panel utility-panel withdrawal-panel">
      <div class="panel-header"><span>Email Rút tiền nhanh</span><small>Tạo tự động</small></div>
      <div class="panel-body">
        <div class="button-row"><input readonly value="${email}" /><button data-copy="${email}">Copy</button></div>
      </div>
    </section>
  `;
}

function renderLinkSubmissionPanel(settings) {
  if (settings.display.display_link_submission_panel !== "true") return "";
  const requireEmployee = settings.display.display_employee_required === "true";
  return `
    <section class="panel link-panel">
      <div class="panel-header"><span>Đăng Link Giftee</span><small>Lưu link theo nhân viên</small></div>
      <div class="panel-body">
        <form id="submit-links-form">
          ${requireEmployee ? `<div class="form-group"><label>Nhân viên</label><select name="employee" required><option value="">-- Chọn nhân viên --</option>${state.data.employees.map((name) => `<option>${escapeHtml(name)}</option>`).join("")}</select></div>` : `<input type="hidden" name="employee" value="Không chọn" />`}
          <div class="form-group"><label>Danh sách link</label><textarea name="links" placeholder="Dán các link của bạn vào đây, mỗi link một dòng..."></textarea></div>
          <div class="form-actions"><button type="button" data-action="paste-links">Dán</button><button class="btn-save" type="submit">Gửi Link</button><button type="button" data-action="show-link-stats">Thống kê</button></div>
        </form>
      </div>
    </section>
  `;
}

function renderSettingsPrompt() {
  app.innerHTML = `
    <section class="panel" style="max-width: 520px; margin: 30px auto;">
      <div class="panel-header">Mở khóa trang Cài đặt</div>
      <div class="panel-body">
        <p class="muted">Đây là khu vực riêng tư. Vui lòng nhập mật khẩu để tiếp tục.</p>
        <form id="unlock-settings-form">
          <div class="form-group"><input type="password" name="password" placeholder="Mật khẩu..." required /></div>
          <div class="form-actions"><button class="btn-primary" type="submit">Mở khóa</button><a href="/home" class="nav-link" data-route="home">Quay lại Trang chủ</a></div>
        </form>
      </div>
    </section>
  `;
}

function renderSettings() {
  if (!state.settingsData) {
    app.innerHTML = `<div class="loading">Đang tải cài đặt...</div>`;
    loadSettingsData().then(render).catch((error) => showToast(error.message, true));
    return;
  }
  const content = state.selectedManagerPanel || state.selectedSettingsPanel !== "general"
    ? renderSelectedSettingsPanel()
    : `${renderGeneralSettings()}${renderDisplaySettings()}`;
  app.innerHTML = `
    <div class="settings-page">
      <section class="settings-card quick-settings-card">
        <div class="settings-card-title">${settingsIcon("bolt")}<span>Thao tác nhanh</span></div>
        <div class="quick-actions settings-quick-grid">
          ${quickActionButton("videos", "settings", "video", "Thêm Video")}
          ${quickActionButton("employees", "manager", "users", "Quản lý NV")}
          ${quickActionButton("links", "manager", "list", "Quản lý Link")}
          ${quickActionButton("normal", "manager", "user-check", "Quản lý TK Thường")}
          ${quickActionButton("twofa", "manager", "shield", "Quản lý 2FA")}
          ${quickActionButton("mailAccounts", "settings", "mail", "Thêm Email reg")}
          ${quickActionButton("normalAccounts", "settings", "user-plus", "Thêm TK Thường")}
          ${quickActionButton("twofaAccounts", "settings", "shield", "Thêm TK 2FA")}
        </div>
      </section>
      <div class="settings-stack">${content}</div>
      <a href="/home" class="settings-back-link" data-route="home">← Quay lại Trang chủ</a>
    </div>
  `;
}

function settingsMenuButton(id, label) {
  return `<button data-settings-panel="${id}" class="${state.selectedSettingsPanel === id ? "active" : ""}">${label}</button>`;
}

function quickActionButton(id, kind, icon, label) {
  const attr = kind === "manager" ? `data-manager-panel="${id}"` : `data-settings-panel="${id}"`;
  const active = kind === "manager"
    ? state.selectedManagerPanel === id
    : !state.selectedManagerPanel && state.selectedSettingsPanel === id;
  return `<button ${attr} class="${active ? "active" : ""}">${settingsIcon(icon)}<span>${label}</span></button>`;
}

function settingsCard(title, icon, body, className = "") {
  return `
    <section class="settings-card ${className}">
      <div class="settings-card-title">${settingsIcon(icon)}<span>${title}</span></div>
      <div class="settings-card-body">${body}</div>
    </section>
  `;
}

function settingsIcon(name) {
  const icons = {
    bolt: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13 2 4 14h7l-1 8 10-13h-7l0-7Z"/></svg>`,
    users: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm6-1a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 21a6 6 0 0 1 12 0H3Zm11.5 0c-.2-2.1-1-3.9-2.3-5.2A5 5 0 0 1 21 21h-6.5Z"/></svg>`,
    list: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h3v3H4V6Zm5 1h11v2H9V7ZM4 11h3v3H4v-3Zm5 1h11v2H9v-2ZM4 16h3v3H4v-3Zm5 1h11v2H9v-2Z"/></svg>`,
    shield: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5l-8-3Zm0 4 5 1.9V11c0 3.5-2 6.6-5 7.8A8.6 8.6 0 0 1 7 11V7.9L12 6Z"/></svg>`,
    video: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h11a2 2 0 0 1 2 2v1.5L21 7v10l-4-2.5V16a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2Z"/></svg>`,
    "user-plus": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2a7 7 0 0 0-7 7h10.5A6.5 6.5 0 0 1 15 16a7 7 0 0 0-6-2Zm10 1v3h3v2h-3v3h-2v-3h-3v-2h3v-3h2Z"/></svg>`,
    "user-check": `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2a7 7 0 0 0-7 7h11.4a7.6 7.6 0 0 1-.4-2.5c0-1.3.3-2.5.9-3.5A7 7 0 0 0 9 14Zm12.7 1.7-1.4-1.4-4.3 4.3-1.8-1.8-1.4 1.4 3.2 3.2 5.7-5.7Z"/></svg>`,
    api: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 7 3 12l5 5 1.4-1.4L5.8 12l3.6-3.6L8 7Zm8 0-1.4 1.4 3.6 3.6-3.6 3.6L16 17l5-5-5-5Zm-4.1 12 2.2-14h-2L9.9 19h2Z"/></svg>`,
    apple: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.4 13c0-2 1.4-3 1.5-3.1-1-1.4-2.4-1.6-2.9-1.6-1.2-.1-2.4.7-3 0-.6-.7-1.6-.7-2.5-.7-1.3 0-2.6.8-3.3 2-1.4 2.4-.4 6 1 8 .7 1 1.5 2.2 2.6 2.1 1 0 1.4-.7 2.7-.7 1.2 0 1.6.7 2.7.7s1.8-1 2.5-2c.8-1.2 1.1-2.3 1.1-2.4 0 0-2.4-.9-2.4-2.3ZM14.2 7c.5-.7 1-1.6.8-2.5-.8 0-1.8.5-2.4 1.2-.5.6-1 1.6-.8 2.5.9.1 1.8-.5 2.4-1.2Z"/></svg>`,
    mail: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 5h18v14H3V5Zm2 3.2V17h14V8.2l-7 5.1-7-5.1Zm1.5-1.2 5.5 4 5.5-4h-11Z"/></svg>`,
    key: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 14a5 5 0 1 1 4.6-7H22v4h-3v3h-4v-2.1A5 5 0 0 1 8 14Zm0-3a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"/></svg>`,
    display: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v13H3V4Zm2 2v9h14V6H5Zm4 13h6v2H9v-2Z"/></svg>`
  };
  return `<span class="settings-icon">${icons[name] || icons.bolt}</span>`;
}

function renderSelectedSettingsPanel() {
  if (state.selectedManagerPanel) return renderManagerPanel();
  if (state.selectedSettingsPanel === "videos") return renderVideoSettings();
  if (state.selectedSettingsPanel === "accounts") return renderAccountSettings();
  if (state.selectedSettingsPanel === "mailAccounts") return renderMailAccountSettings();
  if (state.selectedSettingsPanel === "normalAccounts") return renderNormalAccountSettings();
  if (state.selectedSettingsPanel === "twofaAccounts") return renderAccountSettings("save-2fa-accounts-form", "twofaAccounts", "Quản lý DS Tài Khoản 2FA", "accounts");
  if (state.selectedSettingsPanel === "display") return renderDisplaySettings();
  return renderGeneralSettings();
}

function renderGeneralSettings() {
  const s = state.settingsData.settings;
  return `
    ${settingsCard("Cài đặt Phương thức API (Get Code)", "api", `
      <form id="save-mail-api-form">
        <div class="radio-stack">
          ${radio("mail_api_method", "oauth2", "OAuth2", s.mail_api_method)}
          ${radio("mail_api_method", "graph_api", "Graph API", s.mail_api_method)}
          ${radio("mail_api_method", "unlimitmail", "UnlimitMail", s.mail_api_method)}
        </div>
        <div class="form-group"><label>API Token (UnlimitMail):</label><input name="mail_api_token" value="${escapeAttr(s.mail_api_token || "")}" /></div>
        <button class="btn-save" type="submit">Lưu Cài đặt API</button>
      </form>
    `)}
    ${settingsCard("Cài đặt iCloud", "apple", `
      <form id="save-icloud-form">
        <div class="form-group"><label>Tài Khoản iCloud</label><input name="icloud_account" value="${escapeAttr(s.icloud_account || "")}" /></div>
        <div class="form-group"><label>Mật khẩu iCloud</label><input name="icloud_password" value="${escapeAttr(s.icloud_password || "")}" /></div>
        <button class="btn-save" type="submit">Lưu thông tin iCloud</button>
      </form>
    `)}
    ${settingsCard("Cài đặt Email Rút Tiền Nhanh", "mail", `
      <form id="save-withdrawal-email-form">
        <p class="muted">Email sẽ được tạo ngẫu nhiên theo dạng: [7-10 ký tự]@[Tên miền]</p>
        <div class="form-group"><label>Tên miền (ví dụ: mail.com):</label><input name="withdrawal_domain" value="${escapeAttr(s.withdrawal_domain || "")}" /></div>
        <button class="btn-save" type="submit">Lưu Cài đặt Email</button>
      </form>
    `)}
    ${settingsCard("Cài đặt Mật khẩu Mặc định", "key", `
      <form id="save-default-password-form">
        ${checkbox("default_password_enabled", "Bật mật khẩu mặc định", s.default_password_enabled)}
        <div class="form-group"><label>Mật khẩu mặc định:</label><input name="default_password" value="${escapeAttr(s.default_password || "")}" /></div>
        <button class="btn-save" type="submit">Lưu Mật khẩu Mặc định</button>
      </form>
    `)}
    ${settingsCard("Bảo vệ bằng mật khẩu", "shield", `
      <form id="save-site-password-form">
        ${checkbox("site_password_enabled", "Bật bảo vệ bằng mật khẩu", s.site_password_enabled)}
        <div class="form-group"><label>Mật khẩu mới (để trống nếu không đổi):</label><input type="password" name="site_password" placeholder="Nhập mật khẩu mới" /></div>
        <button class="btn-save" type="submit">Lưu cài đặt bảo vệ</button>
      </form>
    `)}
    ${settingsCard("Mật khẩu trang Cài đặt", "key", `
      <form id="change-settings-password-form">
        ${checkbox("settings_password_enabled", "Bật mật khẩu trang Cài đặt", s.settings_password_enabled)}
        <p class="muted">Để trống các trường dưới đây nếu chỉ muốn bật/tắt mật khẩu. Mật khẩu mặc định: Zxcv123</p>
        <div class="form-group"><label>Mật khẩu cũ:</label><input type="password" name="current_password" /></div>
        <div class="form-group"><label>Mật khẩu mới (ít nhất 6 ký tự):</label><input type="password" name="new_password" /></div>
        <div class="form-group"><label>Xác nhận mật khẩu mới:</label><input type="password" name="confirm_password" /></div>
        <button class="btn-save" type="submit">Lưu Thay Đổi</button>
      </form>
    `)}
    ${settingsCard("Mật khẩu Quản lý", "list", `
      <form id="save-management-password-form">
        ${checkbox("management_password_enabled", "Bật mật khẩu cho các mục Quản lý", s.management_password_enabled)}
        <p class="muted">Để trống các trường dưới đây nếu chỉ muốn bật/tắt mật khẩu.</p>
        <div class="form-group"><label>Mật khẩu cũ:</label><input type="password" name="current_password" placeholder="Nhập mật khẩu hiện tại..." /></div>
        <div class="form-group"><label>Mật khẩu mới (ít nhất 4 ký tự):</label><input type="password" name="new_password" placeholder="Nhập mật khẩu mới..." /></div>
        <button class="btn-save" type="submit">Lưu Mật khẩu</button>
      </form>
    `)}
  `;
}

function renderVideoSettings() {
  const s = state.settingsData.settings;
  return settingsCard("Quản lý Link Video TikTok", "video", `
    <form id="save-video-links-form">
      <p class="muted">Nhập danh sách link video TikTok, mỗi link trên một dòng.</p>
      <div class="form-group"><label>Link TikTok thường (60 phút)</label><textarea name="video_normal_60">${escapeHtml(s.video_normal_60 || "")}</textarea></div>
      <div class="form-group"><label>Link TikTok Lite (60 phút)</label><textarea name="video_lite_60">${escapeHtml(s.video_lite_60 || "")}</textarea></div>
      <div class="form-group"><label>Link TikTok Lite (180 phút)</label><textarea name="video_lite_180">${escapeHtml(s.video_lite_180 || "")}</textarea></div>
      <button class="btn-save" type="submit">Lưu Danh sách Link Video</button>
    </form>
  `);
}

function renderAccountSettings(formId, key, title, fieldName) {
  if (!formId) {
    return settingsCard("Quản lý DS Tài Khoản Thường / Mail ĐK", "user-plus", `
      <form id="save-accounts-form">
        <p class="muted">Mỗi tài khoản một dòng. Mail ĐK dùng cho nút Lấy Mail Đăng ký, TK Thường dùng cho nút Lấy Tài khoản Thường.</p>
        <div class="form-group"><label>Danh sách Mail ĐK</label><textarea name="accounts_mail">${escapeHtml(state.settingsData.mailAccounts || "")}</textarea></div>
        <div class="form-group"><label>Danh sách TK Thường</label><textarea name="accounts_normal">${escapeHtml(state.settingsData.normalAccounts || "")}</textarea></div>
        <button class="btn-save" type="submit">Lưu Danh Sách</button>
      </form>
    `);
  }
  return settingsCard(title, "shield", `
    <form id="${formId}">
      <p class="muted">Mỗi tài khoản một dòng. Hỗ trợ định dạng user|pass, email|pass, hoặc Email|User2FA|Password|2FA_SecretKey|Timestamp.</p>
      <div class="form-group"><textarea name="${fieldName}">${escapeHtml(state.settingsData[key] || "")}</textarea></div>
      <button class="btn-save" type="submit">Lưu Danh Sách</button>
    </form>
  `);
}

function renderMailAccountSettings() {
  return settingsCard("Quản lý DS Mail Đăng ký", "mail", `
    <form id="save-mail-accounts-form">
      <p class="muted">Định dạng: email|pass. Mỗi mail một dòng.</p>
      <div class="form-group"><textarea name="accounts">${escapeHtml(state.settingsData.mailAccounts || "")}</textarea></div>
      <button class="btn-save" type="submit">Lưu Danh Sách</button>
    </form>
  `);
}

function renderNormalAccountSettings() {
  return settingsCard("Quản lý DS Tài Khoản Thường (Nguồn cấp)", "user-plus", `
    <form id="save-normal-accounts-form">
      <p class="muted">Định dạng: Email|User|Password|Timestamp hoặc user|pass. Mỗi tài khoản một dòng.</p>
      <div class="form-group"><textarea name="accounts">${escapeHtml(state.settingsData.normalAccounts || "")}</textarea></div>
      <button class="btn-save" type="submit">Lưu Danh Sách</button>
    </form>
  `);
}

function renderDisplaySettings() {
  const s = state.settingsData.settings;
  return settingsCard("Cài đặt Hiển thị", "display", `
    <form id="save-display-form">
      <p class="muted">Bật/tắt và sắp xếp các thành phần hiển thị trên trang chủ.</p>
      <h4>Nội dung Panel (Bật/Tắt)</h4>
      <div class="check-list">
        ${checkbox("display_account_panel", "Panel Tài Khoản Chính", s.display_account_panel)}
        ${checkbox("display_video_panel", "Panel Xem Video", s.display_video_panel)}
        ${checkbox("display_video_normal_60", "Nút Video TikTok Thường 60p", s.display_video_normal_60)}
        ${checkbox("display_video_lite_60", "Nút Video TikTok Lite 60p", s.display_video_lite_60)}
        ${checkbox("display_video_lite_180", "Nút Video TikTok Lite 180p", s.display_video_lite_180)}
        ${checkbox("display_icloud_panel", "Panel Thông tin iCloud", s.display_icloud_panel)}
        ${checkbox("display_withdrawal_email_panel", "Panel Email Rút tiền nhanh", s.display_withdrawal_email_panel)}
        ${checkbox("display_link_submission_panel", "Panel Đăng Link", s.display_link_submission_panel)}
        ${checkbox("display_employee_required", "Yêu cầu chọn Tên Nhân viên", s.display_employee_required)}
        ${checkbox("display_search_old_accounts_panel", "Panel Tra Cứu TK Cũ", s.display_search_old_accounts_panel)}
        ${checkbox("display_2fa_form", "Hiển thị Form 2FA", s.display_2fa_form)}
      </div>
      <div class="form-group"><label>Thứ tự panel</label><input name="display_panel_order" value="${escapeAttr(s.display_panel_order || "")}" /></div>
      <button class="btn-save" type="submit">Lưu Cài đặt Hiển thị</button>
    </form>
  `);
}

function renderManagerPanel() {
  if (state.selectedManagerPanel === "employees") return settingsCard("Quản lý Nhân viên", "users", `<div id="manager-content">${renderEmployeeManager()}</div>`);
  if (state.selectedManagerPanel === "links") return settingsCard("Quản lý Link Đã Đăng", "list", `<div id="manager-content">${renderStatsManager("link")}</div>`);
  if (state.selectedManagerPanel === "normal") return settingsCard("Quản lý TK Thường (Đã Đăng Ký)", "user-check", `<div id="manager-content">${renderStatsManager("normal")}</div>`);
  if (state.selectedManagerPanel === "twofa") return settingsCard("Quản lý Dữ liệu 2FA", "shield", `<div id="manager-content">${renderStatsManager("twofa")}</div>`);
  return "";
}

function renderEmployeeManager() {
  const rows = (state.managerData?.employees || state.settingsData.employees || []).map((name, index) => `
    <tr><td><input data-employee-index="${index}" value="${escapeAttr(name)}" /></td><td><button class="btn-danger btn-small" data-remove-employee="${index}">Xóa</button></td></tr>
  `).join("");
  return `
    <h3>Quản lý Nhân viên</h3>
    <div class="form-actions"><button data-manager-tab="employees">Danh sách Nhân viên</button><button data-action="load-employee-stats">Thống kê chi tiết</button></div>
    <div class="table-wrap"><table><tbody id="employee-list">${rows || `<tr><td>Chưa có nhân viên.</td></tr>`}</tbody></table></div>
    <div class="form-actions"><input id="new-employee-name" placeholder="Nhập tên nhân viên mới..." /><button data-action="add-employee">Thêm</button><button class="btn-save" data-action="save-employees">Lưu Thay Đổi</button></div>
    <div id="employee-stats"></div>
  `;
}

function renderStatsManager(type) {
  const title = type === "link" ? "Thống kê Link theo ngày" : type === "normal" ? "Thống kê TK Thường theo ngày" : "Thống kê 2FA theo ngày";
  return `<h3>${title}</h3><div id="stats-table" class="loading">Đang tải...</div>`;
}

function bindPageEvents() {
  document.querySelectorAll("[data-route]").forEach((link) => {
    link.addEventListener("click", (event) => {
      event.preventDefault();
      state.page = link.dataset.route;
      history.pushState({}, "", state.page === "settings" ? "/settings" : "/home");
      render();
    });
  });

  document.querySelectorAll("form:not(.lite-video-form)").forEach((form) => form.addEventListener("submit", handleSubmit));
  document.querySelectorAll("[data-action]").forEach((el) => el.addEventListener("click", handleAction));
  document.querySelectorAll("[data-remove-employee]").forEach((el) => el.addEventListener("click", () => {
    el.closest("tr")?.remove();
  }));
  document.querySelectorAll("[data-copy]").forEach((el) => el.addEventListener("click", () => copyText(el.dataset.copy || "")));
  document.querySelectorAll(".lite-video-form").forEach((el) => el.addEventListener("submit", updateLiteVideoProgress));
  document.querySelectorAll("[data-video-group]").forEach((el) => el.addEventListener("click", () => openVideoGroup(el.dataset.videoGroup)));
  document.querySelectorAll("[data-settings-panel]").forEach((el) => el.addEventListener("click", () => {
    state.selectedManagerPanel = null;
    state.selectedSettingsPanel = el.dataset.settingsPanel;
    render();
  }));
  document.querySelectorAll("[data-manager-panel]").forEach((el) => el.addEventListener("click", async () => {
    await openManager(el.dataset.managerPanel);
  }));
  const search = document.getElementById("old-account-search");
  if (search) search.addEventListener("input", debounce(handleSearch, 300));
  if (state.selectedManagerPanel === "links") loadStatsTable("link");
  if (state.selectedManagerPanel === "normal") loadStatsTable("normal");
  if (state.selectedManagerPanel === "twofa") loadStatsTable("twofa");
}

async function handleSubmit(event) {
  event.preventDefault();
  const form = event.target;
  const data = formToJson(form);
  const map = {
    "unlock-settings-form": "unlock_settings",
    "login-form": "login",
    "submit-links-form": "submit_user_links",
    "save-2fa-client-form": "submit_2fa_info",
    "save-video-links-form": "save_video_links",
    "save-accounts-form": "save_account_list",
    "save-mail-accounts-form": "save_account_list",
    "save-normal-accounts-form": "save_normal_account_list",
    "save-2fa-accounts-form": "save_account_2fa_list",
    "save-mail-api-form": "save_mail_api_settings",
    "save-icloud-form": "save_icloud_settings",
    "save-withdrawal-email-form": "save_withdrawal_email_settings",
    "save-default-password-form": "save_default_password_settings",
    "save-site-password-form": "save_site_password_settings",
    "save-display-form": "save_display_settings",
    "change-settings-password-form": "change_settings_password",
    "save-management-password-form": "save_management_password"
  };
  try {
    const action = map[form.id];
    if (!action) return;
    let result;
    if (form.id === "save-accounts-form") {
      await api("save_account_list", { accounts: data.accounts_mail || "" });
      result = await api("save_normal_account_list", { accounts: data.accounts_normal || "" });
    } else if (form.id === "save-mail-accounts-form" || form.id === "save-normal-accounts-form") {
      result = await api(action, { accounts: data.accounts || "" });
    } else {
      if (form.id === "save-2fa-accounts-form") data.accounts = data.accounts || "";
      result = await api(action, data);
    }
    showToast(result.message || "Đã lưu.");
    await loadInitialData();
    if (state.data.isSettingsUnlocked) await loadSettingsData();
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function handleAction(event) {
  const action = event.currentTarget.dataset.action;
  try {
    if (action === "logout") {
      await api("logout");
      state.data = null;
      state.settingsData = null;
      await loadInitialData();
      render();
    }
    if (action === "get-account") {
      const type = event.currentTarget.dataset.type;
      const endpoint = type === "normal" ? "get_normal_account_client" : type === "2fa" ? "get_2fa_account_client" : "get_account_client";
      const result = await api(endpoint);
      if (!result.ok) throw new Error(result.message);
      state.currentAccount = { ...result, issuedType: type, savedAt: Date.now() };
      saveStoredCurrentAccount(state.currentAccount);
      await loadInitialData();
      render();
      showToast(result.message);
    }
    if (action === "clear-account") {
      state.currentAccount = null;
      clearStoredCurrentAccount();
      render();
    }
    if (action === "paste-links") {
      const text = await navigator.clipboard.readText();
      const textarea = document.querySelector("#submit-links-form textarea");
      if (textarea) textarea.value = text;
    }
    if (action === "show-link-stats") {
      await showLinkStatsModal();
    }
    if (action === "get-mail-code") {
      const email = document.querySelector('input[name="email"]')?.value || "";
      const result = await api("get_tiktok_mail_code", { email });
      showToast(result.code ? `Code: ${result.code}` : result.message || "Chưa có code.");
    }
    if (action === "open-mailbox") {
      showToast("Chưa cấu hình hòm thư/API đọc mail.", true);
    }
    if (action === "add-employee") addEmployeeRow();
    if (action === "save-employees") await saveEmployeeRows();
    if (action === "load-employee-stats") await loadEmployeeStats();
  } catch (error) {
    showToast(error.message, true);
  }
}

async function openManager(panel) {
  try {
    if (!state.data.isManagerUnlocked) await promptManagerPassword();
    state.selectedManagerPanel = panel;
    state.selectedSettingsPanel = "general";
    if (panel === "employees") state.managerData = await api("get_employee_manager_data", {}, "GET");
    render();
  } catch (error) {
    showToast(error.message, true);
  }
}

function promptManagerPassword() {
  return new Promise((resolve, reject) => {
    modalRoot.innerHTML = `
      <div class="modal-backdrop">
        <div class="modal">
          <div class="modal-header">Xác thực Quyền Quản lý <button data-close-modal>×</button></div>
          <div class="modal-body">
            <p>Vui lòng nhập mật khẩu chung để tiếp tục.</p>
            <form id="manager-unlock-form"><div class="form-group"><input type="password" name="password" placeholder="Mật khẩu..." /></div><button class="btn-primary" type="submit">Mở khóa</button></form>
          </div>
        </div>
      </div>`;
    document.querySelector("[data-close-modal]").onclick = () => {
      closeModal();
      reject(new Error("Đã hủy."));
    };
    document.getElementById("manager-unlock-form").onsubmit = async (event) => {
      event.preventDefault();
      try {
        await api("unlock_manager", formToJson(event.target));
        await loadInitialData();
        closeModal();
        resolve();
      } catch (error) {
        reject(error);
      }
    };
  });
}

async function loadStatsTable(type) {
  const target = document.getElementById("stats-table");
  if (!target) return;
  const action = type === "link" ? "get_link_stats" : type === "normal" ? "get_normal_account_stats" : "get_2fa_list";
  const data = await api(action, {}, "GET");
  const stats = data.stats || [];
  target.innerHTML = `
    <div class="table-wrap">
      <table>
        <thead><tr><th>Ngày</th><th>Số lượng</th><th>Hành động</th></tr></thead>
        <tbody>${stats.map((row) => `<tr><td>${row.date}</td><td>${row.count}</td><td><button class="btn-small" data-view-stat="${type}" data-date="${row.date}">Xem</button> <button class="btn-small" data-download-stat="${type}" data-date="${row.date}" data-format="txt">TXT</button> <button class="btn-small" data-download-stat="${type}" data-date="${row.date}" data-format="csv">CSV</button> <button class="btn-danger btn-small" data-delete-stat="${type}" data-date="${row.date}">Xóa</button></td></tr>`).join("") || `<tr><td colspan="3">Chưa có dữ liệu.</td></tr>`}</tbody>
      </table>
    </div>`;
  target.querySelectorAll("[data-view-stat]").forEach((btn) => btn.addEventListener("click", () => viewStat(type, btn.dataset.date)));
  target.querySelectorAll("[data-download-stat]").forEach((btn) => btn.addEventListener("click", () => downloadStat(type, btn.dataset.date, btn.dataset.format)));
  target.querySelectorAll("[data-delete-stat]").forEach((btn) => btn.addEventListener("click", () => deleteStat(type, btn.dataset.date)));
}

async function viewStat(type, date) {
  const action = type === "link" ? "view_links" : type === "normal" ? "view_normal_accounts_by_date" : "view_2fa_by_date";
  const data = await api(action, { date }, "GET");
  const rows = data.links || data.accounts || data.records || [];
  showModal(`Chi tiết ${date}`, `<pre>${escapeHtml(JSON.stringify(rows, null, 2))}</pre>`);
}

async function downloadStat(type, date, format) {
  const action = type === "link" ? "view_links" : type === "normal" ? "view_normal_accounts_by_date" : "view_2fa_by_date";
  const data = await api(action, { date }, "GET");
  const rows = data.links || data.accounts || data.records || [];
  const text = format === "csv" ? toCsv(rows) : rows.map((row) => row.link || row.raw || JSON.stringify(row)).join("\n");
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${type}-${date}.${format}`;
  a.click();
  URL.revokeObjectURL(a.href);
}

async function deleteStat(type, date) {
  if (!confirm(`Xóa dữ liệu ngày ${date}?`)) return;
  const action = type === "link" ? "delete_link_file" : type === "normal" ? "delete_normal_accounts_by_date" : "delete_2fa_day_file";
  await api(action, { date });
  await loadStatsTable(type);
}

async function loadEmployeeStats() {
  const data = await api("get_employee_manager_data", {}, "GET");
  const target = document.getElementById("employee-stats");
  target.innerHTML = `
    <h4>Thống kê chi tiết</h4>
    <table><thead><tr><th>Ngày</th><th>Số link</th><th></th></tr></thead><tbody>
      ${(data.stats || []).map((row) => `<tr><td>${row.date}</td><td>${row.count}</td><td><button class="btn-small" data-employee-day="${row.date}">Xem</button></td></tr>`).join("") || `<tr><td colspan="3">Chưa có dữ liệu.</td></tr>`}
    </tbody></table>`;
  target.querySelectorAll("[data-employee-day]").forEach((btn) => btn.addEventListener("click", async () => {
    const detail = await api("get_daily_employee_stats", { date: btn.dataset.employeeDay }, "GET");
    showModal(`Thống kê ${btn.dataset.employeeDay}`, `<pre>${escapeHtml(JSON.stringify(detail.breakdown, null, 2))}</pre>`);
  }));
}

function addEmployeeRow() {
  const input = document.getElementById("new-employee-name");
  const name = input.value.trim();
  if (!name) return;
  const tbody = document.getElementById("employee-list");
  const index = tbody.querySelectorAll("input[data-employee-index]").length;
  tbody.insertAdjacentHTML("beforeend", `<tr><td><input data-employee-index="${index}" value="${escapeAttr(name)}" /></td><td><button class="btn-danger btn-small" data-remove-employee="${index}">Xóa</button></td></tr>`);
  input.value = "";
}

async function saveEmployeeRows() {
  const employees = [...document.querySelectorAll("input[data-employee-index]")].map((input) => input.value.trim()).filter(Boolean);
  const result = await api("save_employees", { employees });
  showToast(result.message);
  await loadInitialData();
}

async function handleSearch(event) {
  const query = event.target.value.trim();
  const target = document.getElementById("search-results");
  if (!query) {
    target.textContent = "Gõ để tìm kiếm...";
    return;
  }
  try {
    const data = await api("search_old_accounts", { query }, "GET");
    target.innerHTML = (data.results || []).map((row) => `<div><strong>#${row.id}</strong> ${escapeHtml(row.raw)}</div>`).join("") || "Không tìm thấy.";
  } catch (error) {
    target.textContent = error.message;
  }
}

function openVideoGroup(group) {
  const settings = state.data.settings;
  const links = group === "normal" ? [settings.videoNormal60].filter(Boolean) : settings.videoLite180;
  if (links.length === 1) {
    window.open(links[0], "_blank", "noopener,noreferrer");
    return;
  }
  showModal("Chọn video", `<div class="video-grid">${links.map((link, index) => `<a class="action-button" href="${escapeAttr(link)}" target="_blank" rel="noopener noreferrer">Link ${index + 1}</a>`).join("")}</div>`);
}

function updateLiteVideoProgress() {
  const current = getLiteVideoProgress();
  const nextIndex = current % LITE_VIDEO_SEQUENCE.length;
  const nextNumber = nextIndex + 1;
  saveLiteVideoProgress(nextNumber);
}

async function showLinkStatsModal() {
  const data = await api("get_link_stats", {}, "GET");
  showModal("Thống kê Link", `<table><thead><tr><th>Ngày</th><th>Số lượng</th></tr></thead><tbody>${(data.stats || []).map((row) => `<tr><td>${row.date}</td><td>${row.count}</td></tr>`).join("") || `<tr><td colspan="2">Chưa có dữ liệu.</td></tr>`}</tbody></table>`);
}

function showModal(title, body) {
  modalRoot.innerHTML = `<div class="modal-backdrop"><div class="modal"><div class="modal-header">${title}<button data-close-modal>×</button></div><div class="modal-body">${body}</div></div></div>`;
  document.querySelector("[data-close-modal]").onclick = closeModal;
  document.querySelector(".modal-backdrop").addEventListener("click", (event) => {
    if (event.target.classList.contains("modal-backdrop")) closeModal();
  });
}

function closeModal() {
  modalRoot.innerHTML = "";
}

function formToJson(form) {
  const data = Object.fromEntries(new FormData(form).entries());
  form.querySelectorAll("input[type=checkbox]").forEach((input) => {
    data[input.name] = input.checked ? "true" : "false";
  });
  return data;
}

function checkbox(name, label, value) {
  return `<label class="check-row"><input type="checkbox" name="${name}" ${value === "true" ? "checked" : ""} /> ${label}</label>`;
}

function radio(name, value, label, current) {
  return `<label class="check-row"><input type="radio" name="${name}" value="${value}" ${current === value ? "checked" : ""} /> ${label}</label>`;
}

function copyText(text) {
  navigator.clipboard.writeText(text || "");
  showToast("Đã copy.");
}

function randomEmail(domain) {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  const len = 7 + Math.floor(Math.random() * 4);
  let name = "";
  for (let i = 0; i < len; i += 1) name += chars[Math.floor(Math.random() * chars.length)];
  return `${name}@${domain}`;
}

function showToast(message, isError = false) {
  const root = document.getElementById("toast-root");
  root.innerHTML = `<div class="toast ${isError ? "error" : ""}">${escapeHtml(message)}</div>`;
  setTimeout(() => (root.innerHTML = ""), 3500);
}

function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

function toCsv(rows) {
  if (!rows.length) return "";
  const keys = Object.keys(rows[0]);
  return [keys.join(","), ...rows.map((row) => keys.map((key) => JSON.stringify(row[key] ?? "")).join(","))].join("\n");
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
}

function escapeAttr(value) {
  return escapeHtml(value);
}

function loadStoredCurrentAccount() {
  try {
    const raw = localStorage.getItem(CURRENT_ACCOUNT_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function saveStoredCurrentAccount(account) {
  try {
    localStorage.setItem(CURRENT_ACCOUNT_STORAGE_KEY, JSON.stringify(account));
  } catch {
    // Ignore storage failures; the current page state still works.
  }
}

function clearStoredCurrentAccount() {
  try {
    localStorage.removeItem(CURRENT_ACCOUNT_STORAGE_KEY);
  } catch {
    // Ignore storage failures.
  }
}

function getLiteVideoProgress() {
  try {
    const value = Number(localStorage.getItem(LITE_VIDEO_PROGRESS_KEY) || "0");
    return Number.isInteger(value) && value >= 1 && value <= LITE_VIDEO_SEQUENCE.length ? value : 0;
  } catch {
    return 0;
  }
}

function saveLiteVideoProgress(value) {
  try {
    localStorage.setItem(LITE_VIDEO_PROGRESS_KEY, String(value));
  } catch {
    // Ignore storage failures; the redirect still works.
  }
}

window.addEventListener("popstate", () => {
  state.page = location.pathname.includes("settings") ? "settings" : "home";
  render();
});
