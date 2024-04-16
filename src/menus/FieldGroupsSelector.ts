import { Menu } from "obsidian";
import type { EdgeFieldGroup } from "src/interfaces/settings";

export const FieldGroupsSelectorMenu = ({
	cb,
	value,
	edge_field_groups,
}: {
	value: string[];
	edge_field_groups: EdgeFieldGroup[];
	cb: (new_value: string[]) => void;
}) => {
	const menu = new Menu();

	edge_field_groups.forEach((group) => {
		const checked = value.includes(group.label);

		menu.addItem((item) =>
			item
				.setTitle(group.label)
				.setChecked(checked)
				.onClick(() => {
					if (checked) {
						// Remove all fields that are in the group
						value = value.filter((label) => label !== group.label);
					} else {
						// Add all fields that are in the group
						value.push(group.label);
					}

					cb(value);
				}),
		);
	});

	return menu;
};
