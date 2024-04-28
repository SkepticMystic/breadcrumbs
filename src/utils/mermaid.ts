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

const MERMAID_CURVE_STYLES = [
	"basis",
	"bumpX",
	"bumpY",
	"cardinal",
	"catmullRom",
	"linear",
	"monotoneX",
	"monotoneY",
	"natural",
	"step",
	"stepAfter",
	"stepBefore",
] as const;
type MermaidCurveStyle = (typeof MERMAID_CURVE_STYLES)[number];

type MermaidEdge = {
	source_i: number;
	target_i: number;
	arrow: string;
	attr: BCEdgeAttributes;
	collapsed_attr: Record<string, Set<string>>;
};

const build_arrow = (e: { attr: Pick<BCEdgeAttributes, "explicit"> }) =>
	e.attr.explicit ? "-->" : "-.->";

const build_attrs = (
	attr: Record<string, string>,
	show_attributes?: EdgeAttribute[],
) => {
	const params = show_attributes?.length
		? url_search_params(untyped_pick(attr, show_attributes), {
				trim_lone_param: true,
			})
		: null;

	// Only add the attributes if there are any, otherwise Mermaid will throw an error
	return params?.length ? `|"${params}"|` : "";
};

const from_edges = (
	edges: Omit<BCEdge, "id" | "undirected">[],
	config?: {
		active_node_id?: string;
		renderer?: MermaidRenderer;
		kind?: "flowchart" | "graph";
		direction?: MermaidDirection;
		curve_style?: MermaidCurveStyle;
		show_attributes?: EdgeAttribute[];
		collapse_opposing_edges?: false;
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
	const resolved = Object.assign(
		{ direction: "LR", kind: "flowchart" },
		remove_nullish_keys(
			config ?? ({} as unknown as NonNullable<typeof config>),
		),
	);

	const flowchart_init = remove_nullish_keys({
		curve: resolved.curve_style,
		defaultRenderer: resolved.renderer,
	});

	const lines = [
		// NOTE: Regardless of kind, the below field should always be flowchart
		`%%{ init: { "flowchart": ${JSON.stringify(flowchart_init)} } }%%`,
		`${resolved.kind} ${resolved.direction}`,
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
				label:
					resolved.get_node_label?.(node.path, node.attr) ??
					node.path,
			}),
		new Map<string, { i: number; label: string; attr: BCNodeAttributes }>(),
	);

	// Declare the labeled nodes
	node_map.forEach((node) => {
		lines.push(`\t${node.i}("${node.label}")`);
	});

	lines.push("");

	// Collapse opposing edges to and from the same nodes
	// e.g. A -->|same| B -->|same| A becomes A <-->|same| B
	const mermaid_edges: MermaidEdge[] = [];

	for (const edge of edges) {
		const [source_i, target_i] = [
			node_map.get(edge.source_id)!.i,
			node_map.get(edge.target_id)!.i,
		];

		const opposing_edge_i =
			resolved.collapse_opposing_edges !== false
				? mermaid_edges.findIndex(
						(existing) =>
							// NOTE: This is pretty intense, all opposing edges will collapse, because now there's no direction semantics
							target_i === existing.source_i &&
							source_i === existing.target_i,
					)
				: -1;

		if (opposing_edge_i === -1) {
			// If there is no opposing edge, add the original edge
			mermaid_edges.push({
				source_i,
				target_i,
				arrow: build_arrow(edge),
				attr: edge.attr,
				collapsed_attr: Object.fromEntries(
					resolved.show_attributes?.map((attr) => [
						attr,
						new Set([
							// @ts-ignore: If the property is not in the object, it will be undefined
							edge.attr[attr] ?? "_",
						]),
					]) ?? [],
				),
			});
		} else {
			// If there is an opposing edge, collapse them into a single edge
			const existing = mermaid_edges[opposing_edge_i];

			existing.arrow =
				edge.attr.explicit || existing.attr.explicit ? "---" : "-.-";

			resolved.show_attributes?.forEach((attr) => {
				existing.collapsed_attr[attr].add(
					// @ts-ignore: If the property is not in the object, it will be undefined
					edge.attr[attr] ?? "_",
				);
			});
		}
	}

	// Add the edges
	mermaid_edges.forEach(({ arrow, collapsed_attr, source_i, target_i }) => {
		const attrs = build_attrs(
			Object.fromEntries(
				Object.entries(collapsed_attr).map(([key, set]) => [
					key,
					[...set.values()].join("|"),
				]),
			),
			resolved.show_attributes,
		);

		lines.push(`\t${source_i} ${arrow}${attrs} ${target_i}`);
	});

	lines.push("");

	const active_note_i = resolved.active_node_id
		? node_map.get(resolved.active_node_id)?.i
		: undefined;

	if (active_note_i !== undefined) {
		lines.push(`\tclass ${active_note_i} BC-active-node`);
	}

	switch (resolved.click?.method) {
		case "class": {
			const nodes = [...node_map.values()];

			if (nodes.length) {
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
					`\tclick ${node.i} "${(<Extract<(typeof resolved)["click"], { method: "href" }>>resolved.click)?.getter(path, node.attr)}"`,
				);
			});

			break;
		}

		case "callback": {
			node_map.forEach((node) => {
				lines.push(
					`\tclick ${node.i} call ${(<Extract<(typeof resolved)["click"], { method: "callback" }>>resolved.click)?.callback_name}()`,
				);
			});

			break;
		}
	}

	return lines.join("\n");
};

const _encode = (code: string) => {
	const bytes = new TextEncoder().encode(code);
	return btoa(String.fromCharCode(...bytes));
};

const to_image_link = (code: string) =>
	`https://mermaid.ink/img/${_encode(code)}`;

type MermaidState = {
	code: string;
	mermaid: {
		theme: string;
	};
	updateDiagram: boolean;
	autoSync: boolean;
	editorMode?: "code" | "config";
	panZoom?: boolean;
	pan?: { x: number; y: number };
	zoom?: number;
};

// SOURCE: https://mermaid.js.org/ecosystem/tutorials.html#jupyter-integration-with-mermaid-js
const to_live_edit_link = (code: string) => {
	const state: MermaidState = {
		code,
		// NOTE: For some reason, having both true doesn't trigger the initial render?
		autoSync: false,
		updateDiagram: true,
		mermaid: { theme: "default" },
	};

	const encoded = _encode(JSON.stringify(state, undefined, 2));

	return `https://mermaid.live/edit#base64:${encoded}`;
};

export const Mermaid = {
	from_edges,

	to_image_link,
	to_live_edit_link,

	RENDERERS: MERMAID_RENDERER,
	DIRECTIONS: MERMAID_DIRECTIONS,
	CURVE_STYLES: MERMAID_CURVE_STYLES,
};

export type Mermaid = {
	Renderer: MermaidRenderer;
	Direction: MermaidDirection;
};
