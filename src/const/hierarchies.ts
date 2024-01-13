export const DIRECTIONS = ["up", "same", "down", "next", "prev"] as const;
export type Direction = (typeof DIRECTIONS)[number];

export const ARROW_DIRECTIONS: { [dir in Direction]: string } = {
	up: "↑",
	same: "↔",
	down: "↓",
	next: "→",
	prev: "←",
};
