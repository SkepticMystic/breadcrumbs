import type { ExplicitEdgeSource } from "src/const/graph";
import type { ExplicitEdgeBuilder } from "src/interfaces/graph";
import { _add_explicit_edges_list_note } from "./list_note";
import { _add_explicit_edges_tag_note } from "./tag_note";
import { _add_explicit_edges_typed_link } from "./typed_link";

export const add_explicit_edges: Record<
	ExplicitEdgeSource,
	ExplicitEdgeBuilder
> = {
	typed_link: _add_explicit_edges_typed_link,
	tag_note: _add_explicit_edges_tag_note,
	list_note: _add_explicit_edges_list_note,
};
