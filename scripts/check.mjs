import { readFile } from "node:fs/promises";

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
for (const action of ["get_initial_data", "unlock_settings", "get_account_client", "submit_user_links", "download-profile-image"]) {
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
if (app.includes("account-switch-actions")) throw new Error("Old stacked account switch markup is still present");
if (app.includes('<section class="panel video-panel">')) throw new Error("Video panel should not render after moving its buttons into account actions");

const styles = await readFile("public/styles.css", "utf8");
for (const compactStyle of ["account-compact-actions", "grid-template-columns: repeat(6", "grid-column: span 2"]) {
  if (!styles.includes(compactStyle)) throw new Error(`Missing compact account action style: ${compactStyle}`);
}
for (const mediaStyle of ["account-media-action", "grid-column: span 6"]) {
  if (!styles.includes(mediaStyle)) throw new Error(`Missing moved media button style: ${mediaStyle}`);
}

const api = await readFile("functions/api/[[path]].ts", "utf8");
for (const action of ["save_video_links", "save_account_list", "get_link_stats", "view_2fa_by_date", "get_profile_image", "confirm_profile_image"]) {
  if (!api.includes(action)) throw new Error(`Missing backend action: ${action}`);
}
for (const imageToken of ["length: 500", "profile_", "padStart(4, \"0\")", ".jpg"]) {
  if (!api.includes(imageToken)) throw new Error(`Missing profile image token: ${imageToken}`);
}
if (api.includes("profile-001.svg")) throw new Error("Old sample SVG profile image is still referenced");

console.log("Project check passed.");
