import * as graphlib from "graphlib";
import { Graph } from "graphlib";
import { addIcon, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  DATAVIEW_INDEX_DELAY,
  TRAIL_ICON,
  VIEW_TYPE_BREADCRUMBS_MATRIX,
} from "src/constants";
import type {
  allGraphs,
  BreadcrumbsSettings,
  neighbourObj,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import { getFileFrontmatterArr, getNeighbourObjArr } from "src/sharedFunctions";

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: ["Index"],
  refreshIntervalTime: 0,
  defaultView: true,
  showNameOrType: true,
  showRelationType: true,
  showTrail: true,
  noPathMessage: `No path to index note was found`,
  trailSeperator: "→",
  respectReadableLineLength: true,
  debugMode: false,
  superDebugMode: false,
};

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  trailDiv: HTMLDivElement;
  previewView: HTMLDivElement;
  refreshIntervalID: number;
  currGraphs: allGraphs;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.app.workspace.onLayoutReady(async () => {
      setTimeout(async () => {
        this.currGraphs = await this.initGraphs();

        this.registerView(
          VIEW_TYPE_BREADCRUMBS_MATRIX,
          (leaf: WorkspaceLeaf) =>
            (this.matrixView = new MatrixView(leaf, this))
        );
        this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);

        this.trailDiv = createDiv({
          // Check if respectReadableLineLength is enabled
          cls: `breadcrumbs-trail is-readable-line-width${
            this.settings.respectReadableLineLength
              ? " markdown-preview-sizer markdown-preview-section"
              : ""
          }`,
        });
        if (this.settings.showTrail) {
          await this.drawTrail(this.currGraphs.gParents);
        }

        this.registerEvent(
          this.app.workspace.on("active-leaf-change", async () => {
            this.currGraphs = await this.initGraphs();
            await this.matrixView.draw();
            if (this.settings.showTrail) {
              await this.drawTrail(this.currGraphs.gParents);
            }
          })
        );

        // ANCHOR autorefresh interval
        if (this.settings.refreshIntervalTime) {
          this.refreshIntervalID = window.setInterval(async () => {
            this.currGraphs = await this.initGraphs();
            if (this.trailDiv && this.settings.showTrail) {
              await this.drawTrail(this.currGraphs.gParents);
            }
            if (this.matrixView) {
              await this.matrixView.draw();
            }
          }, this.settings.refreshIntervalTime * 1000);
          this.registerInterval(this.refreshIntervalID);
        }
      }, DATAVIEW_INDEX_DELAY);
    });

    addIcon(
      TRAIL_ICON,
      '<path fill="currentColor" stroke="currentColor" d="M48.8,4c-6,0-13.5,0.5-19.7,3.3S17.9,15.9,17.9,25c0,5,2.6,9.7,6.1,13.9s8.1,8.3,12.6,12.3s9,7.8,12.2,11.5 c3.2,3.7,5.1,7.1,5.1,10.2c0,14.4-13.4,19.3-13.4,19.3c-0.7,0.2-1.2,0.8-1.3,1.5s0.1,1.4,0.7,1.9c0.6,0.5,1.3,0.6,2,0.3 c0,0,16.1-6.1,16.1-23c0-4.6-2.6-8.8-6.1-12.8c-3.5-4-8.1-7.9-12.6-11.8c-4.5-3.9-8.9-7.9-12.2-11.8c-3.2-3.9-5.2-7.7-5.2-11.4 c0-7.8,3.6-11.6,8.8-14S43,8,48.8,8c4.6,0,9.3,0,11,0c0.7,0,1.4-0.4,1.7-1c0.3-0.6,0.3-1.4,0-2s-1-1-1.7-1C58.3,4,53.4,4,48.8,4 L48.8,4z M78.1,4c-0.6,0-1.2,0.2-1.6,0.7l-8.9,9.9c-0.5,0.6-0.7,1.4-0.3,2.2c0.3,0.7,1,1.2,1.8,1.2h0.1l-2.8,2.6 c-0.6,0.6-0.8,1.4-0.5,2.2c0.3,0.8,1,1.3,1.9,1.3h1.3l-4.5,4.6c-0.6,0.6-0.7,1.4-0.4,2.2c0.3,0.7,1,1.2,1.8,1.2h10v4 c0,0.7,0.4,1.4,1,1.8c0.6,0.4,1.4,0.4,2,0c0.6-0.4,1-1,1-1.8v-4h10c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.1-1.6-0.4-2.2L86.9,24h1.3 c0.8,0,1.6-0.5,1.9-1.3c0.3-0.8,0.1-1.6-0.5-2.2l-2.8-2.6h0.1c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.2-1.6-0.3-2.2l-8.9-9.9 C79.1,4.3,78.6,4,78.1,4L78.1,4z M78,9l4.4,4.9h-0.7c-0.8,0-1.6,0.5-1.9,1.3c-0.3,0.8-0.1,1.6,0.5,2.2l2.8,2.6h-1.1 c-0.8,0-1.5,0.5-1.8,1.2c-0.3,0.7-0.1,1.6,0.4,2.2l4.5,4.6H70.8l4.5-4.6c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-1.1 l2.8-2.6c0.6-0.6,0.8-1.4,0.5-2.2c-0.3-0.8-1-1.3-1.9-1.3h-0.7L78,9z M52.4,12c-4.1,0-7.1,0.5-9.4,1.5c-2.3,1-3.8,2.5-4.5,4.3 c-0.7,1.8-0.5,3.6,0.1,5.2c0.6,1.5,1.5,2.9,2.5,3.9c5.4,5.4,18.1,12.6,29.6,21c5.8,4.2,11.2,8.6,15.1,13c3.9,4.4,6.2,8.7,6.2,12.4 c0,14.5-12.9,18.7-12.9,18.7c-0.7,0.2-1.2,0.8-1.4,1.5s0.1,1.5,0.7,1.9c0.6,0.5,1.3,0.6,2,0.3c0,0,15.6-5.6,15.6-22.5 c0-5.3-2.9-10.3-7.2-15.1C84.6,53.6,79,49,73.1,44.7c-11.8-8.6-24.8-16.3-29.2-20.6c-0.6-0.6-1.2-1.5-1.6-2.4 c-0.3-0.9-0.4-1.7-0.1-2.4c0.3-0.7,0.8-1.4,2.3-2c1.5-0.7,4.1-1.2,7.8-1.2c4.9,0,9.4,0.1,9.4,0.1c0.7,0,1.4-0.3,1.8-1 c0.4-0.6,0.4-1.4,0-2.1c-0.4-0.6-1.1-1-1.8-1C61.9,12.1,57.3,12,52.4,12L52.4,12z M24,46c-0.5,0-1.1,0.2-1.4,0.6L9.2,60.5 c-0.6,0.6-0.7,1.4-0.4,2.2c0.3,0.7,1,1.2,1.8,1.2h3l-6.5,6.8c-0.6,0.6-0.7,1.4-0.4,2.2s1,1.2,1.8,1.2H13l-8.5,8.6 C4,83.2,3.8,84,4.2,84.8C4.5,85.5,5.2,86,6,86h16v5.4c0,0.7,0.4,1.4,1,1.8c0.6,0.4,1.4,0.4,2,0c0.6-0.4,1-1,1-1.8V86h16 c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.1-1.6-0.4-2.2L35,74h4.4c0.8,0,1.5-0.5,1.8-1.2s0.2-1.6-0.4-2.2l-6.5-6.8h3 c0.8,0,1.5-0.5,1.8-1.2c0.3-0.7,0.2-1.6-0.4-2.2L25.4,46.6C25.1,46.2,24.5,46,24,46L24,46z M24,50.9l8.7,9h-3 c-0.8,0-1.5,0.5-1.8,1.2s-0.2,1.6,0.4,2.2l6.5,6.8h-4.5c-0.8,0-1.5,0.5-1.8,1.2c-0.3,0.7-0.1,1.6,0.4,2.2l8.5,8.6H10.8l8.5-8.6 c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-4.5l6.5-6.8c0.6-0.6,0.7-1.4,0.4-2.2c-0.3-0.7-1-1.2-1.8-1.2h-3L24,50.9z"/>'
    );

    this.addCommand({
      id: "show-breadcrumbs-matrix-view",
      name: "Open Matrix View",
      checkCallback: (checking: boolean) => {
        if (checking) {
          return (
            this.app.workspace.getLeavesOfType(VIEW_TYPE_BREADCRUMBS_MATRIX)
              .length === 0
          );
        }
        this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);
      },
    });

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  // SECTION OneSource

  populateGraph(
    g: Graph,
    currFileName: string,
    neighbours: neighbourObj,
    relationship: string
  ): void {
    // NOTE I removed an if(neighbours[relationship]) check here
    g.setNode(currFileName, currFileName);
    neighbours[relationship].forEach((node) =>
      g.setEdge(currFileName, node, relationship)
    );
  }

  async initGraphs(): Promise<{
    gParents: Graph;
    gSiblings: Graph;
    gChildren: Graph;
  }> {
    const fileFrontmatterArr = getFileFrontmatterArr(this.app, this.settings);
    const neighbourArr = getNeighbourObjArr(this, fileFrontmatterArr);
    const [gParents, gSiblings, gChildren] = [
      new Graph(),
      new Graph(),
      new Graph(),
    ];

    neighbourArr.forEach((neighbourObj) => {
      const currFileName = neighbourObj.current.basename;

      this.populateGraph(gParents, currFileName, neighbourObj, "parents");
      this.populateGraph(gSiblings, currFileName, neighbourObj, "siblings");
      this.populateGraph(gChildren, currFileName, neighbourObj, "children");
    });

    return { gParents, gSiblings, gChildren };
  }

  // !SECTION OneSource

  // SECTION Breadcrumbs

  resolvedClass(toFile: string, currFile: TFile): string {
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

  getShortestBreadcrumbs(g: Graph): string[] {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    const indexNotes: string[] = this.settings.indexNote;

    const allTrails: string[][] = [];

    indexNotes.forEach((index) => {
      let step = index;
      const breadcrumbs: string[] = [];

      // Check if indexNote exists
      if (
        !this.app.metadataCache.getFirstLinkpathDest(
          index,
          this.app.workspace.getActiveFile().path
        )
      ) {
        return [`${index} is not a note in your vault`];
      }
      // Check if a path even exists
      else if (paths[step].distance === Infinity) {
        breadcrumbs.push(this.settings.noPathMessage);
      } else {
        // If it does, walk it until arriving at `from`
        while (paths[step].distance !== 0) {
          breadcrumbs.push(step);
          step = paths[step].predecessor;
        }
        breadcrumbs.push(from);
      }
      allTrails.push(breadcrumbs);
    });

    let sortedTrails: string[][] = allTrails;

    if (allTrails.some((trail) => trail[0] !== this.settings.noPathMessage)) {
      const discardNoPath = allTrails.filter(
        (trail) => trail[0] !== this.settings.noPathMessage
      );
      sortedTrails = discardNoPath.sort((a, b) =>
        a.length < b.length ? -1 : 1
      );
    }

    if (this.settings.debugMode) {
      console.log(sortedTrails);
    }

    return sortedTrails[0];
  }

  fillTrailDiv(breadcrumbs: string[], currFile: TFile): void {
    // If a path was found
    if (breadcrumbs[0] !== this.settings.noPathMessage) {
      breadcrumbs.forEach((crumb) => {
        const link = this.trailDiv.createEl("a", {
          text: crumb,
          // A link in the trail will never be unresolved, so no need to check
          cls: "internal-link breadcrumbs-link",
          href: null,
        });
        link.addEventListener("click", async () => {
          await this.app.workspace.openLinkText(crumb, currFile.path);
        });
        this.trailDiv.createSpan({
          text: ` ${this.settings.trailSeperator} `,
        });
      });
      this.trailDiv.removeChild(this.trailDiv.lastChild);
    }
    // Otherwise don't add any links, just text
    else {
      this.trailDiv.createSpan({ text: breadcrumbs[0] });
    }
  }

  async drawTrail(gParents: Graph): Promise<void> {
    const breadcrumbs = this.getShortestBreadcrumbs(gParents);
    const currFile = this.app.workspace.getActiveFile();

    // Get the container div of the active note
    this.previewView = document.querySelector(
      "div.mod-active div.view-content div.markdown-preview-view"
    );
    // Prepend the exisiting trailDiv (created in `onLoad`)
    this.previewView.prepend(this.trailDiv);
    // Make sure it's empty when changing files
    this.trailDiv.empty();
    // Fill in the breadcrumbs
    this.fillTrailDiv(breadcrumbs, currFile);
  }

  initView = async (type: string): Promise<void> => {
    let leaf: WorkspaceLeaf = null;
    for (leaf of this.app.workspace.getLeavesOfType(type)) {
      if (leaf.view instanceof MatrixView) {
        return;
      }
      await leaf.setViewState({ type: "empty" });
      break;
    }
    (leaf ?? this.app.workspace.getRightLeaf(false)).setViewState({
      type,
      active: true,
    });
  };

  async loadSettings(): Promise<void> {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings(): Promise<void> {
    await this.saveData(this.settings);
  }

  onunload(): void {
    console.log("unloading");
    // Detach matrix view
    const openLeaves = this.app.workspace.getLeavesOfType(
      VIEW_TYPE_BREADCRUMBS_MATRIX
    );
    // console.log(openLeaves);
    openLeaves.forEach((leaf) => leaf.detach());

    // Empty trailDiv
    if (this.trailDiv) {
      this.trailDiv.remove();
    }
  }
}
