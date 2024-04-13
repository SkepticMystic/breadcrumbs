import { EXPLICIT_EDGE_SOURCES } from "src/const/graph";
import { META_ALIAS } from "src/const/metadata_fields";
import { IMPLIED_RELATIONSHIP_MAX_ROUNDS } from "src/const/settings";
import type BreadcrumbsPlugin from "src/main";
import { BCGraph, type BCNodeAttributes } from "../MyMultiGraph";
import { add_explicit_edges } from "./explicit";
import { get_all_files, type AllFiles } from "./explicit/files";
import { add_implied_edges } from "./implied";
import { _add_implied_edges_custom_transitive } from "./implied/custom/transitive";
import { Timer } from "src/utils/timer";
import { log } from "src/logger";

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

			return { source, ...result };
		}),
	);

	log.debug(timer.elapsedMessage("Adding initial edges"));
	timer.reset();

	for (let round = 1; round <= IMPLIED_RELATIONSHIP_MAX_ROUNDS; round++) {
		Object.entries(add_implied_edges).forEach(([kind, fn]) => {
			fn(graph, plugin, { round });
		});

		plugin.settings.custom_implied_relations.transitive.forEach(
			(transitive) => {
				_add_implied_edges_custom_transitive(
					graph,
					plugin,
					transitive,
					{ round },
				);
			},
		);
	}

	log.debug(timer.elapsedMessage("Adding implied edges"));
	log.debug(timer2.elapsedMessage("Total Graph building"));

	return { graph, explicit_edge_results };
};
