// Tells the IndexNow search engines (Bing, Yandex, Seznam, Naver…) that every
// page in the sitemap changed. Run once a deploy is live: bun run indexnow
import { readdir, readFile } from "fs/promises";
import { SITE_URL } from "../render/components";

const key = (await readdir(".")).find(f => /^[0-9a-f]{32}\.txt$/.test(f))?.slice(0, 32);
if (!key) throw new Error("IndexNow key file (<32 hex chars>.txt) not found");
const urlList = Array.from((await readFile("sitemap.xml", "utf8")).matchAll(/<loc>([^<]+)<\/loc>/g), m => m[1]);
const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: new URL(SITE_URL).host, key, keyLocation: `${SITE_URL}/${key}.txt`, urlList }),
});
console.log(`IndexNow: ${response.status} ${response.statusText} for ${urlList.length} URLs`);
