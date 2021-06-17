<script lang="ts">
  export let levels: string[];
</script>

<div class="breadcrumb-trail">
  {#each levels as crumb}
    <span class="crumb">{crumb}</span>
  {/each}
</div>
