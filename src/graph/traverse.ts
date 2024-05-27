import { EdgeSorter, NoteGraph, sort_traversal_data, type RecTraversalData } from "wasm/pkg/breadcrumbs_graph_wasm";
// import { BCGraph, type BCEdge, type BCEdgeAttributes } from "./MyMultiGraph";
// import { type EdgeSorter } from "./utils";

// export type TraversalStackItem = {
// 	edge: BCEdge;
// 	depth: number;
// };

// const breadth_first = (
// 	graph: BCGraph,
// 	start_node: string,
// 	callback: (item: TraversalStackItem) => void,
// 	edge_filter?: (item: TraversalStackItem) => boolean,
// ) => {
// 	const visited_edge_ids = new Set<string>();

// 	// Initial stack contains the filtered_out_edges of the start_node
// 	const stack: TraversalStackItem[] = graph
// 		.get_out_edges(start_node)
// 		.map((edge) => ({ edge, depth: 0 }))
// 		.filter((item) => !edge_filter || edge_filter(item));

// 	while (stack.length > 0) {
// 		const item = stack.shift()!;

// 		if (visited_edge_ids.has(item.edge.id)) continue;
// 		else visited_edge_ids.add(item.edge.id);

// 		callback(item);

// 		graph
// 			.get_out_edges(item.edge.target_id)
// 			.map((out_edge) => ({ edge: out_edge, depth: item.depth + 1 }))
// 			.filter((out_item) => !edge_filter || edge_filter(out_item))
// 			.forEach((item) => stack.push(item));
// 	}
// };

// const gather_items = (
// 	graph: BCGraph,
// 	start_node: string,
// 	edge_filter?: (item: TraversalStackItem) => boolean,
// ) => {
// 	const items: TraversalStackItem[] = [];

// 	breadth_first(graph, start_node, (item) => items.push(item), edge_filter);

// 	return items;
// };

// export type EdgeTree = {
// 	edge: BCEdge;
// 	depth: number;
// 	children: EdgeTree[];
// };

// const MAX_DEPTH = 100;

// const build_tree = (
// 	graph: BCGraph,
// 	source_id: string,
// 	{ depth, max_depth }: { depth?: number; max_depth?: number },
// 	edge_filter?: (edge: BCEdge, depth: number) => boolean,
// 	visited_edge_ids = new Set<string>(),
// ) => {
// 	depth ??= 0;
// 	max_depth ??= MAX_DEPTH;

// 	const tree: EdgeTree[] = [];

// 	if (depth <= max_depth) {
// 		for (const edge of graph
// 			.get_out_edges(source_id)
// 			.filter((edge) => !edge_filter || edge_filter(edge, depth!))) {
// 			if (visited_edge_ids.has(edge.id)) continue;
// 			else visited_edge_ids.add(edge.id);

// 			const children = build_tree(
// 				graph,
// 				edge.target_id,
// 				{ depth: depth + 1, max_depth },
// 				edge_filter,
// 				visited_edge_ids,
// 			);

// 			tree.push({ edge, depth, children });
// 		}
// 	}

// 	return tree;
// };

// const flatten_tree = (tree: EdgeTree[]) => {
// 	const traversal_items: TraversalStackItem[] = [];

// 	tree.forEach(({ edge, depth, children }) => {
// 		traversal_items.push({ edge, depth });
// 		traversal_items.push(...flatten_tree(children));
// 	});

// 	return traversal_items;
// };

// const tree_to_all_paths = (tree: EdgeTree[]): BCEdge[][] => {
// 	const paths: BCEdge[][] = [];

// 	tree.forEach(({ edge, children }) => {
// 		if (children.length === 0) {
// 			paths.push([edge]);
// 		} else {
// 			const child_paths = tree_to_all_paths(children);

// 			child_paths.forEach((path) => paths.push([edge, ...path]));
// 		}
// 	});

// 	return paths;
// };

/** 
 * Sort a nested list of paths on a per-depth level.
 * This will mutate the individual traversal data, but it will return a new array.
 */
const sort_edge_tree = (graph: NoteGraph, tree: RecTraversalData[], sorter: EdgeSorter) => {
	tree.forEach((nested_path) => {
		nested_path.rec_sort_children(graph, sorter);
	});

	return sort_traversal_data(graph, tree, sorter);
};

// // TODO: Not sure how, but we need to filter out paths that included the same target_id twice.
// // e.g. me -> spouse -> sibling-in-law under the rule [spouse, sibling, sibling] -> sibling-in-law
// // Yields me -->|sibling-in-law| spouse
// /** Find all paths of nodes connected by edges that pair-wise match the attrs in the chain */
// const get_transitive_chain_target_ids = (
// 	graph: BCGraph,
// 	start_node: string,
// 	chain: Partial<BCEdgeAttributes>[],
// 	edge_filter?: (item: TraversalStackItem) => boolean,
// ) => {
// 	const target_ids: string[] = [];

// 	Traverse.breadth_first(
// 		graph,
// 		start_node,
// 		(item) => {
// 			// Only push the target_id if we're at the end of the chain
// 			if (item.depth === chain.length - 1) {
// 				target_ids.push(item.edge.target_id);
// 			}
// 		},
// 		(item) =>
// 			// Ensures we don't go over the chain length ("max_depth")
// 			chain[item.depth] &&
// 			// Check if the edge has the attrs we're looking for
// 			has_edge_attrs(item.edge, chain[item.depth]) &&
// 			(!edge_filter || edge_filter(item)),
// 	);

// 	return target_ids;
// };

export const Traverse = {
// 	breadth_first,
// 	gather_items,
// 	build_tree,
// 	flatten_tree,
// 	tree_to_all_paths,

	sort_edge_tree,

// 	get_transitive_chain_target_ids,
};
