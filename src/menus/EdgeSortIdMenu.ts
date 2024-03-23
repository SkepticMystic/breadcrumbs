import { Menu } from "obsidian";
import { SIMPLE_EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
import { DIRECTIONS } from "src/const/hierarchies";

const ORDERS = [1, -1] as const;

export const EdgeSortIdMenu = ({
	cb,
	value,
	exclude_fields,
}: {
	value: EdgeSortId;
	cb: (_: EdgeSortId) => void;
	exclude_fields?: EdgeSortId["field"][];
}) => {
	const menu = new Menu();

	ORDERS.forEach((order) => {
		menu.addItem((item) =>
			item
				.setTitle(`Order: ${order === 1 ? "asc" : "desc"}`)
				.setChecked(value.order === order)
				.onClick(() => {
					value.order = order;
					cb(value);
				}),
		);
	});

	menu.addSeparator();

	SIMPLE_EDGE_SORT_FIELDS.filter((f) => !exclude_fields?.includes(f)).forEach(
		(field) => {
			menu.addItem((item) =>
				item
					.setTitle("Field: " + field)
					.setChecked(value.field === field)
					.onClick(() => {
						value.field = field;
						cb(value);
					}),
			);
		},
	);

	menu.addSeparator();

	if (!exclude_fields?.includes("neighbour-dir:")) {
		DIRECTIONS.forEach((dir) => {
			const field = `neighbour-dir:${dir}` as const;

			menu.addItem((item) =>
				item
					.setTitle("Field: " + field)
					.setChecked(value.field === field)
					.onClick(() => {
						value.field = field;
						cb(value);
					}),
			);
		});
	}

	return menu;
};
