import { url_search_params } from "src/utils/url";
import { describe, test } from "vitest";

describe("url_search_params", () => {
	test("happy", (t) => {
		t.expect(url_search_params({ a: 1, b: 2 })).toBe("a=1 b=2");
	});

	test("happy > custom delimiter", (t) => {
		t.expect(url_search_params({ a: 1, b: 2 }, { delimiter: "&" })).toBe(
			"a=1&b=2",
		);
	});

	test("happy > trim lone param", (t) => {
		t.expect(
			url_search_params({ a: 1, b: 2 }, { trim_lone_param: true }),
		).toBe("a=1 b=2");
	});

	test("happy > trim lone param > custom delimiter", (t) => {
		t.expect(
			url_search_params(
				{ a: 1, b: 2 },
				{ delimiter: "&", trim_lone_param: true },
			),
		).toBe("a=1&b=2");
	});

	test("empty object", (t) => {
		t.expect(url_search_params({})).toBe("");
	});

	test("empty object > custom delimiter", (t) => {
		t.expect(url_search_params({}, { delimiter: "&" })).toBe("");
	});

	test("one item", (t) => {
		t.expect(url_search_params({ a: 1 })).toBe("a=1");
	});

	test("one item > custom delimiter", (t) => {
		t.expect(url_search_params({ a: 1 }, { delimiter: "&" })).toBe("a=1");
	});

	test("one item > trim lone param", (t) => {
		t.expect(url_search_params({ a: 1 }, { trim_lone_param: true })).toBe(
			"1",
		);
	});

	test("one item > trim lone param > custom delimiter", (t) => {
		t.expect(
			url_search_params(
				{ a: 1 },
				{ delimiter: "&", trim_lone_param: true },
			),
		).toBe("1");
	});
});
