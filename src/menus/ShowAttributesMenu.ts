import { Menu } from "obsidian";
import type { EdgeAttribute } from "src/graph/utils";
import { EDGE_ATTRIBUTES } from "src/graph/utils";

export const ShowAttributesSelectorMenu = ({
	cb,
	value,
	exclude_attributes,
}: {
	value: EdgeAttribute[];
	cb: (_: EdgeAttribute[]) => void;
	exclude_attributes?: EdgeAttribute[];
}) => {
	const menu = new Menu();

	const possible = EDGE_ATTRIBUTES.filter(
		(attr) => !exclude_attributes?.includes(attr),
	);
	const all = possible.length === value.length;

	menu.addItem((item) =>
		item.setTitle(all ? "None" : "All").onClick(() => {
			cb(all ? [] : possible);
		}),
	);

	menu.addSeparator();

	const add_item = (attr: EdgeAttribute) => {
		const included = value.includes(attr);

		menu.addItem((item) =>
			item
				.setTitle(attr)
				.setChecked(included)
				.onClick(() => {
					if (included) {
						cb(value.filter((v) => v !== attr));
					} else {
						cb([...value, attr]);
					}
				}),
		);
	};

	(["field", "explicit"] as const)
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	menu.addSeparator();

	(["source"] as const)
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	menu.addSeparator();

	(["implied_kind", "round"] as const)
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	return menu;
};
