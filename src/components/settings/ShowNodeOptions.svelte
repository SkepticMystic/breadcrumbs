<script lang="ts">
	import type { ShowNodeOptions } from "src/interfaces/settings";

	export let show_node_options: ShowNodeOptions;
</script>

<!-- NOTE: I've ended up using regular TS and the Obsidian Setting builder for this -->
<div>
	<label>
		<input type="checkbox" bind:checked={show_node_options.folder} />
		<span>Show Folder</span>
	</label>

	<label>
		<input type="checkbox" bind:checked={show_node_options.ext} />
		<span>Show Extension</span>
	</label>
</div>
