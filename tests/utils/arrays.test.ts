import {
	ensure_is_array,
	ensure_square_array,
	gather_by_runs,
	group_by,
	remove_duplicates,
	remove_duplicates_by,
	swap_items,
	transpose,
} from "src/utils/arrays";
import { describe, test } from "vitest";

describe("swap_items", () => {
	const original = [0, 1, 2];

	test("happy", (t) => {
		t.expect(swap_items(0, 1, original)).toEqual([1, 0, 2]);
	});

	test("out-of-bounds i", (t) => {
		t.expect(swap_items(-1, 1, original)).toEqual(original);
	});

	test("out-of-bounds j", (t) => {
		t.expect(swap_items(0, 3, original)).toEqual(original);
	});

	test("out-of-bounds i and j", (t) => {
		t.expect(swap_items(-1, 3, original)).toEqual(original);
	});
});

describe("ensure_is_array", () => {
	test("happy", (t) => {
		t.expect(ensure_is_array([1, 2, 3])).toEqual([1, 2, 3]);
	});

	test("scalar", (t) => {
		t.expect(ensure_is_array(1)).toEqual([1]);
	});
});

describe("ensure_square_array", () => {
	test("happy", (t) => {
		const arr = [[1, 2, 3], [4, 5], [6]];

		t.expect(ensure_square_array(arr, 0)).toEqual([
			[1, 2, 3],
			[4, 5, 0],
			[6, 0, 0],
		]);
	});

	test("pre", (t) => {
		const arr = [[1, 2, 3], [4, 5], [6]];

		t.expect(ensure_square_array(arr, 0, true)).toEqual([
			[1, 2, 3],
			[0, 4, 5],
			[0, 0, 6],
		]);
	});
});

describe("transpose", () => {
	test("empty", (t) => {
		const arr: number[][] = [];

		t.expect(transpose(arr)).toEqual([]);
	});

	test("scalar", (t) => {
		const arr = [[1]];

		t.expect(transpose(arr)).toEqual([[1]]);
	});

	test("row", (t) => {
		const arr = [[1, 2, 3]];

		t.expect(transpose(arr)).toEqual([[1], [2], [3]]);
	});

	test("column", (t) => {
		const arr = [[1], [2], [3]];

		t.expect(transpose(arr)).toEqual([[1, 2, 3]]);
	});

	test("square", (t) => {
		const arr = [
			[1, 2, 3],
			[4, 5, 6],
		];

		t.expect(transpose(arr)).toEqual([
			[1, 4],
			[2, 5],
			[3, 6],
		]);
	});

	// NOTE: transpose makes no checks that the input is square
	// And tests for it are flaky, since the implementation depends on the input being square
});

describe("gather_by_runs", () => {
	test("empty", (t) => {
		const arr: number[] = [];

		t.expect(gather_by_runs(arr, (v) => v)).toEqual([]);
	});

	test("long", (t) => {
		const arr = [1, 1, 1, 2, 2, 3, 3, 3, 3, 4, 4, 4, 5, 5, 5, 5, 5];

		t.expect(gather_by_runs(arr, (v) => v)).toEqual([
			{ value: 1, first: 0, last: 2 },
			{ value: 2, first: 3, last: 4 },
			{ value: 3, first: 5, last: 8 },
			{ value: 4, first: 9, last: 11 },
			{ value: 5, first: 12, last: 16 },
		]);
	});
});

describe("group_by", () => {
	test("happy", (t) => {
		const arr = [
			{ a: 1, b: 1 },
			{ a: 1, b: 2 },
			{ a: 2, b: 3 },
			{ a: 2, b: 4 },
			{ a: 3, b: 5 },
			{ a: 3, b: 6 },
		];

		t.expect(group_by(arr, (v) => v.a.toString())).toEqual({
			1: [
				{ a: 1, b: 1 },
				{ a: 1, b: 2 },
			],
			2: [
				{ a: 2, b: 3 },
				{ a: 2, b: 4 },
			],
			3: [
				{ a: 3, b: 5 },
				{ a: 3, b: 6 },
			],
		});
	});

	test("happy (projection)", (t) => {
		const arr = [
			{ a: 1, b: 1 },
			{ a: 1, b: 2 },
			{ a: 2, b: 3 },
			{ a: 2, b: 4 },
			{ a: 3, b: 5 },
			{ a: 3, b: 6 },
		];

		t.expect(
			group_by(
				arr,
				(v) => v.a.toString(),
				(v) => ({ b: v.b }),
			),
		).toEqual({
			1: [{ b: 1 }, { b: 2 }],
			2: [{ b: 3 }, { b: 4 }],
			3: [{ b: 5 }, { b: 6 }],
		});
	});
});

describe("remove_duplicates", (t) => {
	test("empty", (t) => {
		const arr: number[] = [];

		t.expect(remove_duplicates(arr)).toEqual([]);
	});

	test("happy", (t) => {
		const arr = [1, 2, 3, 1, 2, 3, 4, 5, 6, 4, 5, 6];

		t.expect(remove_duplicates(arr)).toEqual([1, 2, 3, 4, 5, 6]);
	});
});

describe("remove_duplicates_by", (t) => {
	test("empty", (t) => {
		const arr: number[] = [];

		t.expect(remove_duplicates_by(arr, (v) => v)).toEqual([]);
	});

	test("happy", (t) => {
		const arr = [
			{ a: 1, b: 1 },
			{ a: 1, b: 2 },
			{ a: 2, b: 3 },
			{ a: 2, b: 4 },
			{ a: 3, b: 5 },
			{ a: 3, b: 6 },
		];

		t.expect(remove_duplicates_by(arr, (v) => v.a)).toEqual([
			{ a: 1, b: 1 },
			{ a: 2, b: 3 },
			{ a: 3, b: 5 },
		]);
	});
});
