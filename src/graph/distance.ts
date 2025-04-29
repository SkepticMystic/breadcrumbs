import type { TraversalStackItem } from "./traverse";

const from_traversal_items = (items: TraversalStackItem[]) => {
	const distances = new Map<string, number>();

	items.forEach((item) => {
		distances.set(
			item.edge.target_id,
			Math.min(
				distances.get(item.edge.target_id) ?? Infinity,
				item.depth + 1,
			),
		);
	});

	return distances;
};

export const Distance = {
	from_traversal_items,
};
