<script lang="ts">
	interface Props {
		tag: string;
		href?: string | undefined;
		title?: string | undefined;
		onclick?: (e: MouseEvent) => void;
		oncontextmenu?: (e: MouseEvent) => void;
		onkeydown?: (e: KeyboardEvent) => void;
	}

	let { 
		tag, 
		href = undefined, 
		title = undefined, 
		onclick = () => {},
		oncontextmenu = () => {},
		onkeydown = () => {}, 
	 }: Props = $props();
</script>

{#if href !== undefined}
	<a {href} {title} class="tag" onclick={onclick} oncontextmenu={oncontextmenu}>
		{tag}
	</a>
{:else}
	<!-- svelte-ignore a11y_missing_attribute -->
	<a
		{title}
		class="tag"
		tabindex="0"
		role="button"
		onclick={onclick}
		onkeydown={onkeydown}
		oncontextmenu={oncontextmenu}
	>
		{tag}
	</a>
{/if}
