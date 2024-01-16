export const split_and_trim = (str: string, delimiter?: string): string[] => {
	if (!str || str === "") return [];
	else return str.split(delimiter ?? ",").map((str) => str.trim());
};

export const ensure_starts_with = (str: string, prefix: string): string =>
	str.startsWith(prefix) ? str : prefix + str;

export const ensure_ends_with = (str: string, suffix: string): string =>
	str.endsWith(suffix) ? str : str + suffix;
