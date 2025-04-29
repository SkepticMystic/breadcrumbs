import { ListIndex } from "src/commands/list_index";
import { Traverse } from "src/graph/traverse";
import { active_file_store } from "src/stores/active_file";
import { get } from "svelte/store";
import type BCPlugin from "../main";

export class BCAPI {
	plugin: BCPlugin;

	public constructor(plugin: BCPlugin) {
		this.plugin = plugin;
	}

	get fields() {
		return this.plugin.settings.edge_fields;
	}

	get field_groups() {
		return this.plugin.settings.edge_field_groups;
	}

	public refresh = () => this.plugin.refresh();
	/** @deprecated Use refresh */
	public refreshIndex = this.refresh;

	/** @deprecated Filter edges of plugin.graph instead */
	public getSubForFields = (fields: string[], g = this.plugin.graph) => {};

	public build_tree = Traverse.build_tree;
	public breadth_first_traversal = Traverse.breadth_first;

	public create_list_index = (
		start_node = get(active_file_store)?.path,
		options?: ListIndex.Options,
	) => {
		if (!start_node) throw new Error("No active file");

		return ListIndex.build(
			this.plugin.graph,
			start_node,
			Object.assign({ ...ListIndex.DEFAULT_OPTIONS }, options),
		);
	};

	// BREAKING
	/** @deprecated Use flatten_all_paths and flat_paths_to_index_list instead. Or, create_list_index */
	public createIndex = () => {};

	public get_neighbours = (source = get(active_file_store)?.path) =>
		source && this.plugin.graph.hasNode(source)
			? this.plugin.graph.get_out_edges(source)
			: [];

	/** @deprecated Use get_neighbours instead */
	public getMatrixNeighbours = this.get_neighbours;
}
