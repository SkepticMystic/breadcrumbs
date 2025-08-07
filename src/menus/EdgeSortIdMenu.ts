import { Menu } from "obsidian";
import type { EdgeSortId } from "src/const/graph";
import { SIMPLE_EDGE_SORT_FIELDS } from "src/const/graph";

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

	return menu;
};
