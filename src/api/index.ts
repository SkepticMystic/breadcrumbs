import { ListIndex } from "src/commands/list_index";
import {
	ARROW_DIRECTIONS,
	DIRECTIONS,
	type Direction,
} from "src/const/hierarchies";
import type { BCEdgeAttributes } from "src/graph/MyMultiGraph";
import { objectify_edge_mapper } from "src/graph/objectify_mappers";
import { Traverse } from "src/graph/traverse";
import { active_file_store } from "src/stores/active_file";
import {
	get_field_hierarchy,
	get_opposite_direction,
} from "src/utils/hierarchies";
import { get } from "svelte/store";
import type BCPlugin from "../main";
import type { Hierarchy } from "src/interfaces/hierarchies";

export class BCAPI {
	plugin: BCPlugin;

	public constructor(plugin: BCPlugin) {
		this.plugin = plugin;
	}

	public DIRECTIONS = DIRECTIONS;
	public ARROW_DIRECTIONS = ARROW_DIRECTIONS;

	// TODO
	public buildObsGraph = () => {
		throw new Error("Not implemented");
	};

	public refresh = () => this.plugin.refresh();
	/** @deprecated Use refresh */
	public refreshIndex = this.refresh;

	/** @deprecated Filter edges of plugin.graph instead */
	public getSubInDirs = (dirs: Direction[], g = this.plugin.graph) => {};

	/** @deprecated Filter edges of plugin.graph instead */
	public getSubForFields = (fields: string[], g = this.plugin.graph) => {};

	public all_paths_depth_first = (
		start_node = get(active_file_store)?.path,
		graph = this.plugin.graph,
		options?: Partial<BCEdgeAttributes>,
	) => {
		if (!start_node) throw new Error("No active file");

		return Traverse.all_paths(
			"depth_first",
			graph,
			start_node,
			(e) =>
				(!options?.dir || e.attr.dir === options.dir) &&
				(!options?.field || e.attr.field === options.field) &&
				(options?.hierarchy_i === undefined ||
					e.attr.hierarchy_i === options.hierarchy_i) &&
				(options?.explicit === undefined ||
					e.attr.explicit === options.explicit),
		);
	};

	/** @deprecated Use all_paths_depth_first instead */
	public dfsAllPaths = this.all_paths_depth_first;

	public nest_all_paths = Traverse.nest_all_paths;
	public flatten_all_paths = Traverse.flatten_all_paths;
	public flat_paths_to_index_list = Traverse.flat_paths_to_index_list;

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
		this.plugin.graph.hasNode(source)
			? this.plugin.graph.mapOutEdges(
					source,
					objectify_edge_mapper((e) => e),
				)
			: [];

	/** @deprecated Use get_neighbours instead */
	public getMatrixNeighbours = this.get_neighbours;

	public get_opposite_direction = get_opposite_direction;
	/** @deprecated Use get_opposite_direction */
	public getOppDir = this.get_opposite_direction;

	public get_opposite_fields = (field: string) => {
		const field_hierarchy = get_field_hierarchy(
			this.plugin.settings.hierarchies,
			field,
		);
		if (!field_hierarchy) {
			console.error(
				"BCAPI.getOppFields: field_hierarchy not found",
				field,
			);
			return [];
		}

		return this.plugin.settings.hierarchies[field_hierarchy.hierarchy_i]
			.dirs[get_opposite_direction(field_hierarchy.dir)];
	};

	/** @deprecated Use get_opposite_fields */
	public getOppFields = this.get_opposite_fields;

	public get_field_hierarchy = (field: string) =>
		get_field_hierarchy(this.plugin.settings.hierarchies, field);

	/** @deprecated Use get_field_hierarchy */
	public getFieldInfo = this.get_field_hierarchy;

	/** @deprecated Filter plugin.settings.hierarchies instead */
	public getFields = (dir: Direction) => {};

	/** @deprecated Map plugin.settings.hierachies instead */
	public iterateHiers(
		cb: (hier: Hierarchy, dir: Direction, field: string) => void,
	) {}
}