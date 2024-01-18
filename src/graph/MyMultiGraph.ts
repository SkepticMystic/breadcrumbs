import { MultiGraph } from "graphology";
import type { ExplicitEdgeSource } from "src/const/graph";
import type { Direction } from "src/const/hierarchies";
import type { Hierarchy } from "src/interfaces/hierarchies";

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
		if (!this.hasNode(id)) {
			this.addNode(id, attr);
		}
	}
}
