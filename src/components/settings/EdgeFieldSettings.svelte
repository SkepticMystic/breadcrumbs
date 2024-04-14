<script lang="ts">
	import { XIcon } from "lucide-svelte";
	import { ICON_SIZE } from "src/const";
	import type { EdgeField, EdgeFieldGroup } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";

	export let plugin: BreadcrumbsPlugin;

	let dirty = false;

	const actions = {
		save: async () => {
			await Promise.all([plugin.saveSettings(), plugin.refresh()]);

			dirty = false;
		},

		fields: {
			add: () => {
				plugin.settings.edge_fields.push({
					label: "New Edge Field",
				});

				dirty = true;
				plugin = plugin;
			},
			remove: (edge_field: EdgeField) => {
				plugin.settings.edge_fields =
					plugin.settings.edge_fields.filter(
						(f) => f.label !== edge_field.label,
					);

				plugin.settings.edge_field_groups.forEach((group) => {
					group.fields = group.fields.filter(
						(f) => f !== edge_field.label,
					);
				});

				dirty = true;
				plugin = plugin;
			},

			rename: (edge_field: EdgeField, new_label: string) => {
				edge_field.label = new_label;

				plugin.settings.edge_field_groups.forEach((group) => {
					const index = group.fields.indexOf(edge_field.label);
					if (index === -1) return;

					group.fields[index] = new_label;
				});

				dirty = true;
				plugin = plugin;
			},
		},

		groups: {
			add: () => {
				plugin.settings.edge_field_groups.push({
					label: "New Group",
					fields: [],
				});

				dirty = true;
				plugin = plugin;
			},

			remove: (group: EdgeFieldGroup) => {
				plugin.settings.edge_field_groups =
					plugin.settings.edge_field_groups.filter(
						(g) => g.label !== group.label,
					);

				dirty = true;
				plugin = plugin;
			},

			rename: (group: EdgeFieldGroup, new_label: string) => {
				group.label = new_label;

				dirty = true;
				plugin = plugin;
			},

			add_field: (group: EdgeFieldGroup, field_label: string) => {
				group.fields.push(field_label);

				dirty = true;
				plugin = plugin;
			},

			remove_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

				group.fields = group.fields.filter((f) => f !== field_label);

				dirty = true;
				plugin = plugin;
			},
		},
	};
</script>

<div class="flex flex-col">
	<div class="flex flex-wrap items-center gap-2">
		<button on:click={actions.fields.add}> New Edge Field </button>

		<button on:click={actions.groups.add}> New Group </button>

		<button on:click={actions.save}> Save </button>

		{#if dirty}
			<span style="color: var(--text-warning);">
				Remember to save your changes!
			</span>
		{/if}
	</div>

	<h4>Fields</h4>
	<div class="flex flex-col gap-6">
		{#each plugin.settings.edge_fields as edge_field, i}
			{@const group_labels = plugin.settings.edge_field_groups
				.filter((group) => group.fields.includes(edge_field.label))
				.map((g) => g.label)}

			<div class="flex flex-col gap-2">
				<div class="flex items-center gap-1">
					<span>Field</span>

					<input
						type="text"
						class="w-32"
						value={edge_field.label}
						on:blur={(e) => {
							actions.fields.rename(
								edge_field,
								e.currentTarget.value,
							);
						}}
					/>
					<button title="Remove Field">
						<XIcon size={ICON_SIZE} />
					</button>
				</div>

				<div class="flex flex-wrap gap-1 px-3">
					<span>In Groups</span>

					{#each group_labels as group_label}
						<!-- svelte-ignore a11y-missing-attribute -->
						<!-- svelte-ignore a11y-click-events-have-key-events -->
						<!-- svelte-ignore a11y-no-static-element-interactions -->
						<a
							class="tag"
							title="Click to remove field from group"
							on:click={() => {
								actions.groups.remove_field(
									plugin.settings.edge_field_groups.find(
										(g) => g.label === group_label,
									),
									edge_field.label,
								);
							}}
						>
							{group_label} x
						</a>
					{/each}
				</div>
			</div>
		{/each}
	</div>

	<h4>Groups</h4>
	<div class="flex flex-col gap-6">
		{#each plugin.settings.edge_field_groups as group}
			<div class="flex flex-col gap-1">
				<div class="flex items-center gap-1">
					<span>Group</span>
					<input
						type="text"
						class="w-32"
						value={group.label}
						on:blur={(e) =>
							actions.groups.rename(group, e.currentTarget.value)}
					/>

					<button on:click={() => actions.groups.remove(group)}>
						<XIcon size={ICON_SIZE} />
					</button>

					<select
						class="dropdown"
						value=""
						on:change={(e) => {
							if (e.currentTarget.value) {
								actions.groups.add_field(
									group,
									e.currentTarget.value,
								);

								e.currentTarget.value = "";
							}
						}}
					>
						<option value="" disabled>Add Field to Group</option>

						{#each plugin.settings.edge_fields as edge_field}
							{#if !group.fields.includes(edge_field.label)}
								<option value={edge_field.label}>
									{edge_field.label}
								</option>
							{/if}
						{/each}
					</select>
				</div>

				<div class="flex flex-wrap items-center gap-1 px-3">
					<span>Fields</span>

					{#each group.fields as field}
						<div class="flex items-center gap-1">
							<!-- svelte-ignore a11y-missing-attribute -->
							<!-- svelte-ignore a11y-click-events-have-key-events -->
							<!-- svelte-ignore a11y-no-static-element-interactions -->
							<a
								class="tag"
								title="Click to remove field from group"
								on:click={() =>
									actions.groups.remove_field(group, field)}
							>
								{field} x
							</a>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
