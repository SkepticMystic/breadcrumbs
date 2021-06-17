# Breadcrumb Trail

This plugin adds a new view to Obsidian, the breadcrumb trail. In this view, you can see a hieracrchy going from your current note, all the way up to your chosen Index/Home note.

![](https://i.imgur.com/sZFeosp.png)

To get this structure, the plugin requires that you use some type of metadata indicating the hierarchy of notes.
For example, you may have a yaml field called `parent`, which links to the current note's "parent" note: `parent: [[Parent Note]]`. (You can also use inline Dataview fields `parent:: [[Parent Note]]`).
Using this structure that you impose, you can use the breadcrumb trail to visualise the path back to your parent note.

To open the view in your sidebar, run the command `Breadcrumbs: Open View` from the command palette.

## Settings

### Index/Home Note

You need to supply the name of your vault's index/home note. If it is called `000 Home.md`, for example, just enter `000 Home` in the setting input field.
If the index is nested inside folders, still just use the name of the note. `Folder/Index.md` → `Index`, for example.

### Parent Field

You also need to give the name of the field you use to indicate parent notes. For example, if you use `parent: [[Note]]`, then enter `parent` into the setting field.
