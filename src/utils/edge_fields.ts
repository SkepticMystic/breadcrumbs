import type { BreadcrumbsSettings } from "src/interfaces/settings";
import { remove_duplicates } from "./arrays";

export const resolve_field_group_labels = (
	edge_field_groups: BreadcrumbsSettings["edge_field_groups"],
	field_group_labels: string[],
) =>
	remove_duplicates(
		edge_field_groups
			.filter((group) => field_group_labels.includes(group.label))
			.flatMap((group) => group.fields),
	);
