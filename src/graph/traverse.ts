import type { ShowNodeOptions } from "src/interfaces/settings";
import { Link } from "src/utils/links";
import type { BCEdge, BCGraph } from "./MyMultiGraph";
import { objectify_edge_mapper } from "./objectify_mappers";
import { is_self_loop, stringify_node } from "./utils";

type StackItem = {
	path: BCEdge[];
};

type Traverser = (
	graph: BCGraph,
	start_node: string,
	callback: (
		current_stack_item: StackItem,
		filtered_out_edges: BCEdge[],
	) => void,
	edge_filter?: (edge: BCEdge) => boolean,
) => void;

const depth_first: Traverser = (graph, start_node, callback, edge_filter?) => {
	// edge_ids visited so far
	const visited = new Set<string>();

	// Initial stack contains the filtered_out_edges of the start_node
	const stack: StackItem[] = graph
		.mapOutEdges(
			start_node,
			objectify_edge_mapper((e) => e),
		)
		.filter((e) => !is_self_loop(e) && (!edge_filter || edge_filter(e)))
		.map((edge) => ({
			edge,
			// NOTE: It's a little redundant to add the start_edge,
			//    but it makes the code simpler (e.g. GridView)
			path: [edge],
		}));

	while (stack.length > 0) {
		const stack_item = stack.pop()!;
		const current_edge = stack_item.path.last()!;

		if (visited.has(current_edge.id)) continue;
		else visited.add(current_edge.id);

		const filtered_out_edges = graph
			.mapOutEdges(
				current_edge.target_id,
				objectify_edge_mapper((e) => e),
			)
			.filter(
				(e) => !is_self_loop(e) && (!edge_filter || edge_filter(e)),
			);

		// Act on the current stack item
		callback(stack_item, filtered_out_edges);

		// And push the next edges
		filtered_out_edges.forEach((out_edge) => {
			// But push the next edge
			stack.push({ path: stack_item.path.concat(out_edge) });
		});
	}
};

const all_paths = (
	traverser: Traverser,
	graph: BCGraph,
	start_node: string,
	edge_filter?: (edge: BCEdge) => boolean,
) => {
	const paths: BCEdge[][] = [];

	traverser(
		graph,
		start_node,
		({ path }, filtered_out_edges) => {
			if (!filtered_out_edges.length) {
				paths.push(path);
			}
		},
		edge_filter,
	);

	return paths;
};

const paths_to_index_list = (
	paths: BCEdge[][],
	{
		indent,
		link_kind,
		show_node_options,
	}: {
		indent: string;
		link_kind: "none" | "wiki" | "markdown";
		show_node_options: ShowNodeOptions;
	},
) => {
	let index = "";
	const visited = new Set<string>();

	paths.forEach((path) => {
		path.forEach((edge, depth) => {
			const key = `${depth}-${edge.target_id}`;

			if (!visited.has(key)) {
				visited.add(key);

				const display = stringify_node(
					edge.target_id,
					edge.target_attr,
					{ show_node_options },
				);
				const link = Link.ify(edge.target_id, display, {
					link_kind,
				});

				index += indent.repeat(depth) + `- ${link}\n`;
			}
		});
	});

	return index;
};

export const traverse = {
	depth_first,
	all_paths,
	paths_to_index_list,
};
