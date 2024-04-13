import { MultiGraph } from "graphology";
import type { ExplicitEdgeSource } from "src/const/graph";
import { log } from "src/logger";
import { fail, succ } from "src/utils/result";
import { objectify_edge_mapper } from "./objectify_mappers";
import { Traverse } from "./traverse";
import { has_edge_attrs, is_self_loop } from "./utils";

export type BCNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
	aliases?: string[];
	// TODO: All a narrower ignore filter, to ignore only edges from certain sources, for example
	// 	source=list-note
	// The syntax can allow multiple values: source=list-note source=dataview (parse as URLSearchParams)
	/** If true, don't add any edges _to_ this node */
	ignore_in_edges?: true;
	/** If true, don't add any edges _from_ this node */
	ignore_out_edges?: true;
};

export const EDGE_ATTRIBUTES = [
	"field",
	"explicit",
	"source",
	"implied_kind",
	"round",
] as const;

export type EdgeAttribute = (typeof EDGE_ATTRIBUTES)[number];

export type BCEdgeAttributes = {
	field: string;
} & (
	| {
			explicit: true;
			source: ExplicitEdgeSource;
	  }
	| {
			explicit: false;
			implied_kind: string;
			/** Which round of implied_building this edge got added in.
			 * Starts at 1 - you can think of real edges as being added in round 0.
			 * The way {@link BCGraph.safe_add_directed_edge} works, currently only the first instance of an edge will be added.
			 *   If the same edge tries again in a future round, _that_ one will be blocked.
			 */
			round: number;
	  }
);

export type BCEdge = {
	id: string;
	attr: BCEdgeAttributes;
	source_id: string;
	target_id: string;
	source_attr: BCNodeAttributes;
	target_attr: BCNodeAttributes;
	undirected: boolean;
};

export class BCGraph extends MultiGraph<BCNodeAttributes, BCEdgeAttributes> {
	constructor(
		/** Generally only for testing purposes, to quickly init a graph */
		input?: {
			nodes?: { id: string; attr: BCNodeAttributes }[];
			edges?: {
				source_id: string;
				target_id: string;
				attr: BCEdgeAttributes;
			}[];
		},
	) {
		super();

		if (input) {
			input.nodes?.forEach(({ id, attr }) =>
				this.safe_add_node(id, attr),
			);
			input.edges?.forEach((edge) => {
				this.safe_add_node(edge.source_id, { resolved: true });
				this.safe_add_node(edge.target_id, { resolved: true });

				this.safe_add_directed_edge(
					edge.source_id,
					edge.target_id,
					edge.attr,
				);
			});
		}
	}

	safe_add_node(id: string, attr: BCNodeAttributes) {
		try {
			this.addNode(id, attr);
			return true;
		} catch (error) {
			return false;
		}
	}

	/** Upsert a node by it's id (path). If it exists, patch attr, else addNode */
	upsert_node(id: string, attr: BCNodeAttributes) {
		if (this.hasNode(id)) {
			Object.keys(attr).forEach((key) => {
				this.setNodeAttribute(
					id,
					key as keyof BCNodeAttributes,
					attr[key as keyof BCNodeAttributes],
				);
			});
		} else {
			this.addNode(id, attr);
		}
	}

	safe_rename_node(old_id: string, new_id: string) {
		const exists = {
			old: this.hasNode(old_id),
			new: this.hasNode(new_id),
		};

		if (!exists.old) {
			return fail({ exists, message: "old_id doesn't exist" });
		} else if (exists.new) {
			return fail({ exists, message: "new_id already exists" });
		} else {
			// Add the new node
			this.addNode(new_id, this.getNodeAttributes(old_id));

			// WARN: For edge sources that depend on the name of the note (e.g. Dendron),
			//   This naive renaming won't _just_ work.
			//   The idea I mentioned about GraphBuilders being on a node-level would address this
			//   You could just rerun the builders for the new_id node
			//   But for now, the name-specific edges can just be filtered out here
			// Freeze the old node
			const old_edges = {
				in: this.get_in_edges(old_id),
				out: this.get_out_edges(old_id),
			};

			// Drop the old node (conveniently, this also drops the old edges)
			this.dropNode(old_id);

			// Point the old edges at the new node
			old_edges.in.forEach((old_in_edge) => {
				// Might be a self-loop (source:self_is_sibling, for example)
				is_self_loop(old_in_edge)
					? this.safe_add_directed_edge(
							new_id,
							new_id,
							old_in_edge.attr,
						)
					: this.safe_add_directed_edge(
							old_in_edge.source_id,
							new_id,
							old_in_edge.attr,
						);
			});

			old_edges.out.forEach((old_out_edge) => {
				// Only add the self-loop once.
				// If it's there, it would have appeared in both the old_in and old_out edges
				!is_self_loop(old_out_edge) &&
					this.safe_add_directed_edge(
						new_id,
						old_out_edge.target_id,
						old_out_edge.attr,
					);
			});
		}

		return succ({ exists });
	}

