<script lang="ts">
  import { Notice } from "obsidian";
  import FaListUl from "svelte-icons/fa/FaListUl.svelte";
  import FaPlus from "svelte-icons/fa/FaPlus.svelte";
  import FaRegTrashAlt from "svelte-icons/fa/FaRegTrashAlt.svelte";
  import { ARROW_DIRECTIONS, blankUserHier, DIRECTIONS } from "../constants";
  import type { UserHier } from "../interfaces";
  import type BCPlugin from "../main";
  import { splitAndTrim, swapItems } from "../Utils/generalUtils";
  import { hierToStr } from "../Utils/HierUtils";

  export let plugin: BCPlugin;
  const { settings } = plugin;

  let currHiers = [...plugin.settings.userHiers];
  async function update(currHiers: UserHier[]) {
    plugin.settings.userHiers = currHiers;
    await plugin.saveSettings();
  }
</script>

<div>
  <div class="BC-Buttons">
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

        <span class="BC-Buttons">
          <button
            aria-label="Swap with Hierarchy Above"
            on:click={async () => {
              currHiers = swapItems(i, i - 1, currHiers);
              await update(currHiers);
            }}
          >
            ↑
          </button>
          <button
            aria-label="Swap with Hierarchy Below"
            on:click={async () => {
              currHiers = swapItems(i, i + 1, currHiers);
              await update(currHiers);
            }}
          >
            ↓
          </button>
          <button
            aria-label="Remove Hierarchy"
            on:click={async () => {
              const oldHier = currHiers.splice(i, 1)[0];
              oldHier.up.forEach((upField) => {
                const index = settings.limitTrailCheckboxes.indexOf(upField);
                if (index > -1) settings.limitTrailCheckboxes.splice(index, 1);
              });

              DIRECTIONS.forEach((dir) => {
                oldHier[dir].forEach((field) => {
                  const indexI = settings.limitJumpToFirstFields.indexOf(field);
                  if (indexI > -1)
                    settings.limitJumpToFirstFields.splice(indexI, 1);

                  const indexJ = settings.limitWriteBCCheckboxes.indexOf(field);
                  if (indexJ > -1)
                    settings.limitJumpToFirstFields.splice(indexJ, 1);
                });
              });

              currHiers = currHiers;
              await update(currHiers);
            }}
          >
            X
          </button>
        </span>
      </summary>
      {#each DIRECTIONS as dir}
        <div>
          <label class="BC-Arrow-Label" for={dir}>
            {ARROW_DIRECTIONS[dir]}
          </label>
          <input
            type="text"
            size="20"
            name={dir}
            value={hier[dir]?.join(", ") ?? ""}
            on:change={async (e) => {
              const { value } = e.target;
              const splits = splitAndTrim(value);
              currHiers[i][dir] = splits;
              await update(currHiers);

              splits.forEach((split) => {
                if (
                  dir === "up" &&
                  !settings.limitTrailCheckboxes.includes(split)
                )
                  settings.limitTrailCheckboxes.push(split);
                if (!settings.limitJumpToFirstFields.includes(split))
                  settings.limitJumpToFirstFields.push(split);
                if (!settings.limitWriteBCCheckboxes.includes(split))
                  settings.limitWriteBCCheckboxes.push(split);
              });
              await plugin.saveSettings();
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
  div.BC-Buttons {
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
