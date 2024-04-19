<script lang="ts">
	import { PlusIcon, SaveIcon } from "lucide-svelte";
	import { Menu, Notice } from "obsidian";
	import { ICON_SIZE } from "src/const";
	import type { EdgeField, EdgeFieldGroup } from "src/interfaces/settings";
	import type BreadcrumbsPlugin from "src/main";
	import { onDestroy } from "svelte";
	import Tag from "../obsidian/tag.svelte";

	export let plugin: BreadcrumbsPlugin;

	onDestroy(() => {
		if (dirty) {
			new Notice(
				"⚠️ Exited without saving changes to Edge Field Settings. Your changes are still in effect, but were not saved. Go back and click 'Save' if you want them to persist.",
			);
		}
	});

	let dirty = false;

	let filters = {
		fields: "",
		groups: "",
	};

	const actions = {
		save: async () => {
			await Promise.all([plugin.saveSettings(), plugin.refresh()]);

			dirty = false;
		},

		fields: {
			add: () => {
				plugin.settings.edge_fields.push({
					label: `Edge Field ${plugin.settings.edge_fields.length + 1}`,
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
				if (edge_field.label === new_label) return;

				plugin.settings.edge_field_groups.forEach((group) => {
					const index = group.fields.indexOf(edge_field.label);
					if (index === -1) return;

					group.fields[index] = new_label;
				});

				// NOTE: Only rename the field after updating the groups
				edge_field.label = new_label;

				dirty = true;
				plugin = plugin;
			},
		},

		groups: {
			add: () => {
				plugin.settings.edge_field_groups.push({
					label: `Group ${plugin.settings.edge_field_groups.length + 1}`,
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
				if (group.label === new_label) return;

				group.label = new_label;

				dirty = true;
				plugin = plugin;
			},

			add_field: (
				group: EdgeFieldGroup | undefined,
				field_label: string,
			) => {
				if (!group) return;

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

	const context_menus = {
		field_group:
			(edge_field: EdgeField, group_label: string) => (e: MouseEvent) => {
				const menu = new Menu();

				menu.addItem((item) =>
					item
						.setTitle("Remove from Group")
						.setIcon("x")
						.onClick(() =>
							actions.groups.remove_field(
								plugin.settings.edge_field_groups.find(
									(g) => g.label === group_label,
								),
								edge_field.label,
							),
						),
				);

				menu.showAtMouseEvent(e);
			},

		group_field:
			(group: EdgeFieldGroup, field_label: string) => (e: MouseEvent) => {
				const menu = new Menu();

				menu.addItem((item) =>
					item
						.setTitle("Remove Field")
						.setIcon("x")
						.onClick(() =>
							actions.groups.remove_field(group, field_label),
						),
				);

				menu.showAtMouseEvent(e);
			},
	};
</script>

<div class="flex flex-col">
	<div class="my-2 flex items-center gap-2">
		<button class="flex items-center gap-1" on:click={actions.save}>
			<SaveIcon size={ICON_SIZE} />
			Save
		</button>

		{#if dirty}
			<span class="text-warning">Unsaved changes</span>
		{/if}
	</div>

	<div class="flex items-center gap-3">
		<h4>Fields</h4>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Fields by Name"
				bind:value={filters.fields}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filters.fields === ""}
				on:click={() => (filters.fields = "")}
			>
				X
			</button>
		</div>
	</div>

	<div class="flex flex-col gap-7">
		{#each plugin.settings.edge_fields.filter( (f) => f.label.includes(filters.fields), ) as field}
			{@const group_labels = plugin.settings.edge_field_groups
				.filter((group) => group.fields.includes(field.label))
				.map((g) => g.label)}

			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-1">
					<input
						id="BC-edge-field-{field.label}"
						type="text"
						class="w-48 scroll-mt-24"
						placeholder="Field Label"
						value={field.label}
						on:blur={(e) =>
							actions.fields.rename(field, e.currentTarget.value)}
					/>
					<button
						class="w-8"
						title="Remove Field"
						on:click={() => actions.fields.remove(field)}
					>
						X
					</button>
				</div>

				<!-- TODO: I don't think this key even does what I'm looking for
				The intention is to update the groups_label references when the groups themselves change
			To replicate an issue this cause, context-menu > remove field from group, then do that again. It doesn't remove the second time -->
				{#key plugin.settings.edge_field_groups}
					<div class="flex flex-wrap items-center gap-1.5">
						<span>Groups</span>

						{#each group_labels as group_label}
							<div class="flex items-center gap-0.5">
								<Tag
									tag={group_label}
									href="#BC-edge-group-{group_label}"
									title="Jump to group. Right click for more actions."
									on:contextmenu={context_menus.field_group(
										field,
										group_label,
									)}
								/>
							</div>
						{/each}

						{#if !group_labels.length}
							<span class="search-empty-state my-0">
								{"<none>"}
							</span>
						{/if}

						<select
							class="dropdown"
							value=""
							on:change={(e) => {
								if (e.currentTarget.value) {
									actions.groups.add_field(
										plugin.settings.edge_field_groups.find(
											(g) =>
												g.label ===
												e.currentTarget.value,
										),
										field.label,
									);

									e.currentTarget.value = "";
								}
							}}
						>
							<option value="" disabled>Add to Group</option>

							{#each plugin.settings.edge_field_groups as group}
								{#if !group.fields.includes(field.label)}
									<option value={group.label}>
										{group.label}
									</option>
								{/if}
							{/each}
						</select>
					</div>
				{/key}
			</div>
		{/each}

		<button class="flex items-center gap-1" on:click={actions.fields.add}>
			<PlusIcon size={ICON_SIZE} />
			New Edge Field
		</button>
	</div>

	<hr />

	<div class="flex items-center gap-3">
		<h4>Groups</h4>

		<div class="flex gap-1">
			<input
				type="text"
				placeholder="Filter Groups by Name"
				bind:value={filters.groups}
			/>
			<button
				class="w-8"
				aria-label="Clear Filter"
				disabled={filters.groups === ""}
				on:click={() => (filters.groups = "")}
			>
				X
			</button>
		</div>
	</div>

	<div class="flex flex-col gap-7">
		{#each plugin.settings.edge_field_groups.filter( (group) => group.label.includes(filters.groups), ) as group}
			<div class="flex flex-col gap-2">
				<div class="flex flex-wrap items-center gap-1">
					<input
						id="BC-edge-group-{group.label}"
						type="text"
						class="w-48 scroll-mt-24"
						placeholder="Group Label"
						value={group.label}
						on:blur={(e) =>
							actions.groups.rename(group, e.currentTarget.value)}
					/>

					<button
						class="w-8"
						title="Remove Group"
						on:click={() => actions.groups.remove(group)}
					>
						X
					</button>
				</div>

				<div class="flex flex-wrap items-center gap-1.5">
					<span>Fields</span>

					{#each group.fields as field_label}
						<div class="flex items-center gap-0.5">
							<Tag
								tag={field_label}
								href="#BC-edge-field-{field_label}"
								title="Jump to field. Right click for more actions."
								on:contextmenu={context_menus.group_field(
									group,
									field_label,
								)}
							/>
						</div>
					{/each}

					{#if !group.fields.length}
						<span class="search-empty-state my-0">{"<none>"}</span>
					{/if}

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
						<option value="" disabled>Add Field</option>

						{#each plugin.settings.edge_fields as edge_field}
							{#if !group.fields.includes(edge_field.label)}
								<option value={edge_field.label}>
									{edge_field.label}
								</option>
							{/if}
						{/each}
					</select>
				</div>
			</div>
		{/each}

		<button class="flex items-center gap-1" on:click={actions.groups.add}>
			<PlusIcon size={ICON_SIZE} />
			New Group
		</button>
	</div>
</div>
