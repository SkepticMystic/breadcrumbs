import { Notice } from "obsidian";
import type BreadcrumbsPlugin from "src/main";
import { active_file_store } from "src/stores/active_file";
import { get } from "svelte/store";

export const jump_to_neighbour = async (
	plugin: BreadcrumbsPlugin,
	options: { fields: string[] },
) => {
	const active_file = get(active_file_store);
	if (!active_file) return;

	const matches = plugin.graph
		.get_outgoing_edges(active_file.path)
		.filter(
			(e) =>
				e.matches_edge_filter(plugin.graph, options.fields) &&
				e.target_path(plugin.graph) !== active_file.path,
		);

	if (!matches.length) {
		new Notice(
			`No matches found with attributes: ${options.fields.join(", ")}`,
		);
		return;
	} else {
		await plugin.app.workspace.openLinkText(
			matches[0].target_path(plugin.graph),
			active_file.path,
		);
	}
};
