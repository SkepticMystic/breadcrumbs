import { Notice } from "obsidian";
import type { BCEdgeAttributes } from "src/graph/MyMultiGraph";
import { has_edge_attrs } from "src/graph/utils";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";
import { get } from "svelte/store";

export const jump_to_neighbour = async (
	plugin: BreadcrumbsPlugin,
	options: { attr: Partial<BCEdgeAttributes> },
) => {
	const active_file = get(active_file_store);
	if (!active_file) return;

	const matches = plugin.graph
		.get_out_edges(active_file.path)
		.filter(
			(e) =>
				has_edge_attrs(e, options.attr) &&
				e.target_id !== active_file.path,
		);

	if (!matches.length) {
		new Notice("No matches found");
		return;
	} else {
		await plugin.app.workspace.openLinkText(
			matches[0].target_id,
			active_file.path,
		);
	}
};
