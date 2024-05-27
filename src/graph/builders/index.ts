import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import { META_ALIAS } from "src/const/metadata_fields";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Timer } from "src/utils/timer";
// import { type BCNode, type BCNodeAttributes } from "../MyMultiGraph";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
// import { _add_implied_edges_transitive } from "./implied/transitive";
import {
	GraphConstructionEdgeData,
	GraphConstructionNodeData,
	TransitiveGraphRule,
} from "wasm/pkg/breadcrumbs_graph_wasm";

const get_initial_nodes = (all_files: AllFiles) => {
	const nodes: GraphConstructionNodeData[] = [];

	if (all_files.obsidian) {
		all_files.obsidian.forEach(({ file, cache }) => {
			let node_aliases = [];
			let ignore_in_edges = false;
			let ignore_out_edges = false;

			const aliases = cache?.frontmatter?.aliases as unknown;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_aliases = aliases;
			}

			if (cache?.frontmatter?.[META_ALIAS["ignore-in-edges"]]) {
				ignore_in_edges = true;
			}
			if (cache?.frontmatter?.[META_ALIAS["ignore-out-edges"]]) {
				ignore_out_edges = true;
			}

			nodes.push(
				new GraphConstructionNodeData(
					file.path,
					node_aliases,
					true,
					ignore_in_edges,
					ignore_out_edges,
				),
			);
		});
	} else {
		all_files.dataview.forEach((page) => {
			let node_aliases = [];
			let ignore_in_edges = false;
			let ignore_out_edges = false;

			const aliases = page.file.aliases.values;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_aliases = aliases;
			}

			if (page[META_ALIAS["ignore-in-edges"]]) {
				ignore_in_edges = true;
			}
			if (page[META_ALIAS["ignore-out-edges"]]) {
				ignore_out_edges = true;
			}

			nodes.push(
				new GraphConstructionNodeData(
					page.file.path,
					aliases,
					true,
					ignore_in_edges,
					ignore_out_edges,
				),
			);
		});
	}

	return nodes;
};

export const rebuild_graph = async (plugin: BreadcrumbsPlugin) => {
	const timer = new Timer();
	const timer2 = new Timer();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	const nodes = get_initial_nodes(all_files);

	log.debug(timer.elapsedMessage("get_initial_nodes"));
	timer.reset();

	// Explicit edges
	const explicit_edge_results = await Promise.all(
		EXPLICIT_EDGE_SOURCES.map(async (source) => {
			const results = await add_explicit_edges[source](plugin, all_files);

			return { source, results };
		}),
	);

	const edges: GraphConstructionEdgeData[] = [];
	for (const { results } of explicit_edge_results) {
		nodes.push(...results.nodes);
		edges.push(...results.edges);
	}

	log.debug(timer.elapsedMessage("Collecting edges and nodes"));
	timer.reset();

	const transitive_rules = plugin.settings.implied_relations.transitive.map((rule) => {
		return new TransitiveGraphRule(
			rule.name,
			rule.chain.map((attr) => attr.field!),
			rule.close_field,
			rule.rounds,
			false,
			rule.close_reversed
		)
	});

	plugin.graph.set_transitive_rules(
		transitive_rules
	);

	plugin.graph.build_graph(nodes, edges);
	log.debug(timer.elapsedMessage("WASM call"));
	log.debug(timer2.elapsedMessage("Total"));

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
