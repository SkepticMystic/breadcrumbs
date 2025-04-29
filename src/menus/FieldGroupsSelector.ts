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

	const checks = edge_field_groups.map((group) =>
		value.includes(group.label),
	);

	const all_checked = checks.every((check) => check);

	menu.addItem((item) =>
		item.setTitle(all_checked ? "None" : "All").onClick(() => {
			value = all_checked
				? []
				: edge_field_groups.map((group) => group.label);

			cb(value);
		}),
	);

	menu.addSeparator();

	edge_field_groups.forEach((group, group_i) => {
		const checked = checks[group_i];

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
