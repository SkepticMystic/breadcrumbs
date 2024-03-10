import type { Direction } from "src/const/hierarchies";

export type Hierarchy = {
	dirs: Record<Direction, string[]>;
	implied_relationships: {
		self_is_sibling: { rounds: number };
		opposite_direction: { rounds: number };
		cousin_is_sibling: { rounds: number };
		same_parent_is_sibling: { rounds: number };
		same_sibling_is_sibling: { rounds: number };
		siblings_parent_is_parent: { rounds: number };
		parents_sibling_is_parent: { rounds: number };
	};
};
