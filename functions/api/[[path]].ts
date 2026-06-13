type Env = {
  DB: D1Database;
  SESSION_SECRET?: string;
};

type Ctx = {
  request: Request;
  env: Env;
};

const SESSION_MAX_AGE = 60 * 60 * 12;
let schemaReady = false;
const DEFAULT_VIDEO_LITE_60 = [
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
  "https://lite.tiktok.com/t/ZS6rUtJ2s/",
  "https://lite.tiktok.com/t/ZSM4coUbQ/",
  "https://lite.tiktok.com/t/ZSuSUyy8F/",
  "https://lite.tiktok.com/t/ZSrGTt2F5/",
  "https://lite.tiktok.com/t/ZSrjqdo5Q/"
].join("\n");

const defaultSettings: Record<string, string> = {
  settings_password_hash: "",
  manager_password_hash: "",
  site_password_enabled: "false",
  site_password_hash: "",
  default_password_enabled: "true",
  default_password: "Phat3479@",
  video_normal_60: "https://vt.tiktok.com/ZSBQ8GVqD/",
  video_lite_60: DEFAULT_VIDEO_LITE_60,
  video_lite_180: "https://www.icloud.com/shortcuts/06edcf1bdaa24bc791c865be824172e4",
  icloud_account: "",
  icloud_password: "",
  withdrawal_domain: "ahhd.pages.dev",
  mail_api_method: "oauth2",
  mail_api_token: "",
  display_account_panel: "true",
  display_video_panel: "true",
  display_video_normal_60: "true",
  display_video_lite_60: "true",
  display_video_lite_180: "true",
  display_icloud_panel: "true",
  display_withdrawal_email_panel: "true",
  display_link_submission_panel: "true",
  display_employee_required: "true",
  display_search_old_accounts_panel: "true",
  display_2fa_form: "true",
  display_panel_order: "account_panel,search_old_accounts_panel,video_panel,icloud_panel,withdrawal_email_panel,link_submission_panel"
};

