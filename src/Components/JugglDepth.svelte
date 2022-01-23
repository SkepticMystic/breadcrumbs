<script lang="ts">
    import JugglButton from "./JugglButton.svelte";

    export let maxDepth;
    export let onUpdateDepth;
    export let up: boolean;

    let depth = maxDepth;
    export let visible = true;

</script>

{#if visible}
    <div class="cy-toolbar-section">
        <JugglButton icon="-" disabled={depth <= 0} onClick={() => {depth -= 1; onUpdateDepth(depth);}}  >
        </JugglButton>

        <JugglButton icon={depth} disabled={true} onClick={null}>
        </JugglButton>

        <JugglButton icon="+" disabled={depth >= maxDepth} onClick={() => {depth += 1; onUpdateDepth(depth);}} >
        </JugglButton>
    </div>
{/if}