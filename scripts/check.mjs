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

const api = await readFile("functions/api/[[path]].ts", "utf8");
for (const action of ["save_video_links", "save_account_list", "get_link_stats", "view_2fa_by_date", "get_profile_image", "confirm_profile_image"]) {
  if (!api.includes(action)) throw new Error(`Missing backend action: ${action}`);
}
for (const imageToken of ["length: 500", "profile_", "padStart(4, \"0\")", ".jpg"]) {
  if (!api.includes(imageToken)) throw new Error(`Missing profile image token: ${imageToken}`);
}
if (api.includes("profile-001.svg")) throw new Error("Old sample SVG profile image is still referenced");

console.log("Project check passed.");
