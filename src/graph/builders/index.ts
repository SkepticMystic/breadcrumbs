import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import { META_ALIAS } from "src/const/metadata_fields";
import type { BreadcrumbsError, EdgeToAdd } from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Timer } from "src/utils/timer";
import { BCGraph, type BCNode, type BCNodeAttributes } from "../MyMultiGraph";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
// import { _add_implied_edges_transitive } from "./implied/transitive";
import { GraphConstructionEdgeData, GraphConstructionNodeData } from "wasm/pkg/breadcrumbs_graph_wasm";

const get_initial_nodes = (all_files: AllFiles) => {
	const nodes: GraphConstructionNodeData[] = []

	if (all_files.obsidian) {
		all_files.obsidian.forEach(({ file, cache }) => {
			const attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = cache?.frontmatter?.aliases as unknown;
			if (Array.isArray(aliases) && aliases.length > 0) {
				attr.aliases = aliases;
			}

			if (cache?.frontmatter?.[META_ALIAS["ignore-in-edges"]]) {
				attr.ignore_in_edges = true;
			}
			if (cache?.frontmatter?.[META_ALIAS["ignore-out-edges"]]) {
				attr.ignore_out_edges = true;
			}

			nodes.push(new GraphConstructionNodeData(file.path, attr.aliases ?? [], true, attr.ignore_in_edges ?? false, attr.ignore_out_edges ?? false))
		});
	} else {
		all_files.dataview.forEach((page) => {
			const attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = page.file.aliases.values;
			if (Array.isArray(aliases) && aliases.length > 0) {
				attr.aliases = aliases;
			}

			if (page[META_ALIAS["ignore-in-edges"]]) {
				attr.ignore_in_edges = true;
			}
			if (page[META_ALIAS["ignore-out-edges"]]) {
				attr.ignore_out_edges = true;
			}

			nodes.push(new GraphConstructionNodeData(page.file.path, attr.aliases ?? [], true, attr.ignore_in_edges ?? false, attr.ignore_out_edges ?? false))
		});
	}

	return nodes
};

// TODO: these functions should not be needed. The explicit edge builders should return the WASM data directly
const construction_data_from_node = (node: BCNode): GraphConstructionNodeData => {
	const attr = node.attr;
	return new GraphConstructionNodeData(node.id, attr.aliases ?? [], attr.resolved, attr.ignore_in_edges ?? false, attr.ignore_out_edges ?? false);
}

// TODO: these functions should not be needed. The explicit edge builders should return the WASM data directly
const construction_data_from_edge = (edge: EdgeToAdd): GraphConstructionEdgeData => {
	return new GraphConstructionEdgeData(edge.source_id, edge.target_id, edge.attr.field);
}

export const rebuild_graph = async (plugin: BreadcrumbsPlugin) => {
	const timer = new Timer();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	const nodes = get_initial_nodes(all_files);

	log.debug(timer.elapsedMessage("get_initial_nodes"));
	timer.reset();

	// Explicit edges
	const explicit_edge_results = await Promise.all(
		EXPLICIT_EDGE_SOURCES.map(async (source) => {
			const results = await add_explicit_edges[source](
				plugin,
				all_files,
			);

			return { source, results };
		}),
	);

	const edges: GraphConstructionEdgeData[] = [];

	for (const { source, results } of explicit_edge_results) {
		nodes.push(...results.nodes.map(construction_data_from_node));
		edges.push(...results.edges.map(construction_data_from_edge));
	}

	log.debug(timer.elapsedMessage("Collecting edges and nodes"));

	// TODO
	plugin.graph.build_graph(nodes, edges);

	// log.debug(timer.elapsedMessage("Adding initial edges"));
	// timer.reset();

	// const max_implied_relationship_rounds = Math.max(
	// 	...plugin.settings.implied_relations.transitive.map(
	// 		(imp) => imp.rounds,
	// 	),
	// );

	// const implied_edge_results: { transitive: BreadcrumbsError[] } = {
	// 	transitive: [],
	// };

	// // Track which fields get added, clearing each round
	// // This lets us check if a transitive rule even needs to be considered
	// const added_fields = new Set<string>();

	// // Add all the fields from the initial edges
	// for (const edge of graph.edgeEntries()) {
	// 	added_fields.add(edge.attributes.field);
	// }

	// for (let round = 1; round <= max_implied_relationship_rounds; round++) {
	// 	const edges: EdgeToAdd[] = [];

	// 	plugin.settings.implied_relations.transitive.forEach((rule) => {
	// 		// If none of the fields added in the previous round are in this rule, skip it
	// 		if (!rule.chain.some((attr) => added_fields.has(attr.field!))) {
	// 			return;
	// 		}

	// 		const result = _add_implied_edges_transitive(
	// 			graph,
	// 			plugin,
	// 			rule,
	// 			round,
	// 		);

	// 		edges.push(...result.edges);
	// 		implied_edge_results.transitive.push(...result.errors);
	// 	});

	// 	// We don't need the previous fields anymore
	// 	added_fields.clear();

	// 	// PERF: Break if no edges were added. We've reached a fixed point
	// 	if (edges.length === 0) break;
	// 	else {
	// 		edges.forEach((edge) => {
	// 			graph.safe_add_directed_edge(
	// 				edge.source_id,
	// 				edge.target_id,
	// 				edge.attr,
	// 			) && added_fields.add(edge.attr.field);
	// 		});
	// 	}
	// }

	// log.debug(timer.elapsedMessage("Adding implied edges"));
	// log.debug(timer2.elapsedMessage("Total Graph building"));

	return { explicit_edge_results };
};
