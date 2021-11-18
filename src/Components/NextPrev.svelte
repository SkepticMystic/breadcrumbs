<script lang="ts">
  import type { App } from "obsidian";
  import { openOrSwitch } from "obsidian-community-lib";
  import { linkClass } from "src/sharedFunctions";
  import type BCPlugin from "src/main";
  export let app: App;
  export let plugin: BCPlugin;
  export let next: { to: string; real: boolean }[];
  export let prev: { to: string; real: boolean }[];
</script>

<div class="BC-NextPrev-Container">
  <div class="BC-prevs">
    {#if prev.length}←{/if}
    {#each prev as p}
      <div
        class={linkClass(app, p.to, p.real)}
        on:click={async (e) => openOrSwitch(app, p.to, e)}
      >
        {p.to}
      </div>
    {/each}
  </div>
  <div class="BC-nexts">
    {#if next.length}→{/if}
    {#each next as n}
      <div
        class={linkClass(app, n.to, n.real)}
        on:click={async (e) => openOrSwitch(app, n.to, e)}
      >
        {n.to}
      </div>
    {/each}
  </div>
</div>

<style>
  /* span {
    border: 1px solid white;
    padding: 2px;
  }
  .BC-prevs span {
    color: red;
  }
  .BC-nexts span {
    color: blue;
  } */

  /* .BC-nexts {
    float: right;
  } */

  .BC-NextPrev-Container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }
</style>
