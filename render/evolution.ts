import type { PokemonDetails } from "../pokemon-detail";
import { regionOf, REGION_TOKENS } from "../regions";
import type { PageData } from "../shared/model";
import { icon } from "../shared/icons";
import { artworkUrl } from "../shared/sprites";

export interface EvolutionView {
  rowsHtml: string;
  formsHtml: string;
  selectable: string[];
}

export function renderEvolution(pokemon: PokemonDetails, page: PageData): EvolutionView {
    const evoNodeAnchor = (evo: any): string => {
      // Gender branches share one dex id (Basculegion male + female), so only
      // the default-form node is highlighted on load; the client re-targets the
      // selected gender by data-hash.
      const isCurrentSpecies = evo.id === pokemon.id;
      return `
        <a href="${String(evo.id).padStart(4, '0')}_details.html${evo.hash ? `#${evo.hash}` : ''}" data-hash="${evo.hash || ''}" class="evo-step ${isCurrentSpecies && !evo.hash ? 'current' : ''}" ${isCurrentSpecies ? 'data-base="1"' : ''}>
          ${evo.hasForms ? `<span class="evo-forms-badge" title="Has other forms"${isCurrentSpecies ? ' style="display:none;"' : ''}>+</span>` : ''}
          <img src="${evo.imageUrl}" data-default-img="${artworkUrl(evo.id)}" alt="${evo.name}" loading="lazy" crossorigin="anonymous" />
          <span>${evo.name}</span>
        </a>`;
    };

    const battleSuffix = (formName: string): string =>
      formName.startsWith(pokemon.codename + '-') ? formName.slice(pokemon.codename.length + 1) : formName.split('-').slice(1).join('-');
    const evoBattleStep = (b: any): string => `
        <button type="button" class="evo-battle-step" data-form="${battleSuffix(b.formName)}">
          <img src="${b.imageUrl}" alt="${b.name}" loading="lazy" crossorigin="anonymous" />
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
    const evoArtwork = artworkUrl;

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
    // nor gender-difference forms (those show as gender branches in the chain).
    const isGenderVariety = (name: string): boolean => {
      const s = evoSuffixOf(name);
      return s === 'male' || s === 'female';
    };
    const clusterVarieties = pokemon.varieties.filter(v => !battleOnlyNames.has(v.name) && !isGenderVariety(v.name));

    // Label a form the way the evolution chain does (official name for regional
    // forms, e.g. "Alolan Persian"), reusing the names already resolved there.
    const evoVariantNames: { [formName: string]: string } = {};
    if (currentEvoNode) for (const v of currentEvoNode.variants) evoVariantNames[v.formName] = v.name;
    const formLabel = (v: any): string => {
      const fromPage = page.varieties.find(pv => pv.name === v.name);
      if (fromPage) return fromPage.label;
      if (v.name === pokemon.codename) return pokemon.name;
      if (evoVariantNames[v.name]) return evoVariantNames[v.name];
      const formPart = v.name.startsWith(pokemon.codename + '-') ? v.name.slice(pokemon.codename.length + 1) : v.name;
      return formPart.replace(/-/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase());
    };

    // Clickable form squares shown below the evolution chain (battle-only forms
    // are excluded, since they live in the chain). The artwork URL is built straight
    // from the variety id (no extra fetch needed).
    const formSquares = clusterVarieties.length > 1 ? `
          <div class="forms-cluster">
            <span class="forms-label">Forms</span>
            <div class="forms-list">
              ${clusterVarieties.map(v => {
                const formId = v.url.split('/').filter(Boolean).pop();
                const artwork = artworkUrl(Number(formId));
                const label = formLabel(v);
                return `<button type="button" class="form-step ${v.is_default ? 'active' : ''}" data-variety="${v.name}" data-region="${evoSuffixOf(v.name)}">
                  <img src="${artwork}" data-default-img="${pokemon.officialArtworkUrl}" alt="${label}" loading="lazy" crossorigin="anonymous" />
                  <span>${label}</span>
                </button>`;
              }).join('')}
            </div>
          </div>` : '';


    return { rowsHtml: evolutionRowsHtml, formsHtml: formSquares, selectable: clusterVarieties.map(v => v.name) };
}
