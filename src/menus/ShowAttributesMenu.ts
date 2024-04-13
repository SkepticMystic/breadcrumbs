import { Menu } from "obsidian";
import { type EdgeAttribute } from "src/graph/MyMultiGraph";

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

	(<const>["field", "explicit"])
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	menu.addSeparator();

	(<const>["source"])
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	menu.addSeparator();

	(<const>["implied_kind", "round"])
		.filter((attr) => !exclude_attributes?.includes(attr))
		.forEach(add_item);

	return menu;
};
