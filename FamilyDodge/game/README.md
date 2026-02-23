# Game export folder

After exporting from Godot (Project → Export → Web → Export Project),
the generated files will appear here:

  index.html
  index.js
  index.wasm
  index.pck
  index.audio.worklet.js

These files are served by FamilyDodge/index.html via an iframe.

> **Note re: GitHub Pages**
> Godot 4 web exports require `SharedArrayBuffer`, which needs
> Cross-Origin Isolation headers (COOP/COEP).  GitHub Pages does not
> set these by default.  Two options:
>
> Option A (recommended): add a `_headers` file at the repo root
>   (works with Netlify / Cloudflare Pages, not plain GitHub Pages).
>
> Option B: include `coi-serviceworker` in the exported HTML.
>   Download it from https://github.com/gzuidhof/coi-serviceworker
>   and add the script tag to the Godot-exported index.html.

Committed placeholder so git tracks this folder.
