import { Menu } from "obsidian";
import type { EdgeField } from "src/interfaces/settings";

export const EdgeFieldSelectorMenu = ({
	cb,
	value,
	fields,
}: {
	value: EdgeField;
	fields: EdgeField[];
	cb: (_: EdgeField) => void;
}) => {
	const menu = new Menu();

	fields.forEach((field) => {
		menu.addItem((item) =>
			item
				.setTitle(field.label)
				.setChecked(value.label === field.label)
				.onClick(() => {
					value = field;
					cb(value);
				}),
		);
	});

	return menu;
};
