import type { BCEdge, BCEdgeAttributes } from "src/graph/MyMultiGraph";
import { stringify_node } from "src/graph/utils";
import type { ShowNodeOptions } from "src/interfaces/settings";
import { remove_duplicates_by } from "./arrays";

const MERMAID_DIRECTIONS = ["LR", "RL", "TB", "BT"] as const;
type MermaidDirection = (typeof MERMAID_DIRECTIONS)[number];

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
		click?:
			| { method: "class" }
			| { method: "callback"; callback_name: string }
			| { method: "href"; getter: (target_id: string) => string };
	},
) => {
	const { direction, kind } = Object.assign(
		{ direction: "LR", kind: "flowchart" },
		config,
	);

	// obsidian://open?vault=breadcrumbs-test-vault&file=build-graph%2Flist-note%2F1

	const lines = [`${kind} ${direction}`];

	edges.forEach((e) => {
		const [source_label, target_label] = [
			stringify_node(e.source_id, e.source_attr, config),
			stringify_node(e.target_id, e.target_attr, config),
		];

		lines.push(
			`\t${e.source_id}[${source_label}] ${e.attr.explicit ? "-->" : "-.->"}|${e.attr.field}| ${e.target_id}[${target_label}]`,
		);
	});

	lines.push("");

	switch (config?.click?.method) {
		case "class": {
			// NOTE: This is _pretty_ inefficient, but necessary.
			// If we just take all unique target_ids, we miss source nodes that don't have any incoming edges.
			const nodes = remove_duplicates_by(
				edges.flatMap((e) => [
					{ id: e.source_id, attr: e.source_attr },
					{ id: e.target_id, attr: e.target_attr },
				]),
				(n) => n.id,
			);

			if (nodes.length) {
				lines.push(`\tclass ${nodes.map((n) => n.id)} internal-link`);
			}

			const unresolved_nodes = nodes.filter((n) => !n.attr.resolved);
			if (unresolved_nodes.length) {
				lines.push(
					`\tclass ${unresolved_nodes.map((n) => n.id)} is-unresolved`,
				);
			}

			break;
		}

		case "href": {
			edges.forEach(({ target_id }) => {
				lines.push(
					`\tclick ${target_id} "${(<Extract<(typeof config)["click"], { method: "href" }>>config.click)?.getter(target_id)}"`,
				);
			});

			break;
		}

		case "callback": {
			edges.forEach(({ target_id }) => {
				lines.push(
					`\tclick ${target_id} "${(<Extract<(typeof config)["click"], { method: "callback" }>>config.click)?.callback_name}"`,
				);
			});

			break;
		}
	}

	return lines.join("\n");
};

export const Mermaid = {
	from_edges,
	DIRECTIONS: MERMAID_DIRECTIONS,
};

export type Mermaid = {
	Direction: MermaidDirection;
};
