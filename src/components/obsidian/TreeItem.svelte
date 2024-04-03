<script lang="ts">
	import ChevronOpener from "../ChevronOpener.svelte";

	export let details_cls = "";

	let open = true;
</script>

<details class="tree-item {details_cls}" bind:open>
	<!-- svelte-ignore a11y-click-events-have-key-events -->
	<!-- svelte-ignore a11y-no-static-element-interactions -->
	<summary class="tree-item-self is-clickable mod-collapsible text-lg">
		<div class="tree-item-icon collapse-icon">
			<ChevronOpener {open} />
		</div>

		<slot class="tree-item-inner" name="tree-item-inner" />

		<slot class="tree-item-flair-outer" name="tree-item-flair-outer" />
	</summary>

	<slot class="tree-item-children" name="tree-item-children" />
</details>
