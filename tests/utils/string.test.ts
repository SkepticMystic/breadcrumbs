import { split_and_trim } from "src/utils/strings";
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
