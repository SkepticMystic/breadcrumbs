> [!IMPORTANT]
> Breadcrumbs has recently been rewritten from scratch, and is available in the V4 beta (downloadable via the Obsidian BRAT plugin). If you're an existing user, see here for more info about the changes: https://github.com/SkepticMystic/breadcrumbs/blob/master/V4.md.
> The following documentation has been rewritten for V4.

Breadcrumbs is an Obsidian plugin that lets you add _directed links_ to your notes, then view/traverse that structure in various ways. Internally, Breadcrumbs uses a graph to represent this structure (much like the regular Obsidian graph, except now, links have _direction_ to them). You tell Breadcrumbs about the structure of your notes, it builds this directed graph, and then lets you visualise and navigate the graph.

**Table of Contents**:

-   [Hierarchies](#hierarchies)
-   [Building the graph](#building-the-graph)
    -   [Explicit Edge Builders](#explicit-edge-sources)
    -   [Implied Relationships](#implied-relationships)
    -   [Customise the Build Process](#customise-the-build-process)
-   [Leveraging the graph](#leveraging-the-graph)
    -   [Views](#views)
        -   [Page View](#page-view)
        -   [Matrix View](#matrix-view)
        -   [Tree View](#tree-view)
        -   [Codeblocks](#codeblocks)
    -   [Commands](#commands)
        -   [Rebuild Graph](#rebuild-graph)
        -   [Create List Index](#create-list-index)
        -   [Jump to First Neighbour](#jump-to-first-neighbour)
        -   [Thread](#thread)
    -   [Suggestors](#suggestors)
    -   [API](#api)
-   [Media](#media)

# Hierarchies

The starting point of Breadcrumbs is the hierarchy system, which determine the _directed fields_ you'll use to structure your notes. You can have as many hierarchies as you like, and they'll all run separately from each other. A basic hierarchy could be:

```
up: parent
down: child
same: sibling
prev: before
next: after
```

On the left are the unchangeable directions, and on the right are the fields you'll use to structure your notes. You can change the fields to whatever you like, but the directions are fixed.
Using these _fields_, you can now start adding edges to your Breadcrumbs graph. For example the `[[Father]]` note could have a `child` field pointing to `[[Me]]`, and `[[Me]]` could have a `parent` field pointing to `[[Mother]]`.

[![](https://mermaid.ink/img/pako:eNoljjEOgzAMRa8SeQIJhtItQ6eqU1naNYuVmBKVJMhNVFWIu9eApy-_Z-svYJMj0DBM6WtH5KzuDxOVzKm6YR6Ja9W2yo5-chIuqqt6qg-j28iMTDHv6Fz1ab-ABgJxQO_k87LJBgQEMqAlOuS3ARNX8bDk9PxFCzpzoQbK7DDT1eOLMYAecPrIlpzPifuj6t54_QNKMzn8?type=png)](https://mermaid.live/edit#pako:eNoljjEOgzAMRa8SeQIJhtItQ6eqU1naNYuVmBKVJMhNVFWIu9eApy-_Z-svYJMj0DBM6WtH5KzuDxOVzKm6YR6Ja9W2yo5-chIuqqt6qg-j28iMTDHv6Fz1ab-ABgJxQO_k87LJBgQEMqAlOuS3ARNX8bDk9PxFCzpzoQbK7DDT1eOLMYAecPrIlpzPifuj6t54_QNKMzn8)

# Building the graph

There are two broad ways of building the graph, or adding edges. The first are the _explicit edge sources_, and the other are the various _implied relationships_ that build on the explicit edges.

## Explicit Edge Sources

There are many ways to add directed edges to the graph. I'll start with the most basic, manual approach.

### Typed Links

_Typed links_ are the most basic, manual way to add edges to the graph. They can be added in two ways.

#### Frontmatter Links

In the YAML frontmatter of your note, you can add key/value pairs indicating a directed link to another note:

```yaml
---
parent: "[[A]]"
child: ["[[B]]", "[[C]]"]
---
```

This tells Breadcrumbs that the "parent" of the current note is "A", and that its two "children" are "B" and "C".

[![](https://mermaid.ink/img/pako:eNotjj8LwjAUxL9KeIOk0A7-mTIIaldddMzySF5tsElKfEWk9Lub1t503O84bgQTLYGCposf02Ji8ah1EFlbeYtMhagq0WOiwNkdxU6eipXPxLSuswvYy3MhNuIgLyuHEjwlj87m-XHONHBLnjSobC2mlwYdptzDgeP9GwwoTgOVMPQWmWqHz4QeVIPdO6dkHcd0_f9dbk8_SUc5Cw?type=png)](https://mermaid.live/edit#pako:eNotjj8LwjAUxL9KeIOk0A7-mTIIaldddMzySF5tsElKfEWk9Lub1t503O84bgQTLYGCposf02Ji8ah1EFlbeYtMhagq0WOiwNkdxU6eipXPxLSuswvYy3MhNuIgLyuHEjwlj87m-XHONHBLnjSobC2mlwYdptzDgeP9GwwoTgOVMPQWmWqHz4QeVIPdO6dkHcd0_f9dbk8_SUc5Cw)

#### Dataview Links

If you have the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin enabled, you can use their format of metadata as well. In the _content_ of a note:

```
parent:: [[A]]
child:: [[B]], [[C]]
```

This creates the same structure as the [frontmatter links](#frontmatter-links) method above.

##### Markdown Links

If you have Dataview enabled, Breadcrumbs will automatically detect and add edges from _markdown links_. These take the following format:

```md
field:: [note name](path/to/note.md)
```

### Tag Notes

_Tag Notes_ allow you to leverage your existing tag structure. You can turn a note into a tag note by adding the following to your frontmatter:

```yaml
BC-tag-note-tag: "#tag"
BC-tag-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields. This will tell Breadcrumbs to find all notes with the tag `#tag`, and add edges from the current note to those tagged notes using the field you specify.

#### `BC-tag-note-exact`

If you want to only add edges to notes that _exactly_ match the tag, you can add the `BC-tag-note-exact` field to the frontmatter of the tag note.

```yaml
BC-tag-note-exact: true
```

If you don't add this field, Breadcrumbs will add edges to all notes that _contain_ the tag. e.g. `#tag/child` contains `#tag`.

### Regex Notes

_Regex Notes_ allow you to leverage your existing note name structure. You can turn a note into a regex note by adding the following to your frontmatter:

```yaml
BC-regex-note-regex: <regex>
BC-regex-note-field: <field>
```

Where `<regex>` is a valid JavaScript regex (without the surrounding `/`), and `<field>` is one of your Breadcrumbs fields. This will tell Breadcrumbs to find all notes that match the regex (using the _full path_ of the note), and add edges from the regex note to the matches using the field you specify.

> [!NOTE]
> The `BC-regex-note-regex` value gets passed directly to the Javascript [`RegExp`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) constructor.

#### `BC-regex-note-flags`

You can also add flags to the regex by adding the `BC-regex-note-flags` field to the frontmatter of the regex note.

```yaml
BC-regex-note-flags: <flags>
```

Where `<flags>` is a string of any combination of `g`, `i`, and `m` (for global, case-insensitive, and multi-line, respectively). e.g. `gim` would add all three flags.

#### Regex Note Settings

-   **Default field**: Choose a fallback field to use when only `BC-regex-note-regex` is present. This is useful if you have a _lot_ of regex notes, and don't want to add the `BC-regex-note-field` to each one.

### List Notes

_List Notes_ allow you to leverage your existing bullet list structure. You can turn a note into a list note by adding the following to your frontmatter:

```yaml
BC-list-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields. The structure of a List Note is as follows:

```md
-   [[A]]
    -   [[B]]
        -   [[C]]
    -   [[D]]
```

In this example, `A` goes down to `B` and `D`, and `B`goes down to `C` (assuming the field you used is `down`).

[![](https://mermaid.ink/img/pako:eNpVjzEPgjAQhf9Kc1NJYBB16WCiMqKDrl0u9NBG2ppyhBjCf7fKxC3v8uXlvbwJmmAIFLRdGJsnRhb1TXuRbiNr27O4BqZMFIUwYfRJD6KUxzXYytMa7OQ5W0LKFd_LKoMcHEWH1qTW6efSwE9ypEGl12B8adB-Tj4cONw_vgHFcaAchrdBpsriI6ID1WLXJ0rGcoiXZcZ_zfwFMOY_Hg?type=png)](https://mermaid.live/edit#pako:eNpVjzEPgjAQhf9Kc1NJYBB16WCiMqKDrl0u9NBG2ppyhBjCf7fKxC3v8uXlvbwJmmAIFLRdGJsnRhb1TXuRbiNr27O4BqZMFIUwYfRJD6KUxzXYytMa7OQ5W0LKFd_LKoMcHEWH1qTW6efSwE9ypEGl12B8adB-Tj4cONw_vgHFcaAchrdBpsriI6ID1WLXJ0rGcoiXZcZ_zfwFMOY_Hg)

#### Field Overrides

By default, each item in the list will use the `BC-list-note-field` value to add edges. But you can override this on a per-item basis by adding the field _before_ the link.

```md
---
BC-list-note-field: down
---

-   [[A]]
    -   child [[B]]
```

In this example, `List Note` -down-> `A`, but `A` -child-> `B`.

[![](https://mermaid.ink/img/pako:eNoljjELwjAUhP9KeFML7aBuGQTFsTromuWR92qDTSLpK0VK_7sx3nLHx3HcCjYSg4Z-jIsdMInq7iaorF3VuUnULQrXqm0VxSVkP6p9dSrADm6kQg7VuYYGPCePjvLa-pswIAN7NqBzJEwvAyZsuYezxMcnWNCSZm5gfhMKXxw-E3rQPY5TpkxOYrr-75WX2xezITYI?type=png)](https://mermaid.live/edit#pako:eNoljjELwjAUhP9KeFML7aBuGQTFsTromuWR92qDTSLpK0VK_7sx3nLHx3HcCjYSg4Z-jIsdMInq7iaorF3VuUnULQrXqm0VxSVkP6p9dSrADm6kQg7VuYYGPCePjvLa-pswIAN7NqBzJEwvAyZsuYezxMcnWNCSZm5gfhMKXxw-E3rQPY5TpkxOYrr-75WX2xezITYI)

#### `BC-list-note-exclude`

By default, the list note itself links to the top-level list items. You can exclude this behaviour by adding the `BC-list-note-exclude` field to the frontmatter of the list note.

```yaml
BC-list-note-exclude: true
```

[![](https://mermaid.ink/img/pako:eNpVjj0LwjAQhv9KuCmBdvFjySCoHXXRNcuRXG2xSSQmFCn9754fS9_lXh4ejncCGx2BhnaIo-0wZXG6mCA4K7lXoq6Fi2PguxNreViCjTyqv7vgW9koqMBT8tg7fj59LAO5I08GNFeH6W7AhJk9LDleX8GCzqlQBeXhMFPT4y2hB93i8GRKrs8xnX9rv6PnN462OCA?type=png)](https://mermaid.live/edit#pako:eNpVjj0LwjAQhv9KuCmBdvFjySCoHXXRNcuRXG2xSSQmFCn9754fS9_lXh4ejncCGx2BhnaIo-0wZXG6mCA4K7lXoq6Fi2PguxNreViCjTyqv7vgW9koqMBT8tg7fj59LAO5I08GNFeH6W7AhJk9LDleX8GCzqlQBeXhMFPT4y2hB93i8GRKrs8xnX9rv6PnN462OCA)

#### `BC-list-note-neighbour-field`

Normally, only the parent/child relationships are added. But you can also add edges based on the _neighbours_ of each list item. This is useful for adding sibling/next/prev relationships.

```yaml
BC-list-note-neighbour-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields.

In the first List Note example above, this would add edges from `B` to `D`.

[![](https://mermaid.ink/img/pako:eNpVz7EOgjAQBuBXaW4qCQyCLh1MVEZ00LVLQw9tpK0pR9AQ3t0iLtxyly-Xy_0j1F4jCGhaP9QPFYhVV-lYrA2vTEfs4gkTlmVM-8HFvmc5P6yh4Mc1bPkpWY7kK9_x8u_F7A7ftDikYDFYZXR8ZZxXJNADLUoQcdQqPCVIN8U91ZO_fVwNgkKPKfQvrQhLo-5BWRCNaruoqA35cF6y_SJOX71eRAE?type=png)](https://mermaid.live/edit#pako:eNpVz7EOgjAQBuBXaW4qCQyCLh1MVEZ00LVLQw9tpK0pR9AQ3t0iLtxyly-Xy_0j1F4jCGhaP9QPFYhVV-lYrA2vTEfs4gkTlmVM-8HFvmc5P6yh4Mc1bPkpWY7kK9_x8u_F7A7ftDikYDFYZXR8ZZxXJNADLUoQcdQqPCVIN8U91ZO_fVwNgkKPKfQvrQhLo-5BWRCNaruoqA35cF6y_SJOX71eRAE)

#### List Note Settings

-   **Default Neighbour Field**: Choose a default field to use for the neighbour relationships. This is useful if you have a _lot_ of list notes, and don't want to add the `BC-list-note-neighbour-field` to each one.

### Dendron Notes

If you use the [Dendron](https://www.dendron.so/) note-taking system, Breadcrumbs can leverage the structure of your note names. For example, if you have the following notes:

-   `A`
-   `A.B`
-   `A.B.C`

Breadcrumbs will add edges from `A.B.C` to `A.B` to `A` using the field you specify.

[![](https://mermaid.ink/img/pako:eNpNjjELwjAQhf9KuKmFtqBuGYSqoy66ZjmSqw02TTkTREr_u1ddfMPj8fHueDPY6Ag0dEN82R45qfPVjEq0Kdrm0BxLVdcqT-J7tV3RP9gVbQkVBOKA3smbeb01kHoKZEBLdMgPA2ZcpIc5xdt7tKATZ6ogTw4TnTzeGQPoDoenUHI-Rb78dn3nLR98sTJV?type=png)](https://mermaid.live/edit#pako:eNpNjjELwjAQhf9KuKmFtqBuGYSqoy66ZjmSqw02TTkTREr_u1ddfMPj8fHueDPY6Ag0dEN82R45qfPVjEq0Kdrm0BxLVdcqT-J7tV3RP9gVbQkVBOKA3smbeb01kHoKZEBLdMgPA2ZcpIc5xdt7tKATZ6ogTw4TnTzeGQPoDoenUHI-Rb78dn3nLR98sTJV)

#### Dendron Note Settings

-   **Enable**: Toggle Dendron notes on or off.
-   **Field**: Choose the field to use for the edges.
-   **Delimiter**: Choose the delimiter you use in your Dendron notes. This is generally a period (`.`), but can be anything you like.
-   **Display Trimmed**: Choose to display the trimmed note name. This will remove the prefix from the note name, so `A.B.C` will be displayed as `C`.

### Johnny Decimal Notes

If you use the [Johnny Decimal](https://johnnydecimal.com/) note-taking system, Breadcrumbs can leverage the structure of your note names. For example, if you have the following notes:

-   `10 Work`
-   `10.20 Project A`
-   `10.20.a Task 1`

Breadcrumbs will add edges from `10.20.a Task 1` to `10.20 Project A` to `10 Work` using the field you specify.

[![](https://mermaid.ink/img/pako:eNpVjrEOgkAMhl-l6SQJEMDtBidHTYyauNzScEUQjiPH3WAI726VyQ5N83_Nn2_B2hlGhU9PUwunqx5BptyVRV4VOcGd5h7KBLIM4iT7ANXG4OLdi-vwD_cC4eF8n2CKlr2lzkj78q3VGFq2rFHJabihOASNelzllWJwt_dYowo-copxMhT42JF4WVQNDbOkbLrg_Hkz_omvH0ugOa0?type=png)](https://mermaid.live/edit#pako:eNpVjrEOgkAMhl-l6SQJEMDtBidHTYyauNzScEUQjiPH3WAI726VyQ5N83_Nn2_B2hlGhU9PUwunqx5BptyVRV4VOcGd5h7KBLIM4iT7ANXG4OLdi-vwD_cC4eF8n2CKlr2lzkj78q3VGFq2rFHJabihOASNelzllWJwt_dYowo-copxMhT42JF4WVQNDbOkbLrg_Hkz_omvH0ugOa0)

#### Johnny Decimal Note Settings

-   **Enable**: Toggle Johnny Decimal notes on or off.
-   **Field**: Choose the field to use for the edges.
-   **Delimiter**: Choose the delimiter you use in your Johnny Decimal notes. This is generally a period (`.`), but can be anything you like.

### Dataview Notes

_Dataview Notes_ allow you to use the [Dataview plugin](https://github.com/blacksmithgu/obsidian-dataview) query engine to add edges to the graph. You can turn a note into a dataview note by adding the following to your frontmatter:

```yaml
BC-dataview-note-query: <query>
BC-dataview-note-field: <field>
```

Where `<query>` is a valid Dataview query, and `<field>` is one of your Breadcrumbs fields. Breadcrumbs will ask Dataview for all notes that match the query, and add edges from the current note to those notes using the field you specify.

For example, the following query will add child edges from the current note to all notes that contain the tag `#tag` and are in the folder "Folder":

```yaml
BC-dataview-note-query: "#tag" AND "Folder"
BC-dataview-note-field: child
```

> [!TIP]
> The `query` is passed directly to the Dataview `pages` method, which you can test out in the Obsidian console with `app.plugins.plugins.dataview.api.pages('<query>', app.workspace.getActiveFile()?.path ?? "")`

### Date Notes

_Date Notes_ allow you to leverage your existing daily notes structure. You can enable Date Notes globally in the settings, under Date Notes. For example, if you have the following notes:

-   `2022-01-01`
-   `2022-01-02`
-   `2022-01-03`

Breadcrumbs will add edges from `2022-01-01` to `2022-01-02`, to `2022-01-03` using the field you specify.

[![](https://mermaid.ink/img/pako:eNpVjjELwjAQhf9KuMlCC226ZXBy1EXXLEdztcUmKfGCSul_99SheDy4477H4y3QRUdgoJ_ioxswsTqebVAyzU7XWld1IypUValAT5a9V3oj-p-0G2kLKMFT8jg6yV8-oRZ4IE8WjJwO082CDav4MHO8vEIHhlOmEvLskOkw4jWhB9PjdJcvuZFjOv0Kf3uvb3hzN54?type=png)](https://mermaid.live/edit#pako:eNpVjjELwjAQhf9KuMlCC226ZXBy1EXXLEdztcUmKfGCSul_99SheDy4477H4y3QRUdgoJ_ioxswsTqebVAyzU7XWld1IypUValAT5a9V3oj-p-0G2kLKMFT8jg6yV8-oRZ4IE8WjJwO082CDav4MHO8vEIHhlOmEvLskOkw4jWhB9PjdJcvuZFjOv0Kf3uvb3hzN54)

> [!TIP]
> Refer to the Luxon documentation for the full list of date formats: https://moment.github.io/luxon/#/parsing?id=table-of-tokens.

#### Date Note Settings

-   **Enable**: Toggle Date Notes on or off.
-   **Field**: Choose the field to use for the edges.
-   **Date Format**: Choose the date format you use for your daily notes (e.g. `YYYY-MM-DD`).
-   **Stretch to Existing**: If there is a gap from one day to another, should the next note be the unresolved one in _one day_ or should it "stretch" to the next resolved (existing) note?

### Folder Notes

_Folder Notes_ allow you to leverage your existing folder structure. You can turn a note into a folder note by adding the following to your frontmatter:

```yaml
BC-folder-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields. Breadcrumbs will add edges from the current note to all _other_ notes in the same folder, using the field you specify.

[![](https://mermaid.ink/img/pako:eNo1jjELwkAMhf9KyCAWWkTdbhCUrk463hKa1B727iReqVL63z2VviXvJeHxTdhEFjTY9nFsOtIE19oGyNqu29iz6MYFllcBVQUcx5DnAXbL7VjACvZLOhVYohf15Dh3Tt8ii6kTLxZNtkx6t2jDnP9oSPHyDg2apIOUODyYktSObkoeTUv9M2-FXYp6_kP-WOcP2Ns5uQ?type=png)](https://mermaid.live/edit#pako:eNo1jjELwkAMhf9KyCAWWkTdbhCUrk463hKa1B727iReqVL63z2VviXvJeHxTdhEFjTY9nFsOtIE19oGyNqu29iz6MYFllcBVQUcx5DnAXbL7VjACvZLOhVYohf15Dh3Tt8ii6kTLxZNtkx6t2jDnP9oSPHyDg2apIOUODyYktSObkoeTUv9M2-FXYp6_kP-WOcP2Ns5uQ)

#### `BC-folder-note-recurse`

By default, Breadcrumbs will only add edges to notes in the _immediate_ folder. If you want to add edges to notes in _all_ subfolders, you can add the `BC-folder-note-recurse` field to the frontmatter of the folder note.

```yaml
BC-folder-note-recurse: true
```

[![](https://mermaid.ink/img/pako:eNo1j08LwjAMxb9KyUEcbIh_Tj0Ijl096bGXuGSuuLbStUwZ--526nLJ-yWB9zJC7YhBQtO5oW7RB3GtlBWptuvGdcR-oy3xKxNFIcgNNvWj2C27UyZWYr9QOdNhoT7e_gozyMGwN6gpeY2zgYLQsmEFMklC_1Cg7JTuMAZ3edsaZPCRc4hPwsCVxrtHA7LBrk9TJh2cP__Cf3-YPpJbQaU?type=png)](https://mermaid.live/edit#pako:eNo1j08LwjAMxb9KyUEcbIh_Tj0Ijl096bGXuGSuuLbStUwZ--526nLJ-yWB9zJC7YhBQtO5oW7RB3GtlBWptuvGdcR-oy3xKxNFIcgNNvWj2C27UyZWYr9QOdNhoT7e_gozyMGwN6gpeY2zgYLQsmEFMklC_1Cg7JTuMAZ3edsaZPCRc4hPwsCVxrtHA7LBrk9TJh2cP__Cf3-YPpJbQaU)

> [!IMPORTANT]
> This doesn't create _nested_ edges. It effectively flattens your folder structure into one level, so notes in subfolders will still be added as children of the _top-level_ folder note, not as children of the notes in the subfolders.

## Implied Relationships

By adding edges to the Breadcrumbs graph, you've created various explicit relationships: "Note A is the _parent_ of note B", or "note C has 3 _children_: D, E, and F". But you've also created some _implied_ relationships. For example, if A is the _parent_ of B, then it's _implied_ that B is the **child** of A! This _kind_ of implied relationship is called the "opposite direction" implied relation.

[![](https://mermaid.ink/img/pako:eNoljjELgzAUhP9KeJMFFXTM0Ek6tUu7ZnkkTxNqorwmlCL-977Wm467j-M2sIsj0DDOy9t65Kyud5OUqKsGLJPPxCfVNGpFppTFnVVfXTB7yQ-wV02rrA-zU620HdQQiSMGJ7vbjzEgeCQDWqxDfhowaRcOS14en2RBZy5UQ1kdZhoCTowR9IjzS1JyIS98O47-_-5fKyI5vg?type=png)](https://mermaid.live/edit#pako:eNoljjELgzAUhP9KeJMFFXTM0Ek6tUu7ZnkkTxNqorwmlCL-977Wm467j-M2sIsj0DDOy9t65Kyud5OUqKsGLJPPxCfVNGpFppTFnVVfXTB7yQ-wV02rrA-zU620HdQQiSMGJ7vbjzEgeCQDWqxDfhowaRcOS14en2RBZy5UQ1kdZhoCTowR9IjzS1JyIS98O47-_-5fKyI5vg)

There are many other kinds, including "If A and B both have the same _parent_, then they must be **siblings**". Breadcrumbs automatically detects, and adds these implied relationships to the graph. Each kind of implied relationship is completely _optional_, and can be toggled on a hierarchy-level in the settings.

### Transitive Implied Relations

This category of implied relations can be thought of as a _chain_ of fields which collapse down to one field. For example, if A is the _parent_ of B, and B is the _parent_ of C, then it's _implied_ that A is the **grandparent** of C. This is a _transitive_ implied relation. Or, in a more general syntax, `[parent, parent] -> grandparent` (a chain of two `parent` fields collapses down to one `grandparent` field between the start and end nodes).

[![](https://mermaid.ink/img/pako:eNpdjzELg0AMhf_KkUlBBe12Q6dCl7q06y3Bi1Xq3Uk8KUX87421Q2mmx8uXPN4CTbAEGtohPJsOOarL1XglUyY1pSrP1YhMPoo6qiqpQ-yI0x2p_taH5MzobYs_TKnyQt03-wsWGwgZOGKHvZXsZSMNyJEjA1qkRX4YMH4VDucYbi_fgI48UwbzaDHSqUd56kC3OEziku1j4Hov8-m0vgFP_ERG?type=png)](https://mermaid.live/edit#pako:eNpdjzELg0AMhf_KkUlBBe12Q6dCl7q06y3Bi1Xq3Uk8KUX87421Q2mmx8uXPN4CTbAEGtohPJsOOarL1XglUyY1pSrP1YhMPoo6qiqpQ-yI0x2p_taH5MzobYs_TKnyQt03-wsWGwgZOGKHvZXsZSMNyJEjA1qkRX4YMH4VDucYbi_fgI48UwbzaDHSqUd56kC3OEziku1j4Hov8-m0vgFP_ERG)

#### Same Sibling is Sibling

If A and B both share the same _sibling_, mark them as **siblings** as well.

`[same, same] -> same`

#### Siblings Parent is Parent

If A and B are _siblings_, then make A's **parent** B's **parent** as well.

`[same, up] -> up`

#### Parents Sibling is Parent

If A's _parent_ is B, and B is the _sibling_ of C, then make C the **parent** of A.

`[up, same] -> up`

#### Parents Child is Sibling

If A and B both have the same _parent_, mark them as **siblings**.

`[up, down] -> same`

#### Cousin is Sibling

If A and B are _cousins_, mark them as **siblings**.

`[up, same, down] -> same`

#### Custom Transitive Relations

Using this format of `[chain] -> closing-field`, you can create fully customised transitive relations. For example, if you have a `grandparent` field, you could add the following:

`[parent, parent] -> grandparent`

Or if you have a `sibling-in-law` field, you could add the following:

`[spouse, sibling] -> sibling-in-law`

The crucial difference between these and the built-in transitive relations are that the custom ones can use fields from _any_ hierarchy! As with regular implied relations, you can choose how many _rounds_ to run these for.

### Other Implied Relations

#### Self is Sibling

This implied relation makes every note its own sibling. This is useful for always showing the current note in the various visualisations.

[![](https://mermaid.ink/img/pako:eNoljsEKwjAQRH9l2ZOFttBrDoLgUS96zWVJtjbYJLLdIKX03406p2F4A29Dlz2jwXHObzeRKFxuNkHNcDg10PWwUGTouyMM2GJkiRR8PWxfyqJOHNmiqdWTPC3atFeOiub7mhwalcItlpcn5XOgh1BEM9K81JV90CzXv8FPZP8AlCsuGA?type=png)](https://mermaid.live/edit#pako:eNoljsEKwjAQRH9l2ZOFttBrDoLgUS96zWVJtjbYJLLdIKX03406p2F4A29Dlz2jwXHObzeRKFxuNkHNcDg10PWwUGTouyMM2GJkiRR8PWxfyqJOHNmiqdWTPC3atFeOiub7mhwalcItlpcn5XOgh1BEM9K81JV90CzXv8FPZP8AlCsuGA)

#### Opposite Direction

If A is the _parent_ of B, then it's _implied_ that B is the **child** of A.

[![](https://mermaid.ink/img/pako:eNolTsEKgzAU-5XHOymooMceBhs7zst27eXRPqfMttK1yBD_fW8zhxCSELKhCZZR4TCH1YwUE9zu2oOgLc4l1DXkRfgEXXEpj6CDugEbVg-N-C1W6Dg6mqzMbL-KxjSyY41KpKX40qj9Lj3KKTw-3qBKMXOFebGU-DrRM5JDNdD8FpftlELsj1__e_sXqicywg?type=png)](https://mermaid.live/edit#pako:eNolTsEKgzAU-5XHOymooMceBhs7zst27eXRPqfMttK1yBD_fW8zhxCSELKhCZZR4TCH1YwUE9zu2oOgLc4l1DXkRfgEXXEpj6CDugEbVg-N-C1W6Dg6mqzMbL-KxjSyY41KpKX40qj9Lj3KKTw-3qBKMXOFebGU-DrRM5JDNdD8FpftlELsj1__e_sXqicywg)

The mapping of opposite directions is as follows:

-   `up` -> `down`
-   `down` -> `up`
-   `same` -> `same`
-   `prev` -> `next`
-   `next` -> `prev`

### Implied Relation Rounds

Not only can you enable/disable each kind of implied relation, you can change how many _rounds_ to go through to detect them. This is useful to add implied relations _based on other implied relations_.

-   Setting rounds to `0` disables that kind.
-   Setting it to `1` will add that kind of implied relation, only considering _explicit_ edges.
-   Setting it to `2` will add that kind of implied relation again, considering _explicit_ edges and _previously added_ implied edges. And so on...

#### Example

Say you have the following explicit edges (two notes pointing `up` to their parent):

[![](https://mermaid.ink/img/pako:eNpVTrEKwjAU_JXwphbaQd0yCIqjBdE1yyN5tcEmKc8XREr_3WgnbziOu-O4GWxyBBr6Mb3sgCzqfDVRFWyqQ63aVuWp8F5tqwsyRanXdFcd_1JoIBAH9K6Mzd-OARkokAFdpEN-GDBxKT3Mkm7vaEELZ2ogTw6FTh7vjAF0j-OzuOS8JO7Wd7-TywfrETSq?type=png)](https://mermaid.live/edit#pako:eNpVTrEKwjAU_JXwphbaQd0yCIqjBdE1yyN5tcEmKc8XREr_3WgnbziOu-O4GWxyBBr6Mb3sgCzqfDVRFWyqQ63aVuWp8F5tqwsyRanXdFcd_1JoIBAH9K6Mzd-OARkokAFdpEN-GDBxKT3Mkm7vaEELZ2ogTw6FTh7vjAF0j-OzuOS8JO7Wd7-TywfrETSq)

If you have the [Parents' Child is Sibling](#parents-child-is-sibling) relation enabled, you may expect `A` and `B` to be marked as siblings, since they share the same parent. But in this example, they won't since there isn't a chain of `[up, down]` between the two. Instead, they both point `up`. To achieve the same effect, we can use the [Opposite Direction](#opposite-direction) relation to add the `down` edges we need:

[![](https://mermaid.ink/img/pako:eNptj8EKwjAQRH9l2VMLbaHtLQdB8agges1laba22CQlJhQp_XejOQnOYRneDCyzYmcVo8B-sks3kPNwukoDUXW2z6EsIczx7qDJLuTY-DylbXb4SRNtoKxA2cVAFWH9D7ZYoGanaVTx7fqpSPQDa5YoolXkHhKl2WKPgre3l-lQeBe4wDAr8nwc6e5Io-hpekbKavTWndOO75ztDatEPl4?type=png)](https://mermaid.live/edit#pako:eNptj8EKwjAQRH9l2VMLbaHtLQdB8agges1laba22CQlJhQp_XejOQnOYRneDCyzYmcVo8B-sks3kPNwukoDUXW2z6EsIczx7qDJLuTY-DylbXb4SRNtoKxA2cVAFWH9D7ZYoGanaVTx7fqpSPQDa5YoolXkHhKl2WKPgre3l-lQeBe4wDAr8nwc6e5Io-hpekbKavTWndOO75ztDatEPl4)

Now there is a chain of `[up, down]` between `A` and `B` (`A -up-> Parent -down-> B)`. But, because the `down` edge is implied, we have to increase the _rounds_ of the Parents' Child is Sibling relation to `2` to detect it. If it was only on `1`, then it wouldn't consider the implied edges added by the Opposite Direction relation.

[![](https://mermaid.ink/img/pako:eNptjzELgzAQhf_KcZOCCuqWodDSsYXSrlkOc1bBJBITShH_e6N2KfSG4_je43hvxsYqRoFPR2MHl7s0EKdMjinkOYQx7gNUyY0cG5_uap2cftSdVitS9mU2WP6D9fc75AVMpBmKFWKGmp2mXsUc82qR6DvWLFHEU3FLYfASpVmilYK3j7dpUHgXOMMwKvJ87ik20ChaGqZIWfXeuuvebau4fABhA0Kt?type=png)](https://mermaid.live/edit#pako:eNptjzELgzAQhf_KcZOCCuqWodDSsYXSrlkOc1bBJBITShH_e6N2KfSG4_je43hvxsYqRoFPR2MHl7s0EKdMjinkOYQx7gNUyY0cG5_uap2cftSdVitS9mU2WP6D9fc75AVMpBmKFWKGmp2mXsUc82qR6DvWLFHEU3FLYfASpVmilYK3j7dpUHgXOMMwKvJ87ik20ChaGqZIWfXeuuvebau4fABhA0Kt)

You can think of increasing the rounds as making all _previous_ implied relations **explicit**. So, in the above example, increasing the rounds of the Parents' Child is Sibling relation to `2` would make the `down` edge between `A` and `B` explicit (because they were added in round `1`), and then detect the sibling relationship.

## Customise the Build Process

The following metadata fields influence how Breadcrumbs adds edges to the graph. They can be added to the YAML frontmatter, or as an inline Dataview field.

-   `BC-ignore-in-edges`: If true, Breadcrumbs won't add edges coming _into_ this note.
-   `BC-ignore-out-edges`: If true, Breadcrumbs won't add edges going _out_ of this note.

# Leveraging the graph

## Views

Once you've built the graph, you can view it in various ways.

### Page View

The Page View appears at the top of the current note. It shows _multiple_ subviews: Trail View, and Previous/Next View.

#### Trail View

The Trail View shows all paths going _up_ from the current note.

##### Trail View Settings

-   **Enable**: Show/hide the Trail View at the top of your notes.
-   **Format**: Show the results in a Path/Grid format (the underlying data is still the same).
-   **Path Selection**: Show all paths, or only the shortest/longest path.
-   **Depth**: A maximum _depth_ of the paths. If the paths go longer than the max depth, slice them off.
-   **Show Controls**: Show/hide a set of controls on top of the Trail View to change the above options.
-   **No Path Message**: The message to show when there are no paths to show. Leave blank to show nothing.

#### Previous/Next View

The Previous/Next View shows the immediate `previous` and `next` neighbours of the current note.

##### Previous/Next View Settings

-   **Enable**: Show/hide the Previous/Next View at the top of your notes.

#### Page View Settings

Settings common to the Page View as a whole:

-   **Sticky**: Keep the Page View visible as you scroll down a note.
-   **Readable Line Width**: Keep the Page View's width inline with the width of a note.

### Matrix View

The Matrix View shows up on the side of the editor, and shows the immediate neighbours of the current note (in all 5 directions).

On the right side of each link, you'll see either `(x)` or `(i)`, indicating if that edge is _explicit_ or _implied_. However over the icon to see the _source_ of real edges, and the _kind_ of implied edges (as well as the _round_ they were added in).

### Tree View

The Tree View shows up on the side of the editor, and shows all path going in a _chosen direction_ from the current note. It is similar to the [Trail View](#trail-view), but you can choose which direction to traverse.

#### Tree View Settings

-   **Collapse**: Collapse the tree such that the top-level dropdowns are closed.
-   **Direction**: Choose the default direction to traverse in the Tree View.
-   **Sort**: Choose which field and direction to sort the tree by.
-   **Show Attributes**: Choose which edge attributes to show in the tree.

### Codeblocks

Breadcrumbs adds a new codeblock language, `breadcrumbs`. Currently, this can be used to render a tree of all paths in a given direction from the current note (similar to the [Tree View](#tree-view)), or a [mermaid](https://mermaid.js.org) graph of the same data. The basic syntax is:

```yaml
type: tree
dir: down
depth: 0-3
sort: basename desc
```

The above example would render a markdown list of all paths going _down_ from the current note, up to a depth of 3, sorted by the basename of the notes, in descending order.

#### Fields

The following fields can be added to the codeblock to customise the output. Optional fields are marked with a `?`, and their default values are shown in `(parentheses)`.

##### `type`

Type: `type?: (tree) | mermaid`

How to visualise the results.

##### `dirs`

Type: `dirs?: (up | (down) | same | prev | next)[]`

Filter edges by a given list of directions. By default, only the `down` direction is shown.

##### `fields`

Type: `fields?: string`

Filter edges by a list of fields (comma-separated)

##### `title`

Type: `title?: string`

Add a title above the codeblock

##### `depth`

Type: `depth?: <number>-<number>`

Filter edges by a depth range. For example:

-   `1-3` would show all paths between 1 and 3 levels deep.
-   `3-` would show all paths 3 levels deep and deeper.
-   `-3` would show all paths 3 levels deep and shallower.

By default, all depths are shown.

##### `flat`

Type: `flat?: true | (false)`

Flatten the nested results into a flat list.

##### `collapse`

Type: `collapse?: true | (false)`

##### `merge-hierarchies`

Type: `merge-hierarchies?: true | (false)`

By default, Breadcrumbs traverses each hierarchy separately. If you set this to `true`, Breadcrumbs will merge all hierarchies together, meaning paths of edges from _different_ hierarchies can contribute to the same path.

Collapse the nested results such that the top-level dropdowns are closed.

##### `dataview-from`

Type: `dataview-from?: string`

Filter edges by a [Dataview](http://blacksmithgu.github.io/obsidian-dataview/) query.

##### `sort`

Type: `sort?: <field> (asc) | desc`

Used to sort the results. The available fields are:

-   `basename` sorts by the basename of the note.
-   `path` sorts by the full path of the note.
-   `field` sorts by the field value of the note.
-   `explicit` sorts by the explicitness of the edge.
    -   Uses `source` as a tiebreaker for explicit edges, and `implied_kind` for implied edges.

There are more complex sort fields as well:

-   `neighbour-field:<field>` sort by the _path_ of the first neighbour of the note in the given `<field>`.
    -   Useful for sorting by the `next` neighbour.

##### `show-attributes`

Type: `show-attributes?: string[]`

Show specific attributes about each item in the tree/mermaid-chart. Give a comma-separated list of values. Options include:

-   `hierarchy_i`: Which hierarchy the edge is from.
-   `dir`: The direction of the edge.
-   `field`: The field of the edge.
-   `explicit`: Whether the edge is explicit or implied.
-   `source`: The [source](#explicit-edge-sources) of the edge.
-   `implied_kind`: The kind of [implied relation](#implied-relationships) the edge is.
-   `round`: The round the implied edge was added in.

##### `mermaid-direction`

Type: `mermaid-direction?: LR | RL | TB | BT`

The direction of the mermaid graph (if `type: mermaid`). If you don't give a value, Breadcrumbs will choose one based on the `dir` field.

##### `mermaid-renderer`

Type: `mermaid-renderer?: (dagre) | elk`

The renderer to use for the mermaid graph.

-   `dagre` is the default renderer, and is more stable.
-   `elk` is more experimental, but can handle larger graphs.

### View Settings

Settings common to **all** Views:

-   **Note Display Options**: Decide how to present a note path. Toggle the Folder, Extension, and Alias on/off (customisable per-view).

## Commands

Breadcrumbs adds a few commands to the command palette.

### Rebuild Graph

This command rebuilds the Breadcrumbs graph. This is useful if you've made changes to your notes, and want to see them reflected in the graph.

#### Rebuild Graph Settings

-   **Notify on Rebuild**: Show a notification when the graph is rebuilt. The notification will show a summary of any errors that occurred during the rebuild.
-   **Triggers**: Choose to automatically run the command when you change notes, or when you save a note.

### Create List Index

This command builds a nested markdown list of all paths in a given direction from the current note. It then copies this list to the clipboard.

For example:

```md
-   [[A]]
    -   [[B]]
        -   [[C]]
    -   [[D]]
-   [[E]]
    -   [[F]]
```

> [!TIP]
> The output format matches the required format for the [List Note](#list-notes) edge source. So you can paste this list into a note, and then use it as a List Note.

#### Create List Index Settings

-   **Hierarchy**: Choose the hierarchy to use for the list. "All" will traverse all hierarchies (while still keeping the paths separate).
-   **Direction**: Choose the direction to traverse in the list.
-   **Link Kind**: Choose the kind of links to use in the list. Options include "wiki", "markdown", and "none".
-   **Indent**: Choose the string to use for indentation in the list (e.g. ` `, `\t`).

### Jump to First Neighbour

These commands let you quickly jump around your Breadcrumgs graph. For each of the 5 directions, and each individual field in your hierarchies, there is a command to jump to the first neighbour in that direction/field.

### Freeze Breadcrumbs to File

This command takes all the _implied_ edges leaving the current note, and makes them explicit by writing them to the file in the format you choose.

#### Freeze Breadcrumbs Settings

-   **Destination**: Choose where to write the edges to. Either as [frontmatter links](#frontmatter-links), or [Dataview links](#dataview-links).

### Thread

This command creates a new note, and adds a Breadcrumbs edge to it from the current note. This is useful for quickly creating a new note in the context of the current note.

#### Thread Settings

-   **Destination**: Choose where to write the edges to. Either as [frontmatter links](#frontmatter-links), [Dataview links](#dataview-links), or none.
-   **Target Path Template**: Choose a template for the path of the new note. This can include placeholders for:
    -   `{{source.folder}}`: The folder of the current note.
    -   `{{source.path}}`: The path of the current note.
    -   `{{source.basename}}`: The basename of the current note.
    -   `{{attr.field}}`: The Breadcrumbs field used to thread the new note.

## Suggestors

### Hierarchy Field Suggestor

The Hierarchy Field Suggestor lets you quickly add a new [Typed Link](#typed-links) edge. If you type the _trigger_ string at the start of a line, it will show you a list of all the fields you've used in your Breadcrumbs settings, and let you quickly select one.

#### Hierarchy Field Suggestor Settings

-   **Enable**: Enable the Hierarchy Field Suggestor. Obsidian needs to be restarted after enabling.
-   **Trigger**: The character(s) that triggers the suggestor. Defaults to `.`.

## API

Breadcrumbs exposes a simple API for other plugins to use.

You can access the API off the window object, like so:

```javascript
window.BCAPI;
```

# Media

Media related to Breacrumbs. Thanks to everyone for sharing!

## Videos

-   @SkepticMystic: [Breadcrumbs - Everything you need to know](https://www.youtube.com/watch?v=N4QmszBRu9I&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @SkepticMystic: [Breadcrumbs - Obsidian Community Showcase](https://www.youtube.com/watch?v=DXXB7fHcArg&pp=ygUUYnJlYWRjcnVtYnMgb2JzaWRpYW4%3D) (Outdated)
-   @Zen Productivist: [Threading Mode with the Breadcrumbs Plugin in Obsidian](https://www.youtube.com/watch?v=AS5Mv6YNmsQ) (2022-01-01)

## Written

-   @Rhoadey: [How a Hierarchy Note sharpened my thinking in 20 minutes](https://medium.com/obsidian-observer/how-a-hierarchy-note-sharpened-my-thinking-in-20-minutes-f1c65945f41e?sk=64f4d1f889ff8a99009a060a24778a7f)
-   [Obsidian Hub - Breadcrumbs Quickstart Guide](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/Breadcrumbs+Quickstart+Guide)
-   [Obsidian Hub - Breadcrumbs for Comparative Law](https://publish.obsidian.md/hub/03+-+Showcases+%26+Templates/Plugin+Showcases/Breadcrumbs+for+Comparative+Law)
-   [Obsidian Hub - How to get the most out of Breadcrumbs](https://publish.obsidian.md/hub/04+-+Guides%2C+Workflows%2C+%26+Courses/Guides/How+to+get+the+most+out+of+the+Breadcrumbs+plugin)

# Feed my coffee problem

If you're so inclined, you can buy me a coffee over here: https://ko-fi.com/skepticmystic :)

# Release

## Prod

## Beta

1. Push all previous changes to the actual project
2. Bump version in `package.json`
3. `npm run version:beta` to update `manifest-beta.json` and `versions.json` accordingly
4. `git tag -a x.x.x-beta -m 'x.x.x-beta'` to tag the build
5. `git push origin x.x.x-beta` to push the release and trigger the action

Or, do steps 3-5 in one go with `npm run release:beta`
