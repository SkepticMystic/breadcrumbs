import type { BCEdge } from "./MyMultiGraph";

const from_paths = (all_paths: BCEdge[][]) => {
	const distances = new Map<string, number>();

	all_paths.forEach((path) => {
		path.forEach(({ target_id }, depth) => {
			distances.set(
				target_id,
				Math.min(distances.get(target_id) ?? Infinity, depth),
			);
		});
	});

	return distances;
};

export const Distance = {
	from_paths,
};
