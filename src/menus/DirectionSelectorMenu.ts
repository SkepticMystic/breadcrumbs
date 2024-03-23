import { Menu } from "obsidian";
import { DIRECTIONS, type Direction } from "src/const/hierarchies";

export const DirectionSelectorMenu = ({
	cb,
	value,
}: {
	value: Direction;
	cb: (_: Direction) => void;
}) => {
	const menu = new Menu();

	DIRECTIONS.forEach((dir) => {
		menu.addItem((item) =>
			item
				.setTitle(dir)
				.setChecked(value === dir)
				.onClick(() => {
					value = dir;
					cb(value);
				}),
		);
	});

	return menu;
};
