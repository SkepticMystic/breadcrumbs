import type { Literal } from "./zod";
import { deep_access } from "./objects";

export function split_and_trim(str: string, delimiter = ","): string[] {
	if (!str || str === "") return [];
	else return str.split(delimiter).map((str) => str.trim());
}

export function quote_join(
	arr: Literal[] | readonly Literal[],
	quote = '"',
	joiner = ", ",
): string {
	return arr.map((str) => quote + str + quote).join(joiner);
}

export function ensure_starts_with(str: string, prefix: string): string {
	return str.startsWith(prefix) ? str : prefix + str;
}

export function ensure_ends_with(str: string, suffix: string): string {
	return str.endsWith(suffix) ? str : str + suffix;
}

export function ensure_not_starts_with(str: string, prefix: string): string {
	return str.startsWith(prefix) ? str.slice(prefix.length) : str;
}

export function ensure_not_ends_with(str: string, suffix: string): string {
	return str.endsWith(suffix) ? str.slice(0, -suffix.length) : str;
}

const TEMPLATE_REGEX = /{{(.*?)}}/g;

export function resolve_templates(
	str: string,
	templates: Record<string, unknown>,
): string {
	let resolved = str.slice();

	resolved.match(TEMPLATE_REGEX)?.forEach((match) => {
		const key = match.slice(2, -2);
		const value = deep_access(templates, key.split("."));

		if (value !== undefined) {
			const str = String(value);
			resolved = resolved.replace(match, str);
		}
	});

	return resolved;
}

export function wrap_in_codeblock(str: string, lang = ""): string {
	return "```" + lang + "\n" + str + "\n```";
}
