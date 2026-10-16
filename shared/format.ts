export const titleCase = (s: string): string =>
  s.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');

export const dexNo = (id: number): string => String(id).padStart(4, '0');

export const detailFile = (id: number): string => `${dexNo(id)}_details.html`;

export const escapeHtml = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

export const searchKey = (s: string): string =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export const formatNumber = (n: number): string =>
  n.toLocaleString('en-US');

export const percent = (n: number): string =>
  `${n.toFixed(1).replace(/\.0$/, '')}%`;

export const typeTags = (types: string[]): string =>
  types.map(type => `<span class="tag ${type}">${type}</span>`).join('');

export const typeVars = (types: string[]): string =>
  `--tc: var(--type-${types[0]}, #9fa19f); --tc2: var(--type-${types[1] || types[0]}, #9fa19f); --tink: var(--ink-${types[0]}, #16181d)`;

export const statColor = (value: number): string =>
  value < 50 ? '#f34444' : value < 80 ? '#ff7f0f' : value < 100 ? '#ffdd57' : value < 120 ? '#a0e515' : value < 150 ? '#23cd5e' : '#00c2b8';
