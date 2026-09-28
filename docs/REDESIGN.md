# Multi-sport redesign — information architecture

Branch `redesign/multi-sport`. Goal: MLB, NFL and college football as equal peers,
every existing feature kept, one navigation model that works on a phone and a desktop.

## Before

The shell was baseball's feature list with football attached.

| Nav entry | What it held |
|---|---|
| Home | two-sport rails, mixed best-picks board, MLB news, MLB standings, CFB top 25 |
| Baseball ▾ (mega menu) | 18 MLB pages in four groups (Today, Leaderboards, Analysis, Compare) |
| Football | one tab; NFL / FBS / FCS and seven sections were in-page buttons |
| Pick'em | NFL / FBS contest |

URL shapes were inconsistent: MLB pages sat at the root in two naming styles
(`/TeamBatting`, `/prediction-diagnostics`), football at `/football/:league/:section`,
and "NFL" and "college" were not addressable as sports of their own.

Pages found with no route or import (left in place, flagged, not deleted):
`HomePageNew.js`, `EnhancedComparison.js`, `EnhancedPlayerCard.js`,
`EnhancedTeamDashboard.js`, `ScatterPlotMatrix.js`, `YearSelector.js`.
`AssistedAnalysis` is routed but is a "Coming soon" placeholder and was never in the nav.

## After

The sport is the primary axis. Every sport has the same section order, so the site
reads as three products built on one model rather than one product and two guests.

```
All sports  /            today across the three: games with win probabilities,
                         model scoreboard vs baselines, power-ranking leaders with
                         rank bands, best picks, standings, news, recent views
MLB         /mlb         Predictions · Scores · Rankings · Stats ▸ · Models ▸ · Lab ▸
NFL         /nfl         Predictions · Rankings · Stats ▸ · Models ▸ · Pick'em
CFB         /cfb/fbs     Predictions · Scores · Rankings · Stats ▸ · Models ▸ · Pick'em
            /cfb/fcs     (FBS | FCS switch in the CFB bar)
```

| Section | MLB | NFL / CFB |
|---|---|---|
| Predictions | `/mlb/predictions` (+ `/players`, `/game/:id`, `/classic`) | `/nfl/predictions`, `/cfb/:div/predictions` (+ `/players`, `/game/:id`); classic `/nfl/picks`, `/cfb/:div/picks` |
| Scores | `/mlb/games`, `/mlb/game/:gamePk` | `/cfb/:div/scoreboard`, `/cfb/:div/game/:id` (no NFL feed) |
| Rankings | `/mlb/rankings` | `/nfl/rankings`, `/cfb/:div/rankings` |
| Stats | team/player batting & pitching, transactions, team & player pages | team stats, leaders, players |
| Models | diagnostics `/mlb/models`, scenario simulator | diagnostics, model comparison (`…/models`) |
| Extras | Lab: splits, Statcast, comparisons, research workflow | Pick'em `/pickem/:sport` |

Football sections are read from `FootballPage`'s exported `SECTIONS` and grouped by
`FOOTBALL_SECTION_GROUP` in `src/config/sports.js`, so a section another branch adds
(the `models` Model Comparison view) appears under **Models** with no nav edit.
Power-ranking pages keep the shared `RankingsBoard` with its rank ranges; nothing in
the shell hides or restyles the bands away.

### Redirects

Every old path redirects, keeping params and the query string:
`/games → /mlb/games`, `/game/:pk → /mlb/game/:pk`, `/predictions → /mlb/predictions`,
`/rankings → /mlb/rankings`, `/prediction-diagnostics → /mlb/models`,
`/TeamBatting → /mlb/stats/team-batting` (and the other three leaderboards),
`/transactions[/:team] → /mlb/transactions[/:team]`, `/team/:abbr`, `/player/:id`,
the nine analysis/compare tools → `/mlb/lab/…`, `/football → /nfl`,
`/football/nfl/:s → /nfl/:s`, `/football/fbs|fcs/:s → /cfb/fbs|fcs/:s`,
`/football/:league/game/:id → /cfb/:league/game/:id`, `/nfl/predictions → /nfl/picks`.
Pick'em keeps `/pickem/:sport/:section` because those links are shared outside the site.

## Shell

