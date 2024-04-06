import type { BCEdge, BCEdgeAttributes } from "src/graph/MyMultiGraph";
import { stringify_node } from "src/graph/utils";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { remove_duplicates_by } from "./arrays";

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
		renderer?: MermaidRenderer;
		click?:
			| { method: "class" }
			| { method: "callback"; callback_name: string }
			| { method: "href"; getter: (target_id: string) => string };
	},
) => {
	const { direction, kind, renderer } = Object.assign(
		{ direction: "LR", kind: "flowchart", renderer: "dagre" },
		config,
	);

	const lines = [
		// TODO: If I add 'graph' as an option, double-check if the below "flowchart" property needs to change accordingly
		`%%{init: {"flowchart": {"defaultRenderer": "${renderer}"}} }%%`,
		`${kind} ${direction}`,
	];

	edges.forEach((e) => {
		const [source_label, target_label] = [
			stringify_node(e.source_id, e.source_attr, config),
			stringify_node(e.target_id, e.target_attr, config),
		];

		const [source, arrow, target] = [
			`${encodeURIComponent(e.source_id)}("${source_label}")`,
			(e.attr.explicit ? "-->" : "-.->") + `|${e.attr.field}|`,
			`${encodeURIComponent(e.target_id)}("${target_label}")`,
		];

		lines.push(`\t${source} ${arrow} ${target}`);
	});

	lines.push("");

	// NOTE: This is _pretty_ inefficient, but necessary.
	// If we just take all unique target_ids, we miss source nodes that don't have any incoming edges.
	const nodes = remove_duplicates_by(
		edges.flatMap((e) => [
			{ id: e.source_id, attr: e.source_attr },
			{ id: e.target_id, attr: e.target_attr },
		]),
		(n) => n.id,
	);

	// const active_file = get(active_file_store);
	// if (active_file && nodes.find((n) => n.id === active_file.path)) {
	// 	lines.push(
	// 		`\tclass ${encodeURIComponent(active_file.path)} BC-active-note`,
	// 	);
	// }

	switch (config?.click?.method) {
		case "class": {
			if (nodes.length) {
				lines.push(
					`\tclass ${nodes.map((n) => encodeURIComponent(n.id))} internal-link`,
				);
			}

			const unresolved_nodes = nodes.filter((n) => !n.attr.resolved);
			if (unresolved_nodes.length) {
				lines.push(
					`\tclass ${unresolved_nodes.map((n) => encodeURIComponent(n.id))} is-unresolved`,
				);
			}

			break;
		}

		case "href": {
			nodes.forEach((node) => {
				lines.push(
					`\tclick ${encodeURIComponent(node.id)} "${(<Extract<(typeof config)["click"], { method: "href" }>>config.click)?.getter(node.id)}"`,
				);
			});

			break;
		}

		case "callback": {
			nodes.forEach((node) => {
				lines.push(
					`\tclick ${encodeURIComponent(node.id)} "${(<Extract<(typeof config)["click"], { method: "callback" }>>config.click)?.callback_name}"`,
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
