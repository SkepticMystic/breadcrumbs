import { Menu } from "obsidian";
import type { EdgeFieldGroup } from "src/interfaces/settings";

export const FieldGroupsSelectorMenu = ({
	cb,
	value,
	edge_field_groups,
}: {
	value: EdgeFieldGroup[];
	edge_field_groups: EdgeFieldGroup[];
	cb: (new_value: EdgeFieldGroup[]) => void;
}) => {
	const menu = new Menu();

	edge_field_groups.forEach((group) => {
		const checked = value.some((g) => group.label === g.label);

		menu.addItem((item) =>
			item
				.setTitle(group.label)
				.setChecked(checked)
				.onClick(() => {
					if (checked) {
						// Remove all fields that are in the group
						value = value.filter((g) => g.label !== group.label);
					} else {
						// Add all fields that are in the group
						value.push(group);
					}

					cb(value);
				}),
		);
	});

	return menu;
};
