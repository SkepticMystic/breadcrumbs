import { DIRECTIONS, type Direction } from "src/const/hierarchies";
import type { Hierarchy } from "src/interfaces/hierarchies";

export const blank_hierarchy = (): Hierarchy => ({
	up: [""],
	same: [""],
	down: [""],
	next: [""],
	prev: [""],
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
	field: string
) => {
	let dir: Direction | null = null;
	let fields: string[] | null = null;
	let hierarchy_i: number | null = null;

	outer: for (const [i, hierarchy] of hierarchies.entries()) {
		for (const direction of DIRECTIONS) {
			const hierarchy_fields = hierarchy[direction];
			if (hierarchy_fields.includes(field)) {
				dir = direction;
				hierarchy_i = i;
				fields = hierarchy_fields;

				// We've found the hierarchy, so we can break out of both loops
				break outer;
			}
		}
	}

	if (hierarchy_i === null || dir === null || fields === null) {
		return null;
	}

	return {
		dir,
		fields,
		hierarchy_i,
	};
};

export const get_opposite_fields = (
	hierarchies: Hierarchy[],
	field: string
) => {
	const field_hierarchy = get_field_hierarchy(hierarchies, field);

	if (field_hierarchy) {
		const { dir, hierarchy_i } = field_hierarchy;

		const opposite_dir = get_opposite_direction(dir);

		return hierarchies[hierarchy_i][opposite_dir];
	}

	return [];
};
