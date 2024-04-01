import { url_search_params } from "src/utils/url";
import { describe, test } from "vitest";

describe("url_search_params", () => {
	test("one item with custom delimiter", (t) => {
		t.expect(url_search_params({ a: 1 }, { delimiter: "&" })).toBe("a=1");
	});

	test("regular", (t) => {
		t.expect(url_search_params({ a: 1, b: 2 })).toBe("a=1 b=2");
	});

	test("custom delimiter", (t) => {
		t.expect(url_search_params({ a: 1, b: 2 }, { delimiter: "&" })).toBe(
			"a=1&b=2",
		);
	});

	test("empty object", (t) => {
		t.expect(url_search_params({})).toBe("");
	});

	test("empty object with custom delimiter", (t) => {
		t.expect(url_search_params({}, { delimiter: "&" })).toBe("");
	});

	test("one item", (t) => {
		t.expect(url_search_params({ a: 1 })).toBe("a=1");
	});
});
