import { PokemonDetails } from "../pokemon-detail";
import { regionOf, REGION_TOKENS } from "../regions";
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

export function renderPokemonDetail(pokemon: PokemonDetails, totalPokemons: number): string {
    const types = typeTags((pokemon.types || []).map(type => type.toLowerCase()));
    const dexNo = String(pokemon.id).padStart(4, '0');
    const matchups = renderMatchups(pokemon);
    const notes = abilityNotes(pokemon.abilities);
    const heightInMeters = (pokemon.height / 10).toFixed(1) + " m";
    const weightInKilograms = (pokemon.weight / 10).toFixed(1) + " kg";
    const prevId = pokemon.id > 1 ? pokemon.id - 1 : totalPokemons;
    const nextId = pokemon.id < totalPokemons ? pokemon.id + 1 : 1;
    const prevFile = `${String(prevId).padStart(4, '0')}_details.html`;
    const nextFile = `${String(nextId).padStart(4, '0')}_details.html`;
    
    const bst = pokemon.stats.reduce((sum, stat) => sum + stat.value, 0);
    
    const getGenderDisplay = (genderRate: number): string => {
      if (genderRate === -1) return '<span class="gender-icon genderless">Genderless</span>';
      const femalePercent = (genderRate / 8) * 100;
      const malePercent = 100 - femalePercent;
      const pct = (n: number) => n.toFixed(1).replace(/\.0$/, '') + '%';
      return `<div class="gender-bar" role="img" aria-label="${pct(malePercent)} male, ${pct(femalePercent)} female"><span class="male" style="width: ${malePercent}%;"></span><span class="female" style="width: ${femalePercent}%;"></span></div>
              <div class="gender-legend"><span class="gender-icon male">♂ ${pct(malePercent)}</span><span class="gender-icon female">♀ ${pct(femalePercent)}</span></div>`;
    };

    const habitatDisplay = pokemon.habitat !== 'unknown'
      ? pokemon.habitat.charAt(0).toUpperCase() + pokemon.habitat.slice(1).replace(/-/g, ' ')
      : 'Unknown';

    const generationDisplay = pokemon.generation !== 'unknown'
      ? 'Gen ' + pokemon.generation.replace('generation-', '').toUpperCase()
      : 'Unknown';
    
    const evoNodeAnchor = (evo: any): string => {
      // Gender branches share one dex id (Basculegion male + female), so only
      // the default-form node is highlighted on load; the client re-targets the
      // selected gender by data-hash.
      const isCurrentSpecies = evo.id === pokemon.id;
      return `
        <a href="${String(evo.id).padStart(4, '0')}_details.html${evo.hash ? `#${evo.hash}` : ''}" data-hash="${evo.hash || ''}" class="evo-step ${isCurrentSpecies && !evo.hash ? 'current' : ''}" ${isCurrentSpecies ? 'data-base="1"' : ''}>
          ${evo.hasForms ? `<span class="evo-forms-badge" title="Has other forms"${isCurrentSpecies ? ' style="display:none;"' : ''}>+</span>` : ''}
          <img src="${evo.imageUrl}" data-default-img="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${evo.id}.png" alt="${evo.name}" />
          <span>${evo.name}</span>
        </a>`;
    };

    const battleSuffix = (formName: string): string =>
      formName.startsWith(pokemon.codename + '-') ? formName.slice(pokemon.codename.length + 1) : formName.split('-').slice(1).join('-');
    const evoBattleStep = (b: any): string => `
        <button type="button" class="evo-battle-step" data-url="https://pokeapi.co/api/v2/pokemon/${b.id}/" data-form="${battleSuffix(b.formName)}">
          <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" />
          <span>${b.name}</span>
        </button>`;

    // A node's outgoing links: its evolutions ("→") and battle-only
    // transformations ("↔"). With more than one they stack as branches, so a
    // battle form reads as an alternative, not the next stage.
    const renderEvolutionStep = (evo: any, isFirst: boolean = false): string => {
      let html = '';
      if (!isFirst && (evo.triggerDetails || evo.regionLabel || evo.genderLabel)) {
        const capRegion = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
        const parts: string[] = [];
        if (evo.triggerDetails) parts.push(evo.triggerDetails);
        if (evo.regionLabel) parts.push(`in ${capRegion(evo.regionLabel)}`);
        if (evo.genderLabel) parts.push(evo.genderLabel);
        html += `<div class="evo-arrow">${icon('arrowRight')}<span class="evo-trigger">${parts.join('<br>')}</span></div>`;
      }
      html += evoNodeAnchor(evo);

      const evos = evo.evolvesTo || [];
      const battles = evo.battleForms || [];
      // A battle-only branch: "↔" plus the transformation trigger (mega stone,
      // ability…) underneath, mirroring the "→" + trigger of an evolution.
      const battleArrow = (b: any) =>
        `<div class="evo-arrow evo-arrow-bi">${icon('arrowLeftRight')}${b.trigger ? `<span class="evo-trigger">${b.trigger}</span>` : ''}</div>`;

      // Single evolution, no battle form → keep the chain in one line.
      if (evos.length === 1 && battles.length === 0) {
        html += renderEvolutionStep(evos[0], false);
        return html;
      }
      // A single battle form (terminal node) → inline "↔" + trigger + form.
      if (evos.length === 0 && battles.length === 1) {
        html += battleArrow(battles[0]) + evoBattleStep(battles[0]);
        return html;
      }
      // Multiple outgoing links → stack them: evolutions with "→", battle forms
      // with "↔", each with its own trigger note.
      if (evos.length + battles.length > 1) {
        html += `<div class="evo-branch">`;
        html += evos.map((nextEvo: any) => `
            <div class="evo-branch-row">${renderEvolutionStep(nextEvo, false)}</div>`).join('');
        html += battles.map((b: any) => `
            <div class="evo-branch-row">${battleArrow(b)}${evoBattleStep(b)}</div>`).join('');
        html += `</div>`;
      }
      return html;
    };
    
    // The chain "key" a form belongs to: its region token (galar…), else its
    // suffix relative to the species codename (own-tempo…), else 'default'.
    // Mirrors the client-side chainKeyOf so form selection swaps to its row.
    const keyOfForm = (formName: string, codename: string): string => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      if (!suffix) return 'default';
      // Gender variants share the default chain (shown as branches, not a line).
      if (suffix === 'male' || suffix === 'female') return 'default';
      const segs = suffix.split('-');
      // Regional only when a region token LEADS the suffix (meowth-galar), not
      // when it appears later (raticate-totem-alola is a Totem form, not Alola).
      // Ash's Pikachu caps are named after regions but are never regional.
      if (!segs.includes('cap') && REGION_TOKENS.includes(segs[0])) return segs[0];
      return suffix;
    };
    // Which chain a path belongs to: its base form's region (Own Tempo Rockruff →
    // Dusk Lycanroc, Galarian Meowth → Perrserker), else the evolved form's region;
    // a plain evolution with no form data stays on the default line.
    const pathRegion = (p: any, codename: string): string => {
      if (p.baseForm) {
        const k = keyOfForm(p.baseForm, codename);
        if (k !== 'default') return k;
      }
      if (p.evolvedForm) {
        const er = regionOf(p.evolvedForm);
        if (er !== 'default') return er;
      }
      return 'default';
    };
    const variantForRegion = (node: any, region: string): any =>
      node.variants.find((v: any) => keyOfForm(v.formName, node.codename) === region) || node.variants.find((v: any) => v.formName === node.defaultFormName);
    const variantByForm = (node: any, formName: string): any =>
      node.variants.find((v: any) => v.formName === formName);
    const isGenderForm = (formName: string, codename: string): boolean => {
      const suffix = formName.startsWith(codename + '-') ? formName.slice(codename.length + 1) : '';
      return suffix === 'male' || suffix === 'female';
    };
    // Target variant(s) when evolved_form is unspecified: the region's (or
    // default) variety; or, if the target splits by gender (Basculin →
    // Basculegion male/female), the default plus its gender siblings.
    const unspecifiedTargets = (node: any, region: string): any[] => {
      if ((node.variants || []).some((v: any) => isGenderForm(v.formName, node.codename))) {
        return node.variants.filter((v: any) =>
          v.formName === node.defaultFormName || isGenderForm(v.formName, node.codename));
      }
      const one = variantForRegion(node, region);
      return one ? [one] : [];
    };

    // Resolve the raw tree into a concrete chain for a region, as renderEvolutionStep
    // expects. Each distinct evolved form in the region becomes its own branch;
    // region forms drop out of the regions they don't apply to.
    const resolveRegion = (node: any, region: string, displayVariant: any, triggerDetails: string, chainRegions: Set<string>, extraVisible: Set<string> = new Set()): any => {
      const evolvesTo: any[] = [];
      let evolvingForm: string | null = null;  // form of THIS node an included path says evolves
      for (const edge of node.children) {
        const seen = new Map<string, { trigger: string; vg: number; regionLabel: string }>();  // evolvedForm ('' = unspecified) → info
        for (const p of edge.paths) {
          const pr = pathRegion(p, node.codename);
          // A regional evolution whose region has no chain of its own (the base
          // species lacks that regional form, e.g. Pikachu → Alolan Raichu) is
          // shown on the default chain, tagged with the region under the arrow.
          const orphanRegional = region === 'default' && pr !== 'default' && !chainRegions.has(pr);
          if (pr !== region && !orphanRegional) continue;
          // base_form names which form of THIS node actually evolves (only
          // White-Striped Basculin → Basculegion); remember it so the node is
          // shown as that form even when reached from a descendant's chain.
          if (p.baseForm && p.baseForm !== node.defaultFormName && variantByForm(node, p.baseForm)) evolvingForm = p.baseForm;
          // A granular evolved form with no variety of its own collapses to the default
          // target. The value-less trigger is used only when the base form doesn't pick the
          // result (Alcremie); a form-preserving line sets baseForm and keeps its exact trigger.
          const matched = p.evolvedForm && variantByForm(edge.node, p.evolvedForm);
          const key = matched ? p.evolvedForm : '';
          const trig = (p.evolvedForm && !matched && !p.baseForm) ? p.genericTrigger : p.trigger;
          // Only tag a real region under the arrow ("in Alola"). When several methods reach
          // the same form, keep the most recent generation's (higher version group),
          // e.g. Eevee → Leafeon: Leaf Stone over Moss Rock.
          if (!seen.has(key) || p.vg > seen.get(key)!.vg) seen.set(key, { trigger: trig, vg: p.vg, regionLabel: orphanRegional && REGION_TOKENS.includes(pr) ? pr : '' });
        }
        // All target variants shown for this edge (plus their battle forms), so a shown
        // sibling isn't badged "+" for a form already visible, whether siblings come from
        // one branch (Basculegion ♂/♀) or several (Toxel → Amped/Low-Key Toxtricity).
        const edgeVisible = new Set<string>();
        for (const [ef] of seen) {
          const cvs = (ef ? [variantByForm(edge.node, ef)] : unspecifiedTargets(edge.node, region)).filter(Boolean);
          for (const cv of cvs) {
            edgeVisible.add(cv.formName);
            for (const b of (edge.node.battleForms || [])) if (b.baseForms.includes(cv.formName)) edgeVisible.add(b.formName);
          }
        }
        for (const [evolvedForm, info] of seen) {
          const childVariants = (evolvedForm ? [variantByForm(edge.node, evolvedForm)] : unspecifiedTargets(edge.node, region)).filter(Boolean);
          for (const childVariant of childVariants) {
            const child = resolveRegion(edge.node, region, childVariant, info.trigger, chainRegions, edgeVisible);
            child.regionLabel = info.regionLabel;
            // Gender-split targets (Basculin → male/female Basculegion) carry no
            // gender on the evolution itself, so tag each branch by its form.
            if (childVariants.length > 1) {
              const suffix = childVariant.formName.startsWith(edge.node.codename + '-') ? childVariant.formName.slice(edge.node.codename.length + 1) : '';
              child.genderLabel = suffix === 'female' ? 'Female' : 'Male';
            }
            evolvesTo.push(child);
          }
        }
      }
      // Show this node as the form that actually evolves when it's otherwise
      // displayed as its default (Basculegion's chain roots at White-Striped
      // Basculin, not the default Red-Striped).
      if (evolvingForm && displayVariant.formName === node.defaultFormName) {
        displayVariant = variantByForm(node, evolvingForm) || displayVariant;
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      // A persistent form pair (Minior meteor ↔ core) links to its counterpart
      // regardless of is_battle_only.
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      // Badge this node if its species has a variety not visible in this chain (the
      // shown variant, its "↔" battle forms, gender siblings alongside). The renderer
      // hides it on the current Pokémon, whose forms sit in the Forms list.
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName), ...extraVisible]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      // Suffix (relative to this node's species codename) so the link can carry
      // the exact form and the target page opens in it; '' for the default form.
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails, evolvesTo, battleForms };
    };
    const renderRegionChain = (region: string, chainRegions: Set<string>): string => {
      if (!pokemon.evolutionChain) return '<p class="no-evolution">This Pokémon does not evolve.</p>';
      const root = resolveRegion(pokemon.evolutionChain, region, variantForRegion(pokemon.evolutionChain, region), '', chainRegions);
      // Render whenever there's something to show: an evolution or a battle-only
      // transformation hanging off the root (e.g. Zygarde ↔ Mega, no evolution).
      return root.evolvesTo.length === 0 && root.battleForms.length === 0
        ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
        : renderEvolutionStep(root, true);
    };

    // A plain cosmetic form (Gimmighoul Roaming) shares only an *unrestricted*
    // species evolution: a base_form on the path keeps caps a dead end. Rooted at
    // this species, so an upstream stage (Pichu → Pikachu) never leaks in.
    const resolveCosmetic = (node: any, displayVariant: any, chainRegions: Set<string>): any => {
      const evolvesTo: any[] = [];
      for (const edge of node.children) {
        const seen = new Map<string, string>();  // evolvedForm ('' = unspecified) → trigger
        const seenVg = new Map<string, number>();  // and its version group, to keep the newest
        for (const p of edge.paths) {
          if (p.baseForm) continue;  // restricted evolution: doesn't apply to this form
          // A granular evolved form with no variety of its own (Alcremie's
          // per-sweet forms) collapses to the default target with a value-less trigger.
          const matched = p.evolvedForm && variantByForm(edge.node, p.evolvedForm);
          const key = matched ? p.evolvedForm : '';
          const trig = (p.evolvedForm && !matched) ? p.genericTrigger : p.trigger;
          if (!seen.has(key) || p.vg > (seenVg.get(key) || 0)) { seen.set(key, trig); seenVg.set(key, p.vg); }
        }
        for (const [evolvedForm, trigger] of seen) {
          const childVariant = evolvedForm ? variantByForm(edge.node, evolvedForm) : variantForRegion(edge.node, 'default');
          if (!childVariant) continue;
          evolvesTo.push(resolveRegion(edge.node, 'default', childVariant, trigger, chainRegions));
        }
      }
      const battleForms = (node.battleForms || [])
        .filter((b: any) => b.baseForms.includes(displayVariant.formName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      if (displayVariant.transform) battleForms.push(displayVariant.transform);
      const visible = new Set([displayVariant.formName, ...battleForms.map((b: any) => b.formName)]);
      const hasForms = (node.allFormNames || []).some((n: string) => !visible.has(n));
      const hash = displayVariant.formName === node.defaultFormName
        ? ''
        : (displayVariant.formName.startsWith(node.codename + '-') ? displayVariant.formName.slice(node.codename.length + 1) : displayVariant.formName.split('-').slice(1).join('-'));
      return { id: node.speciesId, name: displayVariant.name, imageUrl: displayVariant.imageUrl, hasForms, hash, triggerDetails: '', evolvesTo, battleForms };
    };

    // One chain per region the current species actually has a form for, read
    // straight from the (data-derived) evolution tree, so no region list to
    // maintain. The default is shown first and loadForm() swaps to the others.
    const findEvoNode = (node: any, id: number): any => {
      if (!node) return null;
      if (node.speciesId === id) return node;
      for (const e of node.children) {
        const found = findEvoNode(e.node, id);
        if (found) return found;
      }
      return null;
    };
    const currentEvoNode = findEvoNode(pokemon.evolutionChain, pokemon.id);

    // Battle-only forms move out of the Forms list into the chain; regional
    // variants (incl. default) already have their own region chains.
    const battleOnlyNames: Set<string> = new Set(currentEvoNode ? currentEvoNode.battleForms.map((b: any) => b.formName) : []);
    // Base forms already covered by a region chain (default + regional variants);
    // any other base form of a battle-only transform (e.g. Battle Bond, Power
    // Construct) gets its own standalone chain instead.
    const regionalFormNames: string[] = currentEvoNode
      ? currentEvoNode.variants.filter((v: any) => v.region !== 'default' || v.formName === currentEvoNode.defaultFormName).map((v: any) => v.formName)
      : [];

    // A special base form (Greninja Battle Bond, Zygarde Power Construct, Minior
    // core) is a non-default, non-regional form hosting a battle-only transform; it
    // gets its own row. Gender forms are excluded (already branches on the default chain).
    const specialBaseForms: string[] = [];
    if (currentEvoNode) {
      const seen = new Set<string>();
      for (const b of currentEvoNode.battleForms) {
        for (const bf of b.baseForms) {
          if (!regionalFormNames.includes(bf) && !isGenderForm(bf, currentEvoNode.codename) && !seen.has(bf)) { seen.add(bf); specialBaseForms.push(bf); }
        }
      }
    }

    // Region rows cover the default form and other variants EXCEPT ones rendered
    // elsewhere: the default form itself and special base forms (own rows below).
    // Emitting them here would duplicate rows (or, mid-chain, make an empty one).
    const defaultKey = currentEvoNode ? keyOfForm(currentEvoNode.defaultFormName, currentEvoNode.codename) : 'default';
    const specialBaseKeys = new Set<string>(specialBaseForms.map((bf) => keyOfForm(bf, currentEvoNode.codename)));

    // Every region key some path in the chain actually resolves to (regional
    // forms, and form-locked lines like Own Tempo Rockruff → Dusk Lycanroc). A
    // variant whose key is NOT here has no chain of its own.
    const pathRegionsInChain = new Set<string>();
    const collectPathRegions = (node: any) => {
      for (const edge of node.children) {
        for (const p of edge.paths) pathRegionsInChain.add(pathRegion(p, node.codename));
        collectPathRegions(edge.node);
      }
    };
    if (pokemon.evolutionChain) collectPathRegions(pokemon.evolutionChain);

    // Regions that earn their own chain: every node's non-battle variants, plus
    // regional-token branches that are a separate species (Meowth's galar → Perrserker).
    // Cosmetic form keys (Flabébé colours, Vivillon patterns) stay one chain.
    const chainRegions = new Set<string>(['default']);
    const collectRegionKeys = (node: any) => {
      if (!node) return;
      for (const v of node.variants) chainRegions.add(keyOfForm(v.formName, node.codename));
      for (const e of node.children) collectRegionKeys(e.node);
    };
    collectRegionKeys(pokemon.evolutionChain);
    for (const r of pathRegionsInChain) if (REGION_TOKENS.includes(r)) chainRegions.add(r);

    // Whether the current species appears in a region's resolved chain, so its
    // page shows only the branch(es) it belongs to (Persian: default+alola;
    // Perrserker: galar; Meowth: all three).
    const speciesInRegion = (region: string): boolean => {
      if (!pokemon.evolutionChain) return false;
      const root = resolveRegion(pokemon.evolutionChain, region, variantForRegion(pokemon.evolutionChain, region), '', chainRegions);
      const walk = (n: any): boolean => n.id === pokemon.id || (n.evolvesTo || []).some(walk);
      return walk(root);
    };
    // A non-default region earns a row only if it's a real branch (a path resolves
    // to it, or the current species has a variant there), so target-only forms
    // like Toxtricity's amped/low-key don't spawn empty rows.
    const currentVariantKeys = new Set<string>(
      currentEvoNode ? currentEvoNode.variants.map((v: any) => keyOfForm(v.formName, currentEvoNode.codename)) : []
    );
    const rest = Array.from(chainRegions).filter((r) =>
      r !== 'default' && r !== defaultKey && !specialBaseKeys.has(r)
      && (pathRegionsInChain.has(r) || currentVariantKeys.has(r)));
    const evoRegionsAll = ['default', ...rest].filter(speciesInRegion);
    const evoRegions: string[] = evoRegionsAll.length ? evoRegionsAll : ['default'];

    // A non-regional key with no path of its own (Gimmighoul Roaming): its
    // region row would be empty, so resolveCosmetic handles it instead.
    const cosmeticInheritRegion = (region: string): boolean =>
      region !== 'default' && !REGION_TOKENS.includes(region) && !pathRegionsInChain.has(region);
    const regionRowsHtml = evoRegions.map(region => {
      const cosmeticVar = cosmeticInheritRegion(region) && currentEvoNode
        ? currentEvoNode.variants.find((v: any) => keyOfForm(v.formName, currentEvoNode.codename) === region)
        : null;
      let body: string;
      if (cosmeticVar) {
        const root = resolveCosmetic(currentEvoNode, cosmeticVar, chainRegions);
        body = root.evolvesTo.length === 0 && root.battleForms.length === 0
          ? '<p class="no-evolution">This Pokémon does not evolve.</p>'
          : renderEvolutionStep(root, true);
      } else {
        body = renderRegionChain(region, chainRegions);
      }
      // Open on the first relevant region ('default', else e.g. 'galar' for
      // Perrserker); the rest start hidden and the client swaps on selection.
      return `<div class="evo-row" data-region="${region}"${region === evoRegions[0] ? '' : ' style="display:none;"'}>${body}</div>`;
    }).join('\n');

    // Chain-building helpers shared below.
    const evoSuffixOf = (name: string): string =>
      name.startsWith(pokemon.codename + '-') ? name.slice(pokemon.codename.length + 1) : name.split('-').slice(1).join('-');
    const evoTitleCase = (s: string): string => s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const evoArtwork = (id: number) => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;

    const varietyIdByName: { [k: string]: number } = {};
    for (const v of pokemon.varieties) varietyIdByName[v.name] = parseInt(v.url.split('/').filter(Boolean).pop() as string);
    const specialRowsHtml = specialBaseForms.map((baseFormName: string) => {
      const attached = currentEvoNode.battleForms
        .filter((b: any) => b.baseForms.includes(baseFormName))
        .map((b: any) => ({ id: b.id, name: b.name, imageUrl: b.imageUrl, formName: b.formName, trigger: b.trigger }));
      const root = {
        id: pokemon.id,
        name: `${pokemon.name} (${evoTitleCase(evoSuffixOf(baseFormName))})`,
        imageUrl: evoArtwork(varietyIdByName[baseFormName]),
        hasForms: false,
        // The node's own anchor links here (#suffix) so you can return to this
        // base form from its battle-only form; without it the link drops the
        // hash and lands on the default form.
        hash: evoSuffixOf(baseFormName),
        region: evoSuffixOf(baseFormName),
        triggerDetails: '',
        evolvesTo: [],
        battleForms: attached,
      };
      return `<div class="evo-row" data-region="${evoSuffixOf(baseFormName)}" style="display:none;">${renderEvolutionStep(root, true)}</div>`;
    }).join('\n');

    const evolutionRowsHtml = regionRowsHtml + '\n' + specialRowsHtml;

    // The Forms list keeps default + regional + special forms, but not battle-only
    // nor gender-difference forms (those show as gender branches in the chain). A
    // suffix→URL map still lets the chain's Male/Female links switch to them.
    const isGenderVariety = (name: string): boolean => {
      const s = evoSuffixOf(name);
      return s === 'male' || s === 'female';
    };
    const clusterVarieties = pokemon.varieties.filter(v => !battleOnlyNames.has(v.name) && !isGenderVariety(v.name));
    const genderFormUrls: { [suffix: string]: string } = {};
    for (const v of pokemon.varieties) {
      if (!v.is_default && !battleOnlyNames.has(v.name) && isGenderVariety(v.name)) genderFormUrls[evoSuffixOf(v.name)] = v.url;
    }

    // Label a form the way the evolution chain does (official name for regional
    // forms, e.g. "Alolan Persian"), reusing the names already resolved there.
    const evoVariantNames: { [formName: string]: string } = {};
    if (currentEvoNode) for (const v of currentEvoNode.variants) evoVariantNames[v.formName] = v.name;
    const formLabel = (v: any): string => {
      if (v.name === pokemon.codename) return pokemon.name;
      if (evoVariantNames[v.name]) return evoVariantNames[v.name];
      const formPart = v.name.startsWith(pokemon.codename + '-') ? v.name.slice(pokemon.codename.length + 1) : v.name;
      return formPart.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    };

    const abilitiesTableRows = pokemon.abilities
      .map(ability => {
        const hiddenTag = ability.is_hidden ? `<span class="hidden-ability">Hidden</span>` : '';
        return `
          <div class="ability">
            <div class="ability-name">${titleCase(ability.name)}${hiddenTag}</div>
            <p class="ability-desc">${ability.description}</p>
          </div>`;
      })
      .join('\n');

    const formOptions = clusterVarieties.map(v =>
      `<option value="${v.url}" ${v.is_default ? 'selected' : ''}>${formLabel(v)}</option>`
    ).join('\n');

    // Clickable form squares shown below the evolution chain (battle-only forms
    // are excluded, since they live in the chain). The artwork URL is built straight
    // from the variety id (no extra fetch needed).
    const formSquares = clusterVarieties.length > 1 ? `
          <div class="forms-cluster">
            <span class="forms-label">Forms</span>
            <div class="forms-list">
              ${clusterVarieties.map(v => {
                const formId = v.url.split('/').filter(Boolean).pop();
                const artwork = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${formId}.png`;
                const label = formLabel(v);
                return `<button type="button" class="form-step ${v.is_default ? 'active' : ''}" data-url="${v.url}" data-region="${evoSuffixOf(v.name)}">
                  <img src="${artwork}" data-default-img="${pokemon.officialArtworkUrl}" alt="${label}" loading="lazy" />
                  <span>${label}</span>
                </button>`;
              }).join('')}
            </div>
          </div>` : '';

    const getStatBar = (value: number, maxValue: number) => {
      const percentage = Math.min(100, Math.round((value / maxValue) * 100));
      return `<div class="stat-bar"><div class="stat-value" style="width: ${percentage}%; background-color: ${statColor(value)};"></div></div>`;
    };

    const getCatchRateBar = (captureRate: number) => {
      const percentage = Math.round((captureRate / 255) * 100);
      let backgroundColor;
      if (percentage >= 50) {
        backgroundColor = '#22c55e';
      } else if (percentage >= 25) {
        backgroundColor = '#f59e0b';
      } else {
        backgroundColor = '#ef4444';
      }
      return `
        <div class="catch-rate-display">
          <div class="catch-bar">
            <div class="catch-value" style="width: ${percentage}%; background-color: ${backgroundColor};"></div>
          </div>
          <span class="catch-percent">${percentage}%</span>
        </div>
      `;
    };

    const statsTableRows = pokemon.stats
      .map(stat => `
        <tr>
          <th scope="row">${STAT_LABELS[stat.name] || titleCase(stat.name)}</th>
          <td class="stat-num">${stat.value}</td>
          <td class="stat-bar-cell">${getStatBar(stat.value, 255)}</td>
        </tr>`)
      .join('\n');

    const descriptionsSelect = pokemon.pokedexDescriptions
      .map(description => `
        <option value="${description.version}">${titleCase(description.version)}</option>`)
      .join('\n');
  
    const descriptionsRows = pokemon.pokedexDescriptions
      .map((description, index) => `
        <p class="description" data-version='${description.version}' style="${index !== 0 ? 'display: none;' : ''}">${description.flavor_text}</p>`)
      .join('\n');
    
    return `<!DOCTYPE html>
    <html lang="en">
      ${head(`${pokemon.name} #${dexNo} · PokeQuickDex`)}
      <body>
        <header class="topbar">
          <div class="topbar-inner">
            <a href="index.html" class="icon-btn back-to-menu" title="Back to the Pokédex" aria-label="Back to the Pokédex">${icon('arrowLeft')}</a>
            <a href="index.html" class="brand">${BRAND}</a>
            <div class="topbar-actions">
              <span id="filter-counter" class="filter-counter"></span>
              <nav class="topbar-nav" aria-label="Previous and next Pokémon">
                <a id="prev-btn" href="${prevFile}" class="icon-btn nav-button" data-default-prev="${prevFile}" title="Previous Pokémon (←)" aria-label="Previous Pokémon">${icon('chevronLeft')}</a>
                <a id="next-btn" href="${nextFile}" class="icon-btn nav-button" data-default-next="${nextFile}" title="Next Pokémon (→)" aria-label="Next Pokémon">${icon('chevronRight')}</a>
              </nav>
              ${THEME_TOGGLE}
            </div>
          </div>
        </header>
        <main class="detail">
          <section id="hero" class="hero" style="${typeVars(pokemon.types)}">
            <div class="hero-inner">
              <div class="hero-head">
                <div class="hero-kicker"><span class="dex-no">#${dexNo}</span><span class="hero-gen">${generationDisplay}</span></div>
                <h1 id="pokemon-title-name">${pokemon.name}</h1>
                <p class="pokemon-genus">${pokemon.genus}</p>
                <div class="hero-types" id="pokemon-types">${types}</div>
              </div>
              <div class="hero-art">
                <img id="pokemon-artwork" src="${pokemon.officialArtworkUrl}" alt="${pokemon.name}" data-normal="${pokemon.officialArtworkUrl}" data-shiny="${pokemon.officialArtworkShinyUrl}" data-animated="${pokemon.animatedSpriteUrl}" />
              </div>
              <div class="hero-actions">${clusterVarieties.length > 1 ? `
                <div class="form-picker">
                  <label for="form-select">Form</label>
                  <div class="select-wrap"><select id="form-select">
                    ${formOptions}
                  </select></div>
                </div>` : ''}
                <div class="image-controls">
                  <button id="shiny-toggle" type="button" class="hero-btn shiny-toggle" title="Toggle shiny"${pokemon.officialArtworkShinyUrl ? '' : ' style="display:none;"'}>${icon('sparkles')}<span>Shiny</span></button>
                  ${pokemon.animatedSpriteUrl ? `<button id="animated-toggle" type="button" class="hero-btn animated-toggle" title="Toggle animated sprite">${icon('play')}<span>Animated</span></button>` : ''}
                  ${pokemon.cryUrl ? `<button id="cry-button" type="button" class="hero-btn cry-button" title="Play cry">${icon('volume')}<span>Cry</span></button>` : ''}
                </div>
                ${pokemon.cryUrl ? `<audio id="pokemon-cry" src="${pokemon.cryUrl}"></audio>` : ''}
              </div>
            </div>
          </section>
          <div class="detail-body">
            <div class="card-row">
              <section class="card matchups">
                <div class="card-head">
                  <h2 class="card-title">Type matchups</h2>
                  <span class="card-hint">Damage taken when attacked</span>
                </div>
                <div class="matchups-list" id="type-defenses">${matchups}</div>
                <ul class="ability-notes" id="ability-notes">${notes}</ul>
              </section>
              <section class="card">
                <div class="card-head"><h2 class="card-title">Base stats</h2></div>
                <table class="stats-table">
                  <tbody id="stats-body">
                  ${statsTableRows}
                  </tbody>
                  <tfoot>
                    <tr class="bst-row">
                      <th scope="row">Total</th>
                      <td class="stat-num bst-value" id="pokemon-bst">${bst}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                </table>
              </section>
            </div>
            <section class="card">
              <div class="card-head"><h2 class="card-title">Evolution</h2></div>
              <div class="evolution-chain">
                ${evolutionRowsHtml}
                ${formSquares}
              </div>
            </section>
            <div class="card-row">
              <section class="card">
                <div class="card-head"><h2 class="card-title">Abilities</h2></div>
                <div class="ability-list" id="abilities-body">
                ${abilitiesTableRows}
                </div>
              </section>
              <section class="card profile">
                <div class="card-head"><h2 class="card-title">Profile</h2></div>
                <div class="profile-grid">
                  <dl class="info-list">
                    <div class="info-row"><dt>Height</dt><dd id="pokemon-height">${heightInMeters}</dd></div>
                    <div class="info-row"><dt>Weight</dt><dd id="pokemon-weight">${weightInKilograms}</dd></div>
                    <div class="info-row info-gender"><dt>Gender</dt><dd>${getGenderDisplay(pokemon.genderRate)}</dd></div>
                    <div class="info-row" id="detail-habitat"><dt>Habitat</dt><dd>${habitatDisplay}</dd></div>
                  </dl>
                  <dl class="info-list" id="detail-training">
                    <div class="info-row" id="detail-catch-rate"><dt title="Higher = easier to catch">Catch rate</dt><dd>${getCatchRateBar(pokemon.captureRate)}</dd></div>
                    <div class="info-row" id="detail-base-happiness"><dt>Base happiness</dt><dd>${pokemon.baseHappiness}</dd></div>
                    <div class="info-row" id="detail-growth-rate"><dt>Growth rate</dt><dd>${titleCase(pokemon.growthRate)}</dd></div>
                    <div class="info-row" id="detail-egg-groups"><dt>Egg groups</dt><dd>${pokemon.eggGroups.map(titleCase).join(', ') || '—'}</dd></div>
                  </dl>
                </div>
              </section>
            </div>
            <section class="card entries" id="pokedex-section"${pokemon.pokedexDescriptions.length === 0 ? ' style="display:none;"' : ''}>
              <div class="card-head">
                <h2 class="card-title">Pokédex entries</h2>
                <div class="select-wrap"><select id="version-select" aria-label="Game version">
                  ${descriptionsSelect}
                </select></div>
              </div>
              <div class="description-container">
                ${descriptionsRows}
              </div>
            </section>
          </div>
        </main>
        ${SITE_FOOTER}
        <script>
          document.addEventListener("DOMContentLoaded", function() {
            document.getElementById("dark-mode-toggle").addEventListener("click", function() {
              const isDark = document.documentElement.classList.toggle("dark-mode");
              localStorage.setItem("darkMode", isDark);
            });

            // Filtered navigation: walk every visible card's link (species and
            // forms), locating the current view by this page's file plus form hash.
            // Not in the set: default Pokédex-order arrows. Lone result: none.
            const filteredNav = JSON.parse(sessionStorage.getItem("filteredPokemonNav") || "[]");
            const prevBtn = document.getElementById("prev-btn");
            const nextBtn = document.getElementById("next-btn");
            const filterCounter = document.getElementById("filter-counter");
            const baseFile = "${String(pokemon.id).padStart(4, '0')}_details.html";
            function updateFilteredNav() {
              const idx = filteredNav.indexOf(baseFile + location.hash);
              if (idx === -1) {
                prevBtn.href = prevBtn.dataset.defaultPrev;
                nextBtn.href = nextBtn.dataset.defaultNext;
                prevBtn.style.visibility = "";
                nextBtn.style.visibility = "";
                filterCounter.textContent = "";
                return;
              }
              filterCounter.textContent = filteredNav.length > 1 ? (idx + 1) + "/" + filteredNav.length : "";
              if (idx > 0) { prevBtn.href = filteredNav[idx - 1]; prevBtn.style.visibility = ""; }
              else { prevBtn.style.visibility = "hidden"; }
              if (idx < filteredNav.length - 1) { nextBtn.href = filteredNav[idx + 1]; nextBtn.style.visibility = ""; }
              else { nextBtn.style.visibility = "hidden"; }
            }
            updateFilteredNav();
            window.addEventListener("hashchange", updateFilteredNav);
            document.addEventListener("keydown", function(e) {
              const tag = document.activeElement ? document.activeElement.tagName : "";
              if (e.altKey || e.ctrlKey || e.metaKey || /^(INPUT|SELECT|TEXTAREA)$/.test(tag)) return;
              if (e.key === "ArrowLeft" && prevBtn.style.visibility !== "hidden") location.href = prevBtn.href;
              if (e.key === "ArrowRight" && nextBtn.style.visibility !== "hidden") location.href = nextBtn.href;
            });

            // Shiny toggle
            const shinyToggle = document.getElementById("shiny-toggle");
            const pokemonArtwork = document.getElementById("pokemon-artwork");
            let isShiny = false;
            let isAnimated = false;
            
            shinyToggle.addEventListener("click", function() {
              isShiny = !isShiny;
              isAnimated = false;
              const animatedToggle = document.getElementById("animated-toggle");
              if (animatedToggle) animatedToggle.classList.remove("active");
              pokemonArtwork.src = isShiny ? pokemonArtwork.dataset.shiny : pokemonArtwork.dataset.normal;
              shinyToggle.classList.toggle("active", isShiny);
            });

            // Animated toggle
            const animatedToggle = document.getElementById("animated-toggle");
            if (animatedToggle) {
              animatedToggle.addEventListener("click", function() {
                isAnimated = !isAnimated;
                isShiny = false;
                shinyToggle.classList.remove("active");
                pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                animatedToggle.classList.toggle("active", isAnimated);
              });
            }

            // Cry button
            const cryButton = document.getElementById("cry-button");
            const pokemonCry = document.getElementById("pokemon-cry");
            if (cryButton && pokemonCry) {
              cryButton.addEventListener("click", function() {
                pokemonCry.currentTime = 0;
                pokemonCry.play();
              });
            }

            // Version filter
            function filterVersions() {
              const selectedVersion = document.getElementById("version-select").value;
              const dexDescriptions = document.querySelectorAll(".description");
              for (const dexDescription of dexDescriptions) {
                const version = dexDescription.dataset.version;
                if (selectedVersion === version) {
                  dexDescription.style.display = "block";
                } else {
                  dexDescription.style.display = "none";
                }
              }
            }
            document.getElementById("version-select").addEventListener("change", filterVersions);

            // Rebuild the Pokédex Description section for a set of entries. A
            // non-default form shows its own entries (empty -> section hidden);
            // the default form shows the species' (SPECIES_DESCRIPTIONS).
            function cleanFlavorText(t) {
              return String(t).replace(/\\s+/g, ' ').trim();
            }
            function renderDescriptions(descs) {
              const section = document.getElementById("pokedex-section");
              const select = document.getElementById("version-select");
              const container = document.querySelector(".description-container");
              if (!section || !select || !container) return;
              if (!descs || descs.length === 0) { section.style.display = "none"; return; }
              section.style.display = "";
              const cap = function(s) { return s.split('-').map(function(w) { return w.charAt(0).toUpperCase() + w.slice(1); }).join(' '); };
              select.innerHTML = descs.map(function(d) { return '<option value="' + d.version + '">' + cap(d.version) + '</option>'; }).join('');
              container.innerHTML = descs.map(function(d, i) { return '<p class="description" data-version="' + d.version + '"' + (i !== 0 ? ' style="display:none;"' : '') + '>' + cleanFlavorText(d.flavor_text) + '</p>'; }).join('');
            }

            // Form selector: the dropdown and the clickable form squares are two
            // views of the same control, kept in sync through selectForm().
            const formSelect = document.getElementById("form-select");
            const formSteps = Array.prototype.slice.call(document.querySelectorAll(".form-step"));
            function markActiveForm(url) {
              formSteps.forEach(function(s) { s.classList.toggle("active", s.dataset.url === url); });
            }
            async function selectForm(url) {
              if (formSelect) formSelect.value = url;
              markActiveForm(url);
              await loadForm(url);
            }
            if (formSelect) {
              formSelect.addEventListener("change", function() { selectForm(this.value); });
            }
            formSteps.forEach(function(step) {
              step.addEventListener("click", function() { selectForm(this.dataset.url); });
            });
            // Battle-only forms live inside the chain; clicking switches the view
            // to that form but keeps the current chain (you're already in it).
            Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step")).forEach(function(step) {
              // Route through the URL hash so switching away and back (e.g. to the
              // base form, whose chain node is a #hash link) always fires, and so
              // battle-only forms are linkable/refresh-safe.
              step.addEventListener("click", function() { location.hash = this.dataset.form; });
            });

            // Form selection is driven by the URL hash so it survives refresh and is linkable,
            // and lets you switch to a battle-only form and back. Empty hash = default; a
            // form-step's region key = base/regional/special; a battle step's data-form = battle-only.
            const BASE_URL = "https://pokeapi.co/api/v2/pokemon/${pokemon.id}/";
            // Gender forms aren't in the Forms list, so they have no form-step to
            // resolve their hash; this maps their suffix to a URL instead.
            const GENDER_FORM_URLS = ${JSON.stringify(genderFormUrls)};
            function applyHash() {
              const hashForm = location.hash.slice(1);
              if (!hashForm) { selectForm(BASE_URL); return; }
              const step = formSteps.filter(function(s) { return s.dataset.region === hashForm; })[0];
              if (step) { selectForm(step.dataset.url); return; }
              if (GENDER_FORM_URLS[hashForm]) { selectForm(GENDER_FORM_URLS[hashForm]); return; }
              const battle = Array.prototype.slice.call(document.querySelectorAll(".evo-battle-step"))
                .filter(function(s) { return s.dataset.form === hashForm; })[0];
              if (battle) {
                // Reveal the chain the battle form lives in, then switch to it.
                const row = battle.closest(".evo-row");
                if (row) {
                  Array.prototype.slice.call(document.querySelectorAll(".evo-row")).forEach(function(r) { r.style.display = "none"; });
                  row.style.display = "";
                }
                loadForm(battle.dataset.url, false);
              }
            }
            window.addEventListener("hashchange", applyHash);
            // On first load act only if a form was requested; an empty hash is the
            // default form, which the page is already rendered as.
            if (location.hash.slice(1)) applyHash();

            function getStatBarHtml(value, maxValue) {
              const percentage = Math.min(100, Math.round((value / maxValue) * 100));
              const backgroundColor = value < 50 ? '#f34444' : value < 80 ? '#ff7f0f' : value < 100 ? '#ffdd57' : value < 120 ? '#a0e515' : value < 150 ? '#23cd5e' : '#00c2b8';
              return \`<div class="stat-bar"><div class="stat-value" style="width: \${percentage}%; background-color: \${backgroundColor};"></div></div>\`;
            }

            async function getTypeWeaknesses(types) {
              const allTypes = ${JSON.stringify(ALL_TYPES)};
              const multipliers = {};
              for (const type of types) {
                const res = await fetch(\`https://pokeapi.co/api/v2/type/\${type}\`);
                const data = await res.json();
                data.damage_relations.double_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 2; });
                data.damage_relations.half_damage_from.forEach(t => { multipliers[t.name] = (multipliers[t.name] || 1) * 0.5; });
                data.damage_relations.no_damage_from.forEach(t => { multipliers[t.name] = 0; });
              }
              const result = { superWeakTo: [], weakTo: [], normal: [], resistantTo: [], superResistantTo: [], immuneTo: [] };
              for (const type of allTypes) {
                const m = multipliers[type];
                if (m === 0) result.immuneTo.push(type);
                else if (m === 4) result.superWeakTo.push(type);
                else if (m === 2) result.weakTo.push(type);
                else if (m === 0.5) result.resistantTo.push(type);
                else if (m === 0.25) result.superResistantTo.push(type);
                else result.normal.push(type);
              }
              return result;
            }

            function renderTags(types) {
              return types.map(t => \`<span class="tag \${t}">\${t}</span>\`).join('');
            }

            function renderDefenses(w) {
              const chip = (type, mult, extraClass) => \`<span class="tag mu-chip \${type}\${extraClass || ''}">\${type}<b class="mu-x">\${mult}</b></span>\`;
              const group = (key, label, chips) => \`<div class="mu-group mu-\${key}"><div class="mu-label">\${label}</div><div class="mu-chips">\${chips || '<span class="mu-none">None</span>'}</div></div>\`;
              const weak = w.superWeakTo.map(t => chip(t, '4×', ' x4')).join('') + w.weakTo.map(t => chip(t, '2×')).join('');
              const resist = w.superResistantTo.map(t => chip(t, '¼×')).join('') + w.resistantTo.map(t => chip(t, '½×')).join('');
              const immune = w.immuneTo.map(t => chip(t, '0×')).join('');
              return group('weak', 'Weak to', weak) + group('resist', 'Resists', resist) + (immune ? group('immune', 'Immune to', immune) : '');
            }

            const ABILITY_MATCHUPS = ${JSON.stringify(ABILITY_MATCHUPS)};
            function renderAbilityNotes(abilities) {
              return abilities.filter(a => ABILITY_MATCHUPS[a.ability.name]).map(a => {
                const name = a.ability.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<li><span><b>\${name}</b>\${a.is_hidden ? ' <span class="note-hidden">(hidden ability)</span>' : ''}: \${ABILITY_MATCHUPS[a.ability.name]}.</span></li>\`;
              }).join('');
            }

            const BASE_NAME = ${JSON.stringify(pokemon.name)};
            const BASE_CODENAME = ${JSON.stringify(pokemon.codename)};
            const DEFAULT_IMG = ${JSON.stringify(pokemon.officialArtworkUrl)};
            // Species-level Pokédex entries (shown for the default form; a form's
            // own entries, when it has any, replace these; see loadForm).
            const SPECIES_DESCRIPTIONS = ${JSON.stringify(pokemon.pokedexDescriptions)};
            const REGION_TOKENS = ${JSON.stringify(REGION_TOKENS)};
            // Which evolution-chain row a form belongs to (mirrors server-side keyOfForm):
            // a leading region token keys a regional chain (meowth-galar), else the full
            // suffix (Battle Bond, Totem…), else default. Caps and later tokens don't count.
            function chainKeyOf(formName) {
              const suffix = formName.indexOf(BASE_CODENAME + "-") === 0 ? formName.slice(BASE_CODENAME.length + 1) : "";
              if (!suffix) return "default";
              if (suffix === "male" || suffix === "female") return "default";
              const segs = suffix.split("-");
              if (segs.indexOf("cap") < 0 && REGION_TOKENS.indexOf(segs[0]) >= 0) return segs[0];
              return suffix;
            }
            function formTitle(formCodename) {
              if (formCodename === BASE_CODENAME) return BASE_NAME;
              const part = formCodename.startsWith(BASE_CODENAME + '-') ? formCodename.slice(BASE_CODENAME.length + 1) : formCodename;
              const formLabel = part.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
              return BASE_NAME + ' (' + formLabel + ')';
            }

            async function loadForm(url, swapChain) {
              if (swapChain === undefined) swapChain = true;
              const res = await fetch(url);
              const data = await res.json();

              // Artwork: official artwork -> Dream World -> game sprite -> the
              // default form's image (some variants have no image of their own).
              const dreamUrl = data.sprites.other['dream_world'] && data.sprites.other['dream_world'].front_default;
              const normalUrl = data.sprites.other['official-artwork'].front_default || dreamUrl || data.sprites.front_default || DEFAULT_IMG;
              // Shiny official artwork, else the shiny sprite; empty = no shiny.
              const shinyUrl = data.sprites.other['official-artwork'].front_shiny || data.sprites.front_shiny || '';
              const animatedUrl = data.sprites.versions?.['generation-v']?.['black-white']?.animated?.front_default || '';
              const artwork = document.getElementById("pokemon-artwork");
              artwork.src = normalUrl;
              artwork.dataset.normal = normalUrl;
              artwork.dataset.shiny = shinyUrl;
              artwork.dataset.animated = animatedUrl;
              isShiny = false;
              isAnimated = false;
              const shinyToggleBtn = document.getElementById("shiny-toggle");
              // Hide the Shiny toggle for forms with no shiny artwork/sprite.
              if (shinyToggleBtn) { shinyToggleBtn.classList.remove("active"); shinyToggleBtn.style.display = shinyUrl ? "" : "none"; }

              // Title
              const titleEl = document.getElementById("pokemon-title-name");
              if (titleEl) titleEl.textContent = formTitle(data.name);

              // Animated sprite toggle availability
              let animBtn = document.getElementById("animated-toggle");
              if (animatedUrl) {
                if (!animBtn) {
                  const imageControls = document.querySelector(".image-controls");
                  animBtn = document.createElement("button");
                  animBtn.id = "animated-toggle";
                  animBtn.type = "button";
                  animBtn.className = "hero-btn animated-toggle";
                  animBtn.title = "Toggle animated sprite";
                  animBtn.innerHTML = ${JSON.stringify(icon('play') + '<span>Animated</span>')};
                  const cryBtnRef = document.getElementById("cry-button");
                  if (cryBtnRef) imageControls.insertBefore(animBtn, cryBtnRef);
                  else imageControls.appendChild(animBtn);
                  animBtn.addEventListener("click", function() {
                    isAnimated = !isAnimated;
                    isShiny = false;
                    shinyToggle.classList.remove("active");
                    pokemonArtwork.src = isAnimated ? pokemonArtwork.dataset.animated : pokemonArtwork.dataset.normal;
                    animBtn.classList.toggle("active", isAnimated);
                  });
                }
                animBtn.classList.remove("active");
                animBtn.style.display = "";
              } else if (animBtn) {
                animBtn.style.display = "none";
              }

              // Cry
              const formCry = data.cries?.latest || '';
              const existingCryAudio = document.getElementById("pokemon-cry");
              const existingCryBtn = document.getElementById("cry-button");
              if (existingCryAudio) {
                // Base form already wired up the audio + listener; just swap the source.
                if (formCry) {
                  existingCryAudio.src = formCry;
                  if (existingCryBtn) existingCryBtn.style.display = "";
                } else {
                  existingCryAudio.removeAttribute("src");
                  if (existingCryBtn) existingCryBtn.style.display = "none";
                }
              } else if (formCry) {
                // Base form had no cry; create the elements on the fly.
                const imageControls = document.querySelector(".image-controls");
                const newAudio = document.createElement("audio");
                newAudio.id = "pokemon-cry";
                newAudio.src = formCry;
                imageControls.parentNode.appendChild(newAudio);
                const newBtn = document.createElement("button");
                newBtn.id = "cry-button";
                newBtn.type = "button";
                newBtn.className = "hero-btn cry-button";
                newBtn.title = "Play cry";
                newBtn.innerHTML = ${JSON.stringify(icon('volume') + '<span>Cry</span>')};
                newBtn.addEventListener("click", function() { newAudio.currentTime = 0; newAudio.play(); });
                imageControls.appendChild(newBtn);
              }

              // Height / weight
              document.getElementById("pokemon-height").textContent = (data.height / 10).toFixed(1) + " m";
              document.getElementById("pokemon-weight").textContent = (data.weight / 10).toFixed(1) + " kg";

              // Types
              const types = data.types.map(t => t.type.name);
              document.getElementById("pokemon-types").innerHTML = renderTags(types);
              const hero = document.getElementById("hero");
              hero.style.setProperty("--tc", "var(--type-" + types[0] + ", #9fa19f)");
              hero.style.setProperty("--tc2", "var(--type-" + (types[1] || types[0]) + ", #9fa19f)");
              hero.style.setProperty("--tink", "var(--ink-" + types[0] + ", #16181d)");

              // Type weaknesses
              const weaknesses = await getTypeWeaknesses(types);
              document.getElementById("type-defenses").innerHTML = renderDefenses(weaknesses);

              // Abilities
              const abilitiesHtml = await Promise.all(data.abilities.map(async a => {
                const aRes = await fetch(a.ability.url);
                const aData = await aRes.json();
                const entry = aData.effect_entries.find(e => e.language.name === 'en');
                const description = entry ? entry.effect : 'No description available';
                const hiddenTag = a.is_hidden ? '<span class="hidden-ability">Hidden</span>' : '';
                const name = a.ability.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<div class="ability"><div class="ability-name">\${name}\${hiddenTag}</div><p class="ability-desc">\${description}</p></div>\`;
              }));
              document.getElementById("abilities-body").innerHTML = abilitiesHtml.join('');
              document.getElementById("ability-notes").innerHTML = renderAbilityNotes(data.abilities);

              // Stats
              const stats = data.stats.map(s => ({ name: s.stat.name, value: s.base_stat }));
              const bst = stats.reduce((sum, s) => sum + s.value, 0);
              const statLabels = ${JSON.stringify(STAT_LABELS)};
              document.getElementById("stats-body").innerHTML = stats.map(s => {
                const label = statLabels[s.name] || s.name.replace(/-/g, ' ').replace(/\\b\\w/g, l => l.toUpperCase());
                return \`<tr><th scope="row">\${label}</th><td class="stat-num">\${s.value}</td><td class="stat-bar-cell">\${getStatBarHtml(s.value, 255)}</td></tr>\`;
              }).join('');
              document.getElementById("pokemon-bst").textContent = bst;

              // Species-level details don't apply to battle-only forms (Mega/Gmax):
              // they can't be caught or bred, so hide those rows for such forms.
              let isBattleOnly = false;
              let formData = null;
              try {
                const formRes = await fetch(data.forms[0].url);
                formData = await formRes.json();
                isBattleOnly = !!formData.is_battle_only;
              } catch (e) { /* keep rows visible if the form lookup fails */ }
              // Pokédex entries: the default form shows the species' entries; a
              // non-default form shows only its own (reusing formData, already
              // fetched above), and the section is hidden when it has none.
              if (data.is_default) {
                renderDescriptions(SPECIES_DESCRIPTIONS);
              } else {
                const formEntries = ((formData && formData.flavor_text_entries) || [])
                  .filter(function(e) { return e.language && e.language.name === 'en'; })
                  .map(function(e) { return { version: e.version.name, flavor_text: e.flavor_text }; });
                renderDescriptions(formEntries);
              }
              ["detail-catch-rate", "detail-habitat", "detail-egg-groups", "detail-base-happiness", "detail-growth-rate", "detail-training"].forEach(id => {
                const row = document.getElementById(id);
                if (row) row.style.display = isBattleOnly ? "none" : "";
              });
              // The Forms list picks base/regional forms; hide it while viewing a
              // battle-only transformation (it's reached from the chain, not here).
              const formsCluster = document.querySelector(".forms-cluster");
              if (formsCluster) formsCluster.style.display = isBattleOnly ? "none" : "";

              // Swap to the evolution chain matching this form (primary selection only; a
              // battle-only click keeps the current chain). Regional → its region chain,
              // special (Battle Bond, Power Construct) → its own, the rest → default.
              if (swapChain) {
                const key = chainKeyOf(data.name);
                const rows = Array.prototype.slice.call(document.querySelectorAll(".evo-row"));
                const target = rows.filter(r => r.dataset.region === key)[0]
                  || rows.filter(r => r.dataset.region === "default")[0] || rows[0];
                rows.forEach(r => { r.style.display = "none"; });
                if (target) target.style.display = "";
              }

              // Move the "current" highlight to the form now shown: its battle
              // step if this is a battle-only form, otherwise the base node.
              const visibleRow = Array.prototype.slice.call(document.querySelectorAll(".evo-row")).filter(r => r.style.display !== "none")[0];
              if (visibleRow) {
                Array.prototype.slice.call(visibleRow.querySelectorAll(".current")).forEach(el => el.classList.remove("current"));
                const battle = visibleRow.querySelector('.evo-battle-step[data-url="' + url + '"]');
                // Highlight the current species' node by hash, scoped to
                // data-base="1" so a same-hash node of another species (Alolan
                // Meowth vs Alolan Persian, both #alola) isn't grabbed instead.
                const suffix = data.name.indexOf(BASE_CODENAME + "-") === 0 ? data.name.slice(BASE_CODENAME.length + 1) : "";
                const formNode = suffix ? visibleRow.querySelector('.evo-step[data-base="1"][data-hash="' + suffix + '"]') : null;
                const base = formNode || visibleRow.querySelector('.evo-step[data-base="1"]');
                if (battle) battle.classList.add("current");
                else if (base) base.classList.add("current");
                // The base node's "+" is hidden while its forms are reachable in
                // the Forms list; show it once that list is hidden (battle-only
                // view), since its other forms are no longer visible anywhere.
                const baseBadge = base && base.querySelector(".evo-forms-badge");
                if (baseBadge) baseBadge.style.display = isBattleOnly ? "" : "none";
              }
            }
          });
        </script>${DONATE_WIDGET}
      </body>
    </html>`;
  }  
