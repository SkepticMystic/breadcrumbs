import { Links } from "src/utils/links";
import { describe, test } from "vitest";

describe("Links.ify", () => {
	const display = "display";
	const no_ext = "folder/note";
	const path = "folder/note.md";

	test("kind:none", (t) => {
		t.expect(
			Links.ify(path, path, {
				link_kind: "none",
			}),
		).toBe(path);
	});

	test("kind:none (display)", (t) => {
		t.expect(
			Links.ify(path, display, {
				link_kind: "none",
			}),
		).toBe(display);
	});

	test("kind:wiki", (t) => {
		t.expect(
			Links.ify(path, path, {
				link_kind: "wiki",
			}),
		).toBe(`[[${no_ext}]]`);
	});

	test("kind:wiki (display)", (t) => {
		t.expect(
			Links.ify(path, display, {
				link_kind: "wiki",
			}),
		).toBe(`[[${no_ext}|${display}]]`);
	});

	test("kind:markdown", (t) => {
		t.expect(
			Links.ify(path, path, {
				link_kind: "markdown",
			}),
		).toBe(`[${path}](${path})`);
	});

	test("kind:markdown (display)", (t) => {
		t.expect(
			Links.ify(path, display, {
				link_kind: "markdown",
			}),
		).toBe(`[${display}](${path})`);
	});
});
