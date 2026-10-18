import { icon } from "../shared/icons";
import { escapeHtml } from "../shared/format";
import { getLang, langDir, rootPath, t, type Lang } from "../shared/i18n";

export { icon };

export const SITE_URL = 'https://pokequickdex.vercel.app';

let assetVersions: Record<string, string> = {};

// CSS/JS URLs carry a content hash so browsers and the service worker can
// cache them forever and still pick up every deploy.
export function setAssetVersions(versions: Record<string, string>): void {
  assetVersions = versions;
}

export const asset = (path: string): string => `${rootPath()}${assetVersions[path] ? `${path}?v=${assetVersions[path]}` : path}`;

export const assetVersion = (path: string): string => assetVersions[path] || '';

export const POKEBALL_LOGO = `<svg class="brand-logo" viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="14" fill="#fff" stroke="#111827" stroke-width="2.5"/><path d="M2 16a14 14 0 0 1 28 0z" fill="#e3350d" stroke="#111827" stroke-width="2.5"/><circle cx="16" cy="16" r="4.5" fill="#fff" stroke="#111827" stroke-width="2.5"/></svg>`;

export const BRAND = `${POKEBALL_LOGO}<span class="brand-name">PokeQuick<span>Dex</span></span>`;

export const themeToggle = (): string =>
  `<button id="dark-mode-toggle" class="icon-btn theme-toggle" type="button" title="${t('theme.toggle')}" aria-label="${t('theme.toggle')}">${icon('moon', 'icon-moon')}${icon('sun', 'icon-sun')}</button>`;

const LANGUAGE_LINKS: Record<Lang, { code: string; label: string }> = {
  en: { code: 'EN', label: 'View in English' },
  es: { code: 'ES', label: 'Ver en español' },
};

// Link to the same page in the other language. The click stores the choice
// (read by the English pages' head script) even before the page scripts load.
export function languageSwitch(file: string): string {
  const target: Lang = getLang() === 'en' ? 'es' : 'en';
  const href = `${rootPath()}${langDir(target)}${file}`;
  const { code, label } = LANGUAGE_LINKS[target];
  return `<a id="lang-switch" class="icon-btn lang-switch" href="${href}" hreflang="${target}" lang="${target}" title="${label}" aria-label="${label}" onclick="try{localStorage.setItem('pokedexLang','${target}')}catch(e){}">${icon('globe')}<span>${code}</span></a>`;
}

const PAYPAL_LOGO = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20.067 8.478c.492.88.556 2.014.3 3.327-.74 3.806-3.276 5.12-6.514 5.12h-.5a.805.805 0 0 0-.794.68l-.04.22-.63 3.993-.032.17a.804.804 0 0 1-.794.679H7.72a.483.483 0 0 1-.477-.558L7.418 21h1.518l.95-6.02h1.385c4.678 0 7.75-2.203 8.796-6.502zm-2.96-5.09c.762.868.983 1.81.752 3.285-.019.123-.04.24-.062.36-.735 3.773-3.089 5.446-6.956 5.446H8.957c-.63 0-1.174.414-1.354 1.002l-.014-.002-.93 5.894H3.121a.051.051 0 0 1-.05-.06l2.598-16.51A.95.95 0 0 1 6.607 2h5.976c2.183 0 3.716.469 4.523 1.388z"/></svg>';

const HEART = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';

export const donateWidget = (): string => `
      <div id="donate-widget" class="donate-widget">
        <div id="donate-card" class="donate-card" role="dialog" aria-label="${t('donate.label')}" hidden>
          <button type="button" id="donate-close" class="donate-close" aria-label="${t('common.close')}">${icon('close')}</button>
          <p class="donate-title">${t('donate.title')}</p>
          <p class="donate-subtitle">${t('donate.subtitle')}</p>
          <a href="https://paypal.me/joansis19" target="_blank" rel="noopener noreferrer" class="donate-paypal-btn">${PAYPAL_LOGO}${t('donate.button')}</a>
        </div>
        <button type="button" id="donate-fab" class="donate-fab" title="${t('donate.fab')}" aria-label="${t('donate.fab')}" aria-expanded="false" aria-controls="donate-card">${HEART}</button>
      </div>`;

// The install link only shows up where the browser can install the app.
export const siteFooter = (): string => `
      <footer class="site-footer">
        <nav class="footer-nav">
          <a href="index.html">Pokédex</a>
          <a href="types.html">${t('footer.typeChart')}</a>
          <button type="button" class="link-btn footer-install" id="install-link" hidden>${icon('download')}${t('install.link')}</button>
        </nav>
        <span>${t('footer.data', { link: '<a href="https://pokeapi.co" target="_blank" rel="noopener">PokéAPI</a>' })}</span>
        <span>${t('footer.trademark')}</span>
      </footer>`;

