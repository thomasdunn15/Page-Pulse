# Page Pulse

A [Atlassian Forge](https://developer.atlassian.com/platform/forge/) app for **Confluence** that helps teams keep pages up to date. It shows each page's **owner** and a **freshness badge** — green (Fresh), yellow (Aging), or red (Stale) based on how long since the page was last reviewed — plus a one-click **"Mark reviewed"** action that resets the clock.

> Built as a hands-on learning project to ship a real Forge app end to end: scaffold → storage → UI → multiple modules → deploy.

## Features

- **Review card macro** — insert on any page to see its review status.
- **Freshness badge** — `Fresh` / `Aging` / `Stale` / `Never reviewed`, computed live from the last-reviewed date (not stored), with contextual "review due" / "overdue" banners.
- **Mark reviewed** — stamps the current time and records **who** reviewed it (with avatar).
- **Owner** — pick a real Confluence user via a user picker; shows their avatar and name.
- **Auto byline badge** — the freshness status appears automatically near the page title on **every** page, no macro insertion needed. Click it for the full card.
- **Admin settings page** — site admins set the day-thresholds for Fresh/Aging/Stale; they apply app-wide.
- Local **date + time** (shown in each viewer's timezone), "days ago", next-review-due date, and a freshness progress bar.

## How it works

| Piece | What it does |
|---|---|
| `confluence:macro` | The review card you insert into a page. |
| `confluence:contentBylineItem` | The automatic status chip near the page title; opens the card in a popup. |
| `confluence:globalSettings` | Admin page to configure the freshness thresholds. |
| Resolver functions | Backend read/write to Forge storage (`getReview`, `markReviewed`, `setOwner`, `getSettings`, `setSettings`). |
| `bylineProperties.js` | Computes the dynamic byline label per page. |

**Data model** — one record per page in [Forge KVS](https://developer.atlassian.com/platform/forge/runtime-reference/storage-api-kvs/) storage:

- Key: `review:{contentId}` → `{ owner, ownerId, lastReviewedISO, reviewedBy }`
- Global config: `settings:thresholds` → `{ freshMaxDays, agingMaxDays }`

The macro and the byline popup share a single `src/components/ReviewCard.jsx` component.

## Project structure

```
.
├── manifest.yml              # App modules, functions, resources, scopes
├── src/
│   ├── index.js              # Backend entry point (exports the resolver handler)
│   ├── resolvers/index.js    # Resolver functions (storage read/write)
│   ├── bylineProperties.js   # Dynamic byline label (server-side)
│   ├── components/
│   │   └── ReviewCard.jsx    # Shared review-card UI
│   ├── frontend/index.jsx    # Macro surface -> renders ReviewCard
│   ├── byline/index.jsx      # Byline popup surface -> renders ReviewCard
│   └── settings/index.jsx    # Admin settings page UI
└── package.json
```

## Tech stack

- Atlassian Forge (UI Kit, `render: native`)
- `@forge/react`, `@forge/bridge`, `@forge/resolver`, `@forge/kvs`
- React 18
- Scope: `storage:app`

## Development

Prerequisites: [Node.js](https://nodejs.org/) (LTS) and the Forge CLI (`npm install -g @forge/cli`), plus a Forge login (`forge login`) and a [free Confluence dev site](https://go.atlassian.com/cloud-dev).

```bash
npm install            # install dependencies
forge deploy           # push to the development environment
forge install          # install on your dev site (first time only)
forge tunnel           # optional: live local development
```

After the first install, most code changes apply with just `forge deploy`. Changes that add **scopes** or **modules** require `forge install --upgrade`.

### Deploy to production

```bash
forge deploy -e production
forge install -e production
```

## Useful commands

```bash
forge deploy           # push code to Atlassian (development)
forge install          # install on a site (first time)
forge logs             # view app logs for debugging
forge lint             # check the manifest/code
```

## License

This is a personal learning project. Use it however you like.
