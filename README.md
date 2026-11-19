# Mermaid Editor for Orca

An [Orca](https://github.com/stablyai/orca) plugin that renders and edits
[Mermaid](https://mermaid.js.org) diagrams (`.mmd` / `.mermaid` files) with live
rendering, built on Orca's `customEditors` contribution point.

## Third-party code

`editor/index.html` embeds a bundled, trimmed build of
[mermaid](https://github.com/mermaid-js/mermaid) 11.4.1, produced by
`build-trim/` from the versions pinned in `build-trim/package-lock.json` and
inlined by `build.sh` (plugin frames allow inline scripts only). Licenses and
provenance are in [THIRD_PARTY_NOTICES.txt](THIRD_PARTY_NOTICES.txt). No
minified output is committed without the build inputs that produce it.

## Diagram types

Built on a trimmed Mermaid v11.4.1 bundle with offline ELK layout (about 2.9 MB
inline). Included: flowchart, sequence, class,
state, ER, gantt, git graph, pie. Excluded long-tail types (architecture,
block, c4, kanban, mindmap, sankey, packet, xychart, quadrant, requirement,
journey, info, timeline, radiation) and KaTeX math raise a clear
"not included in this build" error instead of failing silently. To rebuild
the bundle with a different selection, see `build-trim/` and `build.sh`.

## Views

- **Chart** — the rendered diagram, with wheel zoom, drag panning, and
  double-click reset
- **Split** — source beside the live diagram, with a draggable divider
- **Source** — plain text editing

Edits debounce into Orca's document protocol (`applyEdit` against the document
version, so external changes surface as conflicts instead of silent clobbers),
and `editor.flush` delivers any pending edit before a save. Orca keeps the
buffer, dirty state, saving and remote files; the frame only ever sees the
document. The palette follows Orca's theme through the `--orca-*` panel tokens in
both light and dark.

Mermaid 11.4.1 is bundled inline (plugin frames allow inline scripts only, so the
editor works offline and never reaches the network).

## Layout and fitting

The Layout selector changes the preview without editing or saving diagram source:

- **Source** respects the file's Mermaid configuration (the initial selection).
- **Adaptive** uses Dagre for short flowcharts and ELK for flowcharts longer than
  30 lines or containing multiple subgraphs.
- **Dagre** and **ELK** explicitly select a flowchart layout engine.

Other diagram types retain their own layout and disable the selector. ELK is
bundled locally, including when a file requests `layout: elk` in Source mode.
Layout selection preserves node connections, labels, and direction.

**Auto-fit** starts enabled and fits the entire diagram after rendering and panel
resizing, including split-divider changes. Manual zoom or panning turns Auto-fit
off so resizing preserves the chosen view. **Fit** or double-clicking the chart
fits it again and re-enables Auto-fit. On narrow panels Split stacks source above
the preview; wider panels show them side by side.

## Build and checks

```sh
npm ci --prefix build-trim
node build.mjs
node --test tests/editor.test.cjs
orca plugin check . --json
```

The generated `editor/index.html` is the plugin entry point and must be rebuilt
after changing its template or bundled runtime. ELK increases the inline bundle
size beyond the previous community-catalog size target. This change is for local
use; catalog publication requires a separate size review.

## Install

Settings → Plugins → **Add plugin** → **From a Git URL**, paste:

```
https://github.com/Pr1p/orca-mermaid-editor#master
```

Then **Review & enable**. Or install a local checkout with
`orca plugin dev load <checkout>` / **From a folder…**.

Requires Orca 1.4.245 or later.

## Using it on `.mmd` files

Orca treats `.mmd`/`.mermaid` as a core file type, so plugin editors for it are
offered in the tab's view toggle rather than taking over the file on open: open
the file, then choose **Mermaid** next to **Source** / **Diagram**.

**Saving**: edits go into Orca's buffer immediately (the tab shows its dirty
dot). Press <kbd>Ctrl/⌘+S</kbd> inside the editor to write to disk, or turn on
Settings → General → *Auto Save Files*.

## License

MIT
# test Mon Nov  2 00:15:56     2026
