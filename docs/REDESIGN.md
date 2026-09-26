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
scales, and one accent per sport (`--accent` resolves from `data-sport` on the shell).
Light and dark themes follow the OS, with a manual override stored per browser;
Bootstrap follows via `data-bs-theme`. Accent contrast against the page background is
at least 4.5:1 in both themes (see the table in the commit adding the tokens).

## Flagged, not changed

- Unrouted components (listed above) are left in place; `AssistedAnalysis` is a
  placeholder now reachable only at `/mlb/lab/assisted-analysis` (not in the nav).
- Bootstrap CSS loads twice: the CDN `<link>` in `public/index.html` and the npm import
  in `src/index.js` (5.3.0 and 5.3.2). Harmless, but one should go.
- "Rankings movers" on the homepage is not possible yet: the rankings API returns no
  prior rank. The homepage shows the top five per sport with rank bands instead.
- `--text-faint` is 4.4:1 on the page background (4.7:1 on cards); use it only for
  de-emphasised metadata.
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
