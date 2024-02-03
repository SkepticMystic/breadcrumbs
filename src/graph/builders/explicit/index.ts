import type { ExplicitEdgeSource } from "src/const/graph";
import type { ExplicitEdgeBuilder } from "src/interfaces/graph";
import { _add_explicit_edges_list_note } from "./list_note";
import { _add_explicit_edges_tag_note } from "./tag_note";
import { _add_explicit_edges_typed_link } from "./typed_link";
import { _add_explicit_edges_dendron_note } from "./dendron_note";
import { _add_explicit_edges_dataview_note } from "./dataview_note";
import { _add_explicit_edges_date_note } from "./date_note";

export const add_explicit_edges: Record<
	ExplicitEdgeSource,
	ExplicitEdgeBuilder
> = {
	typed_link: _add_explicit_edges_typed_link,
	tag_note: _add_explicit_edges_tag_note,
	list_note: _add_explicit_edges_list_note,
	dendron_note: _add_explicit_edges_dendron_note,
	dataview_note: _add_explicit_edges_dataview_note,
	date_note: _add_explicit_edges_date_note,
};
