# CLAUDE.md — `src/graph/`

Builder-specific guidance. Loads only when working under `src/graph/`.

## Edge Building Pipeline

`rebuild_graph()` runs **10 explicit edge builders** in parallel, each returning `{ nodes, edges, errors }`:

| Builder | Source |
|---|---|
| `typed_link` | Frontmatter properties matching a field label |
| `tag_note` | Notes whose tag matches a BC-tag-note-tag field |
| `list_note` | Markdown list items treated as children |
| `dendron_note` | Dot/dash-delimited basename hierarchy |
| `johnny_decimal_note` | Numeric prefix hierarchy (e.g. `01.02 Title`) |
| `dataview_note` | Dataview query results |
| `date_note` | Sequential date-based notes |
| `folder_note` | Folder → note containment |
| `regex_note` | Regex matches on basenames |
| `traverse_note` | DFS walk of vault links from a root note |

Builder implementations live in `src/graph/builders/explicit/` (one file per builder + `index.ts` exporting the `add_explicit_edges` record). The coordinator is `src/graph/builders/index.ts`.

After explicit edges are collected, `TransitiveGraphRule`s (stored in settings as `implied_relations.transitive`) are applied inside the WASM engine to generate implied edges (e.g. the `up`↔`down` pair).

Each explicit builder can read a per-note override from frontmatter via the `BC-*-field` metadata keys (see `src/const/metadata_fields.ts`). The fallback is `plugin.settings.explicit_edge_sources.<source>.default_field`.

## `implied_pair_close_field`

Used by Dendron and Johnny.Decimal builders to automatically generate a reverse edge. If the `up` field has a single-step transitive rule with `close_field: "down"`, calling `implied_pair_close_field(settings, "up")` returns `"down"`, and the builder adds a `down` edge from parent → child alongside the explicit `up` edge from child → parent.
