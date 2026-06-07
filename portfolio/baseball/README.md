# WSN2019 Static Dashboard

This repository now contains a static, GitHub Pages-friendly remake of the original Shiny dashboard.

## What changed

- `index.html`, `styles.css`, and `app.js` form the new browser-only dashboard.
- The original `server.R` and `ui.R` are kept as the Shiny reference version.
- The browser loads `WSH_Batter_2019_Full.csv`, derives the same baseball features, and updates charts reactively on the client side.

## How to run locally

Serve the folder with any static HTTP server, then open `index.html`.

Example with Node:

```bash
node serve.js
```

## GitHub Pages

Point GitHub Pages at the repository root. The page only needs static files, so no R server is required.

## Notes

- The dashboard depends on Plotly and Papa Parse from public CDNs.
- The CSV is large, so the first load may take a moment while the browser parses it.
