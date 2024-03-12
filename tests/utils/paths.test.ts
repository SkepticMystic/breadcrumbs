import { Paths } from "src/utils/paths";
import { describe, test } from "vitest";

const path = "folder/note.md";

describe("ensure_ext", () => {
	test("should add if path doesn't have an ext", (t) => {
		t.expect(Paths.ensure_ext("folder/note", "md")).toBe(path);
	});

	test("shouldn't add if path already has the ext", (t) => {
		t.expect(Paths.ensure_ext(path, "md")).toBe(path);
	});

	// NOTE: This isn't the goal of the util. Obsidian paths could have '.' in them without it meaning an ext
	// test("should replace if path has a different ext", (t) => {
	// 	t.expect(Paths.ensure_ext("path.html", "md")).toBe("path.md");
	// });
});

describe("drop_ext", () => {
	test("should drop ext", (t) => {
		t.expect(Paths.drop_ext(path)).toBe("folder/note");
	});

	test("shouldn't drop if no ext", (t) => {
		t.expect(Paths.drop_ext("folder/note")).toBe("folder/note");
	});
});

describe("drop_folder", () => {
	test("should drop folder", (t) => {
		t.expect(Paths.drop_folder(path)).toBe("note.md");
	});

	test("shouldn't drop if no folder", (t) => {
		t.expect(Paths.drop_folder("note.md")).toBe("note.md");
	});
});

describe("show", () => {
	test("should drop ext and folder by default", (t) => {
		t.expect(Paths.show(path)).toBe("note");
	});

	test("should keep true components", (t) => {
		t.expect(Paths.show(path, { ext: true })).toBe("note.md");
		t.expect(Paths.show(path, { folder: true })).toBe("folder/note");
		t.expect(Paths.show(path, { ext: true, folder: true })).toBe(path);
	});

	test("should drop explicitly false components", (t) => {
		t.expect(Paths.show(path, { ext: false, folder: false })).toBe("note");
	});
});
