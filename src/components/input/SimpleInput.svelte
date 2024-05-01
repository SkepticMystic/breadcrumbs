<script lang="ts">
	import { createEventDispatcher } from "svelte";

	export let label = "";
	export let disabled_cb: (value: string) => boolean = () => false;

	let value = "";

	const dispatch = createEventDispatcher<{ submit: string }>();
</script>

<div class="flex flex-col gap-1">
	{#if label}
		<label for="input">
			{label}
		</label>
	{/if}

	<input name="input" type="text" bind:value />

	<button
		disabled={disabled_cb(value)}
		on:click={() => dispatch("submit", value)}
	>
		Submit
	</button>
</div>
