<script lang="ts">
	import { createBubbler } from 'svelte/legacy';

	const bubble = createBubbler();
	interface Props {
		tag: string;
		href?: string | undefined;
		title?: string | undefined;
	}

	let { tag, href = undefined, title = undefined }: Props = $props();
</script>

{#if href !== undefined}
	<a {href} {title} class="tag" onclick={bubble('click')} oncontextmenu={bubble('contextmenu')}>
		{tag}
	</a>
{:else}
	<!-- svelte-ignore a11y_missing_attribute -->
	<a
		{title}
		class="tag"
		tabindex="0"
		role="button"
		onclick={bubble('click')}
		onkeydown={bubble('keydown')}
		oncontextmenu={bubble('contextmenu')}
	>
		{tag}
	</a>
{/if}
