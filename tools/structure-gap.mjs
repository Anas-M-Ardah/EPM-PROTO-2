/* Measures how far the Angular markup has drifted from the reference prototype.
 *
 * The stylesheets in web/src/styles/ are copied VERBATIM from the prototype
 * (CLAUDE.md §3.7), so a class the prototype emits, the sheets define, and no
 * Angular template ever writes is DEAD CSS — markup that was never built.
 * That set is the drift, and this is the number STRUCTURE-GAP.md tracks.
 *
 *   node tools/structure-gap.mjs           summary
 *   node tools/structure-gap.mjs --list    every gap class + the component it comes from
 *
 * Three sides, each biased so the gap is never OVERstated:
 *   prototype  className= attributes only            — never invents a class
 *   angular    ANY d-* token in any .ts/.html string — over-captures on purpose
 *   css        .d-* selectors in the shipped sheets  — the definition of "shipped"
 */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const REF    = 'docs/spec/reference/app';
const NG     = 'web/src/app';
const SHEETS = 'web/src/styles';
const TOKEN  = /\bd-[a-z0-9]+(?:-[a-z0-9]+)*\b/g;

const walk = (dir, ext) => readdirSync(dir, { withFileTypes: true }).flatMap(e =>
  e.isDirectory() ? walk(join(dir, e.name), ext)
  : ext.some(x => e.name.endsWith(x)) ? [join(dir, e.name)] : []);

/* className= followed by "…" or {…}; braces are matched so a ternary or a
   template literal is taken whole, then every quoted run inside it is harvested
   and ${…} interpolations dropped. */
function classNames(src) {
  const out = [];
  for (let i = src.indexOf('className='); i !== -1; i = src.indexOf('className=', i + 1)) {
    let j = i + 'className='.length, chunk = '';
    if (src[j] === '"' || src[j] === "'") {
      const q = src[j], end = src.indexOf(q, j + 1);
      if (end === -1) continue;
      chunk = src.slice(j + 1, end);
    } else if (src[j] === '{') {
      let depth = 0, k = j;
      for (; k < src.length; k++) {
        if (src[k] === '{') depth++;
        else if (src[k] === '}' && --depth === 0) break;
      }
      chunk = src.slice(j + 1, k);
    } else continue;
    let quoted = false;
    for (const m of chunk.matchAll(/`([^`]*)`|"([^"]*)"|'([^']*)'/g)) {
      out.push(m[1] ?? m[2] ?? m[3]); quoted = true;
    }
    if (!quoted) out.push(chunk);
  }
  return out.join(' ').replace(/\$\{[^}]*\}/g, ' ');
}

/* Line by line, so each class names the COMPONENT it sits in. Without that the
   gap is a word list; with it, every row points at the file a rebuild opens.

   Only D-prefixed names carrying a lowercase letter count as components — the
   prototype files are full of ALL-CAPS helper consts (AR, DEC, TABS, MK_LBL)
   declared between components, and taking the nearest declaration blindly
   attributed half the classes to a language flag. */
const proto = new Map();                       // class -> Set('file:Component')
for (const f of walk(REF, ['.jsx', '.js'])) {
  const base = f.split(/[\\/]/).pop().replace(/\.jsx?$/, '');
  let fn = base;
  for (const line of readFileSync(f, 'utf8').split('\n')) {
    const d = line.match(/^\s*(?:export\s+)?(?:function|const)\s+(D[A-Za-z0-9_]*[a-z][A-Za-z0-9_]*)/);
    if (d) fn = d[1];
    for (const c of classNames(line).match(TOKEN) ?? [])
      (proto.get(c) ?? proto.set(c, new Set()).get(c)).add(base + ':' + fn);
  }
}

/* .ts and .html ONLY. web/src/app/STRUCTURE-GAP.md names 162 of these classes and
   lives inside NG — widen this whitelist and the report reads its own backlog as
   markup, and the gap collapses to nothing. */
const angular = new Set();
for (const f of walk(NG, ['.ts', '.html']))
  for (const c of readFileSync(f, 'utf8').match(TOKEN) ?? []) angular.add(c);

const css = new Set();
for (const f of walk(SHEETS, ['.css']))
  for (const m of readFileSync(f, 'utf8').matchAll(/\.(d-[a-z0-9-]+)/g)) css.add(m[1]);

const gap = [...proto.keys()].filter(c => css.has(c) && !angular.has(c)).sort();
const own = [...angular].filter(c => css.has(c) && !proto.has(c)).sort();

console.log(`prototype emits          ${proto.size}`);
console.log(`angular emits            ${angular.size}`);
console.log(`defined in stylesheets   ${css.size}`);
console.log(`\nGAP  defined + emitted by the prototype + emitted by no template: ${gap.length}`);
console.log(`OWN  emitted by angular, absent from the prototype:               ${own.length}`);

if (process.argv.includes('--list')) {
  console.log('\n--- GAP ---');
  for (const c of gap) console.log(`${c.padEnd(24)} ${[...proto.get(c)].sort().join(' · ')}`);
  console.log('\n--- OWN ---');
  for (const c of own) console.log(c);
}
