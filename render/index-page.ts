import { Pokemon } from "../pokemon";
import { ALL_TYPES } from "../types";
import {
  ICON_PATHS,
  icon,
  POKEBALL_LOGO,
  BRAND,
  THEME_TOGGLE,
  PAYPAL_LOGO,
  HEART,
  DONATE_WIDGET,
  SITE_FOOTER,
  typeVars,
  GENERATIONS,
  searchKey,
  ABILITY_MATCHUPS,
  abilityNotes,
  renderMatchups,
  titleCase,
  STAT_LABELS,
  statColor,
  typeTags,
  sharedHead,
  head,
} from "./components";

export function renderPokemonIndex(pokemons: Array<Pokemon>): string {
    const pokemonCard = (href: string, dexNo: string, name: string, types: string[], imageUrl: string, dataAttrs: string, extraClass: string = '', defaultImg: string = ''): string => `
        <a class="pokemon-card${extraClass}" href="${href}" ${dataAttrs} style="${typeVars(types)}">
          <div class="card-art">
            <span class="pokemon-id">#${dexNo}</span>
            <img src="${imageUrl}"${defaultImg ? ` data-default-img="${defaultImg}"` : ''} alt="" loading="lazy" decoding="async" width="96" height="96" />
          </div>
          <div class="card-body">
            <h2>${name}</h2>
            <div class="card-types">${typeTags(types)}</div>
          </div>
        </a>`;
    const pokemonLinks = pokemons.map((pokemon) => {
      const dexNo = String(pokemon.id).padStart(4, '0');
      const tags = `data-baby='${pokemon.is_baby}' data-legendary='${pokemon.is_legendary}' data-mythical='${pokemon.is_mythical}' data-dex='${pokemon.id}'`;
      const baseCard = `
      <li>${pokemonCard(`${dexNo}_details.html`, dexNo, pokemon.name, pokemon.types, pokemon.imageUrl,
        `data-types='${JSON.stringify(pokemon.types)}' ${tags} data-generation='${pokemon.generation}' data-id='${pokemon.id}' data-name="${pokemon.name}" data-search="${searchKey(pokemon.name)}"`)}
      </li>`;
      // Form cards share the species' dex number/tags but carry the form's own
      // types, and link to the detail page with a #hash so it opens in that form.
      // Hidden until the "All forms" toggle is on.
      const formCards = pokemon.forms.map((form) => `
      <li style="display: none;">${pokemonCard(`${dexNo}_details.html#${form.suffix}`, dexNo, form.name, form.types, form.imageUrl,
        `data-types='${JSON.stringify(form.types)}' ${tags} data-generation='${form.generation}' data-id='${form.id}' data-name="${form.name}" data-search="${searchKey(form.name)}" data-formkind='${form.kind}'`,
        ' form-variant', pokemon.officialArtworkUrl)}
      </li>`).join('\n');
      return baseCard + formCards;
    }).join('\n');

    const typeOptions = ALL_TYPES.map(type => `
              <label class="type-option"><input type="radio" name="type" value="${type}"><span class="tag ${type}">${type}</span></label>`).join('');
    const generationOptions = GENERATIONS.map(([value, numeral, region]) => `
              <label class="chip-option"><input type="radio" name="generation" value="${value}"><span><b>${numeral}</b>${region}</span></label>`).join('');
    const generationLabels = Object.fromEntries(GENERATIONS.map(([value, numeral, region]) => [value, `Gen ${numeral} · ${region}`]));

    return `<!DOCTYPE html>
  <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta http-equiv="X-UA-Compatible" content="IE=edge">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover">
      <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><circle cx='50' cy='50' r='47' fill='%23f0f0f0' stroke='%23333' stroke-width='6'/><path d='M3 50 A47 47 0 0 1 97 50' fill='%23ee1515'/><rect x='0' y='46' width='100' height='8' fill='%23333'/><circle cx='50' cy='50' r='12' fill='%23fff' stroke='%23333' stroke-width='6'/><circle cx='50' cy='50' r='5' fill='%23333'/></svg>">
      <title>PokeQuickDex</title>
      <meta name="description" content="PokeQuickDex - Your quick reference for all Pokémon stats, types, abilities, and evolution chains. Browse all 1025 Pokémon!">
      <meta property="og:title" content="PokeQuickDex - Complete Pokémon Database">
      <meta property="og:description" content="Browse all 1025 Pokémon with stats, types, abilities, and evolution chains.">
      <meta property="og:type" content="website">
      <meta property="og:url" content="https://pokequickdex.vercel.app">${sharedHead()}
      <link rel="stylesheet" href="css/styles.css">
      <link rel="stylesheet" href="css/types.css">
      <script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-5418523060607609" crossorigin="anonymous"></script>
      <link rel="canonical" href="https://pokequickdex.vercel.app" />
      <script defer src="/_vercel/insights/script.js"></script>
      <script>
        // On image error, retry the official artwork a few times (transient
        // github hiccups) before falling back to Dream World, then the sprite.
        // Capture phase, so it catches cards loading before other scripts run.
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
    </head>
    <body>
      <header class="topbar">
        <div class="topbar-inner">
          <a href="index.html" class="brand" aria-label="PokeQuickDex home">${BRAND}</a>
          <label class="search">${icon('search')}<input type="search" id="search-input" class="search-input" placeholder="Search by name or number" aria-label="Search Pokémon by name or number" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" /><kbd>/</kbd></label>
          <div class="topbar-actions">${THEME_TOGGLE}</div>
        </div>
      </header>
      <main class="index">
        <aside id="filters" class="filters" aria-label="Filters">
          <div class="filters-head">
            <h2>Filters</h2>
            <button type="button" id="clear-filters-btn" class="link-btn" hidden>Clear all</button>
            <button type="button" id="filters-close" class="icon-btn filters-close" aria-label="Close filters">${icon('close')}</button>
          </div>
          <div class="filters-body">
            <fieldset class="filter-group">
              <legend>Type</legend>
              <div class="type-options">
                <label class="type-option"><input type="radio" name="type" value="" checked><span class="any">All types</span></label>${typeOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group">
              <legend>Generation</legend>
              <div class="gen-options">
                <label class="chip-option"><input type="radio" name="generation" value="" checked><span>All</span></label>${generationOptions}
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-tags">
              <legend>Category</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="baby-filter"><span>Baby</span></label>
                <label class="chip-option"><input type="checkbox" id="legendary-filter"><span>Legendary</span></label>
                <label class="chip-option"><input type="checkbox" id="mythical-filter"><span>Mythical</span></label>
              </div>
            </fieldset>
            <fieldset class="filter-group toolbar-forms">
              <legend>Show</legend>
              <div class="chip-options">
                <label class="chip-option"><input type="checkbox" id="species-filter" checked><span>Species</span></label>
                <label class="chip-option"><input type="checkbox" id="regional-filter"><span>Regional forms</span></label>
                <label class="chip-option"><input type="checkbox" id="battle-filter"><span>Battle forms</span></label>
                <label class="chip-option"><input type="checkbox" id="other-filter"><span>Other forms</span></label>
              </div>
            </fieldset>
          </div>
          <div class="filters-foot">
            <button type="button" id="filters-apply" class="btn btn-primary">Show results</button>
          </div>
        </aside>
        <div class="sheet-backdrop" id="filters-backdrop"></div>
        <section class="results" aria-label="Pokémon list">
          <div class="index-head">
            <div>
              <h1>Pokédex</h1>
              <p class="results-count" id="results-count" aria-live="polite">${pokemons.length} Pokémon</p>
            </div>
            <div class="index-actions">
              <button type="button" id="filters-open" class="btn filters-open" aria-controls="filters">${icon('sliders')}<span>Filters</span><span class="badge" id="filters-badge" hidden></span></button>
              <button type="button" id="compare-mode-btn" class="btn compare-mode-btn" aria-pressed="false">${icon('swords')}<span>Compare</span></button>
            </div>
          </div>
          <div class="active-filters" id="active-filters" hidden></div>
          <p class="compare-hint" id="compare-hint" hidden>Pick two Pokémon to compare their base stats, or just one to compare its forms.</p>
          <ul class="pokemon-grid">${pokemonLinks}</ul>
          <div class="empty-state" id="empty-state" hidden>
            <h2>No Pokémon found</h2>
            <p>Try another name or number, or remove some filters.</p>
            <button type="button" class="btn" id="empty-clear">Clear filters</button>
          </div>
        </section>
      </main>
      ${SITE_FOOTER}
      <div id="compare-bar" class="compare-bar" style="display: none;" role="region" aria-label="Compare Pokémon">
        <div class="compare-slots">
          <span id="compare-pokemon-1" class="compare-slot">Pick a Pokémon</span>
          <span class="vs-text">vs</span>
          <span id="compare-pokemon-2" class="compare-slot">Pick another</span>
        </div>
        <div class="compare-actions">
          <button id="clear-compare-btn" class="btn" type="button">Cancel</button>
          <button id="compare-btn" class="btn btn-primary" type="button" disabled>Compare</button>
        </div>
      </div>
      <div id="compare-modal" class="compare-modal" style="display: none;">
        <div class="compare-modal-content" role="dialog" aria-modal="true" aria-labelledby="compare-title">
          <div class="compare-modal-head">
            <h2 id="compare-title">Compare</h2>
            <button class="close-modal icon-btn" type="button" aria-label="Close">${icon('close')}</button>
          </div>
          <div id="compare-results" class="compare-results"></div>
        </div>
      </div>
      <script>
        document.addEventListener("DOMContentLoaded", function() {
          document.getElementById("dark-mode-toggle").addEventListener("click", function() {
            const isDark = document.documentElement.classList.toggle("dark-mode");
            localStorage.setItem("darkMode", isDark);
          });

          const TOTAL = ${pokemons.length};
          const GENERATION_LABELS = ${JSON.stringify(generationLabels)};
          const STAT_LABELS = ${JSON.stringify(STAT_LABELS)};
          const STAT_NAMES = ["hp", "attack", "defense", "special-attack", "special-defense", "speed"];
          const CLOSE_ICON = ${JSON.stringify(icon('close'))};
          const VOLUME_ICON = ${JSON.stringify(icon('volume'))};
          const cards = Array.prototype.slice.call(document.querySelectorAll(".pokemon-card"));
          const searchInput = document.getElementById("search-input");
          const filtersPanel = document.getElementById("filters");
          const filtersBackdrop = document.getElementById("filters-backdrop");
          const filtersApply = document.getElementById("filters-apply");
          const filtersBadge = document.getElementById("filters-badge");
          const clearFiltersBtn = document.getElementById("clear-filters-btn");
          const resultsCount = document.getElementById("results-count");
          const activeFilters = document.getElementById("active-filters");
          const emptyState = document.getElementById("empty-state");
          const categoryBoxes = Array.prototype.slice.call(document.querySelectorAll('.toolbar-tags input[type="checkbox"]'));

          function normalize(text) {
            return text.normalize("NFD").replace(/[\\u0300-\\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
          }

          function checkedValue(name) {
            const input = document.querySelector('input[name="' + name + '"]:checked');
            return input ? input.value : "";
          }

          function setRadio(name, value) {
            const input = document.querySelector('input[name="' + name + '"][value="' + value + '"]') || document.querySelector('input[name="' + name + '"][value=""]');
            input.checked = true;
          }

          function isChecked(id) {
            return document.getElementById(id).checked;
          }

          function setChecked(id, value) {
            document.getElementById(id).checked = value;
          }

          function readFilters() {
            return {
              search: searchInput.value,
              type: checkedValue("type"),
              generation: checkedValue("generation"),
              baby: isChecked("baby-filter"),
              legendary: isChecked("legendary-filter"),
              mythical: isChecked("mythical-filter"),
              species: isChecked("species-filter"),
              regional: isChecked("regional-filter"),
              battle: isChecked("battle-filter"),
              other: isChecked("other-filter")
            };
          }

          function saveFilters() {
            sessionStorage.setItem("pokemonFilters", JSON.stringify(readFilters()));
          }

          function loadFilters() {
            const saved = sessionStorage.getItem("pokemonFilters");
            if (!saved) return;
            const filters = JSON.parse(saved);
            searchInput.value = filters.search || "";
            setRadio("type", filters.type || "");
            setRadio("generation", filters.generation || "");
            setChecked("baby-filter", !!filters.baby);
            setChecked("legendary-filter", !!filters.legendary);
            setChecked("mythical-filter", !!filters.mythical);
            setChecked("species-filter", filters.species !== false);
            setChecked("regional-filter", !!filters.regional);
            setChecked("battle-filter", !!filters.battle);
            setChecked("other-filter", !!filters.other);
          }

          function formsChanged(filters) {
            return !filters.species || filters.regional || filters.battle || filters.other;
          }

          function plural(count) {
            return count + (count === 1 ? " result" : " results");
          }

          function filterPokemons() {
            const filters = readFilters();
            const query = filters.search.trim();
            const key = normalize(query);
            const number = /^#?\\d+$/.test(query) ? parseInt(query.replace("#", ""), 10) : null;
            const noCategory = !filters.baby && !filters.legendary && !filters.mythical;
            // Every visible card's link (species and forms, in display order), so
            // the detail page's prev/next arrows walk the whole filtered result
            // set; a form's link is its species page plus the form hash.
            const visibleNav = [];
            cards.forEach(function(card) {
              const data = card.dataset;
              const nameMatch = !key || (number !== null ? Number(data.dex) === number : data.search.indexOf(key) !== -1);
              const typeMatch = !filters.type || JSON.parse(data.types).indexOf(filters.type) !== -1;
              const generationMatch = !filters.generation || data.generation === filters.generation;
              const categoryMatch = noCategory || (filters.baby && data.baby === "true") || (filters.legendary && data.legendary === "true") || (filters.mythical && data.mythical === "true");
              // Complementary category toggles: base species, regional forms,
              // battle-only forms, and any other (cosmetic) forms.
              const kindMatch = filters[data.formkind || "species"];
              const visible = nameMatch && typeMatch && generationMatch && categoryMatch && kindMatch;
              card.parentElement.style.display = visible ? "" : "none";
              if (visible) visibleNav.push(card.getAttribute("href"));
            });

            const facets = (filters.type ? 1 : 0) + (filters.generation ? 1 : 0) + (noCategory ? 0 : 1) + (formsChanged(filters) ? 1 : 0);
            const filtered = facets > 0 || key !== "";
            if (filtered) sessionStorage.setItem("filteredPokemonNav", JSON.stringify(visibleNav));
            else sessionStorage.removeItem("filteredPokemonNav");
            resultsCount.textContent = filtered ? plural(visibleNav.length) : TOTAL + " Pokémon";
            filtersApply.textContent = visibleNav.length ? "Show " + plural(visibleNav.length) : "No results";
            filtersBadge.textContent = facets;
            filtersBadge.hidden = facets === 0;
            clearFiltersBtn.hidden = !filtered;
            emptyState.hidden = visibleNav.length > 0;
            renderActiveFilters(filters, noCategory);
          }

          function renderActiveFilters(filters, noCategory) {
            const chips = [];
            if (filters.type) chips.push(["type", '<span class="tag ' + filters.type + '">' + filters.type + '</span>']);
            if (filters.generation) chips.push(["generation", GENERATION_LABELS[filters.generation]]);
            if (!noCategory) chips.push(["category", filters.baby ? "Baby" : filters.legendary ? "Legendary" : "Mythical"]);
            if (formsChanged(filters)) {
              const shown = [];
              if (filters.species) shown.push("Species");
              if (filters.regional) shown.push("Regional");
              if (filters.battle) shown.push("Battle");
              if (filters.other) shown.push("Other");
              chips.push(["forms", "Showing: " + (shown.join(", ") || "none")]);
            }
            activeFilters.innerHTML = chips.map(function(chip) {
              return '<button type="button" class="active-chip" data-clear="' + chip[0] + '" title="Remove filter">' + chip[1] + CLOSE_ICON + '</button>';
            }).join("");
            activeFilters.hidden = chips.length === 0;
          }

          function clearAllFilters() {
            searchInput.value = "";
            setRadio("type", "");
            setRadio("generation", "");
            ["baby-filter", "legendary-filter", "mythical-filter", "regional-filter", "battle-filter", "other-filter"].forEach(function(id) { setChecked(id, false); });
            setChecked("species-filter", true);
            sessionStorage.removeItem("pokemonFilters");
            filterPokemons();
          }

          activeFilters.addEventListener("click", function(e) {
            const chip = e.target.closest("[data-clear]");
            if (!chip) return;
            const facet = chip.dataset.clear;
            if (facet === "type") setRadio("type", "");
            if (facet === "generation") setRadio("generation", "");
            if (facet === "category") categoryBoxes.forEach(function(box) { box.checked = false; });
            if (facet === "forms") {
              setChecked("species-filter", true);
              ["regional-filter", "battle-filter", "other-filter"].forEach(function(id) { setChecked(id, false); });
            }
            filterPokemons();
            saveFilters();
          });

          filtersPanel.addEventListener("change", function(e) {
            // Baby/Legendary/Mythical are mutually exclusive (radio-like).
            if (categoryBoxes.indexOf(e.target) !== -1 && e.target.checked) {
              categoryBoxes.forEach(function(box) { if (box !== e.target) box.checked = false; });
            }
            filterPokemons();
            saveFilters();
          });

          clearFiltersBtn.addEventListener("click", clearAllFilters);
          document.getElementById("empty-clear").addEventListener("click", clearAllFilters);
          searchInput.addEventListener("input", function() { filterPokemons(); saveFilters(); });
          searchInput.addEventListener("keydown", function(e) { if (e.key === "Enter") searchInput.blur(); });

          function openFilters() {
            filtersPanel.classList.add("open");
            filtersBackdrop.classList.add("open");
            document.body.classList.add("no-scroll");
          }

          function closeFilters() {
            filtersPanel.classList.remove("open");
            filtersBackdrop.classList.remove("open");
            document.body.classList.remove("no-scroll");
          }

          document.getElementById("filters-open").addEventListener("click", openFilters);
          document.getElementById("filters-close").addEventListener("click", closeFilters);
          filtersApply.addEventListener("click", closeFilters);
          filtersBackdrop.addEventListener("click", closeFilters);

          // Compare functionality
          let compareList = [];
          let compareMode = false;
          const compareModeBtn = document.getElementById("compare-mode-btn");
          const compareBar = document.getElementById("compare-bar");
          const compareSlot1 = document.getElementById("compare-pokemon-1");
          const compareSlot2 = document.getElementById("compare-pokemon-2");
          const compareBtn = document.getElementById("compare-btn");
          const compareHint = document.getElementById("compare-hint");
          const compareModal = document.getElementById("compare-modal");
          const compareResults = document.getElementById("compare-results");

          function setCompareMode(on) {
            compareMode = on;
            compareModeBtn.classList.toggle("active", on);
            compareModeBtn.setAttribute("aria-pressed", on);
            document.body.classList.toggle("compare-mode", on);
            compareBar.style.display = on ? "flex" : "none";
            compareHint.hidden = !on;
            if (!on) {
              compareList = [];
              document.querySelectorAll(".selected-compare").forEach(function(el) { el.classList.remove("selected-compare"); });
            }
            updateCompareBar();
          }

          function updateCompareBar() {
            compareSlot1.textContent = compareList[0] ? compareList[0].name : "Pick a Pokémon";
            compareSlot1.classList.toggle("filled", compareList.length > 0);
            if (compareList.length === 1) {
              // Mirror the first pick as a faded hint: pressing Go now compares
              // the Pokémon with itself (to pit its forms against each other).
              compareSlot2.textContent = compareList[0].name;
              compareSlot2.classList.add("compare-slot-mirror");
            } else {
              compareSlot2.textContent = compareList[1] ? compareList[1].name : "Pick another";
              compareSlot2.classList.remove("compare-slot-mirror");
            }
            compareSlot2.classList.toggle("filled", compareList.length > 1);
            compareBtn.disabled = compareList.length === 0;
          }

          compareModeBtn.addEventListener("click", function() { setCompareMode(!compareMode); });
          document.getElementById("clear-compare-btn").addEventListener("click", function() { setCompareMode(false); });

          cards.forEach(function(card) {
            card.addEventListener("click", function(e) {
              if (!compareMode) {
                sessionStorage.setItem("indexScroll", String(window.scrollY));
                return;
              }
              e.preventDefault();
              const id = this.dataset.id;
              const name = this.dataset.name;
              const existing = compareList.findIndex(function(p) { return p.id === id; });
              if (existing !== -1) {
                // Clicking an already-selected Pokémon deselects it.
                compareList.splice(existing, 1);
                this.classList.remove("selected-compare");
              } else if (compareList.length < 2) {
                compareList.push({ id: id, name: name });
                this.classList.add("selected-compare");
              }
              updateCompareBar();
            });
          });

          function openCompareModal() {
            compareModal.style.display = "flex";
            document.body.classList.add("no-scroll");
          }

          function closeCompareModal() {
            if (compareModal.style.display === "none") return;
            compareModal.style.display = "none";
            document.body.classList.remove("no-scroll");
            compareModal.querySelectorAll("audio").forEach(function(audio) { audio.pause(); });
          }

          document.querySelector(".close-modal").addEventListener("click", closeCompareModal);
          compareModal.addEventListener("click", function(e) {
            if (e.target === compareModal) closeCompareModal();
          });
          compareResults.addEventListener("click", function(e) {
            const button = e.target.closest("[data-audio]");
            if (!button) return;
            const audio = document.getElementById(button.dataset.audio);
            audio.currentTime = 0;
            audio.play();
          });

          document.addEventListener("keydown", function(e) {
            if (e.key === "Escape") {
              closeFilters();
              closeCompareModal();
              return;
            }
            const tag = document.activeElement ? document.activeElement.tagName : "";
            if (e.key === "/" && !/^(INPUT|SELECT|TEXTAREA)$/.test(tag)) {
              e.preventDefault();
              searchInput.focus();
            }
          });

          function titleCase(text) {
            return text.split("-").map(function(word) { return word.charAt(0).toUpperCase() + word.slice(1); }).join(" ");
          }

          function formatFormName(name, baseName) {
            if (name === baseName) return titleCase(baseName);
            return titleCase(name.startsWith(baseName + "-") ? name.slice(baseName.length + 1) : name);
          }

          function pokemonLabel(pokemon, species) {
            const entry = species.names.find(function(n) { return n.language.name === "en"; });
            const base = entry ? entry.name : titleCase(species.name);
            const isDefault = species.varieties.some(function(v) { return v.is_default && v.pokemon.name === pokemon.name; });
            return isDefault ? base : base + " (" + formatFormName(pokemon.name, species.name) + ")";
          }

          function typesOf(pokemon) {
            return pokemon.types.map(function(t) { return t.type.name; });
          }

          function artworkOf(pokemon) {
            return pokemon.sprites.other["official-artwork"].front_default || pokemon.sprites.front_default;
          }

          function typeTags(types) {
            return types.map(function(t) { return '<span class="tag ' + t + '">' + t + '</span>'; }).join("");
          }

          function buildFormSelect(varieties, baseName, selectId, currentName) {
            if (varieties.length <= 1) return "";
            const options = varieties.map(function(v) {
              return '<option value="' + v.pokemon.url + '"' + (v.pokemon.name === currentName ? " selected" : "") + ">" + formatFormName(v.pokemon.name, baseName) + "</option>";
            }).join("");
            return '<div class="select-wrap"><select id="' + selectId + '" aria-label="Form">' + options + "</select></div>";
          }

          function buildSide(pokemon, species, side) {
            const cry = (pokemon.cries && pokemon.cries.latest) || "";
            return '<div class="compare-pokemon" id="compare-side-' + side + '" style="--tc: var(--type-' + typesOf(pokemon)[0] + ')">' +
              '<div class="compare-art"><img id="compare-img-' + side + '" src="' + artworkOf(pokemon) + '" alt=""></div>' +
              '<h3 id="compare-name-' + side + '">' + pokemonLabel(pokemon, species) + "</h3>" +
              '<div class="compare-types" id="compare-types-' + side + '">' + typeTags(typesOf(pokemon)) + "</div>" +
              buildFormSelect(species.varieties, species.name, "compare-form-" + side, pokemon.name) +
              (cry ? '<div class="compare-cry"><audio id="compare-cry-' + side + '" src="' + cry + '"></audio><button type="button" class="cry-button" data-audio="compare-cry-' + side + '">' + VOLUME_ICON + "<span>Cry</span></button></div>" : "") +
              "</div>";
          }

          function compareRow(label, v1, v2, max, extraClass) {
            const w1 = v1 >= v2 ? " win" : "";
            const w2 = v2 >= v1 ? " win" : "";
            const pct = function(v) { return Math.min(100, Math.round(v / max * 100)); };
            return '<div class="cmp-row' + extraClass + '">' +
              '<span class="cmp-val' + w1 + '">' + v1 + "</span>" +
              '<div class="cmp-bar cmp-left' + w1 + '"><i style="width: ' + pct(v1) + '%"></i></div>' +
              '<span class="cmp-label">' + label + "</span>" +
              '<div class="cmp-bar cmp-right' + w2 + '"><i style="width: ' + pct(v2) + '%"></i></div>' +
              '<span class="cmp-val' + w2 + '">' + v2 + "</span>" +
              "</div>";
          }

          function buildCompareStats(p1, p2) {
            const stats1 = p1.stats.reduce(function(acc, s) { acc[s.stat.name] = s.base_stat; return acc; }, {});
            const stats2 = p2.stats.reduce(function(acc, s) { acc[s.stat.name] = s.base_stat; return acc; }, {});
            let total1 = 0;
            let total2 = 0;
            const rows = STAT_NAMES.map(function(stat) {
              const v1 = stats1[stat] || 0;
              const v2 = stats2[stat] || 0;
              total1 += v1;
              total2 += v2;
              return compareRow(STAT_LABELS[stat], v1, v2, 255, "");
            });
            rows.push(compareRow("Total", total1, total2, Math.max(800, total1, total2), " cmp-total"));
            return rows.join("");
          }

          compareBtn.addEventListener("click", async function() {
            if (compareList.length < 1) return;
            // With a single Pokémon selected, compare it against itself so its
            // forms can be pitted against each other via the per-side selectors.
            const id1 = compareList[0].id;
            const id2 = (compareList[1] || compareList[0]).id;
            compareResults.innerHTML = '<p class="compare-loading">Loading…</p>';
            openCompareModal();

            let pokemon1, pokemon2, species1, species2;
            try {
              [pokemon1, pokemon2] = await Promise.all([
                fetch("https://pokeapi.co/api/v2/pokemon/" + id1).then(function(r) { return r.json(); }),
                fetch("https://pokeapi.co/api/v2/pokemon/" + id2).then(function(r) { return r.json(); }),
              ]);
              // Fetch species from each Pokémon's own species.url so form ids
              // (which have no pokemon-species/{id} endpoint) resolve correctly.
              [species1, species2] = await Promise.all([
                fetch(pokemon1.species.url).then(function(r) { return r.json(); }),
                fetch(pokemon2.species.url).then(function(r) { return r.json(); }),
              ]);
            } catch (err) {
              compareResults.innerHTML = '<p class="compare-loading">Could not load the comparison. Check your connection and try again.</p>';
              return;
            }

            const current = { 1: pokemon1, 2: pokemon2 };
            const species = { 1: species1, 2: species2 };
            compareResults.innerHTML =
              '<div class="compare-header">' + buildSide(pokemon1, species1, 1) + '<div class="vs">VS</div>' + buildSide(pokemon2, species2, 2) + "</div>" +
              '<div class="compare-stats" id="compare-stats"></div>';

            function updateStats() {
              const stats = document.getElementById("compare-stats");
              stats.style.setProperty("--c1", "var(--type-" + typesOf(current[1])[0] + ")");
              stats.style.setProperty("--c2", "var(--type-" + typesOf(current[2])[0] + ")");
              stats.innerHTML = buildCompareStats(current[1], current[2]);
            }
            updateStats();

            [1, 2].forEach(function(side) {
              const select = document.getElementById("compare-form-" + side);
              if (!select) return;
              select.addEventListener("change", async function() {
                const pokemon = await fetch(this.value).then(function(r) { return r.json(); });
                current[side] = pokemon;
                document.getElementById("compare-img-" + side).src = artworkOf(pokemon);
                document.getElementById("compare-name-" + side).textContent = pokemonLabel(pokemon, species[side]);
                document.getElementById("compare-types-" + side).innerHTML = typeTags(typesOf(pokemon));
                document.getElementById("compare-side-" + side).style.setProperty("--tc", "var(--type-" + typesOf(pokemon)[0] + ")");
                const cryEl = document.getElementById("compare-cry-" + side);
                if (cryEl && pokemon.cries && pokemon.cries.latest) cryEl.src = pokemon.cries.latest;
                updateStats();
              });
            });
          });

          loadFilters();
          filterPokemons();
          const savedScroll = sessionStorage.getItem("indexScroll");
          if (savedScroll !== null) {
            sessionStorage.removeItem("indexScroll");
            window.scrollTo(0, Number(savedScroll));
          }
        });
      </script>${DONATE_WIDGET}
    </body>
  </html>`;
  }
