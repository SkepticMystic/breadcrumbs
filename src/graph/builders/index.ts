import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import { META_ALIAS } from "src/const/metadata_fields";
import type { BreadcrumbsError, EdgeToAdd } from "src/interfaces/graph";
import { log } from "src/logger";
import type BreadcrumbsPlugin from "src/main";
import { Timer } from "src/utils/timer";
import { BCGraph, type BCNodeAttributes } from "../MyMultiGraph";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
import { _add_implied_edges_transitive } from "./implied/transitive";

const add_initial_nodes = (graph: BCGraph, all_files: AllFiles) => {
	if (all_files.obsidian) {
		all_files.obsidian.forEach(({ file, cache }) => {
			const node_attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = cache?.frontmatter?.aliases as unknown;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_attr.aliases = aliases;
			}

			if (cache?.frontmatter?.[META_ALIAS["ignore-in-edges"]]) {
				node_attr.ignore_in_edges = true;
			}
			if (cache?.frontmatter?.[META_ALIAS["ignore-out-edges"]]) {
				node_attr.ignore_out_edges = true;
			}

			graph.addNode(file.path, node_attr);
		});
	} else {
		all_files.dataview.forEach((page) => {
			const node_attr: BCNodeAttributes = {
				resolved: true,
			};

			const aliases = page.file.aliases.values;
			if (Array.isArray(aliases) && aliases.length > 0) {
				node_attr.aliases = aliases;
			}

			if (page[META_ALIAS["ignore-in-edges"]]) {
				node_attr.ignore_in_edges = true;
			}
			if (page[META_ALIAS["ignore-out-edges"]]) {
				node_attr.ignore_out_edges = true;
			}

			graph.addNode(page.file.path, node_attr);
		});
	}
};

export const rebuild_graph = async (plugin: BreadcrumbsPlugin) => {
	const timer = new Timer();
	const timer2 = new Timer();

	// Make a new graph, instead of mutating the old one
	const graph = new BCGraph();

	// Get once, send to all builders
	const all_files = get_all_files(plugin.app);

	// Add initial nodes
	add_initial_nodes(graph, all_files);

	log.debug(timer.elapsedMessage("Adding initial nodes"));
	timer.reset();

	// Explicit edges
	const explicit_edge_results = await Promise.all(
		EXPLICIT_EDGE_SOURCES.map(async (source) => {
			const result = await add_explicit_edges[source](
				graph,
				plugin,
				all_files,
			);

			return { source, errors: result.errors };
		}),
	);

	log.debug(timer.elapsedMessage("Adding initial edges"));
	timer.reset();

	const max_implied_relationship_rounds = Math.max(
		...plugin.settings.implied_relations.transitive.map(
			(imp) => imp.rounds,
		),
	);

	const implied_edge_results: { transitive: BreadcrumbsError[] } = {
		transitive: [],
	};

	for (let round = 1; round <= max_implied_relationship_rounds; round++) {
		const edges: EdgeToAdd[] = [];

		plugin.settings.implied_relations.transitive.forEach((transitive) => {
			const result = _add_implied_edges_transitive(
				graph,
				plugin,
				transitive,
				{ round },
			);

			edges.push(...result.edges);
			implied_edge_results.transitive.push(...result.errors);
		});

		// PERF: Break if no edges were added. We've reached a fixed point
		if (edges.length === 0) break;
		else {
			edges.forEach((edge) => {
				graph.safe_add_directed_edge(
					edge.source_id,
					edge.target_id,
					edge.attr,
				);
			});
		}
	}

	log.debug(timer.elapsedMessage("Adding implied edges"));
	log.debug(timer2.elapsedMessage("Total Graph building"));

	return { graph, explicit_edge_results };
};
