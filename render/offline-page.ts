import { BRAND, asset, pageHead } from "./components";

export function renderOfflinePage(): string {
  return `<!DOCTYPE html>
<html lang="en">
  ${pageHead({
    title: 'Offline · PokeQuickDex',
    description: 'You are offline.',
    path: 'offline.html',
    image: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/25.png',
    stylesheet: 'styles.css',
    extra: '\n      <meta name="robots" content="noindex">',
  })}
  <body>
    <header class="topbar">
      <div class="topbar-inner">
        <a href="index.html" class="brand">${BRAND}</a>
      </div>
    </header>
    <main class="index offline-page">
      <section class="empty-state">
        <h2>You're offline</h2>
        <p>Pokémon you've already opened are still available. Connect to the internet to see new ones.</p>
        <a class="btn btn-primary" href="index.html">Go to the Pokédex</a>
      </section>
    </main>
  </body>
</html>`;
}
