import type { ImpliedEdgeBuilder } from "src/interfaces/graph";
import type { Hierarchy } from "src/interfaces/hierarchies";
import { _add_implied_edges_opposite_direction } from "./opposite_direction";
import { _add_implied_edges_self_is_sibling } from "./self_is_sibling";
import { _add_implied_edges_same_parent_is_sibling } from "./same_parent_is_sibling";

export const add_implied_edges: Record<
	keyof Hierarchy["implied_relationships"],
	ImpliedEdgeBuilder
> = {
	self_is_sibling: _add_implied_edges_self_is_sibling,
	opposite_direction: _add_implied_edges_opposite_direction,
	same_parent_is_sibling: _add_implied_edges_same_parent_is_sibling,
};
