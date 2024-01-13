export const split_and_trim = (str: string, delimiter?: string): string[] => {
	if (!str || str === "") return [];
	else return str.split(delimiter ?? ",").map((str) => str.trim());
};
