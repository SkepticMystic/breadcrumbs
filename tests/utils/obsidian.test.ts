import type { App } from "obsidian";
import { TFile } from "obsidian";
import { resolve_relative_target_path } from "src/utils/obsidian";
import { describe, expect, test } from "vitest";

function tfile(path: string): TFile {
	return Object.assign(new TFile(), { path }) as TFile;
}

/**
 * Minimal App whose vault contains `paths`. Link resolution is by basename,
 * as Obsidian's shortest-path-when-possible mode behaves — and, crucially,
 * it returns null for anything carrying a `#subpath`, like the real API.
 */
function app(paths: string[]): App {
	const files = new Map(
		paths.map((path) => [path, tfile(path)] as const),
	);

	const by_linkpath = (linkpath: string) => {
		if (linkpath.includes("#")) return null;

		const with_ext = linkpath.endsWith(".md") ? linkpath : `${linkpath}.md`;
		return (
			files.get(with_ext) ??
			[...files.values()].find(
				(f) => f.path.split("/").pop() === with_ext.split("/").pop(),
			) ??
			null
		);
	};

	return {
		metadataCache: { getFirstLinkpathDest: by_linkpath },
		vault: { getAbstractFileByPath: (path: string) => files.get(path) ?? null },
		fileManager: { getNewFileParent: () => ({ path: "" }) },
	} as unknown as App;
}

describe("resolve_relative_target_path", () => {
	test("plain link resolves to the file", () => {
		const r = resolve_relative_target_path(app(["2.md"]), "2", "1.md");

		expect(r?.[0]).toBe("2.md");
		expect(r?.[1]).not.toBeNull();
	});

	// #734: a block-ref link is a link to the note, so the note must be the
	// edge target — otherwise it never sees the reverse edge.
	test("block-ref link resolves to the note", () => {
		const r = resolve_relative_target_path(
			app(["2.md"]),
			"2#^71f2d9",
			"1.md",
		);

		expect(r?.[0]).toBe("2.md");
		expect(r?.[1]).not.toBeNull();
	});

	test("heading-ref link resolves to the note", () => {
		const r = resolve_relative_target_path(app(["2.md"]), "2#Some Heading", "1.md");

		expect(r?.[0]).toBe("2.md");
	});

	test("block-ref link in another folder resolves to the note", () => {
		const r = resolve_relative_target_path(
			app(["notes/deep/2.md"]),
			"notes/deep/2#^71f2d9",
			"1.md",
		);

		expect(r?.[0]).toBe("notes/deep/2.md");
	});

	test("block-ref to a note that doesn't exist → unresolved path without the subpath", () => {
		const r = resolve_relative_target_path(app([]), "ghost#^71f2d9", "1.md");

		expect(r?.[0]).toBe("ghost.md");
		expect(r?.[1]).toBeNull();
	});

	test("same-note subpath link → skipped entirely", () => {
		expect(
			resolve_relative_target_path(app(["1.md"]), "#^71f2d9", "1.md"),
		).toBeNull();
		expect(
			resolve_relative_target_path(app(["1.md"]), "#Heading", "1.md"),
		).toBeNull();
	});

	test("non-md link keeps its extension", () => {
		const r = resolve_relative_target_path(app(["A.canvas"]), "A.canvas", "1.md");

		expect(r?.[0]).toBe("A.canvas");
	});

	test("non-md link with a subpath drops only the subpath", () => {
		const r = resolve_relative_target_path(
			app(["A.canvas"]),
			"A.canvas#group",
			"1.md",
		);

		expect(r?.[0]).toBe("A.canvas");
	});
});
