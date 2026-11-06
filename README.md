# JEX — Art, Worlds & a Little Chaos

Personal portfolio for **Jex / @Jexeth017** — string art artist, digital creator, NFT collector and co-builder of **Squeek City / Grand Theft Hamster** with 0xyas.

## Experience

An animated, fan-inspired Free Fire world: full-bleed action artwork, Bermuda scenery, a separate Ignis character, foreground palms, drifting supply drops, mist and canvas embers. JavaScript adds smooth pointer depth and section-relative scroll parallax.

All scripts, imagery and fonts are local. No installation, API key, external runtime dependency or blocking loading screen is required. Text, images, anchors and contact links remain usable without JavaScript. Device reduced-motion preferences, a manual Motion control, hidden-tab suspension, smaller mobile particle budgets and a capped canvas pixel ratio keep animation optional.

## Run locally

```sh
python3 -m http.server 48301
```

Open http://localhost:48301/ . Serve over HTTP rather than opening the ES module through `file://`.

## Tests

```sh
node --check scene.mjs
python3 tests/site_test.py
python3 tests/mobile_hero_test.py
node --test tests/scene.test.mjs
```

## GitHub Pages

This is a static site suitable for GitHub Pages using the `main` branch and root (`/`) directory. `.nojekyll` preserves direct static-file serving. All runtime asset paths are relative, including support for a project-site subdirectory.

## Links

- X: https://x.com/Jexeth017
- Telegram: https://t.me/Jexeth017
- Squeek City: https://squeekcity.space
- Squeek City source: https://github.com/jexeth738/hamster-city

## Artwork and licenses

See [SOURCES.md](SOURCES.md) for exact art references, attribution and font licenses. Free Fire theme art belongs to Garena and is not represented as Jex's original artwork. This personal portfolio is not affiliated with Garena. Public downloadability does not itself grant commercial-use or redistribution rights; review the applicable artwork permissions and brand terms before reusing the imagery.
