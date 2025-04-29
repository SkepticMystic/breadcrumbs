import { Menu } from "obsidian";
import type { BreadcrumbsSettings, EdgeField } from "src/interfaces/settings";
import { remove_duplicates } from "src/utils/arrays";

export const EdgeFieldsSelectorMenu = ({
	cb,
	value,
	edge_fields,
	edge_field_groups,
}: {
	value: EdgeField[];
	edge_fields: EdgeField[];
	edge_field_groups: BreadcrumbsSettings["edge_field_groups"];
	cb: (new_value: EdgeField[]) => void;
}) => {
	const menu = new Menu();

	edge_field_groups.forEach((group) => {
		const checked = group.fields.every((label) =>
			value.some((f) => f.label === label),
		);

		menu.addItem((item) =>
			item
				.setTitle(group.label)
				.setChecked(checked)
				.onClick(() => {
					if (checked) {
						// Remove all fields that are in the group
						value = value.filter(
							(f) => !group.fields.includes(f.label),
						);
					} else {
						// Add all fields that are in the group
						value.push(
							...edge_fields.filter((f) =>
								group.fields.includes(f.label),
							),
						);

						// Remove duplicates
						value = remove_duplicates(value);
					}

					cb(value);
				}),
		);
	});

	menu.addSeparator();

	edge_fields.forEach((field) => {
		const checked = value.some((f) => f.label === field.label);

		menu.addItem((item) =>
			item
				.setTitle(field.label)
				.setChecked(checked)
				.onClick(() => {
					if (checked) {
						value = value.filter((f) => f.label !== field.label);
					} else {
						value.push(field);
					}

					cb(value);
				}),
		);
	});

	return menu;
};
