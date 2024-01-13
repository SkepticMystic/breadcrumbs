import type { Direction } from "src/const/hierarchies";

export type Hierarchy = {
	dirs: Record<Direction, string[]>;
	implied_relationships: {
		self_is_sibling: boolean;
		opposite_direction: boolean;
	};
};
