# Breadcrumb Trail

This plugin adds multiple new views to Obsidian.

### The [wiki](https://github.com/SkepticMystic/breadcrumbs/wiki) has way more in-depth info on the plugin than this current outdated and limited readme file.

You can find the changelog [here](https://github.com/SkepticMystic/breadcrumbs/blob/master/CHANGELOG.md).


## Basics

Breadcrumbs plugin lets you add hierarchical metadata to your notes and then leverage that structure.

Use
- up/parent (↑)
- unordered same/sibling (↔)
- directional/orderly sibling (previous (←)/next (→))
- down/child (↓)

relationships in your notes. You can name those relationship types anyway you want that best fits your purpose (up/parent/top/high/ancestor/founder/source/foo).

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
Punching is a very effective MMA technique (sibling:: [ [[Kicking]], [[Elbowing]], [[Kneeing]] ], parent:: [[Striking]])
```
(notice the double colon for the Dataview inline metadata).

3. You can combine both approaches as well. For example your `Course. 101 - Basics of Financing.md` file might have the following content:
```
---
up: [[Year 2022 courses]]
same: [[Course. 103 - Basics of Programming]]
---
# Course. 101 - Basics of Financing
This course teaches the basics of financing. It contains several sub-areas:
- down:: [[101 - Basics of Financing. Lectures]]
- down:: [[101 - Basics of Financing. Group work]]
- down:: [[101 - Basics of Financing. Essay]]

Next:: [[Course. 201 - Advanced Financing]]
```


## Matrix/List view

This view shows the current note's parents, siblings, and children in either of the following styles:

![image](https://user-images.githubusercontent.com/70717676/123402846-75a67f80-d5a8-11eb-8230-75c37441f122.png)

![image](https://user-images.githubusercontent.com/70717676/123402852-77704300-d5a8-11eb-8f56-c4eb3ca23e02.png)

To open the view in your sidebar, run the command `Breadcrumbs: Open View` from the Command Palette (`Ctrl+P`).


## Breadcrumbs Trail view

This view shows a trail of notes from the top of your vault down to your current note:

![image](https://user-images.githubusercontent.com/70717676/123403044-a8507800-d5a8-11eb-9669-33148021b6fa.png)

Using this structure that you impose, you can use the breadcrumb trail to visualise the path back to your parent note.


## Videos

### Latest tutorial as of 2022-01-02

[![image|100](https://user-images.githubusercontent.com/70717676/147882843-bbb28103-a3a4-4dfd-8077-d8a1524f86a3.png)](https://www.youtube.com/watch?v=N4QmszBRu9I&ab_channel=ObsidianCommunityTalks)

### Video going in-depth into Threading feature, by @blizzingout

http://youtube.com/watch?v=AS5Mv6YNmsQ

### First video about Breadcrumbs

[![image](https://user-images.githubusercontent.com/70717676/147882889-cc38e14a-555a-433e-b500-71f159d49354.png)](https://www.youtube.com/watch?v=DXXB7fHcArg)


## Feed my coffee problem

If you're so inclined, you can buy me a coffee over here: https://ko-fi.com/skepticmystic :)
