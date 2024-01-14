import type { Direction } from "src/const/hierarchies";

export type Hierarchy = {
	dirs: Record<Direction, string[]>;
	implied_relationships: {
		self_is_sibling: boolean;
		opposite_direction: boolean;
		cousing_is_sibling: boolean;
		same_parent_is_sibling: boolean;
		same_sibling_is_sibling: boolean;
		siblings_parent_is_parent: boolean;
		parents_sibling_is_parent: boolean;
	};
};
