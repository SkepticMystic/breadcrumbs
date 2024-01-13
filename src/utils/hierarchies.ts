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

export const get_opposite_fields = (
	hierarchies: Hierarchy[],
	field: string
) => {
	const opposite_fields: string[] = [];

	for (const hierarchy of hierarchies) {
		for (const dir of DIRECTIONS) {
			const fields = hierarchy[dir];

			if (fields.includes(field)) {
				opposite_fields.push(...hierarchy[get_opposite_direction(dir)]);
			}
		}
	}

	return opposite_fields;
};
