import {
	resolve_templates,
	split_and_trim,
	wrap_in_codeblock,
} from "src/utils/strings";
import { describe, test } from "vitest";

describe("split_and_trim", () => {
	test("regular", (t) => {
		t.expect(split_and_trim("a, b, c")).toStrictEqual(["a", "b", "c"]);
	});

	test("regular (custom delimiter)", (t) => {
		t.expect(split_and_trim("a|b|c", "|")).toStrictEqual(["a", "b", "c"]);
	});

	test("empty string", (t) => {
		t.expect(split_and_trim("")).toStrictEqual([]);
	});

	test("empty string with custom delimiter", (t) => {
		t.expect(split_and_trim("", "|")).toStrictEqual([]);
	});

	test("one item", (t) => {
		t.expect(split_and_trim("a")).toStrictEqual(["a"]);
	});

	test("one item with custom delimiter", (t) => {
		t.expect(split_and_trim("a", "|")).toStrictEqual(["a"]);
	});
});

describe("resolve_templates", (d) => {
	test("regular", (t) => {
		t.expect(resolve_templates("Hello, {{name}}!", { name: "world" })).toBe(
			"Hello, world!",
		);
	});

	test("nested", (t) => {
		t.expect(
			resolve_templates("Hello, {{user.name}}!", {
				user: { name: "world" },
			}),
		).toBe("Hello, world!");
	});

	test("missing", (t) => {
		t.expect(resolve_templates("Hello, {{name}}!", {})).toBe(
			"Hello, {{name}}!",
		);
	});

	test("missing nested", (t) => {
		t.expect(resolve_templates("Hello, {{user.name}}!", { user: {} })).toBe(
			"Hello, {{user.name}}!",
		);
	});
});

describe("wrap_in_codeblock", () => {
	test("no lang", (t) => {
		t.expect(wrap_in_codeblock("hello")).toBe("```\nhello\n```");
	});

	test("with lang", (t) => {
		t.expect(wrap_in_codeblock("hello", "ts")).toBe("```ts\nhello\n```");
	});
});
