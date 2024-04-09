import type {
	BCEdge,
	BCEdgeAttributes,
	BCNodeAttributes,
	EdgeAttribute,
} from "src/graph/MyMultiGraph";
import { remove_duplicates_by } from "./arrays";
import { remove_nullish_keys, untyped_pick } from "./objects";
import { url_search_params } from "./url";

const MERMAID_DIRECTIONS = ["LR", "RL", "TB", "BT"] as const;
type MermaidDirection = (typeof MERMAID_DIRECTIONS)[number];

const MERMAID_RENDERER = ["dagre", "elk"] as const;
type MermaidRenderer = (typeof MERMAID_RENDERER)[number];

const build_arrow = (e: {
	attr: Pick<BCEdgeAttributes, "explicit" | "dir">;
}) => (e.attr.dir === "same" ? "<--->" : e.attr.explicit ? "-->" : "-.->");

const build_attrs = (
	e: { attr: Pick<BCEdgeAttributes, "explicit"> },
	show_attributes?: EdgeAttribute[],
) => {
	const params = show_attributes?.length
		? url_search_params(untyped_pick(e.attr, show_attributes), {
				trim_lone_param: true,
			})
		: null;

	// Only add the attributes if there are any, otherwise Mermaid will throw an error
	return params?.length ? `|"${params}"|` : "";
};

const from_edges = (
	edges: (Pick<
		BCEdge,
		"source_id" | "target_id" | "source_attr" | "target_attr"
	> & {
		attr: Pick<BCEdgeAttributes, "explicit" | "field" | "dir">;
	})[],
	config?: {
		active_node_id?: string;
		renderer?: MermaidRenderer;
		kind?: "flowchart" | "graph";
		direction?: MermaidDirection;
		show_attributes?: EdgeAttribute[];
		get_node_label?: (id: string, attr: BCNodeAttributes) => string;
		click?:
			| { method: "class" }
			| { method: "callback"; callback_name: string }
			| {
					method: "href";
					getter: (id: string, attr: BCNodeAttributes) => string;
			  };
	},
) => {
	const { direction, kind, renderer, get_node_label } = Object.assign(
		{ direction: "LR", kind: "flowchart", renderer: "dagre" },
		remove_nullish_keys(config ?? {}),
	);

	const lines = [
		// TODO: If I add 'graph' as an option, double-check if the below "flowchart" property needs to change accordingly
		`%%{init: {"${kind}": {"defaultRenderer": "${renderer}"}} }%%`,
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

	// Collapse dir === same edges to and from the same nodes
	// e.g. A -->|same| B -->|same| A becomes A <-->|same| B
	const mermaid_edges: {
		source_i: number;
		target_i: number;
		arrow: string;
		attrs: string;
		field: BCEdgeAttributes["field"];
	}[] = [];

	for (const e of edges.sort(
		// Favour explicit edges in the dedupe
		(a, b) => Number(b.attr.explicit) - Number(a.attr.explicit),
	)) {
		const [source_i, target_i] = [
			node_map.get(e.source_id)!.i,
			node_map.get(e.target_id)!.i,
		];

		if (
			e.attr.dir !== "same" ||
			!mermaid_edges.find(
				(e2) =>
					target_i === e2.source_i &&
					source_i === e2.target_i &&
					e.attr.field === e2.field,
			)
		) {
			mermaid_edges.push({
				source_i,
				target_i,
				field: e.attr.field,
				arrow: build_arrow(e),
				attrs: build_attrs(e, config?.show_attributes),
			});
		}
	}

	// Add the edges
	mermaid_edges.forEach(({ arrow, attrs, source_i, target_i }) => {
		lines.push(`\t${source_i} ${arrow}${attrs} ${target_i}`);
	});

	lines.push("");

	switch (config?.click?.method) {
		case "class": {
			const nodes = [...node_map.values()];

			if (nodes.length) {
				const active_note_i = node_map.get(config.active_node_id!)?.i;

				lines.push(
					`\tclass ${nodes.filter((n) => n.i !== active_note_i).map((n) => n.i)} internal-link`,
				);
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
					`\tclick ${node.i} "${(<Extract<(typeof config)["click"], { method: "href" }>>config.click)?.getter(path, node.attr)}"`,
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
