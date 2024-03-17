<!-- TODO: Publish -->

# Breadcrumbs

Breadcrumbs is an Obsidian plugin that lets you add structured hierarchy to your notes, then view/traverse that structure in various ways.

Internally, Breadcrumbs uses a graph to represent this structure (much like the regular Obsidian graph, except now, links have _direction_ to them). You tell Breadcrumbs about the structure of your notes, it builds this directed graph, and then lets you visualise and navigate the graph.

I will break down the process into two pieces:

1. Building the graph
2. Using the graph

## Building the Breadcrumbs graph

### Edge Sources

There are many ways to add directed edges to the graph - what I call "Edge Sources". I'll start with the most basic, manual approach.

#### Frontmatter Links

In the YAML frontmatter of your note, you can add key/value pairs indicating a directed link to another note:

```yaml
---
parent: "[[A]]"
child: ["[[B]]", "[[C]]"]
---
```

This tells Breadcrumbs that the "parent" of the current note is "A", and that its two "children" are "B" and "C".

#### Dataview Links

If you have the [Dataview](https://github.com/blacksmithgu/obsidian-dataview) plugin enabled, you can use their format of metadata as well. In the _content_ of a note:

```
parent:: [[A]]
child:: [[B]], [[C]]
```

This creates the same structure as the [frontmatter links](#frontmatter-links) method above.

#### Tag Notes

_Tag Notes_ allow you to leverage your existing tag structure.

You can turn a note into a tag note by adding the following to your frontmatter:

```yaml
BC-tag-note-tag: "#tag"
BC-tag-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields. This will tell Breadcrumbs to find all notes with the tag `#tag`, and add edges from the current note to those taggs notes using the field you specify.

##### `BC-tag-note-exact`

If you want to only add edges to notes that _exactly_ match the tag, you can add the `BC-tag-note-exact` field to the frontmatter of the tag note.

```yaml
BC-tag-note-exact: true
```

If you don't add this field, Breadcrumbs will add edges to all notes that _contain_ the tag. e.g. `#tag/child` contains `#tag`.

#### List Notes

_List Notes_ allow you to leverage your existing bullet list structure.

You can turn a note into a list note by adding the following to your frontmatter:

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

##### `BC-list-note-exclude`

By default, the list note itself links to the top-level list items. You can exclude this behaviour by adding the `BC-list-note-exclude` field to the frontmatter of the list note.

```yaml
BC-list-note-exclude: true
```

##### `BC-list-note-neighbour-field`

Normally, only the parent/child relationships are added. But you can also add edges based on the _neighbours_ of each list item. This is useful for adding sibling/next/prev relationships.

```yaml
BC-list-note-neighbour-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields.

In the example above, this would add edges from `B` to `D`.

#### Dendron Notes

If you use the [Dendron](https://www.dendron.so/) note-taking system, Breadcrumbs can leverage the structure of your note names.

You can enable denron notes globally in the settings, under Dendron Notes. Flip the toggle on, choose a field to point `up` with, and tell Breadcrumbs which delimiter you use (generally a period, `.`).

For example, if you have the following notes:

-   `A`
-   `A.B`
-   `A.B.C`

Breadcrumbs will add edges from `A` to `A.B`, and from `A.B` to `A.B.C`.

#### Dataview Note

_Dataview Notes_ allow you to use the [Dataview plugin](TODO) query engine to add edges to the graph.

You can turn a note into a dataview note by adding the following to your frontmatter:

```yaml
BC-dataview-note-query: <query>
BC-dataview-note-field: <field>
```

Where `<query>` is a valid Dataview query, and `<field>` is one of your Breadcrumbs fields.

Breadrumbs will ask Dataview for all notes that match the query, and add edges from the current note to those notes using the field you specify.

#### Date Notes

_Date Notes_ allow you to leverage your existing daily notes structure.

You can enable Date Notes globally in the settings, under Date Notes. Flip the toggle on, choose a field to point `up` with, and tell Breadcrumbs what date format you use for your daily notes (e.g. `YYYY-MM-DD`).

For example, if you have the following notes:

-   `2022-01-01`
-   `2022-01-02`
-   `2022-01-03`

Breadcrumbs will add edges from `2022-01-01` to `2022-01-02`, and from `2022-01-02` to `2022-01-03` using the field you specify.

> [!NOTE] Refer to the Luxon documentation for the full list of date formats: https://moment.github.io/luxon/#/parsing?id=table-of-tokens.

#### Folder Notes

_Folder Notes_ allow you to leverage your existing folder structure.

You can turn a note into a folder note by adding the following to your frontmatter:

```yaml
BC-folder-note-field: <field>
```

Where `<field>` is one of your Breadcrumbs fields.

Breadcrumbs will add edges from the current note to all _other_ notes in the same folder, using the field you specify.

##### `BC-folder-note-recurse`

By default, Breadcrumbs will only add edges to notes in the _immediate_ folder. If you want to add edges to notes in _all_ subfolders, you can add the `BC-folder-note-recurse` field to the frontmatter of the folder note.

```yaml
BC-folder-note-recurse: true
```

> [!NOTE] This doesn't _nest_ notes. It effectively flattens your folder structure into one level. So notes in subfolders will still be added as children of the top-level folder note, not as children of the notes in the subfolders.

### Implied Relationships

By adding edges to the Breadcrumbs graph, you've created various explicit relationships: "Note A is the _parent_ of note B", or "note C has 3 _children_, D, E, and F".

But you've also created some _implied_ relationships. For example, if A is the _parent_ of B, then it's _implied_ that B is the **child** of A! This _kind_ of implied relationship is called the "opposite direction" implied relation. There are many other kinds, including "If A and B both have the same _parent_, then they must be **siblings**". Breadcrumbs automatically detects, and adds these implied relationships to the graph. Again, refer to the [wiki page on Implied Relationships](TODO) for more info.

> [!NOTE] Each kind of implied relationship is completely _optional_, and can be toggled in the settings.
> Furthermore, not only can you enable/disable each kind of implied relation, you can change how many _rounds_ to go through to detect them! This is useful to add implied relations _based on other implied relations_. Setting rounds to `0` disables that kind. Setting it to `1` will add that kind of implied relation, only considering _real_ edges. Setting it to `2` will add that kind of implied relation, considering _real_ edges and _previously added_ implied edges. And so on.

## Leveraging the Breadcrumbs graph

### Views

Once you've built the graph, you can view it in various ways.

#### Page View

The Page View appears at the top of the current note. It shows _multiple_ subviews: Trail View, and Previous/Next View.

##### Trail View

The Trail View shows all paths going _up_ from the current note.

It can show the paths in a _grid_ or a _path_ list, but the underlying data is the same.

The following other options can also be configured:

-   Whether to show _all_ paths, or just the _shortest_ path.
-   A maximum _depth_ of the paths.

##### Previous/Next View

The Previous/Next View shows the immediate `previous` and `next` neighbours of the current note.

#### Matrix View

The Matrix View shows up on the side of the editor, and shows the immediate neighbours of the current note (in all 5 directions).

On the right side of each link, you'll see either `(x)` or `(i)`, indicating if that edge is _explicit_ or _implied_. However over the icon to see the _source_ of real edges, and the _kind_ of implied edges (as well as the round they were added in).

#### Tree View

The Tree View shows up on the side of the editor, and shows all path going in a _chosen direction_ from the current note. It is similar to the [Trail View](#trail-view), but you can choose which direction to traverse.

### Commands

Breadcrumbs adds a few commands to the command palette.

#### Create Index from Note

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

#### Write Breadcrumbs to File

This command takes all the _implied_ edges leaving the current note, and makes them explicit by writing them to the file in the format you choose (either as [frontmatter links](#frontmatter-links), or [Dataview links](#dataview-links)).

### Codeblocks

Breadcrumbs adds a new codeblock language, `breadcrumbs`.

Currently, this can be used to render a tree of all paths in a given direction from the current note.

The basic syntax is:

```yaml
type: tree
dir: down
depth: 0-3 # optional
sort: basename desc # optional
```

The above example would render a markdown list of all paths going _down_ from the current note, up to a depth of 3, sorted by the basename of the notes, in descending order.

The full list of options includes:

-   `type`: tree
-   `dir`: Filter edges by direction
-   `fields`: Filter edges by field # optional
-   `title`: Add title to codeblock # optional
-   `depth`: (number:optional)-(number:optional) # optional
-   `flat`: true|false flatten the nested results # optional
-   `dataview-from`: Filter edges by a Dataview FROM query # optional
-   `sort`: (basename|path|field) (asc|desc) sort results # optional
-   `field-prefix`: true|false show the field before each list item # optional

### API

Breadcrumbs exposes a simple API for other plugins to use.

You can access the API off the window object, like so:

```javascript
window.BCAPI;
```

## Feed my coffee problem

If you're so inclined, you can buy me a coffee over here: https://ko-fi.com/skepticmystic :)

## Release

### Prod

### Beta

1. Push all previous changes to the actual project
2. Bump version in `package.json`
3. `npm run version:beta` to update `manifest-beta.json` and `versions.json` accordingly
4. `git tag -a x.x.x-beta -m 'x.x.x-beta'` to tag the build
5. `git push origin x.x.x-beta` to push the release and trigger the action

Or, do steps 3-5 in one go with `npm run release:beta`