	/** Uniquely identify an edge based on its:
	 * - source_id
	 * - target_id
	 * - field
	 */
	make_edge_id = (
		source_id: string,
		target_id: string,
		attr: BCEdgeAttributes,
	) => `${source_id}|${attr.field}|${target_id}`;
	// NOTE: These fields shouldn't actually dedupe an edge... I think what the user would consider an edge to be the same
	//   even if it was added for different reasons, but still to and from the same nodes, using the same field.
	//   Consider the commands/freeze-crumbs/index.md note as an example. If these fields were included, the implied relations would still show
	//   even tho there are now frozen real relations serving the exact same purpose.
	// |${attr.explicit ? "explicit|" + attr.source : "implied|" + attr.implied_kind}

	/** Return true if the edge was added.
	 * Won't be added if it already exists (based on it's {@link this.make_edge_id}),
	 * 	or if it's target_node has ingore_in_edges */
	safe_add_directed_edge = (
		source_id: string,
		target_id: string,
		attr: BCEdgeAttributes,
	) => {
		if (this.getNodeAttribute(target_id, "ignore_in_edges")) {
			log.debug(
				`ignore-in-edge > ${source_id} -${attr.field}-> ${target_id}`,
			);
			return false;
		} else if (this.getNodeAttribute(source_id, "ignore_out_edges")) {
			log.debug(
				`ignore-out-edge > ${source_id} -${attr.field}-> ${target_id}`,
			);
			return false;
		}

		const edge_id = this.make_edge_id(source_id, target_id, attr);

		if (!this.hasDirectedEdge(edge_id)) {
			this.addDirectedEdgeWithKey(edge_id, source_id, target_id, attr);
			return true;
		} else {
			return false;
		}
	};

	get_in_edges = (node_id?: string) =>
		node_id
			? this.mapInEdges(
					node_id,
					objectify_edge_mapper((e) => e),
				)
			: this.mapInEdges(objectify_edge_mapper((e) => e));

	get_out_edges = (node_id?: string) =>
		node_id
			? this.mapOutEdges(
					node_id,
					objectify_edge_mapper((e) => e),
				)
			: this.mapOutEdges(objectify_edge_mapper((e) => e));

	/** Find all paths of nodes connected by edges that pair-wise match the attrs in the chain */
	get_attrs_chain_path = (
		start_node: string,
		attr_chain: Partial<BCEdgeAttributes>[],
		edge_filter?: (edge: BCEdge) => boolean,
	) => {
		const visited_nodes = new Set<string>();

		return (
			Traverse.all_paths(
				"depth_first",
				this,
				start_node,
				(edge, depth) => {
					// NOTE: The path could go on for arbitrarily long, but the chain could have a shorter length
					const chain_item = attr_chain.at(depth);

					if (
						!visited_nodes.has(edge.target_id) &&
						(!edge_filter || edge_filter(edge)) &&
						// This will naturally end the path when depth > field_chain.length
						chain_item &&
						has_edge_attrs(edge, chain_item)
					) {
						visited_nodes.add(edge.target_id);

						return true;
					} else {
						return false;
					}
				},
			)
				// Just because field_chain[depth] doesn't add the edge to the path,
				//   We still have the filter out the partial paths that got started in that field_chain
				.filter((path) => path.length === attr_chain.length)
		);
	};
}