export const onRequest = async (ctx: Ctx) => {
  try {
    if (!ctx.env.DB) return response({ ok: false, message: "Chua gan D1 binding DB." }, 500);
    await ensureSchema(ctx.env.DB);
    const url = new URL(ctx.request.url);
    const action = url.searchParams.get("action") || "";
    const method = ctx.request.method.toUpperCase();
    if (method === "OPTIONS") return new Response(null, { status: 204 });

    const body = method === "GET" ? Object.fromEntries(url.searchParams) : await readBody(ctx.request);
    const session = await readSession(ctx.request, ctx.env);

    switch (action) {
      case "get_initial_data":
        return response(await getInitialData(ctx.env.DB, session));
      case "unlock_settings":
        return unlock(ctx, body, "admin", "settings_password_hash", "admin_session");
      case "unlock_manager":
        return unlock(ctx, body, "manager", "manager_password_hash", "manager_session");
      case "login":
        return loginSite(ctx, body);
      case "logout":
        return response({ ok: true, message: "Da dang xuat." }, 200, [
          clearCookie(ctx.request, "admin_session"),
          clearCookie(ctx.request, "manager_session"),
          clearCookie(ctx.request, "site_session")
        ]);
      case "get_account_client":
        return response(await issueAccount(ctx.env.DB, "mail"));
      case "get_normal_account_client":
        return response(await issueAccount(ctx.env.DB, "normal"));
      case "get_2fa_account_client":
        return response(await issueAccount(ctx.env.DB, "2fa"));
      case "search_old_accounts":
        return response(await searchOldAccounts(ctx.env.DB, String(body.query || "")));
      case "submit_user_links":
        return response(await submitLinks(ctx.env.DB, body));
      case "submit_2fa_info":
        return response(await submit2FA(ctx.env.DB, body));
      case "preview_2fa_code":
      case "get_current_2fa_code_ajax":
        return response(await preview2FA(String(body.secret || body.twofa_secret || "")));
      case "get_settings_data":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await getSettingsData(ctx.env.DB));
      case "save_video_links":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await saveVideoLinks(ctx.env.DB, body));
      case "save_account_list":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await replacePool(ctx.env.DB, "mail", String(body.accounts || "")));
      case "save_normal_account_list":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await replacePool(ctx.env.DB, "normal", String(body.accounts || "")));
      case "save_account_2fa_list":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await replacePool(ctx.env.DB, "2fa", String(body.accounts || "")));
      case "save_mail_api_settings":
      case "save_icloud_settings":
      case "save_withdrawal_email_settings":
      case "save_default_password_settings":
      case "save_site_password_settings":
      case "save_display_settings":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await saveSettingsGroup(ctx.env.DB, action, body));
      case "change_settings_password":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await changePassword(ctx.env.DB, body, "settings_password_hash", "Mat khau Settings"));
      case "save_management_password":
        await requireAdmin(ctx.request, ctx.env, session);
        return response(await changePassword(ctx.env.DB, body, "manager_password_hash", "Mat khau Quan ly"));
      case "save_employees":
        await requireManager(ctx.request, ctx.env, session);
        return response(await saveEmployees(ctx.env.DB, body.employees || []));
      case "get_employee_manager_data":
        await requireManager(ctx.request, ctx.env, session);
        return response(await getEmployeeManager(ctx.env.DB));
      case "get_daily_employee_stats":
        await requireManager(ctx.request, ctx.env, session);
        return response(await getDailyEmployeeStats(ctx.env.DB, String(body.date || "")));
      case "get_link_stats":
      case "get_link_manager_content":
        await requireManager(ctx.request, ctx.env, session);
        return response(await getLinkStats(ctx.env.DB));
      case "view_links":
        await requireManager(ctx.request, ctx.env, session);
        return response(await viewLinks(ctx.env.DB, String(body.date || "")));
      case "delete_link_file":
        await requireManager(ctx.request, ctx.env, session);
        return response(await deleteLinksByDate(ctx.env.DB, String(body.date || "")));
      case "get_2fa_list":
        await requireManager(ctx.request, ctx.env, session);
        return response(await get2FAStats(ctx.env.DB));
      case "view_2fa_by_date":
        await requireManager(ctx.request, ctx.env, session);
        return response(await view2FAByDate(ctx.env.DB, String(body.date || "")));
      case "delete_2fa_day_file":
        await requireManager(ctx.request, ctx.env, session);
        return response(await delete2FAByDate(ctx.env.DB, String(body.date || "")));
      case "get_tiktok_mail_code":
        return response({ ok: false, message: "Chua cau hinh API lay code mail." }, 501);
      default:
        return response({ ok: false, message: `Action khong hop le: ${action}` }, 404);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Loi khong xac dinh.";
    const status = message.includes("Unauthorized") ? 401 : 400;
    return response({ ok: false, message }, status);
  }
};

