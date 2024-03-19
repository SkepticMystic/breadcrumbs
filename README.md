Breadcrumbs is an Obsidian plugin that lets you add structured hierarchy to your notes, then view/traverse that structure in various ways.

Internally, Breadcrumbs uses a graph to represent this structure (much like the regular Obsidian graph, except now, links have _direction_ to them). You tell Breadcrumbs about the structure of your notes, it builds this directed graph, and then lets you visualise and navigate the graph.

**Table of Contents**:

-   [Hierarchies](#hierarchies)
-   [Building the Breadcrumbs graph](#building-the-breadcrumbs-graph)
    -   [Edge Sources](#explicit-edge-sources)
    -   [Implied Relationships](#implied-relationships)
-   [Leveraging the Breadcrumbs graph](#leveraging-the-breadcrumbs-graph)
    -   [Views](#views)
    -   [Commands](#commands)
    -   [Codeblocks](#codeblocks)
    -   [API](#api)

# Hierarchies

The starting point of Breadcrumbs is the hierarchy system, which determine the _directed fields_ you'll use to structure your notes. You can have as many hierarchies as you like, and they'll all run separately from each other.

A basic hierarchy could be:

```
up: parent
down: child
same: sibling
prev: before
next: after
```

On the left are the unchangeable directions, and on the right are the fields you'll use to structure your notes. You can change the fields to whatever you like, but the directions are fixed.

Using these _fields_, you can now start adding edges to your Breadcrumbs graph. For example the `[[Father]]` note could have a `child` field pointing to `[[Me]]`, and `[[Me]]` could have a `parent` field pointing to `[[Mother]]`.

# Building the Breadcrumbs graph

There are two broad ways of building the graph, or adding edges. The first are the _explicit edge sources_, and the other are the various _implied relationships_ that build on the explicit edges.

## Explicit Edge Sources

There are many ways to add directed edges to the graph - what I call "Edge Sources". I'll start with the most basic, manual approach.

### Frontmatter Links

In the YAML frontmatter of your note, you can add key/value pairs indicating a directed link to another note:

```yaml
---
parent: "[[A]]"
child: ["[[B]]", "[[C]]"]
---
```

This tells Breadcrumbs that the "parent" of the current note is "A", and that its two "children" are "B" and "C".

### Dataview Links

If you have the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin enabled, you can use their format of metadata as well. In the _content_ of a note:

```
parent:: [[A]]
child:: [[B]], [[C]]
```

This creates the same structure as the [frontmatter links](#frontmatter-links) method above.

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

#### Settings

Under Breadcrumbs settings, you can choose a default BC-field to use when only `BC-regex-note-regex` is present. This is useful if you have a _lot_ of regex notes, and don't want to add the `BC-regex-note-field` to each one.

### List Notes

_List Notes_ allow you to leverage your existing bullet list structure. You can turn a note into a list note by adding the following to your frontmatter:

```yaml
BC-list-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields.

The structure of a List Note is as follows:

```md
-   [[A]]
    -   [[B]]
        -   [[C]]
    -   [[D]]
```

In this example, `A` is the parent of `B` and `D`, and `B` is the parent of `C` (assuming the field you used is `parent`).

#### Field Overrides

By default, each item in the list will use the `BC-list-note-field` value to add edges. But you can override this on a per-item basis by adding the field _before_ the link.

```md
---
BC-list-note-field: down
---

-   [[A]]
    -   [[B]]
        -   child [[C]]
```

In this example, `A` -down-> `B`, but `B` -child-> `C`.

#### `BC-list-note-exclude`

By default, the list note itself links to the top-level list items. You can exclude this behaviour by adding the `BC-list-note-exclude` field to the frontmatter of the list note.

```yaml
BC-list-note-exclude: true
```

#### `BC-list-note-neighbour-field`

Normally, only the parent/child relationships are added. But you can also add edges based on the _neighbours_ of each list item. This is useful for adding sibling/next/prev relationships.

```yaml
BC-list-note-neighbour-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields.

In the example above, this would add edges from `B` to `D`.

### Dendron Notes

If you use the [Dendron](https://www.dendron.so/) note-taking system, Breadcrumbs can leverage the structure of your note names. You can enable dendron notes globally in the settings, under Dendron Notes. Flip the toggle on, choose a field to add edges with, and tell Breadcrumbs which delimiter you use (generally a period, `.`).

For example, if you have the following notes:

-   `A`
-   `A.B`
-   `A.B.C`

Breadcrumbs will add edges from `A` to `A.B`, and from `A.B` to `A.B.C` using the field you specify.

#### Display Trimmed

In the Dendron Notes settings, you can also choose to display the trimmed note name. This will remove the prefix from the note name, so `A.B.C` will be displayed as `C`.

### Dataview Note

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

### Date Notes

_Date Notes_ allow you to leverage your existing daily notes structure. You can enable Date Notes globally in the settings, under Date Notes. Flip the toggle on, choose a field to add edges with, and tell Breadcrumbs what date format you use for your daily notes (e.g. `YYYY-MM-DD`). For example, if you have the following notes:

-   `2022-01-01`
-   `2022-01-02`
-   `2022-01-03`

Breadcrumbs will add edges from `2022-01-01` to `2022-01-02`, and from `2022-01-02` to `2022-01-03` using the field you specify.

> [!TIP]
> Refer to the Luxon documentation for the full list of date formats: https://moment.github.io/luxon/#/parsing?id=table-of-tokens.

### Folder Notes

_Folder Notes_ allow you to leverage your existing folder structure. You can turn a note into a folder note by adding the following to your frontmatter:

```yaml
BC-folder-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields. Breadcrumbs will add edges from the current note to all _other_ notes in the same folder, using the field you specify.

#### `BC-folder-note-recurse`

By default, Breadcrumbs will only add edges to notes in the _immediate_ folder. If you want to add edges to notes in _all_ subfolders, you can add the `BC-folder-note-recurse` field to the frontmatter of the folder note.

```yaml
BC-folder-note-recurse: true
```

> [!IMPORTANT]
> This doesn't create _nested_ edges. It effectively flattens your folder structure into one level, so notes in subfolders will still be added as children of the _top-level_ folder note, not as children of the notes in the subfolders.

## Implied Relationships

By adding edges to the Breadcrumbs graph, you've created various explicit relationships: "Note A is the _parent_ of note B", or "note C has 3 _children_: D, E, and F". But you've also created some _implied_ relationships. For example, if A is the _parent_ of B, then it's _implied_ that B is the **child** of A! This _kind_ of implied relationship is called the "opposite direction" implied relation. There are many other kinds, including "If A and B both have the same _parent_, then they must be **siblings**". Breadcrumbs automatically detects, and adds these implied relationships to the graph.

Each kind of implied relationship is completely _optional_, and can be toggled on a hierarchy-level in the settings. Furthermore, not only can you enable/disable each kind of implied relation, you can change how many _rounds_ to go through to detect them! This is useful to add implied relations _based on other implied relations_. Setting rounds to `0` disables that kind. Setting it to `1` will add that kind of implied relation, only considering _real_ edges. Setting it to `2` will add that kind of implied relation, considering _real_ edges and _previously added_ implied edges. And so on.

<!-- TODO: Picture -->

### Transitive Implied Relations

This category of implied relations can be thought of as a _chain_ of fields which collapse down to one field. For example, if A is the _parent_ of B, and B is the _parent_ of C, then it's _implied_ that A is the **grandparent** of C. This is a _transitive_ implied relation. Or, in a more general syntax, `[up, up] -> up` (a chain of two `up` fields collapses down to one `up` field between the start and end nodes).

#### Same Sibling is Sibling

If A and B both share the same _sibling_, mark them as **siblings** as well.

`[same, same] -> same`

#### Siblings Parent is Parent

If A and B are _siblings_, then make A's **parent** B's **parent** as well.

`[same, up] -> up`

#### Parents Sibling is Parent

If A's _parent_ is B, and B is the _sibling_ of C, then make C the **parent** of A.

`[up, same] -> up`

#### Siblings Parent is Parent

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

#### Opposite Direction

If A is the _parent_ of B, then it's _implied_ that B is the **child** of A. The mapping of opposite directions is as follows:

-   `up` -> `down`
-   `down` -> `up`
-   `same` -> `same`
-   `prev` -> `next`
-   `next` -> `prev`

# Leveraging the Breadcrumbs graph

## Views

Once you've built the graph, you can view it in various ways.

### Page View

The Page View appears at the top of the current note. It shows _multiple_ subviews: Trail View, and Previous/Next View.

#### Trail View

The Trail View shows all paths going _up_ from the current note. It can show the paths in a _grid_ or a _path_ list, but the underlying data is the same. The following other options can also be configured:

-   Whether to show _all_ paths, or just the _shortest_ path.
-   A maximum _depth_ of the paths. If the paths go longer than the max depth, slice them off.

#### Previous/Next View

The Previous/Next View shows the immediate `previous` and `next` neighbours of the current note.

### Matrix View

The Matrix View shows up on the side of the editor, and shows the immediate neighbours of the current note (in all 5 directions).

On the right side of each link, you'll see either `(x)` or `(i)`, indicating if that edge is _explicit_ or _implied_. However over the icon to see the _source_ of real edges, and the _kind_ of implied edges (as well as the _round_ they were added in).

### Tree View

The Tree View shows up on the side of the editor, and shows all path going in a _chosen direction_ from the current note. It is similar to the [Trail View](#trail-view), but you can choose which direction to traverse.

## Commands

Breadcrumbs adds a few commands to the command palette.

### Create List Index from Note

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

### Jump to First Neighbour

These commands let you quickly jump around your Breadcrumgs graph. For each of the 5 directions, and each individual field in your hierarchies, there is a command to jump to the first neighbour in that direction/field.

### Freeze Breadcrumbs to File

This command takes all the _implied_ edges leaving the current note, and makes them explicit by writing them to the file in the format you choose (either as [frontmatter links](#frontmatter-links), or [Dataview links](#dataview-links)).

## Codeblocks

Breadcrumbs adds a new codeblock language, `breadcrumbs`. Currently, this can be used to render a tree of all paths in a given direction from the current note (similar to the [Tree View](#tree-view)). The basic syntax is:

```yaml
type: tree
dir: down
depth: 0-3
sort: basename desc
```

The above example would render a markdown list of all paths going _down_ from the current note, up to a depth of 3, sorted by the basename of the notes, in descending order.

### Fields

#### `type`

`type?: tree`

How to visualise the results.

#### `dir`

`dir?: up|down|same|prev|next`

Filter edges by a given direction

#### `fields`

`fields?: string`

Filter edges by a list of fields (comma-separated)

#### `title`

`title?: string`

Add a title above the codeblock

#### `depth`

`depth?: number-number`

Filter edges by a depth range. For example:

-   `1-3` would show all paths between 1 and 3 levels deep.
-   `3-` would show all paths 3 levels deep and deeper.
-   `-3` would show all paths 3 levels deep and shallower.

#### `flat`

`flat?: true|false`

Flatten the nested results into a flat list.

#### `dataview-from`

`dataview-from?: string`

Filter edges by a [Dataview](http://blacksmithgu.github.io/obsidian-dataview/) query.

#### `sort`

`sort?: <field> (asc|desc)`

Used to sort the results. The available fields are:

-   `basename` sorts by the basename of the note.
-   `path` sorts by the full path of the note.
-   `field` sorts by the field value of the note.

There are more complex sort fields as well:

-   `neighbour:<field>` sort by the _path_ of the first neighbour of the note in the given `<field>`.
    -   Useful for sorting by the `next` neighbour.

#### `field-prefix`

`field-prefix?: true|false`

Show the edge's field before each list item.

## API

Breadcrumbs exposes a simple API for other plugins to use.

You can access the API off the window object, like so:

```javascript
window.BCAPI;
```

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
