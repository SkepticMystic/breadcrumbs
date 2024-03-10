import { MultiGraph } from "graphology";
import type { ExplicitEdgeSource } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { Hierarchy } from "src/interfaces/hierarchies";
import { objectify_edge_mapper } from "./objectify_mappers";
import { Traverse } from "./traverse";
import { is_self_loop } from "./utils";

export type BCNodeAttributes = {
	/** .md file exists  */
	resolved: boolean;
	aliases?: string[];
};

export type BCEdgeAttributes = {
	/** The hierarchy index */
	hierarchy_i: number;
	/** The direction of the field in the hierarchy */
	dir: Direction;
	/** The hierarchy field
	 * null if the implied edge has no opposite field
	 */
	field: string | null;
} & (
	| {
			explicit: true;
			source: ExplicitEdgeSource;
	  }
	| {
			explicit: false;
			implied_kind: keyof Hierarchy["implied_relationships"];
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
	constructor() {
		super();
	}

	safe_add_node(id: string, attr: BCNodeAttributes) {
		try {
			this.addNode(id, attr);
		} catch (error) {
			// console.log("node already exists:", id);
		}
	}

	safe_rename_node(old_id: string, new_id: string) {
		const [old_exists, new_exists] = [
			this.hasNode(old_id),
			this.hasNode(new_id),
		];

		if (old_exists && !new_exists) {
			// Add the new node
			this.addNode(new_id, this.getNodeAttributes(old_id));

			// WARN: For edge sources that depend on the name of the note (e.g. Dendron),
			//   This naive renaming won't _just_ work.
			//   The idea I mentioned about GraphBuilders being on a node-level would address this
			//   You could just rerun the builders for the new_id node
			//   But for now, the name-specific edges can just be filtered out here
			// Freeze the old node
			const old_in_edges = this.mapInEdges(
				old_id,
				objectify_edge_mapper((e) => e),
			);
			const old_out_edges = this.mapOutEdges(
				old_id,
				objectify_edge_mapper((e) => e),
			);

			// Drop the old node (conveniently, this also drops the old edges)
			this.dropNode(old_id);

			// Point the old edges at the new node
			old_in_edges.forEach((old_in_edge) => {
				// Might be a self-loop (source:self_is_sibling, for example)
				is_self_loop(old_in_edge)
					? this.addDirectedEdge(new_id, new_id, old_in_edge.attr)
					: this.addDirectedEdge(
							old_in_edge.source_id,
							new_id,
							old_in_edge.attr,
						);
			});

			old_out_edges.forEach((old_out_edge) => {
				// Only add the self-loop once.
				// If it's there, it would have appeared in both the old_in and old_out edges
				!is_self_loop(old_out_edge) &&
					this.addDirectedEdge(
						new_id,
						old_out_edge.target_id,
						old_out_edge.attr,
					);
			});
		} else {
			console.log("can't safe_rename_node:", old_id, "->", new_id, {
				old_exists,
				new_exists,
			});
		}

		return { old_exists, new_exists };
	}

	/** Uniquely identify an edge based on its:
	 * - source_id
	 * - target_id
	 * - hierarchy_i
	 * - dir
	 * - field
	 * - explicit
	 * - source (if explicit)
	 * - implied_kind (if implied)
	 *
	 * But NOT it's round number
	 */
	make_edge_id = (
		source_id: string,
		target_id: string,
		attr: BCEdgeAttributes,
	) => `${source_id}|${attr.field}|${target_id}`;
	// NOTE: These fields are redundant. The `field` field defines which hierarchy_i and dir is chosen anyway,
	//   so it's not adding any extra information to the dedupe key
	// |${attr.hierarchy_i}|${attr.dir}
	// NOTE: These fields shouldn't actually dedupe an edge... I think what the user would consider an edge to be the same
	//   even if it was added for different reasons, but still to and from the same nodes, using the same field.
	//   Consider the commands/freeze-crumbs/index.md note as an example. If these fields were included, the implied relations would still show
	//   even tho there are now frozen real relations serving the exact same purpose.
	// |${attr.explicit ? "explicit|" + attr.source : "implied|" + attr.implied_kind}

	safe_add_directed_edge = (
		source_id: string,
		target_id: string,
		attr: BCEdgeAttributes,
	) => {
		const edge_id = this.make_edge_id(source_id, target_id, attr);

		if (!this.hasDirectedEdge(edge_id)) {
			this.addDirectedEdgeWithKey(edge_id, source_id, target_id, attr);
			return true;
		} else {
			return false;
		}
	};

	get_dir_chains_path = (
		start_node: string,
		dir_chain: Direction[],
		edge_filter?: (edge: BCEdge) => boolean,
	) => {
		const visited_nodes = new Set<string>();

		return (
			Traverse.all_paths(
				"depth_first",
				this,
				start_node,
				(edge, depth) => {
					if (
						!visited_nodes.has(edge.target_id) &&
						(!edge_filter || edge_filter(edge)) &&
						// This will naturally end the path when depth > dir_chain.length
						edge.attr.dir === dir_chain[depth]
					) {
						visited_nodes.add(edge.target_id);

						return true;
					} else {
						return false;
					}
				},
			)
				// Just because dir_chain[depth] doesn't add the edge to the path,
				//   We still have the filter out the partial paths that got started in that dir_chain
				.filter((path) => path.length === dir_chain.length)
		);
	};
}
