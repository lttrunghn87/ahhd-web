import { readFile, readdir, stat } from "node:fs/promises";

const uploadVideoCount = 254;
const profileImageCount = 165;

const requiredFiles = [
  "public/index.html",
  "public/styles.css",
  "public/app.js",
  "functions/api/[[path]].ts",
  "migrations/0001_init.sql"
];

for (const file of requiredFiles) {
  const text = await readFile(file, "utf8");
  if (!text.trim()) throw new Error(`${file} is empty`);
}

const app = await readFile("public/app.js", "utf8");
for (const action of ["get_initial_data", "unlock_settings", "get_account_client", "submit_user_links", "download-profile-image", "confirm-profile-image", "download-upload-video", "confirm-upload-video"]) {
  if (!app.includes(action)) throw new Error(`Missing frontend action: ${action}`);
}
for (const removedAction of ["get-mail-code", "open-mailbox"]) {
  if (app.includes(removedAction)) throw new Error(`Removed account action still present: ${removedAction}`);
}
for (const removedLabel of ["# Get Code", "Đọc Hòm Thư"]) {
  if (app.includes(removedLabel)) throw new Error(`Removed account button label still present: ${removedLabel}`);
}
for (const compactToken of ["account-compact-actions", "account-save-action", "account-clear-action"]) {
  if (!app.includes(compactToken)) throw new Error(`Missing compact account action markup: ${compactToken}`);
}
for (const mediaToken of ["account-media-action", "account-profile-action", "account-upload-video-action"]) {
  if (!app.includes(mediaToken)) throw new Error(`Missing moved media button markup: ${mediaToken}`);
}
for (const emptyMediaAction of ["data-action=\"download-profile-image\"", "data-action=\"download-upload-video\""]) {
  if (!app.includes(emptyMediaAction)) throw new Error(`Missing empty-state media action: ${emptyMediaAction}`);
}
if (app.includes("Tải APK video")) throw new Error("Old APK video button label is still present");
for (const apkToken of ["Tải APK xem video", "/downloads/NexusTiktok-2.4.11.apk", "download=\"NexusTiktok-2.4.11.apk\""]) {
  if (!app.includes(apkToken)) throw new Error(`Missing APK download button token: ${apkToken}`);
}
if (app.includes("NexusTiktok-v2.2.3.apk")) throw new Error("Old APK download path is still present");
if (app.includes("account-switch-actions")) throw new Error("Old stacked account switch markup is still present");
if (app.includes('<section class="panel video-panel">')) throw new Error("Video panel should not render after moving its buttons into account actions");

const headers = await readFile("public/_headers", "utf8");
if (!headers.includes("/downloads/*.apk") || !headers.includes("Content-Disposition: attachment")) {
  throw new Error("APK download headers are missing");
}
const apk = await stat("public/downloads/NexusTiktok-2.4.11.apk");
if (apk.size <= 0) throw new Error("APK download file is empty");

const styles = await readFile("public/styles.css", "utf8");
for (const compactStyle of ["account-compact-actions", "grid-template-columns: repeat(6", "grid-column: span 2"]) {
  if (!styles.includes(compactStyle)) throw new Error(`Missing compact account action style: ${compactStyle}`);
}
for (const mediaStyle of ["account-media-action", "grid-column: span 3"]) {
  if (!styles.includes(mediaStyle)) throw new Error(`Missing moved media button style: ${mediaStyle}`);
}
if (!styles.includes(".account-choice-actions .account-media-action")) {
  throw new Error("Missing visible empty-state media button override");
}
if (styles.includes(".account-media-action {\n  grid-column: span 6")) {
  throw new Error("Media buttons should share one row, not span the full row");
}

const api = await readFile("functions/api/[[path]].ts", "utf8");
for (const action of ["save_video_links", "save_account_list", "get_link_stats", "view_2fa_by_date", "get_profile_image", "confirm_profile_image", "get_upload_video", "confirm_upload_video"]) {
  if (!api.includes(action)) throw new Error(`Missing backend action: ${action}`);
}
for (const poolDedupeToken of ["uniqueLines(text)", "dedupeAvailablePool(db, type)", "COUNT(DISTINCT raw) AS n"]) {
  if (!api.includes(poolDedupeToken)) throw new Error(`Missing account pool dedupe guard: ${poolDedupeToken}`);
}
if (api.includes("for (const line of lines(text))")) {
  throw new Error("Account pool saves must dedupe repeated mail/account lines before insert");
}
for (const imageToken of [`PROFILE_IMAGE_COUNT = ${profileImageCount}`, "profile_", "padStart(4, \"0\")", ".jpg", "profile_assets_batch"]) {
  if (!api.includes(imageToken)) throw new Error(`Missing profile image token: ${imageToken}`);
}
if (api.includes("profile-001.svg")) throw new Error("Old sample SVG profile image is still referenced");
if (api.includes("length: 500")) throw new Error("Old 500-image profile count is still referenced");
if (api.includes("path NOT IN")) throw new Error("Profile cleanup must not use a large SQL variable list");
const profileImages = (await readdir("public/profile-images")).filter((name) => /^profile_\d{4}\.jpg$/.test(name));
if (profileImages.length !== profileImageCount) {
  throw new Error(`Expected ${profileImageCount} profile images, found ${profileImages.length}`);
}
for (const videoToken of ["upload_video_assets", `length: ${uploadVideoCount}`, "upload_video_", ".mp4"]) {
  if (!api.includes(videoToken)) throw new Error(`Missing upload video token: ${videoToken}`);
}
for (const tiktokToken of [
  "TIKTOK_LITE_QUEUE",
  "TIKTOK_DEFAULT_DURATION_MINUTES = 3",
  "/api/tiktok/next",
  "tiktok_sessions",
  "getNextTiktokVideo",
  "resolveTiktokLiteUrl",
  "extractTiktokVideoId",
  "redirect: \"manual\"",
  "durationMinutes: TIKTOK_DEFAULT_DURATION_MINUTES",
  "remaining",
  "total"
]) {
  if (!api.includes(tiktokToken)) throw new Error(`Missing TikTok next API token: ${tiktokToken}`);
}
const tiktokLiteQueueMatches = api.match(/https:\/\/lite\.tiktok\.com\/t\/ZSCB[^"`\s]+\/?/g) || [];
if (new Set(tiktokLiteQueueMatches).size !== 18) {
  throw new Error(`Expected 18 unique TikTok Lite queue URLs, found ${new Set(tiktokLiteQueueMatches).size}`);
}

const uploadVideos = (await readdir("public/upload-videos")).filter((name) => /^upload_video_\d{4}\.mp4$/.test(name));
if (uploadVideos.length !== uploadVideoCount) {
  throw new Error(`Expected ${uploadVideoCount} upload videos, found ${uploadVideos.length}`);
}

console.log("Project check passed.");
