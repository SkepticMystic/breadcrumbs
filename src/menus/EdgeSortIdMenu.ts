import { Menu } from "obsidian";
import { SIMPLE_EDGE_SORT_FIELDS, type EdgeSortId } from "src/const/graph";
import { DIRECTIONS } from "src/const/hierarchies";

const ORDERS = [1, -1] as const;

const is_checked = (value: EdgeSortId, check: EdgeSortId) =>
	value.field === check.field && value.order === check.order;

export const EdgeSortIdMenu = ({
	cb,
	value,
	exclude_fields,
}: {
	cb: (_: EdgeSortId) => void;
	value: EdgeSortId;
	exclude_fields?: EdgeSortId["field"][];
}) => {
	const menu = new Menu();

	SIMPLE_EDGE_SORT_FIELDS.filter((f) => !exclude_fields?.includes(f)).forEach(
		(field) => {
			ORDERS.forEach((order) => {
				menu.addItem((item) =>
					item
						.setTitle(field + (order === 1 ? " (asc)" : " (desc)"))
						.setChecked(is_checked(value, { field, order }))
						.onClick(() => {
							value = { field, order };
							cb(value);
						}),
				);
			});
		},
	);

	menu.addSeparator();

	if (!exclude_fields?.includes("neighbour-dir:")) {
		DIRECTIONS.forEach((dir) => {
			ORDERS.forEach((order) => {
				const field = `neighbour-dir:${dir}` as const;

				menu.addItem((item) =>
					item
						.setTitle(field + (order === 1 ? " (asc)" : " (desc)"))
						.setChecked(is_checked(value, { field, order }))
						.onClick(() => {
							value = { field, order };
							cb(value);
						}),
				);
			});
		});
	}

	return menu;
};
