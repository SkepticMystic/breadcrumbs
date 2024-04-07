import type {
	BCEdge,
	BCEdgeAttributes,
	BCNodeAttributes,
	EdgeAttribute,
} from "src/graph/MyMultiGraph";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { remove_duplicates_by } from "./arrays";
import { remove_nullish_keys, untyped_pick } from "./objects";
import { url_search_params } from "./url";

const MERMAID_DIRECTIONS = ["LR", "RL", "TB", "BT"] as const;
type MermaidDirection = (typeof MERMAID_DIRECTIONS)[number];

const MERMAID_RENDERER = ["dagre", "elk"] as const;
type MermaidRenderer = (typeof MERMAID_RENDERER)[number];

const from_edges = (
	edges: (Pick<
		BCEdge,
		"source_id" | "target_id" | "source_attr" | "target_attr"
	> & {
		attr: Pick<BCEdgeAttributes, "explicit" | "field">;
	})[],
	config?: {
		kind?: "flowchart" | "graph";
		direction?: MermaidDirection;
		show_node_options?: ShowNodeOptions;
		show_attributes?: EdgeAttribute[];
		get_node_label?: (id: string, attr: BCNodeAttributes) => string;
		renderer?: MermaidRenderer;
		click?:
			| { method: "class" }
			| { method: "callback"; callback_name: string }
			| { method: "href"; getter: (target_id: string) => string };
	},
) => {
	const { direction, kind, renderer, get_node_label } = Object.assign(
		{ direction: "LR", kind: "flowchart", renderer: "dagre" },
		remove_nullish_keys(config ?? {}),
	);

	const lines = [
		// TODO: If I add 'graph' as an option, double-check if the below "flowchart" property needs to change accordingly
		`%%{init: {"flowchart": {"defaultRenderer": "${renderer}"}} }%%`,
		`${kind} ${direction}`,
	];

	const node_map = remove_duplicates_by(
		// NOTE: This is _pretty_ inefficient, but necessary.
		// If we just take all unique target_ids, we miss source nodes that don't have any incoming edges.
		edges.flatMap((e) => [
			{ path: e.source_id, attr: e.source_attr },
			{ path: e.target_id, attr: e.target_attr },
		]),
		(n) => n.path,
	).reduce(
		(map, node, i) =>
			map.set(node.path, {
				i,
				attr: node.attr,
				label: get_node_label?.(node.path, node.attr) ?? node.path,
			}),
		new Map<string, { i: number; label: string; attr: BCNodeAttributes }>(),
	);

	// Declare the labeled nodes
	node_map.forEach((node) => {
		lines.push(`\t${node.i}("${node.label}")`);
	});

	lines.push("");

	// Add the edges
	edges.forEach((e) => {
		const [source, arrow, attrs, target] = [
			// No need to label the nodes again
			node_map.get(e.source_id)?.i,

			e.attr.explicit ? "-->" : "-.->",

			config?.show_attributes?.length
				? `|"${url_search_params(untyped_pick(e.attr, config.show_attributes), { trim_lone_param: true })}"|`
				: "",

			node_map.get(e.target_id)?.i,
		];

		lines.push(`\t${source} ${arrow}${attrs} ${target}`);
	});

	lines.push("");

	switch (config?.click?.method) {
		case "class": {
			const nodes = [...node_map.values()];

			if (nodes.length) {
				lines.push(`\tclass ${nodes.map((n) => n.i)} internal-link`);
			}

			const unresolved_nodes = nodes.filter((n) => !n.attr.resolved);
			if (unresolved_nodes.length) {
				lines.push(
					`\tclass ${unresolved_nodes.map((n) => n.i)} is-unresolved`,
				);
			}

			break;
		}

		case "href": {
			node_map.forEach((node, path) => {
				lines.push(
					`\tclick ${node.i} "${(<Extract<(typeof config)["click"], { method: "href" }>>config.click)?.getter(path)}"`,
				);
			});

			break;
		}

		case "callback": {
			node_map.forEach((node) => {
				lines.push(
					`\tclick ${node.i} call ${(<Extract<(typeof config)["click"], { method: "callback" }>>config.click)?.callback_name}()`,
				);
			});

			break;
		}
	}

	return lines.join("\n");
};

export const Mermaid = {
	from_edges,
	RENDERERS: MERMAID_RENDERER,
	DIRECTIONS: MERMAID_DIRECTIONS,
};

export type Mermaid = {
	Renderer: MermaidRenderer;
	Direction: MermaidDirection;
};
