import { deep_merge_objects } from "src/utils/objects";
import { describe, test } from "vitest";

describe("deep_merge_objects", () => {
	test("depth 1", (t) => {
		const obj1: Record<string, any> = { a: 1, c: 3 };
		const obj2: Record<string, any> = { b: 2, c: 4 };

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({
			a: 1,
			b: 2,
			c: 3,
		});
	});

	test("depth 2", (t) => {
		const obj1: Record<string, any> = {
			top1: { a: 1, c: 3 },
			top2: { d: 5 },
		};
		const obj2: Record<string, any> = {
			top1: { b: 2, c: 4 },
			top2: { e: 6 },
		};

		t.expect(deep_merge_objects(obj1, obj2)).toEqual({
			top1: { a: 1, b: 2, c: 3 },
			top2: { d: 5, e: 6 },
		});
	});

	// TODO: Implement and test arrays
});
