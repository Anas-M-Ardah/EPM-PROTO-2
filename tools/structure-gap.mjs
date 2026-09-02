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

/* ── IS THE COMPONENT ACTUALLY RENDERED? ──────────────────────────────────
   The reference contains components that are declared and exported to
   `window` and then never mounted — `DReviewFlow`, `DEditTimeline`,
   `DActRows`, `DDistribution`, `DMetricList`, `DProjectContext` among them.
   Their `className=` attributes are in the source, so a naive scan counts
   their classes as gaps and sends someone off to port markup that draws
   nothing in the running prototype. Verified against the live site as well as
   the checked-in copy. See P-210.

   AND IT HAS TO BE TRANSITIVE. Asking only "does `<X` appear anywhere" is one
   level deep, and the prototype supersedes whole modules: `DBoqWorkspace`
   (boq-workspace.jsx) replaced `DModBOQ`, and `desktop-workspace.jsx:221` —
   the workspace router — mounts the new one. Nothing mounts `DModBOQ` at all
   any more, so `DBOQAssignment` inside it is mounted by dead code and draws
   nothing. A one-level check called it live and sent A5 off to rebuild a
   screen the port had already built correctly from the newer component. See
   P-212.

   So: build the mount graph, then walk it from the entry. `main.jsx` mounts
   `DesktopApp`; anything reachable from there renders, anything else does not,
   however many `<X` sites it has. */
const bodies = new Map();                      // component -> its source body
const rootMounts = new Set();                  // mounted outside any component
for (const f of walk(REF, ['.jsx', '.js'])) {
  const lines = readFileSync(f, 'utf8').split('\n');
  let cur = null, buf = [];
  const flush = () => { if (cur) bodies.set(cur, (bodies.get(cur) ?? '') + buf.join('\n')); buf = []; };
  for (const line of lines) {
    /* COLUMN 0 ONLY. Every component in these files is declared flush left, and
       every one of them opens with indented `const AR = …` helpers. Allowing
       leading whitespace splits a component at its first local const and leaves
       the component itself holding one line — its own signature — so the walk
       finds no mounts and declares the entire prototype dead. It did. */
    const d = line.match(/^(?:export\s+)?(?:function|const)\s+([A-Z][A-Za-z0-9_]*)/);
    if (d) { flush(); cur = d[1]; }
    if (cur) buf.push(line);
    else for (const m of line.matchAll(/<(?:window\.)?([A-Z][A-Za-z0-9_]*)[\s/>]/g)) rootMounts.add(m[1]);
  }
  flush();
}
const mountsIn = n => [...((bodies.get(n) ?? '').matchAll(/<(?:window\.)?([A-Z][A-Za-z0-9_]*)[\s/>]/g))]
  .map(m => m[1]);

/* `main.jsx`'s own component is the entry; DesktopApp is what it renders for
   the desktop app this port is a port of. Mobile and admin roots are included
   because excluding them would silently reclassify their classes. */
const reachable = new Set();
const queue = ['DesktopApp', 'MobileApp', 'Admin', 'App', ...rootMounts];
while (queue.length) {
  const n = queue.pop();
  if (!n || reachable.has(n)) continue;
  reachable.add(n);
  for (const k of mountsIn(n)) if (!reachable.has(k)) queue.push(k);
}
const isLive = c => [...(proto.get(c) ?? [])].some(fc => reachable.has(fc.split(':')[1]));

/* .ts and .html ONLY. web/src/app/STRUCTURE-GAP.md names 162 of these classes and
   lives inside NG — widen this whitelist and the report reads its own backlog as
   markup, and the gap collapses to nothing. */
/* COMMENTS ARE STRIPPED FIRST. These templates explain themselves at length,
   and a comment that NAMES a class it is not using — "`.d-vow-facets` is not
   here, see A4b" — would otherwise count as markup and quietly retire a row
   that is still outstanding. Measured: two classes went missing from the gap
   this way before the strip was added. */
const strip = s => s
  .replace(/<!--[\s\S]*?-->/g, ' ')   // html
  .replace(/\/\*[\s\S]*?\*\//g, ' ')  // /* … */ in .ts and inline styles
  .replace(/^\s*\/\/.*$/gm, ' ');     // // … line comments in .ts

const angular = new Set();
for (const f of walk(NG, ['.ts', '.html']))
  for (const c of strip(readFileSync(f, 'utf8')).match(TOKEN) ?? []) angular.add(c);

const css = new Set();
for (const f of walk(SHEETS, ['.css']))
  for (const m of readFileSync(f, 'utf8').matchAll(/\.(d-[a-z0-9-]+)/g)) css.add(m[1]);

const missing = [...proto.keys()].filter(c => css.has(c) && !angular.has(c)).sort();
const gap  = missing.filter(isLive);     // the prototype really draws these
const dead = missing.filter(c => !isLive(c));  // declared, exported, never mounted
const own  = [...angular].filter(c => css.has(c) && !proto.has(c)).sort();

console.log(`prototype emits          ${proto.size}`);
console.log(`angular emits            ${angular.size}`);
console.log(`defined in stylesheets   ${css.size}`);
console.log(`\nGAP   the prototype RENDERS it, no Angular template emits it:  ${gap.length}`);
console.log(`DEAD  in the reference too — its component is never mounted:   ${dead.length}`);
console.log(`OWN   emitted by angular, absent from the prototype:           ${own.length}`);

if (process.argv.includes('--list')) {
  console.log('\n--- GAP ---');
  for (const c of gap) console.log(`${c.padEnd(24)} ${[...proto.get(c)].sort().join(' · ')}`);
  console.log('\n--- DEAD (do not port: nothing renders these) ---');
  for (const c of dead) console.log(`${c.padEnd(24)} ${[...proto.get(c)].sort().join(' · ')}`);
  console.log('\n--- OWN ---');
  for (const c of own) console.log(c);
}