async function ensureSchema(db: D1Database) {
  if (schemaReady) return;

  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS account_pool (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, raw TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'available', issued_at TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS issued_accounts (id INTEGER PRIMARY KEY AUTOINCREMENT, type TEXT NOT NULL, raw TEXT NOT NULL, username TEXT, password TEXT, email TEXT, mail_password TEXT, twofa_secret TEXT, issued_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS employees (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS submitted_links (id INTEGER PRIMARY KEY AUTOINCREMENT, employee TEXT NOT NULL, link TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
    CREATE TABLE IF NOT EXISTS twofa_records (id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT, username TEXT, password TEXT, secret TEXT NOT NULL, code TEXT, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);
  `);

  if (!defaultSettings.settings_password_hash) {
    defaultSettings.settings_password_hash = await sha256("d");
    defaultSettings.manager_password_hash = await sha256("d");
  }

  const marker = await db.prepare("SELECT value FROM settings WHERE key = 'schema_initialized'").first<any>();
  if (!marker) {
    const statements = Object.entries(defaultSettings).map(([key, value]) =>
      db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)").bind(key, value)
    );
    statements.push(db.prepare("INSERT OR IGNORE INTO settings (key, value) VALUES ('schema_initialized', 'true')"));
    for (const name of ["Hung", "Truong", "Tuan Anh", "Cuong", "Huyen"]) {
      statements.push(db.prepare("INSERT OR IGNORE INTO employees (name) VALUES (?)").bind(name));
    }
    await db.batch(statements);
  }

  schemaReady = true;
}

async function getInitialData(db: D1Database, session: Record<string, boolean>) {
  const siteLocked = (await getSetting(db, "site_password_enabled")) === "true" && !session.site && !session.admin;
  if (siteLocked) {
    return {
      ok: true,
      requiresAuth: true,
      isSettingsUnlocked: !!session.admin,
      isManagerUnlocked: !!session.manager,
      settings: {},
      employees: [],
      stats: { remainingMail: 0, remainingNormal: 0, remaining2FA: 0, usedToday: 0, totalUsed: 0 }
    };
  }
  const settings = await publicSettings(db);
  const [remainingMail, remainingNormal, remaining2FA, usedToday, totalUsed] = await Promise.all([
    countPool(db, "mail"),
    countPool(db, "normal"),
    countPool(db, "2fa"),
    scalar(db, "SELECT COUNT(*) AS n FROM issued_accounts WHERE date(issued_at) = date('now')"),
    scalar(db, "SELECT COUNT(*) AS n FROM issued_accounts")
  ]);
  const employees = await listEmployees(db);
  return {
    ok: true,
    requiresAuth: false,
    isSettingsUnlocked: !!session.admin,
    isManagerUnlocked: !!session.manager,
    settings,
    employees,
    stats: { remainingMail, remainingNormal, remaining2FA, usedToday, totalUsed }
  };
}

async function getSettingsData(db: D1Database) {
  return {
    ok: true,
    settings: await allSettings(db),
    employees: await listEmployees(db),
    mailAccounts: await poolLines(db, "mail"),
    normalAccounts: await poolLines(db, "normal"),
    twofaAccounts: await poolLines(db, "2fa")
  };
}

async function publicSettings(db: D1Database) {
  const all = await allSettings(db);
  return {
    videoNormal60: all.video_normal_60 || "",
    videoLite60: lines(all.video_lite_60),
    videoLite180: lines(all.video_lite_180),
    icloudAccount: all.icloud_account || "",
    icloudPassword: all.icloud_password || "",
    withdrawalDomain: all.withdrawal_domain || "ahhd.pages.dev",
    defaultPasswordEnabled: all.default_password_enabled === "true",
    defaultPassword: all.default_password || "",
    display: Object.fromEntries(Object.entries(all).filter(([key]) => key.startsWith("display_")))
  };
}

async function issueAccount(db: D1Database, type: string) {
  const item = await db.prepare("SELECT * FROM account_pool WHERE type = ? AND status = 'available' ORDER BY id LIMIT 1").bind(type).first<any>();
  if (!item) return { ok: false, message: "Da het tai khoan trong kho." };
  await db.prepare("UPDATE account_pool SET status = 'issued', issued_at = CURRENT_TIMESTAMP WHERE id = ?").bind(item.id).run();
  const parsed = parseAccount(item.raw, type);
  await db
    .prepare("INSERT INTO issued_accounts (type, raw, username, password, email, mail_password, twofa_secret) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .bind(type, item.raw, parsed.username, parsed.password, parsed.email, parsed.mailPassword, parsed.twofaSecret)
    .run();
  return { ok: true, message: "Da cap tai khoan.", account: parsed, raw: item.raw };
}

function parseAccount(raw: string, type: string) {
  const parts = raw.split("|").map((part) => part.trim());
  if (type === "2fa") {
    return {
      email: parts[0] || "",
      username: parts[1] || parts[0] || "",
      password: parts[2] || "",
      twofaSecret: parts[3] || "",
      mailPassword: ""
    };
  }
  if (parts.length >= 4) {
    return { username: parts[0] || "", password: parts[1] || "", email: parts[2] || "", mailPassword: parts[3] || "", twofaSecret: "" };
  }
  if ((parts[0] || "").includes("@")) {
    return { username: parts[0] || "", password: parts[1] || "", email: parts[0] || "", mailPassword: parts[1] || "", twofaSecret: "" };
  }
  return { username: parts[0] || "", password: parts[1] || "", email: "", mailPassword: "", twofaSecret: "" };
}

async function searchOldAccounts(db: D1Database, query: string) {
  const q = query.trim();
  if (!q) return { ok: true, results: [] };
  const rows = q.startsWith("#")
    ? await db.prepare("SELECT * FROM issued_accounts WHERE id = ? LIMIT 20").bind(Number(q.slice(1))).all()
    : await db.prepare("SELECT * FROM issued_accounts WHERE raw LIKE ? OR username LIKE ? OR email LIKE ? ORDER BY id DESC LIMIT 30").bind(`%${q}%`, `%${q}%`, `%${q}%`).all();
  return { ok: true, results: rows.results || [] };
}

async function submitLinks(db: D1Database, body: any) {
  const employee = String(body.employee || "").trim();
  const submitted = lines(String(body.links || ""));
  if (!employee) return { ok: false, message: "Chua chon nhan vien." };
  if (!submitted.length) return { ok: false, message: "Chua co link de gui." };
  for (const link of submitted) {
    await db.prepare("INSERT INTO submitted_links (employee, link) VALUES (?, ?)").bind(employee, link).run();
  }
  return { ok: true, message: `Da luu ${submitted.length} link.` };
}

async function submit2FA(db: D1Database, body: any) {
  const secret = String(body.secret || body.twofa_secret || "").trim();
  if (!secret) return { ok: false, message: "Chua nhap secret 2FA." };
  const preview = await preview2FA(secret);
  await db.prepare("INSERT INTO twofa_records (email, username, password, secret, code) VALUES (?, ?, ?, ?, ?)")
    .bind(String(body.email || ""), String(body.username || ""), String(body.password || ""), secret, preview.code || "")
    .run();
  return { ok: true, message: "Da luu thong tin 2FA.", code: preview.code };
}

async function replacePool(db: D1Database, type: string, text: string) {
  await db.prepare("DELETE FROM account_pool WHERE type = ? AND status = 'available'").bind(type).run();
  for (const line of lines(text)) {
    await db.prepare("INSERT INTO account_pool (type, raw) VALUES (?, ?)").bind(type, line).run();
  }
  return { ok: true, message: "Da luu danh sach." };
}

async function saveVideoLinks(db: D1Database, body: any) {
  await setSetting(db, "video_normal_60", String(body.video_normal_60 || ""));
  await setSetting(db, "video_lite_60", String(body.video_lite_60 || ""));
  await setSetting(db, "video_lite_180", String(body.video_lite_180 || ""));
  return { ok: true, message: "Da luu danh sach link video." };
}

async function saveSettingsGroup(db: D1Database, action: string, body: any) {
  const map: Record<string, string[]> = {
    save_mail_api_settings: ["mail_api_method", "mail_api_token"],
    save_icloud_settings: ["icloud_account", "icloud_password"],
    save_withdrawal_email_settings: ["withdrawal_domain"],
    save_default_password_settings: ["default_password_enabled", "default_password"],
    save_site_password_settings: ["site_password_enabled", "site_password"],
    save_display_settings: Object.keys(defaultSettings).filter((key) => key.startsWith("display_"))
  };
  for (const key of map[action] || []) {
    if (key === "site_password") {
      const value = String(body[key] || "");
      if (value) await setSetting(db, "site_password_hash", await sha256(value));
      continue;
    }
    await setSetting(db, key, normalizeSettingValue(body[key]));
  }
  return { ok: true, message: "Da luu cai dat." };
}

async function changePassword(db: D1Database, body: any, settingKey: string, label: string) {
  const current = String(body.current_password || "");
  const next = String(body.new_password || "");
  if (next.length < 4) return { ok: false, message: "Mat khau moi qua ngan." };
  const hash = await getSetting(db, settingKey);
  if (hash !== await sha256(current)) return { ok: false, message: "Mat khau cu khong dung." };
  await setSetting(db, settingKey, await sha256(next));
  return { ok: true, message: `Da doi ${label}.` };
}

async function saveEmployees(db: D1Database, employees: string[]) {
  const clean = [...new Set((employees || []).map((name) => String(name).trim()).filter(Boolean))];
  await db.prepare("DELETE FROM employees").run();
  for (const name of clean) await db.prepare("INSERT INTO employees (name) VALUES (?)").bind(name).run();
  return { ok: true, message: "Da luu nhan vien." };
}

async function getEmployeeManager(db: D1Database) {
  return { ok: true, employees: await listEmployees(db), stats: (await db.prepare("SELECT date(created_at) AS date, COUNT(*) AS count FROM submitted_links GROUP BY date(created_at) ORDER BY date DESC").all()).results || [] };
}

async function getDailyEmployeeStats(db: D1Database, date: string) {
  const rows = (await db.prepare("SELECT employee, link FROM submitted_links WHERE date(created_at) = date(?) ORDER BY employee, id").bind(date).all<any>()).results || [];
  const breakdown: Record<string, { count: number; links: string[] }> = {};
  for (const row of rows) {
    breakdown[row.employee] ||= { count: 0, links: [] };
    breakdown[row.employee].count += 1;
    breakdown[row.employee].links.push(row.link);
  }
  return { ok: true, date, breakdown };
}

async function getLinkStats(db: D1Database) {
  return { ok: true, stats: (await db.prepare("SELECT date(created_at) AS date, COUNT(*) AS count FROM submitted_links GROUP BY date(created_at) ORDER BY date DESC").all()).results || [] };
}

async function viewLinks(db: D1Database, date: string) {
  return { ok: true, links: (await db.prepare("SELECT * FROM submitted_links WHERE date(created_at) = date(?) ORDER BY id").bind(date).all()).results || [] };
}

async function deleteLinksByDate(db: D1Database, date: string) {
  await db.prepare("DELETE FROM submitted_links WHERE date(created_at) = date(?)").bind(date).run();
  return { ok: true, message: "Da xoa link theo ngay." };
}

async function get2FAStats(db: D1Database) {
  return { ok: true, stats: (await db.prepare("SELECT date(created_at) AS date, COUNT(*) AS count FROM twofa_records GROUP BY date(created_at) ORDER BY date DESC").all()).results || [] };
}

async function view2FAByDate(db: D1Database, date: string) {
  return { ok: true, records: (await db.prepare("SELECT * FROM twofa_records WHERE date(created_at) = date(?) ORDER BY id").bind(date).all()).results || [] };
}

async function delete2FAByDate(db: D1Database, date: string) {
  await db.prepare("DELETE FROM twofa_records WHERE date(created_at) = date(?)").bind(date).run();
  return { ok: true, message: "Da xoa 2FA theo ngay." };
}

async function preview2FA(secret: string) {
  try {
    const code = await totp(secret);
    return { ok: true, code, secondsRemaining: 30 - (Math.floor(Date.now() / 1000) % 30) };
  } catch {
    return { ok: false, message: "Secret 2FA khong hop le." };
  }
}

async function unlock(ctx: Ctx, body: any, scope: string, settingKey: string, cookieName: string) {
  const password = String(body.password || "");
  const hash = await getSetting(ctx.env.DB, settingKey);
  if (hash !== await sha256(password)) return response({ ok: false, message: "Sai mat khau." }, 401);
  const token = await makeToken(ctx.env, scope);
  return response({ ok: true, message: "Da mo khoa." }, 200, [cookie(ctx.request, cookieName, token, SESSION_MAX_AGE)]);
}

async function loginSite(ctx: Ctx, body: any) {
  const enabled = (await getSetting(ctx.env.DB, "site_password_enabled")) === "true";
  if (!enabled) return response({ ok: true, message: "Khong bat bao ve." });
  const hash = await getSetting(ctx.env.DB, "site_password_hash");
  if (hash !== await sha256(String(body.password || ""))) return response({ ok: false, message: "Sai mat khau." }, 401);
  const token = await makeToken(ctx.env, "site");
  return response({ ok: true, message: "Da dang nhap." }, 200, [cookie(ctx.request, "site_session", token, SESSION_MAX_AGE)]);
}

async function requireAdmin(request: Request, env: Env, session: Record<string, boolean>) {
  if (session.admin || (await verifyCookie(request, env, "admin_session", "admin"))) return;
  throw new Error("Unauthorized");
}

async function requireManager(request: Request, env: Env, session: Record<string, boolean>) {
  if (session.manager || (await verifyCookie(request, env, "manager_session", "manager"))) return;
  throw new Error("Unauthorized");
}

async function readSession(request: Request, env: Env) {
  return {
    admin: await verifyCookie(request, env, "admin_session", "admin"),
    manager: await verifyCookie(request, env, "manager_session", "manager"),
    site: await verifyCookie(request, env, "site_session", "site")
  };
}

async function makeToken(env: Env, scope: string) {
  const payload = btoa(JSON.stringify({ scope, exp: Math.floor(Date.now() / 1000) + SESSION_MAX_AGE })).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
  const sig = await hmac(env, payload);
  return `${payload}.${sig}`;
}

async function verifyCookie(request: Request, env: Env, name: string, scope: string) {
  const token = parseCookies(request.headers.get("Cookie") || "")[name];
  if (!token || !token.includes(".")) return false;
  const [payload, sig] = token.split(".");
  if ((await hmac(env, payload)) !== sig) return false;
  const normalized = payload.replaceAll("-", "+").replaceAll("_", "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
  const data = JSON.parse(atob(padded));
  return data.scope === scope && data.exp > Math.floor(Date.now() / 1000);
}

async function hmac(env: Env, value: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(env.SESSION_SECRET || "change-this-session-secret"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return hex(sig);
}

async function sha256(value: string) {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
}

async function totp(secret: string) {
  const keyData = base32Decode(secret.replace(/\s+/g, ""));
  const counter = Math.floor(Date.now() / 1000 / 30);
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  view.setUint32(4, counter);
  const key = await crypto.subtle.importKey("raw", keyData, { name: "HMAC", hash: "SHA-1" }, false, ["sign"]);
  const hash = new Uint8Array(await crypto.subtle.sign("HMAC", key, buffer));
  const offset = hash[hash.length - 1] & 0xf;
  const binary = ((hash[offset] & 0x7f) << 24) | ((hash[offset + 1] & 0xff) << 16) | ((hash[offset + 2] & 0xff) << 8) | (hash[offset + 3] & 0xff);
  return String(binary % 1_000_000).padStart(6, "0");
}

function base32Decode(input: string) {
  const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
  let bits = "";
  for (const char of input.toUpperCase().replace(/=+$/, "")) {
    const val = alphabet.indexOf(char);
    if (val < 0) throw new Error("Invalid base32");
    bits += val.toString(2).padStart(5, "0");
  }
  const bytes = [];
  for (let i = 0; i + 8 <= bits.length; i += 8) bytes.push(parseInt(bits.slice(i, i + 8), 2));
  return new Uint8Array(bytes);
}

async function allSettings(db: D1Database) {
  const rows = (await db.prepare("SELECT key, value FROM settings").all<any>()).results || [];
  return Object.fromEntries(rows.map((row) => [row.key, row.value])) as Record<string, string>;
}

async function getSetting(db: D1Database, key: string) {
  const row = await db.prepare("SELECT value FROM settings WHERE key = ?").bind(key).first<any>();
  return row?.value || "";
}

async function setSetting(db: D1Database, key: string, value: string) {
  await db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").bind(key, value).run();
}

async function listEmployees(db: D1Database) {
  return ((await db.prepare("SELECT name FROM employees ORDER BY id").all<any>()).results || []).map((row) => row.name);
}

async function poolLines(db: D1Database, type: string) {
  return ((await db.prepare("SELECT raw FROM account_pool WHERE type = ? AND status = 'available' ORDER BY id").bind(type).all<any>()).results || []).map((row) => row.raw).join("\n");
}

async function countPool(db: D1Database, type: string) {
  return scalar(db, "SELECT COUNT(*) AS n FROM account_pool WHERE type = ? AND status = 'available'", [type]);
}

async function scalar(db: D1Database, sql: string, binds: unknown[] = []) {
  const row = await db.prepare(sql).bind(...binds).first<any>();
  return Number(row?.n || 0);
}

async function readBody(request: Request) {
  const contentType = request.headers.get("Content-Type") || "";
  if (contentType.includes("application/json")) return request.json();
  if (contentType.includes("form")) return Object.fromEntries(await request.formData());
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

function lines(text: string) {
  return text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

function normalizeSettingValue(value: unknown) {
  if (value === true || value === "on" || value === "true") return "true";
  if (value === false || value === undefined || value === null) return "";
  return String(value);
}

function response(data: unknown, status = 200, cookies: string[] = []) {
  const headers = new Headers({ "Content-Type": "application/json; charset=utf-8" });
  for (const item of cookies) headers.append("Set-Cookie", item);
  return new Response(JSON.stringify(data), { status, headers });
}

function cookie(request: Request, name: string, value: string, maxAge: number) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly${secure}; SameSite=Lax`;
}

function clearCookie(request: Request, name: string) {
  const secure = new URL(request.url).protocol === "https:" ? "; Secure" : "";
  return `${name}=; Path=/; Max-Age=0; HttpOnly${secure}; SameSite=Lax`;
}

function parseCookies(header: string) {
  return Object.fromEntries(header.split(";").map((part) => part.trim().split("=")).filter((pair) => pair.length === 2));
}

function hex(buffer: ArrayBuffer) {
  return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
