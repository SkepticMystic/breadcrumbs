import type { ImpliedEdgeBuilder } from "src/interfaces/graph";
import type { Hierarchy } from "src/interfaces/hierarchies";
import { _add_implied_edges_opposite_direction } from "./opposite_direction";
import { _add_implied_edges_parents_sibling_is_parent } from "./parents_sibling_is_parent";
import { _add_implied_edges_same_parent_is_sibling } from "./same_parent_is_sibling";
import { _add_implied_edges_same_sibling_is_sibling } from "./same_sibling_is_sibling";
import { _add_implied_edges_self_is_sibling } from "./self_is_sibling";
import { _add_implied_edges_cousin_is_sibling } from "./cousin_is_sibling";
import { _add_implied_edges_siblings_parent_is_parent } from "./siblings_parent_is_parent";

// TODO: Flesh out
export const add_implied_edges: Record<
	keyof Hierarchy["implied_relationships"],
	ImpliedEdgeBuilder
> = {
	self_is_sibling: _add_implied_edges_self_is_sibling,
	opposite_direction: _add_implied_edges_opposite_direction,
	same_parent_is_sibling: _add_implied_edges_same_parent_is_sibling,
	parents_sibling_is_parent: _add_implied_edges_parents_sibling_is_parent,
	same_sibling_is_sibling: _add_implied_edges_same_sibling_is_sibling,
	cousin_is_sibling: _add_implied_edges_cousin_is_sibling,
	siblings_parent_is_parent: _add_implied_edges_siblings_parent_is_parent,
};
