import { readFile } from "fs/promises";
import { DEFAULT_SETTINGS } from "src/const/settings";
import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { migrate_old_settings } from "src/settings/migration";
import { deep_merge_objects } from "src/utils/objects";
import { describe, expect, test } from "vitest";

describe("migration", () => {
	test("v4-with-directions", async () => {
		const old = deep_merge_objects(
			JSON.parse(
				await readFile(
					"tests/__mocks__/settings/v4-with-directions.json",
					"utf-8",
				),
			),
			DEFAULT_SETTINGS,
		);

		console.log("old", JSON.stringify(old, null, 2));

		const migrated = migrate_old_settings(old);

		expect(migrated).toStrictEqual({
			edge_fields: [
				{ label: "up" },
				{ label: "down" },
				{ label: "same" },
				{ label: "next" },
				{ label: "prev" },
				{ label: "parent" },
				{ label: "sibling" },
				{ label: "child" },
				{ label: "right" },
				{ label: "left" },
			],
			edge_field_groups: [
				{
					label: "ups",
					fields: ["up", "parent"],
				},
				{
					label: "downs",
					fields: ["down", "child"],
				},
				{
					label: "sames",
					fields: ["same", "sibling"],
				},
				{
					label: "nexts",
					fields: ["next", "right"],
				},
				{
					label: "prevs",
					fields: ["prev", "left"],
				},
				{
					label: "Hierarchy 1",
					fields: ["up", "same", "down", "next", "prev"],
				},
				{
					label: "Hierarchy 2",
					fields: ["parent", "sibling", "child", "right", "left"],
				},
			],
			implied_relations: {
				transitive: [
					{
						rounds: 1,
						name: "Opposite Direction: up/down",
						close_field: "down",
						chain: [{ field: "up" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: down/up",
						close_field: "up",
						chain: [{ field: "down" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: same/same",
						close_field: "same",
						chain: [{ field: "same" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: next/prev",
						close_field: "prev",
						chain: [{ field: "next" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: prev/next",
						close_field: "next",
						chain: [{ field: "prev" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: parent/child",
						close_field: "child",
						chain: [{ field: "parent" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: child/parent",
						close_field: "parent",
						chain: [{ field: "child" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: sibling/sibling",
						close_field: "sibling",
						chain: [{ field: "sibling" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: left/right",
						close_field: "right",
						chain: [{ field: "left" }],
						close_reversed: true,
					},
					{
						rounds: 1,
						name: "Opposite Direction: right/left",
						close_field: "left",
						chain: [{ field: "right" }],
						close_reversed: true,
					},
					// custom_implied_relations.transitive
					{
						chain: [{ field: "up" }, { field: "same" }],
						close_field: "up",
						close_reversed: false,
						name: "[up, same] -> up",
						rounds: 1,
					},
				],
			},

			explicit_edge_sources: {
				list_note: {
					default_neighbour_field: "",
				},
				typed_link: {},
				tag_note: {
					default_field: "up",
				},
				regex_note: {
					default_field: "up",
				},
				dendron_note: {
					enabled: true,
					delimiter: ".",
					default_field: "up",
					display_trimmed: true,
				},
				date_note: {
					enabled: true,
					date_format: "yyyy-MM-dd 'DN'",
					default_field: "next",
					stretch_to_existing: false,
				},
				johnny_decimal_note: {
					enabled: false,
					delimiter: ".",
					default_field: "up",
				},
			},
			views: {
				page: {
					all: {
						sticky: false,
						readable_line_width: true,
					},
					trail: {
						enabled: true,
						format: "grid",
						selection: "all",
						default_depth: 999,
						no_path_message: "",
						merge_fields: false,
						show_controls: false,
						field_group_labels: ["ups"],
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
					},
					prev_next: {
						enabled: true,
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
						field_group_labels: {
							prev: ["prevs"],
							next: ["nexts"],
						},
					},
				},
				side: {
					matrix: {
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						show_attributes: [],
						field_group_labels: [
							"ups",
							"downs",
							"sames",
							"nexts",
							"prevs",
						],
						show_node_options: {
							ext: true,
							folder: false,
							alias: false,
						},
					},
					tree: {
						collapse: true,
						merge_fields: false,
						show_attributes: [],
						field_group_labels: ["downs"],
						edge_sort_id: {
							field: "basename",
							order: 1,
						},
						show_node_options: {
							ext: false,
							folder: false,
							alias: false,
						},
					},
				},
				codeblocks: {
					show_node_options: {
						ext: false,
						folder: false,
						alias: false,
					},
				},
			},
			commands: {
				rebuild_graph: {
					notify: true,
					trigger: {
						note_save: false,
						layout_change: false,
					},
				},
				list_index: {
					default_options: {
						// TODO: Not sure why this dir field isn't getting deleted...
						// @ts-ignore
						dir: "down",
						indent: "\\t",
						hierarchy_i: -1,
						link_kind: "wiki",
						edge_sort_id: {
							order: 1,
							field: "basename",
						},
						show_node_options: {
							ext: false,
							alias: true,
							folder: false,
						},
						fields: [],
					},
				},
				freeze_implied_edges: {
					default_options: {
						destination: "frontmatter",
					},
				},
				thread: {
					default_options: {
						destination: "frontmatter",
						target_path_template:
							"{{source.folder}}/{{attr.field}} {{source.basename}}",
					},
				},
			},
			suggestors: {
				edge_field: {
					enabled: true,
					trigger: ".",
				},
			},
			debug: {
				level: "DEBUG",
			},
		} satisfies BreadcrumbsSettings);
	});
});
