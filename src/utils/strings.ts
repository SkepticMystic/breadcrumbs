import { log } from "src/logger";
import { deep_access } from "./objects";

export const split_and_trim = (str: string, delimiter = ","): string[] => {
	if (!str || str === "") return [];
	else return str.split(delimiter).map((str) => str.trim());
};

export const ensure_starts_with = (str: string, prefix: string): string =>
	str.startsWith(prefix) ? str : prefix + str;

export const ensure_ends_with = (str: string, suffix: string): string =>
	str.endsWith(suffix) ? str : str + suffix;

export const ensure_not_starts_with = (str: string, prefix: string): string =>
	str.startsWith(prefix) ? str.slice(prefix.length) : str;

export const ensure_not_ends_with = (str: string, suffix: string): string =>
	str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;

const TEMPLATE_REGEX = /{{(.*?)}}/g;

export const resolve_templates = (
	str: string,
	templates: Record<string, unknown>,
): string => {
	let resolved = str.slice();

	resolved.match(TEMPLATE_REGEX)?.forEach((match) => {
		const key = match.slice(2, -2);
		const value = deep_access(templates, key.split("."));

		if (value !== undefined) {
			resolved = resolved.replace(match, String(value));
		}
	});

	return resolved;
};
