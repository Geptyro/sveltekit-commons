# sveltekit-commons

Design-token contract, Svelte 5 primitives and dependency-free helpers shared
across [uar.cedricdessalles.dev](https://uar.cedricdessalles.dev), STALZONE db
and the Guild Wars sites.

Components and styles ship as source, compiled by the consumer's own
`vite-plugin-svelte` — the same arrangement `uar-shared`, `grid-router` and
`panels-layout` use. The helpers are TypeScript, compiled to a committed
`dist/`. See [Why dist/ is committed](#why-dist-is-committed).

```bash
npm i github:Geptyro/sveltekit-commons
```

## The two layers

This package is **layer 1: the contract** — the scale, rhythm and shape every
site shares. It names no colour.

**Layer 2 is the palette**, and it stays in each site. That split is the whole
design: sites that shared the colours too would just be the same site twice.
STALZONE is rust/concrete/hazard-green, UAR is olive/parchment, and both are
recognisably built from the same parts.

A site must define these, or components render wrong:

| group | tokens |
|---|---|
| surfaces | `--bg` `--surface` `--surface-raised` `--surface-sunken` |
| lines | `--border` `--border-strong` |
| text | `--text` `--text-dim` `--text-faint` |
| accent | `--accent` `--accent-dim` `--accent-contrast` |
| status | `--danger` `--warn` `--ok` |

`--accent-dim` is the hover/pressed accent. Whether "dim" means darker or
lighter is the palette's call — the only requirement is that it reads as a
state change.

`raised` and `sunken` mean **elevation, not lightness**. A raised surface is a
step further from the page than `--surface`; on a light skin that is usually a
shade darker, and both skins built on this do exactly that.

Everything else (`--space-1..7`, `--radius-1..4`, `--text-xs..2xl`,
`--font-sans`, `--font-mono`, `--border-width`, `--focus-ring`, `--accent-soft`,
`--shadow-1`, `--shadow-2`, `--z-float`, `--chrome-h`) comes from
`tokens.css` and can be overridden from the palette.

### Import order

```js
import 'sveltekit-commons/tokens.css'; // the contract
import '$lib/styles/palette.css';      // the site's skin, and any overrides
import 'sveltekit-commons/base.css';   // reset + element styles (optional)
```

The palette goes second so a site can override the type scale or fonts from
equal specificity. `base.css` deliberately has no `@import` of its own —
CSS hoists `@import`, which would put the contract back above the palette and
silently undo those overrides.

## Components

```js
import {
	Breadcrumbs, Button, Card, Chip, HoverPop, SectionHeading, Tag, Toggle
} from 'sveltekit-commons';
```

Every one carries its own scoped styles and references only contract tokens.
That is the one real change from the `uar-shared` these grew out of, where
`Button`, `Card`, `Chip`, `Tag` and `SectionHeading` were empty shells whose
appearance came from global classes in `base.css`. A package cannot ship
components whose styling only arrives if you also adopt a stylesheet that
restyles your `<a>`, `<body>` and form controls — so `base.css` is now optional
and the components stand alone.

- **`Breadcrumbs`** — `trail` root-first. The last entry renders as text with
  `aria-current`, not a link: a crumb pointing at the page you are on is noise
  to a mouse and a trap to a screen reader. Separators are `::before` content,
  so a reader announces "Weapons, link" rather than "slash Weapons slash link".
- **`Button`** — `variant="solid" | "ghost" | "danger"`. Given an `href` it
  renders an `<a>`, so a link that looks like a button still middle-clicks and
  opens in a new tab.
- **`Card`** — `href` makes it a link card with the lift-on-hover;
  `pad={false}` for contents that manage their own padding.
- **`Chip`** — pressable pill; `pressed` drives both the fill and `aria-pressed`.
- **`Tag`** — `kind="accent" | "danger" | "warn" | "ok"`, or `tint` with any CSS
  colour for a label the contract has no name for: `<Tag tint="var(--mos)">`.
  That prop is why this could leave `uar-shared` at all — its tag kinds were
  `mos`, `hostile` and `item`, three facts about one StarCraft map baked into a
  shared primitive.
- **`Toggle`** — labelled switch over a real checkbox, so the label, keyboard
  behaviour and `:checked` state come for free.
- **`SectionHeading`** — mono small-caps with a rule to the right margin.
- **`HoverPop`** — hover/focus with a mouse, tap with a finger. `position:fixed`
  and placed by `placeFloating`, so it escapes clipping ancestors and cannot
  hang off a phone's edge. Contents stay interactive — it is a menu, not a
  tooltip.

## Layout

```
src/components/*.svelte   framework-agnostic primitives
src/app/*.svelte          the SvelteKit-only half (imports $app/*)
src/styles/*.css          tokens.css (contract) and base.css (reset)
src/helpers/*.ts          the source of truth for the helpers
dist/*.js + *.d.ts        generated from src/helpers — committed, never edited
```

The root entry imports no `$app/*`, so it works in any Svelte app — the UAR
Electron companion consumes it. Anything needing SvelteKit lives behind
`sveltekit-commons/app`, which that companion never resolves.

## The shell

```js
import { AppShell, NavItem, NavSection, NavProgress } from 'sveltekit-commons/app';
```

`AppShell` is the site frame: a top bar, a sidebar that collapses to an icon
rail on wide screens and slides in as a drawer on narrow ones, and a scrolling
content column. Everything site-specific arrives as a snippet — `brand`,
`crumb`, `tools`, `nav`, `foot`.

The collapse is done entirely with custom properties: `.shell` declares the
collapsed geometry and the two expanded states override it, so the rail width,
the label visibility, the icon size and the burger's own glyph all read the
same variables and transition together. Nothing toggles a class per row and
nothing measures anything.

That is also what makes it work as a package. Svelte scopes styles to the
component that declares the markup, so `AppShell` cannot style what a caller
passes through a snippet — and does not need to, because the variables cascade:

| variable | |
|---|---|
| `--label-display` | `none` in the rail, `block` expanded — put it on anything that should fold away |
| `--nav-slot` / `--nav-glyph` | icon column width / icon size |
| `--nav-pad-x` / `--nav-pad-y` / `--nav-justify` | row padding and alignment |
| `--label-align` | alignment for group headings |
| `--foot-dir` | footer stacking direction |

`NavItem` and `NavSection` already read them, so the common cases need none of
this. A site sets `--brand-w` on `:root` so the shell can line the page heading
up with the content column below it.

## Helpers

All pure, all import-free, so plain `node --test` loads them without a
bundler's import chain — and so nothing here can drag a server dependency into
a client bundle.

```js
import { paginate, pageWindow, pageNumber, PER_PAGE } from 'sveltekit-commons/paging';
import { cacheState, cacheKeyMatches } from 'sveltekit-commons/cache';
import { escapeRegex, foldForSearch, clampText } from 'sveltekit-commons/text';
import { timeAgo } from 'sveltekit-commons/time';
import { sitemapXml, sitemapDate, xmlEscape } from 'sveltekit-commons/sitemap';
import { placeFloating } from 'sveltekit-commons/place';
```

`npm test` builds `dist/` and then covers them. `npm run check:dist` fails if
the committed `dist/` has drifted from `src/helpers/`.

## Why `dist/` is committed

Because the alternative breaks the consumers, and it is worth writing down
before someone deletes it.

The helpers are TypeScript. Every consumer that goes through Vite — both
SvelteKit sites, the electron-vite companion — could happily transpile raw
`.ts` from `node_modules`. But some consumer entrypoints never touch Vite:

```
node --env-file=.env scripts/list-feedback.ts     # and 4 more in UAR
node --test "tests/**/*.test.ts"
```

Those load the site's own `$lib/server/db.ts`, which imports
`sveltekit-commons/paging`, `/cache` and `/text`. Node refuses to strip types
inside `node_modules`:

```
ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING
```

That is unconditional — neither `--experimental-strip-types` nor
`--experimental-transform-types` lifts it, and it applies to `node_modules`
specifically. TypeScript in a consumer's *own* tree is fine: UAR's `src/lib`
and all 185 of its tests are `.ts`, and plain `node --test` loads them today.
The restriction only bites at the package boundary.

The one consumer-side fix is a loader — `node --import tsx script.ts` — in all
three repos. That works, but it puts a transpiler in front of every CLI
invocation in exchange for deleting a build step from one package.

A normal npm package compiles on publish. This one is installed as a git
dependency, so there is no publish step — the build would have to run from
`prepare` on every consumer install, which is the install-script fragility this
project has already been bitten by. Committing `dist/` is what is left, and
`check:dist` is what keeps it honest.

## Server code — read before adding any

There is none yet, deliberately, and the bar for the first is high.

**SvelteKit's `$lib/server` import protection does not extend into
`node_modules`.** Nothing would stop a component importing
`sveltekit-commons/server` and leaking a database client into the client
bundle. So when server code does land here:

- it lives strictly under a `./server` subpath and is never re-exported from `.`;
- no top-level side effects — nothing connects on import;
- the package goes in `ssr.noExternal` (consumers need that anyway for the
  source-`svelte`-export style), so a leak surfaces as a build error;
- `if (!import.meta.env.SSR) throw new Error(…)` at the top of the entry.

Mongo access was considered for the first cut and left out. The genuinely
shared part is about twenty lines of connect-and-cache; putting it here would
force `mongodb` onto every consumer to save them, and the rest of each site's
`db.ts` is its own domain queries — UAR's is over a thousand lines, STALZONE's
is eighty.

## Scope

- **In** — the token contract, the reset, primitives used by more than one
  site, and pure helpers written more than once.
- **Out** — domain components (unit tables, item cards, app screens) and
  domain colours. Those belong to their site, or to a site-specific shared
  package like `uar-shared`.
- **Separate packages, not absorbed** — `grid-router`, `panels-layout`.
