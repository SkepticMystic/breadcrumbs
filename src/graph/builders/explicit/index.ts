import type { BCEdgeAttributes, GraphBuilder } from "src/interfaces/graph";
import { _add_explicit_edges_tag_note } from "./tag_note";
import { _add_explicit_edges_typed_link } from "./typed_link";

export const add_explicit_edges: Record<
	Extract<BCEdgeAttributes, { explicit: true }>["source"],
	GraphBuilder
> = {
	typed_link: _add_explicit_edges_typed_link,
	tag_note: _add_explicit_edges_tag_note,
};
