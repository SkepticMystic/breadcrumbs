<script lang="ts">
	import { GroupIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeFieldGroup } from "src/interfaces/settings";
	import { FieldGroupsSelectorMenu } from "src/menus/FieldGroupsSelector";

	interface Props {
		cls?: string;
		field_group_labels: string[];
		edge_field_groups: EdgeFieldGroup[];
	}

	let { cls = "", field_group_labels = $bindable(), edge_field_groups }: Props = $props();
</script>

<button
	class={cls}
	aria-label="Choose edge field groups"
	onclick={(e) => {
		FieldGroupsSelectorMenu({
			edge_field_groups,
			value: field_group_labels,
			cb: (value) => (field_group_labels = value),
		}).showAtMouseEvent(e);
	}}
>
	<GroupIcon size={ICON_SIZE} />
</button>
