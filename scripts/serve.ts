import { createServer, type Server } from "http";
import { existsSync, readFileSync } from "fs";
import { readFile } from "fs/promises";
import { extname, join, normalize, resolve } from "path";

const TYPES: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".xml": "application/xml",
  ".txt": "text/plain; charset=utf-8",
};

export function serve(root: string, port: number): Promise<Server> {
  const base = resolve(root);
  // Same rewrites as on Vercel, like /app (where the installed app opens).
  const config = join(base, "vercel.json");
  const rewrites: { source: string; destination: string }[] = existsSync(config) ? JSON.parse(readFileSync(config, "utf8")).rewrites || [] : [];
  const server = createServer(async (req, res) => {
    const requested = decodeURIComponent((req.url || "/").split("?")[0]);
    const path = rewrites.find((r) => r.source === requested)?.destination || requested;
    const file = normalize(join(base, path.endsWith("/") ? `${path}index.html` : path));
    if (!file.startsWith(base)) {
      res.writeHead(403).end();
      return;
    }
    try {
      const body = await readFile(file);
      res.writeHead(200, { "Content-Type": TYPES[extname(file)] || "application/octet-stream" }).end(body);
    } catch (e) {
      res.writeHead(404).end("Not found");
    }
  });
  return new Promise((done) => server.listen(port, "127.0.0.1", () => done(server)));
}

const entryPath = (globalThis as any).process?.argv?.[1];
if (entryPath && import.meta.url === `file://${entryPath}`) {
  const port = Number(process.env.PORT || 8765);
  serve(process.cwd(), port).then(() => console.log(`PokeQuickDex on http://localhost:${port}/`));
}
