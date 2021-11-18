<script lang="ts">
  import type { App } from "obsidian";
  import { openOrSwitch } from "obsidian-community-lib";
  import { linkClass } from "src/sharedFunctions";
  import type BCPlugin from "src/main";
  export let app: App;
  export let plugin: BCPlugin;

  const { basename } = app.workspace.getActiveFile();
  const { main } = plugin.currGraphs;

  const next: { to: string; real: boolean }[] = [];
  const prev: { to: string; real: boolean }[] = [];
  main.forEachEdge(basename, (k, a, s, t) => {
    if (a.dir === "next" && s === basename) {
      next.push({ to: t, real: true });
    }
    if (a.dir === "prev" && t === basename) {
      next.push({ to: s, real: false });
    }
    if (a.dir === "prev" && s === basename) {
      prev.push({ to: t, real: true });
    }
    if (a.dir === "next" && t === basename) {
      prev.push({ to: s, real: false });
    }
  });
</script>

<span class="BC-NextPrev-Container">
  <span class="BC-prevs">
    {#if prev.length}←{/if}
    {#each prev as p}
      <span
        class={linkClass(app, p.to, p.real)}
        on:click={async (e) => openOrSwitch(app, p.to, e)}>{p.to}</span
      >
    {/each}
  </span>
  <span class="BC-nexts">
    {#each next as n}
      <span
        class={linkClass(app, n.to, n.real)}
        on:click={async (e) => openOrSwitch(app, n.to, e)}>{n.to}</span
      >
    {/each}
    {#if next.length}→{/if}
  </span>
</span>

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

  .BC-nexts {
    float: right;
  }
</style>
