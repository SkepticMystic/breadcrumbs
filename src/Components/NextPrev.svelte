<script lang="ts">
  import type { App } from "obsidian";
  import { openOrSwitch } from "obsidian-community-lib";
  import type { SquareItem } from "../interfaces";
  import type BCPlugin from "../main";
  import { linkClass } from "../Utils/generalUtils";

  export let app: App;
  export let plugin: BCPlugin;
  export let next: SquareItem[];
  export let prev: SquareItem[];
</script>

<div class="BC-NextPrev-Container">
  <div class="BC-prevs">
    <span>
      {#each prev as p}
        <div
          on:click={async (e) => openOrSwitch(app, p.to, e)}
          class={linkClass(app, p.to, p.real)}
        >
          <strong>{p.field}</strong>
          {p.to}
        </div>
      {/each}
    </span>
  </div>
  <div class="BC-nexts">
    <span>
      {#each next as n}
        <div
          on:click={async (e) => openOrSwitch(app, n.to, e)}
          class="{linkClass(app, n.to, n.real)} BC-next"
        >
          {n.to} <strong>{n.field}</strong>
        </div>
      {/each}
    </span>
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
  */
  .BC-nexts div {
    text-align: right;
  }

  .BC-right-arrow {
    padding-left: 5px;
    float: right;
  }

  .BC-left-arrow {
    padding-right: 5px;
    float: left;
  }

  .BC-nexts {
    border-left: 1px solid var(--background-modifier-border);
  }
  .BC-prevs {
    border-right: 1px solid var(--background-modifier-border);
  }

  .BC-NextPrev-Container {
    display: grid;
    grid-template-columns: 1fr 1fr;
  }

  .BC-NextPrev-Container div {
  }
</style>
