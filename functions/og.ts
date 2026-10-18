import { ImageResponse } from "@vercel/og";
import type { Meta, PageData } from "../shared/model";
import { defensiveMatchups } from "../shared/type-chart";

// Social card for a Pokémon page (/api/og?dex=6&lang=es): name, types and
// weaknesses next to the artwork. Rendered on demand by a Vercel Edge Function
// and cached for a year (the page links it with a version); colours and data
// come from the deployed site.
export const config = { runtime: "edge" };

const WEAK_TO = { en: "Weak to", es: "Débil a" };

const LOGO = `data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><circle cx="16" cy="16" r="14" fill="#fff" stroke="#111827" stroke-width="2.5"/><path d="M2 16a14 14 0 0 1 28 0z" fill="#e3350d" stroke="#111827" stroke-width="2.5"/><circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#111827" stroke-width="2.5"/></svg>')}`;

interface Node {
  type: string;
  props: Record<string, unknown>;
}

const el = (type: string, style: Record<string, unknown>, children?: unknown, attrs: Record<string, unknown> = {}): Node =>
  ({ type, props: { ...attrs, style, children } });

function palette(css: string): { colors: Record<string, string>; inks: Record<string, string> } {
  const colors: Record<string, string> = {};
  const inks: Record<string, string> = {};
  for (const [, type, hex] of css.matchAll(/--type-([a-z]+):\s*(#[0-9a-f]{6})/gi)) colors[type] = hex;
  for (const [, type, ink] of css.matchAll(/--ink-([a-z]+):\s*var\(--ink-(white|black)\)/gi)) inks[type] = ink === "white" ? "#ffffff" : "#16181d";
  return { colors, inks };
}

export default async function handler(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const dex = Number(url.searchParams.get("dex"));
  const lang = url.searchParams.get("lang") === "es" ? "es" : "en";
  if (!Number.isInteger(dex) || dex < 1 || dex > 1025) return new Response("Not found", { status: 404 });

  const site = `${url.origin}/`;
  const dir = lang === "es" ? "es/" : "";
  const get = async (path: string): Promise<Response> => {
    const response = await fetch(site + path);
    if (!response.ok) throw new Error(`${response.status} ${path}`);
    return response;
  };
  try {
    const [page, meta, css, bold, extraBold] = await Promise.all([
      get(`${dir}data/pokemon/${String(dex).padStart(4, "0")}.json`).then(r => r.json() as Promise<PageData>),
      get(`${dir}data/meta.json`).then(r => r.json() as Promise<Meta>),
      get("css/types.css").then(r => r.text()),
      get("fonts/plus-jakarta-sans-latin-700-normal.woff").then(r => r.arrayBuffer()),
      get("fonts/plus-jakarta-sans-latin-800-normal.woff").then(r => r.arrayBuffer()),
    ]);
    const { colors, inks } = palette(css);
    const variety = page.varieties[0];
    const game = meta.games.find(g => g.key === page.defaultGame) || meta.games[0];
    const matchups = defensiveMatchups(meta, game.gen, variety.types);
    const label = (type: string) => meta.typeLabels?.[type] || type.charAt(0).toUpperCase() + type.slice(1);
    const [first, second = first] = variety.types;

    const pill = (type: string, size: number, mult?: string) => el("div", {
      display: "flex",
      alignItems: "center",
      gap: 10,
      padding: `${size * 0.3}px ${size * 0.8}px`,
      borderRadius: 999,
      background: colors[type] || "#9fa19f",
      color: inks[type] || "#16181d",
      fontSize: size,
      fontWeight: 800,
      letterSpacing: 1,
      textTransform: "uppercase",
      border: mult === "4×" ? "4px solid #0f172a" : "4px solid transparent",
    }, mult ? [label(type), el("span", { fontSize: size * 0.8, padding: "2px 10px", borderRadius: 999, background: "rgba(255,255,255,0.92)", color: "#0f172a" }, mult)] : label(type));

    const weakSize = matchups.x4.length + matchups.x2.length > 4 ? 20 : 24;
    const weak = [...matchups.x4.map(type => pill(type, weakSize, "4×")), ...matchups.x2.map(type => pill(type, weakSize, "2×"))];
    const nameSize = Math.min(84, Math.floor(520 / (0.62 * page.name.length)));

    const tree = el("div", {
      display: "flex",
      position: "relative",
      width: 1200,
      height: 630,
      fontFamily: "Jakarta",
      backgroundImage: `linear-gradient(135deg, ${colors[first]} 0%, ${colors[first]} 50%, ${colors[second]} 50%, ${colors[second]} 100%)`,
    }, [
      el("div", { position: "absolute", right: 46, top: 61, width: 508, height: 508, borderRadius: 999, background: "rgba(255,255,255,0.3)" }),
      el("img", { position: "absolute", right: 56, top: 71 }, undefined, { src: variety.art, width: 488, height: 488 }),
      el("div", {
        position: "absolute",
        left: 48,
        top: 48,
        bottom: 48,
        width: 620,
        display: "flex",
        flexDirection: "column",
        padding: "44px 48px",
        borderRadius: 40,
        background: "#ffffff",
        boxShadow: "0 24px 60px rgba(15, 23, 42, 0.22)",
      }, [
        el("div", { fontSize: 30, fontWeight: 700, color: "#64748b" }, `#${String(dex).padStart(4, "0")}`),
        el("div", { fontSize: nameSize, fontWeight: 800, color: "#0f172a", letterSpacing: -2, lineHeight: 1.05, marginTop: 4 }, page.name),
        el("div", { display: "flex", gap: 12, marginTop: 22 }, variety.types.map(type => pill(type, 26))),
        el("div", { fontSize: 22, fontWeight: 800, color: "#64748b", letterSpacing: 2, textTransform: "uppercase", marginTop: weakSize === 24 ? 34 : 26 }, WEAK_TO[lang]),
        el("div", { display: "flex", flexWrap: "wrap", gap: 10, marginTop: 14 }, weak.length ? weak : "—"),
        el("div", { display: "flex", alignItems: "center", gap: 12, marginTop: "auto", paddingTop: 18 }, [
          el("img", {}, undefined, { src: LOGO, width: 40, height: 40 }),
          el("div", { display: "flex", fontSize: 30, fontWeight: 800, color: "#0f172a", letterSpacing: -1 }, ["PokeQuick", el("span", { color: "#e3350d" }, "Dex")]),
          el("div", { fontSize: 22, fontWeight: 700, color: "#64748b", marginLeft: 8 }, url.host),
        ]),
      ]),
    ]);

    return new ImageResponse(tree as never, {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Jakarta", data: bold, weight: 700, style: "normal" },
        { name: "Jakarta", data: extraBold, weight: 800, style: "normal" },
      ],
    });
  } catch (error) {
    return new Response(`Could not render the card: ${(error as Error).message}`, { status: 500 });
  }
}
