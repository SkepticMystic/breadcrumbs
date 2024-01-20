import { DIRECTIONS, type Direction } from "src/const/hierarchies";
import type { Hierarchy } from "src/interfaces/hierarchies";

export const blank_hierarchy = (): Hierarchy => ({
	dirs: {
		up: [""],
		same: [""],
		down: [""],
		next: [""],
		prev: [""],
	},
	// NOTE: In a "blank" hierarchy, should everything be off, or should it be reasonable defaults?
	implied_relationships: {
		opposite_direction: true,
		self_is_sibling: false,
		parents_sibling_is_parent: false,
		cousing_is_sibling: false,
		same_parent_is_sibling: false,
		same_sibling_is_sibling: false,
		siblings_parent_is_parent: false,
	},
});

export const get_opposite_direction = (dir: Direction): Direction => {
	switch (dir) {
		case "up":
			return "down";
		case "down":
			return "up";
		case "same":
			return "same";
		case "next":
			return "prev";
		case "prev":
			return "next";
	}
};

export const get_field_hierarchy = (
	hierarchies: Hierarchy[],
	field: string,
) => {
	let dir: Direction | null = null;
	let fields: string[] | null = null;
	let hierarchy_i: number | null = null;
	let implied_relationships: Hierarchy["implied_relationships"] | null = null;

	outer: for (const [i, hierarchy] of hierarchies.entries()) {
		for (const direction of DIRECTIONS) {
			const hierarchy_fields = hierarchy.dirs[direction];
			if (hierarchy_fields.includes(field)) {
				dir = direction;
				hierarchy_i = i;
				fields = hierarchy_fields;
				implied_relationships = hierarchy.implied_relationships;

				// We've found the hierarchy, so we can break out of both loops
				break outer;
			}
		}
	}

	if (
		dir === null ||
		fields === null ||
		hierarchy_i === null ||
		implied_relationships === null
	) {
		return null;
	}

	return {
		dir,
		fields,
		hierarchy_i,
		implied_relationships,
	};
};

export const stringify_hierarchy = (hierarchy: Hierarchy) =>
	DIRECTIONS.map((dir) => hierarchy.dirs[dir].join(", ")).join(" | ");
