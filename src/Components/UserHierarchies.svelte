<script lang="ts">
  import { Notice } from "obsidian";
  import type { UserHier } from "src";
  import { ARROW_DIRECTIONS, blankUserHier, DIRECTIONS } from "src/constants";
  import type BCPlugin from "src/main";
  import { hierToStr, splitAndTrim, swapItems } from "src/sharedFunctions";
  import FaListUl from "svelte-icons/fa/FaListUl.svelte";
  import FaPlus from "svelte-icons/fa/FaPlus.svelte";
  import FaRegTrashAlt from "svelte-icons/fa/FaRegTrashAlt.svelte";

  export let plugin: BCPlugin;

  let currHiers = [...plugin.settings.userHiers];
  async function update(currHiers: UserHier[]) {
    plugin.settings.userHiers = currHiers;
    await plugin.saveSettings();
  }
</script>

<div>
  <div class="GA-Buttons">
    <button
      aria-label="Add New Hierarchy"
      on:click={async () => (currHiers = [...currHiers, blankUserHier()])}
    >
      <div class="icon">
        <FaPlus />
      </div>
    </button>
    <button
      aria-label="Reset All Hierarchies"
      on:click={async () => {
        if (window.confirm("Are you sure you want to reset all hierarchies?")) {
          currHiers = [];
          await update(currHiers);
        }
      }}
    >
      <div class="icon">
        <FaRegTrashAlt />
      </div>
    </button>
    <button
      aria-label="Show Hierarchies"
      on:click={() => new Notice(currHiers.map(hierToStr).join("\n\n"))}
    >
      <div class="icon">
        <FaListUl />
      </div>
    </button>
  </div>

  {#each currHiers as hier, i}
    <details class="BC-Hier-Details">
      <summary>
        {DIRECTIONS.map((dir) => hier[dir]?.join(", ") ?? "")
          .map((dirFields) => `(${dirFields})`)
          .join(" ")}

        <span class="GA-Buttons">
          <button
            aria-label="Swap with Hierarchy Above"
            on:click={async () => {
              currHiers = swapItems(i, i - 1, currHiers);
              await update(currHiers);
            }}>↑</button
          >
          <button
            aria-label="Swap with Hierarchy Below"
            on:click={async () => {
              currHiers = swapItems(i, i + 1, currHiers);
              await update(currHiers);
            }}>↓</button
          >
          <button
            aria-label="Remove Hierarchy"
            on:click={async () => {
              currHiers.splice(i, 1);
              currHiers = currHiers;
              await update(currHiers);
            }}>X</button
          >
        </span>
      </summary>
      {#each DIRECTIONS as dir}
        <div>
          <label class="BC-Arrow-Label" for={dir}>
            {ARROW_DIRECTIONS[dir]}</label
          >
          <input
            type="text"
            size="20"
            name={dir}
            value={hier[dir]?.join(", ") ?? ""}
            on:change={async (e) => {
              const { value } = e.target;
              if (value === "") {
                currHiers[i][dir] = [];
              } else {
                currHiers[i][dir] = splitAndTrim(value);
              }
              await update(currHiers);
            }}
          />
        </div>
      {/each}
    </details>
  {/each}
</div>

<style>
  label.BC-Arrow-Label {
    display: inline-block;
    width: 20px !important;
  }
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
