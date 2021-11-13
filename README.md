# Breadcrumb Trail

This plugin adds multiple new views to Obsidian.

### The [wiki](https://github.com/SkepticMystic/breadcrumbs/wiki) has more in-depth info on the plugin than the outdated readme.

You can find the changelog [here](https://github.com/SkepticMystic/breadcrumbs/blob/master/CHANGELOG.md).


## Basics

Breadcrumbs plugin lets you add hierarchical metadata to your notes and then leverage that structure.

Using up/parent (↑), same/sibling (→), and down/child (↓) relationships, you can add directional structure to your notes.

To get this structure, the plugin requires that you use some type of metadata indicating the hierarchy of notes:
1. Frontmatter field. This is a field in the yaml format at the very top of your note. For example the `me.md` file could have the following frontmatter:
```
---
parent: [[dad]]
parent: [[mom]]
sibling: [[sister Lara]]
child: [[child Andre]]
---
```
2. Inline (must use the [Dataview](https://github.com/blacksmithgu/obsidian-dataview#data) plugin), among the normal text like this: 
```
Punching is a very effective MMA technique (sibling:: [ [[Kicking]], [[Grappling]] ], parent:: [[Striking]])
```
(notice the double colon for the Dataview inline metadata).


## Matrix/List view

This view shows the current note's parents, siblings, and children in either of the following styles:

![image](https://user-images.githubusercontent.com/70717676/123402846-75a67f80-d5a8-11eb-8230-75c37441f122.png)

![image](https://user-images.githubusercontent.com/70717676/123402852-77704300-d5a8-11eb-8f56-c4eb3ca23e02.png)

To open the view in your sidebar, run the command `Breadcrumbs: Open View` from the Command Palette (`Ctrl+P`).


## Breadcrumbs Trail view

This view shows a trail of notes from the top of your vault down to your current note:

![image](https://user-images.githubusercontent.com/70717676/123403044-a8507800-d5a8-11eb-9669-33148021b6fa.png)

Using this structure that you impose, you can use the breadcrumb trail to visualise the path back to your parent note.


## Video overview of the basic idea and functionality
[![Breadcrumbs Plugin - Obsidian Community Showcase](https://img.youtube.com/vi/DXXB7fHcArg/0.jpg)](https://www.youtube.com/watch?v=DXXB7fHcArg)


## Feed my coffee problem

If you're so inclined, you can buy me a coffee over here: https://ko-fi.com/skepticmystic :)