export interface HeadOptions {
  title: string;
  description: string;
  path: string;
  image: string;
  imageSize?: [width: number, height: number];
  stylesheet: string;
  extra?: string;
  alternates?: boolean;
}

const FAVICON = `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>`;

const OG_LOCALES: Record<Lang, string> = { en: 'en_US', es: 'es_ES' };

// English pages send visitors who chose Spanish to the same page under es/.
const LANGUAGE_REDIRECT = `
        try {
          if (localStorage.getItem("pokedexLang") === "es") {
            var page = location.pathname.split("/").pop();
            location.replace("es/" + (page || "index.html") + location.hash);
          }
        } catch (e) {}`;

export function pageHead(o: HeadOptions): string {
  const lang = getLang();
  const url = `${SITE_URL}/${langDir()}${o.path}`;
  const title = escapeHtml(o.title);
  const description = escapeHtml(o.description);
  const alternates = o.alternates === false ? '' : `
      <link rel="alternate" hreflang="en" href="${SITE_URL}/${o.path}">
      <link rel="alternate" hreflang="es" href="${SITE_URL}/es/${o.path}">
      <link rel="alternate" hreflang="x-default" href="${SITE_URL}/${o.path}">`;
  return `
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
      <title>${title}</title>
      <meta name="description" content="${description}">
      <link rel="canonical" href="${url}">${alternates}
      <meta property="og:site_name" content="PokeQuickDex">
      <meta property="og:type" content="website">
      <meta property="og:locale" content="${OG_LOCALES[lang]}">
      <meta property="og:title" content="${title}">
      <meta property="og:description" content="${description}">
      <meta property="og:url" content="${url}">
      <meta property="og:image" content="${o.image}">${o.imageSize ? `
      <meta property="og:image:width" content="${o.imageSize[0]}">
      <meta property="og:image:height" content="${o.imageSize[1]}">
      <meta property="og:image:alt" content="${title}">` : ''}
      <meta name="twitter:card" content="${o.imageSize ? 'summary_large_image' : 'summary'}">
      <link rel="icon" href="${FAVICON}">
      <link rel="apple-touch-icon" href="${rootPath()}icons/apple-touch-icon.png">
      <link rel="manifest" href="${rootPath()}manifest.webmanifest">
      <meta name="theme-color" content="#e3350d">
      <meta name="apple-mobile-web-app-capable" content="yes">
      <meta name="apple-mobile-web-app-title" content="QuickDex">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap">
      <link rel="stylesheet" href="${asset('css/base.css')}">
      <link rel="stylesheet" href="${asset(`css/${o.stylesheet}`)}">
      <link rel="stylesheet" href="${asset('css/types.css')}">
      <script>${lang === 'en' ? LANGUAGE_REDIRECT : ''}
        try { if (localStorage.getItem("darkMode") === "true") document.documentElement.classList.add("dark-mode"); } catch (e) {}
        // On image error, retry the official artwork a few times (transient
        // github hiccups) before falling back to Dream World, then the sprite.
        // Capture phase, so it catches images loading before other scripts run.
        document.addEventListener('error', function (ev) {
          var img = ev.target;
          if (!img || img.tagName !== 'IMG') return;
          var src = img.src.split('?')[0];
          if (src.indexOf('/other/official-artwork/') !== -1) {
            var tries = +(img.getAttribute('data-oa-retry') || 0);
            if (tries < 3) {
              img.setAttribute('data-oa-retry', tries + 1);
              setTimeout(function () { img.src = src + '?r=' + (tries + 1); }, 300 * (tries + 1));
            } else if (src.indexOf('/official-artwork/shiny/') !== -1) {
              img.src = src.replace('/other/official-artwork/', '/');            // shiny: go to shiny sprite
            } else {
              img.src = src.replace('/other/official-artwork/', '/other/dream-world/').replace(/\\.png$/, '.svg');  // -> Dream World
            }
          } else if (src.indexOf('/other/dream-world/') !== -1) {
            img.src = src.replace('/other/dream-world/', '/').replace(/\\.svg$/, '.png');   // -> game sprite
          } else {
            var di = img.getAttribute('data-default-img');                       // -> default form's image
            if (di && di !== src) { img.removeAttribute('data-default-img'); img.setAttribute('data-oa-retry', 0); img.src = di; }
          }
        }, true);
      </script>
      <script defer src="/_vercel/insights/script.js"></script>${o.extra || ''}
    </head>`;
}