- Desktop: top bar (brand · sport switcher · Pick'em · theme) and a sport bar beneath it
  with the sections; sections with children open a second row of pills.
- Phone: compact top bar, the sport bar as a horizontally scrolling strip, and a fixed
  bottom tab bar (Home · MLB · NFL · CFB · Pick'em) with safe-area padding.

## Design system

Tokens in `src/index.css`: surfaces, text, borders, status colours, spacing and type
scales, one brand accent (green) and a secondary tint per sport. Light and dark themes
follow the OS, with a manual override stored per browser; Bootstrap follows via
`data-bs-theme`. See "Colour" below for the palette and the contrast numbers.

## Flagged, not changed

- Unrouted components (listed above) are left in place; `AssistedAnalysis` is a
  placeholder now reachable only at `/mlb/lab/assisted-analysis` (not in the nav).
- ~~Bootstrap CSS loads twice~~ — fixed in the green recolour: the CDN `<link>` (5.3.0) and
  the unused CDN JS bundle are gone; the npm import in `src/index.js` is the only copy.
- "Rankings movers" on the homepage is not possible yet: the rankings API returns no
  prior rank. The homepage shows the top five per sport with rank bands instead.
- `--text-faint` now clears 4.5:1 on every surface in both themes (5.1 at worst).
- In dark mode team-coloured names fall back to the theme text colour (brand navies
  and golds are unreadable on one of the two themes); bars keep team colours.
- The older MLB pages keep their own headers and Bootstrap layouts inside the new
  shell; they are themed through the tokens but not restructured.

## Merging the parallel branches

`git merge-tree` reports no conflicts against `football-model-compare` or
`fix/rankings-display`. After merging, the `models` section appears under
Models → Model comparison automatically, and `/football/:league/models` redirects
to `/nfl/models` / `/cfb/:division/models`. The rankings branch's `asOfLabel` header
works unchanged; the homepage leader cards already read `meta.as_of_date`.

## Unified predictions (2026-09-25)

The Predictions section is the unified slate (`GET /api/predictions/:sport/slate`): every
model on every game, production only the default featured model, simulation
distributions and MLB player projections one click from each card, CSV/JSON export.
Nav: Predictions → Games | Players | Models scoreboard | Classic. `/nfl` and `/cfb/:div`
land on it; the old boards stay at `/mlb/predictions/classic`, `/nfl/picks`,
`/cfb/:div/picks`. Code: `src/components/predictions/`, rules in
`src/utils/unifiedPredictions.js`. `REACT_APP_PREDICTIONS_MOCKS=true` serves
contract-shaped fixtures (`src/services/predictionMocks.js`, its own chunk).

## Colour: the green recolour (2026-09-28)

Branch `design/green-recolor`. The default blue is gone. The site is a charcoal/gray
neutral base with one green as the brand trim. Layout and features are unchanged; only
tokens, the Bootstrap bridge and colour usages moved.

### Palette

| Token | Light | Dark | Job |
|---|---|---|---|
| `--bg` | `#f4f4f5` | `#0b0c0c` | page |
| `--surface` | `#ffffff` | `#151717` | cards |
| `--surface-2` / `-3` | `#f0f0f1` / `#e4e4e7` | `#1c1f1e` / `#262a28` | wells, tracks |
| `--text` / `-2` | `#18181b` / `#3f3f46` | `#ececed` / `#c8cbca` | ink |
| `--text-muted` / `-faint` | `#52525b` / `#65656d` | `#a0a5a3` / `#8b908e` | secondary ink |
| `--border` / `-strong` | `#e4e4e7` / `#cfcfd4` | `#292d2b` / `#3a3f3c` | hairlines |
| `--brand` = `--accent` | `#157a3c` | `#4ade80` | links, active nav, focus, primary buttons |
| `--brand-strong` | `#0f6130` | `#86efac` | hover / pressed |
| `--text-on-accent` | `#ffffff` | `#0b0c0c` | text on a green fill |
| `--chrome` / `--chrome-accent` | `#0b0c0c` / `#4ade80` | `#070808` / `#4ade80` | nav bars (dark in both) |
| `--pos` | `#157a3c` | `#4ade80` | hit / better |
| `--neg` / `--live` | `#c4312a` | `#f26a5f` / `#ff6b5e` | miss / worse / live |
| `--warn` | `#8f6000` | `#fbbf24` | small sample, disagreement |
| `--mlb` / `--nfl` / `--cfb` | `#d6457a` / `#4a3aa7` / `#b07400` | `#e0668f` / `#9085e9` / `#c98500` | sport tints |
| `--viz-1…6` | `#157a3c #4a3aa7 #d6457a #b07400 #2a78d6 #eb6834` | `#1f9d55 #9085e9 #e0668f #c98500 #3987e5 #d95926` | chart series, in order |
| `--viz-muted` | `#71717a` | `#5b605e` | the "other side" beside one coloured series |
| `--viz-fill-1/2/muted` | `#157a3c` / `#4a3aa7` / `#52525b` (both themes) | | bars that carry a white % label |

Bootstrap: `--bs-primary`, links, focus rings, `.btn-primary`, outline, pills,
pagination, dropdown/list-group active, progress, form checks and focus are the brand
green (Bootstrap compiles several of these as literals, so `index.css` overrides the
component variables). `info` is a neutral charcoal `#52525b` rather than cyan.

### Sport identity

Green is the accent in every sport; `data-sport` no longer changes `--accent`. Each sport
is carried by its icon plus a secondary tint (`--sport`, resolved from `data-sport`): the
top trim of the homepage sport cards, the underline of the sport icon tiles, the
homepage spinner, and the dots/bands of the cross-sport model scoreboard, the one chart
where the three sports sit side by side. The tints are rose (MLB), violet (NFL) and gold
(CFB), chosen so they pass the dataviz validator all-pairs in both themes and each clears
3:1 against its card (4.2 / 8.6 / 3.9 light, 5.5 / 5.8 / 5.9 dark). Rows stay labelled,
so identity is never colour alone.

### Data colours (validated with the dataviz skill's `validate_palette.js`)

- `--viz-1…6` (green, violet, rose, gold, blue, orange), adjacent pairs:
  light worst CVD ΔE 10.4, normal-vision 18.9, all ≥ 3:1 on `#ffffff`;
  dark worst CVD ΔE 12.3, normal-vision 17.7, all ≥ 3:1 on `#151717`. PASS.
- Slots 1–2 (green + violet), all pairs: CVD 23.2 light / 20.5 dark. Every two-series chart
  (home/away win probability, drive chart, accuracy vs edge) uses this pair.
- Sport tints (rose, violet, gold), all pairs: CVD 10.4 / 12.3, normal 18.9 / 17.7. PASS.
- Green cannot lead a three-series all-pairs set: under protan/deutan it collapses into
  orange, red, and in dark into rose and gold (ΔE 1.8–6.7). So overlapping forms
  (radar, scatter) with 3+ series lean on their legend; blue only appears as slot 5.
- Status is reserved: green `--pos` and red `--neg` are ΔE 6.4 apart under deutan in
  light (the floor band), which is why every hit/miss/delta carries ✓/✗, a sign or a label.

### Contrast (WCAG, computed)

| Pair | Light (bg / surface / surface-2) | Dark (bg / surface / surface-2) |
|---|---|---|
| `--text` | 16.1 / 17.7 / 15.6 | 16.6 / 15.2 / 14.1 |
| `--text-2` | 9.5 / 10.4 / 9.2 | 12.0 / 11.0 / 10.2 |
| `--text-muted` | 7.0 / 7.7 / 6.8 | 7.8 / 7.2 / 6.7 |
| `--text-faint` | 5.3 / 5.8 / 5.1 | 6.0 / 5.6 / 5.1 |
| `--accent` / `--pos` | 4.9 / 5.4 / 4.8 | 11.2 / 10.3 / 9.5 |
| `--neg` | 5.0 / 5.5 / 4.8 | 6.5 / 6.0 / 5.5 |
| `--warn` | 5.0 / 5.5 / 4.8 | 11.7 / 10.8 / 10.0 |
| text on accent | 5.4 | 11.2 |
| accent on `--accent-soft` | 4.7 | 8.0 |
| `--neg` on `--neg-soft` | 4.6 | 5.0 |
| white on `--viz-fill-1/2/muted` | 5.4 / 8.6 / 7.7 | same |
| chrome text / muted / accent on chrome | 16.1 / 8.1 / 11.2 | same |

Every text pairing clears 4.5:1 and every UI pairing 3:1. The one sub-3:1 mark is
`--viz-muted` in dark (2.8:1 on the surface): it is always the neutral half of a
two-part bar whose coloured half and labels carry the reading.

### What was hardcoded and replaced

- `#0d6efd`/`#007bff`/`#3b82f6`/`#2563eb`/`#1d4ed8` and their `rgba()` tints in 15 legacy
  stylesheets → `--accent`, `--accent-strong`, `rgba(var(--brand-rgb), a)`; white text
  on those fills → `--text-on-accent`. Bootstrap info cyan (`#d1ecf1`, `#cff4fc` …) →
  neutral surfaces.
- Recharts/SVG series (`#8884d8`, the Recharts demo palette, blue/orange/green line
  sets, radar colour lists) → `var(--viz-N)` in fixed order; grids → `--viz-grid`.
- Probability bars: home blue → violet, away gray, predicted winner green (three states
  kept). Win-probability chart and drive chart: orange/blue → green/violet tokens, and
  the chart's hardcoded white surface/grid now follow the theme.
- The three-sport gradient logo mark → a charcoal tile with a green trim (site bar and
  learn bar); the CRA React favicon/logos → an "HT" charcoal/green icon;
  `theme-color`/manifest `#0b1220` (navy) → `#0b0c0c`.
- `public/learn/learn.css`: bar, mark and focus ring recoloured; page surfaces on the
  neutral tokens in both themes; links and `--accent` on the green. Each page's own
  chart series (`--s1` blue etc.) is its validated data palette and was left alone.

Kept on purpose: team colours (`teamMetadata.js`), pitch-type colours in the live
strike zone, and the hot/cold wOBA pair in the scouting report (blue is the "cold" pole).
