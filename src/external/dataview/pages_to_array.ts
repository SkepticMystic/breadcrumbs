/**
 * `DataviewApi.pages()` returns a `DataArray` in 0.5.x (not a plain `[]`).
 * Normalize to a plain array for `forEach` / `.map` without depending on Dataview
 * runtime exports beyond duck-typing.
 */
export function dataview_pages_to_plain_array(pages: unknown): unknown[] {
	if (pages == null) return [];
	if (Array.isArray(pages)) return pages;

	if (typeof pages === "object") {
		const p = pages as Record<string, unknown>;
		if (typeof p.array === "function") {
			try {
				const out = (p.array as () => unknown[])();
				if (Array.isArray(out)) return out;
			} catch {
				/* fall through */
			}
		}
		if (Array.isArray(p.values)) return p.values;
		if (Symbol.iterator in p) {
			return [...(pages as Iterable<unknown>)];
		}
	}

	return [];
}
