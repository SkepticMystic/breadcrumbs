<script lang="ts">
  import { Notice } from "obsidian";
  import { ARROW_DIRECTIONS, blankUserHier, DIRECTIONS } from "src/constants";
  import type BCPlugin from "src/main";
  import { hierToStr, splitAndTrim, swapItems } from "src/sharedFunctions";
  import FaListUl from "svelte-icons/fa/FaListUl.svelte";
  import FaPlus from "svelte-icons/fa/FaPlus.svelte";
  import FaRegTrashAlt from "svelte-icons/fa/FaRegTrashAlt.svelte";

  export let plugin: BCPlugin;

  let { userHierarchies } = plugin.settings;
</script>

<div>
  <div class="GA-Buttons">
    <button
      aria-label="Add New Hierarchy"
      on:click={async () => {
        userHierarchies.push(blankUserHier());
        userHierarchies = userHierarchies;
      }}
    >
      <div class="icon">
        <FaPlus />
      </div>
    </button>
    <button
      aria-label="Reset All Hierarchies"
      on:click={async () => {
        if (window.confirm("Are you sure you want to reset all hierarchies?")) {
          userHierarchies = [];
          await plugin.saveSettings();
        }
      }}
    >
      <div class="icon">
        <FaRegTrashAlt />
      </div>
    </button>
    <button
      aria-label="Show Hierarchies"
      on:click={() => new Notice(userHierarchies.map(hierToStr).join("\n\n"))}
    >
      <div class="icon">
        <FaListUl />
      </div>
    </button>
  </div>

  {#each userHierarchies as hier, i}
    <details class="BC-Hier-Details">
      <summary>
        {DIRECTIONS.map((dir) => hier[dir].join(", "))
          .map((dirFields) => `(${dirFields})`)
          .join(" ")}
        <button
          aria-label="Swap with Hierarchy Above"
          on:click={async () => {
            userHierarchies = swapItems(i, i - 1, userHierarchies);
            await plugin.saveSettings();
          }}>↑</button
        >
        <button
          aria-label="Swap with Hierarchy Below"
          on:click={async () => {
            userHierarchies = swapItems(i, i + 1, userHierarchies);
            await plugin.saveSettings();
          }}>↓</button
        >
        <button
          aria-label="Remove Hierarchy"
          on:click={async () => {
            userHierarchies.splice(i, 1);
            userHierarchies = userHierarchies;
            await plugin.saveSettings();
          }}>X</button
        >
      </summary>
      {#each DIRECTIONS as dir}
        <label for={dir}>{ARROW_DIRECTIONS[dir]}</label>
        <input
          type="text"
          size="10"
          name={dir}
          value={hier[dir].join(", ")}
          on:change={async (e) => {
            userHierarchies[i][dir] = splitAndTrim(e.target.value);
            await plugin.saveSettings();
          }}
        />
      {/each}
    </details>
  {/each}
</div>

<style>
  div.GA-Buttons {
    padding-bottom: 5px;
  }

  details.BC-Hier-Details {
    border: 1px solid var(--background-modifier-border);
    border-radius: 10px;
    padding: 10px 5px 10px 10px;
    margin-bottom: 15px;
  }
  .BC-Hier-Details summary::marker {
    font-size: 10px;
  }

  .BC-Hier-Details summary button {
    float: right;
  }
  .icon {
    color: var(--text-normal);
    display: inline-block;
    padding-top: 3px;
    width: 17px;
    height: 17px;
  }
</style>
