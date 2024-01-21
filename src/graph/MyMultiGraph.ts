import { MultiGraph } from "graphology";
import type { ExplicitEdgeSource } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { Hierarchy } from "src/interfaces/hierarchies";
import { objectify_edge_mapper } from "./objectify_mappers";
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
}
