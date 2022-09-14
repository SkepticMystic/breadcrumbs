<script lang="ts">
  import JugglButton from "./JugglButton.svelte";

  export let visible = true;
  export let maxDepth: number;
  export let onUpdateDepth: (depth: number) => void;

  let depth = maxDepth;
</script>

{#if visible}
  <div class="cy-toolbar-section">
    <JugglButton
      icon="-"
      disabled={depth <= 0}
      onClick={() => {
        depth -= 1;
        onUpdateDepth(depth);
      }}
    />

    <JugglButton icon={depth} disabled={true} onClick={null} />

    <JugglButton
      icon="+"
      disabled={depth >= maxDepth}
      onClick={() => {
        depth += 1;
        onUpdateDepth(depth);
      }}
    />
  </div>
{/if}
