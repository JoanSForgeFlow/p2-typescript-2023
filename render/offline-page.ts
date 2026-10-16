import { getLang, t } from "../shared/i18n";
import { BRAND, pageHead } from "./components";

export function renderOfflinePage(): string {
  return `<!DOCTYPE html>
<html lang="${getLang()}">
  ${pageHead({
    title: t('offline.metaTitle'),
    description: t('offline.metaDescription'),
    path: 'offline.html',
    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    stylesheet: 'styles.css',
    extra: '\n      <meta name="robots" content="noindex">',
    alternates: false,
  })}
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <a href="index.html" class="brand">${BRAND}</a>
      </div>
    </header>
    <main class="index offline-page">
      <section class="empty-state">
        <h2>${t('offline.title')}</h2>
        <p>${t('offline.text')}</p>
        <a class="btn btn-primary" href="index.html">${t('offline.button')}</a>
      </section>
    </main>
  </body>
</html>`;
}
