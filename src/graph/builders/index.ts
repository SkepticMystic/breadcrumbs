import { MultiGraph } from "graphology";
import type { BreadcrumbsGraph } from "src/interfaces/graph";
import type BreadcrumbsPlugin from "src/main";
import { add_implied_relationships } from "./implied";
import { add_real_relationships } from "./explicit";
import { get_obsidian_or_dataview_files } from "./explicit/files";

export const rebuild_graph = (plugin: BreadcrumbsPlugin) => {
	// Make a new graph, instead of mutating the old one
	const graph: BreadcrumbsGraph = new MultiGraph();

	// Get once, send to all builders
	const obsidian_or_dataview_files = get_obsidian_or_dataview_files(
		plugin.app,
	);

	// Real relationships
	Object.entries(add_real_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin, obsidian_or_dataview_files);
	});

	// Implied relationships
	Object.entries(add_implied_relationships).forEach(([kind, fn]) => {
		fn(graph, plugin, obsidian_or_dataview_files);
	});

	return graph;
};
