import * as graphlib from "graphlib";
import { Graph } from "graphlib";
import { Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import { VIEW_TYPE_BREADCRUMBS_MATRIX } from "src/constants";
import type {
  BreadcrumbsSettings,
  fileFrontmatter,
  ParentObj,
} from "src/interfaces";
import MatrixView from "src/MatrixView";
import { getFields, getFileFrontmatterArr } from "src/sharedFunctions";

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: "Index",
  refreshIntervalTime: 0,
  showNameOrType: true,
  showRelationType: true,
  showTrail: true,
  trailSeperator: "→",
  respectReadableLineLength: true,
};

export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  trailDiv: HTMLDivElement;
  previewView: HTMLDivElement;
  refreshIntervalID: number;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => (this.matrixView = new MatrixView(leaf, this))
    );

    this.app.workspace.onLayoutReady(async () => {
      setTimeout(async () => {
        this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);

        this.trailDiv = createDiv({
          cls: `breadcrumbs-trail is-readable-line-width${
            this.settings.respectReadableLineLength
              ? " markdown-preview-sizer markdown-preview-section"
              : ""
          }`,
        });
        if (this.settings.showTrail) {
          await this.drawTrail();
        }
      }, 4000);
    });

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        if (this.settings.showTrail) {
          await this.drawTrail();
        }
      })
    );

    if (this.settings.refreshIntervalTime) {
      this.refreshIntervalID = window.setInterval(async () => {
        if (this.trailDiv) {
          await this.drawTrail();
        }
        if (this.matrixView) {
          await this.matrixView.draw();
        }
      }, this.settings.refreshIntervalTime * 1000);
      this.registerInterval(this.refreshIntervalID);
    }

    this.addCommand({
      id: "show-breadcrumb-matrix-view",
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

    // this.app.workspace.onLayoutReady(() => {});

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  // SECTION Breadcrumbs

  resolvedClass(
    toFile: string,
    currFile: TFile
  ):
    | "internal-link is-unresolved breadcrumbs-link"
    | "internal-link breadcrumbs-link" {
    return this.app.metadataCache.unresolvedLinks[currFile.path][toFile] > 0
      ? "internal-link is-unresolved breadcrumbs-link"
      : "internal-link breadcrumbs-link";
  }

  getParentObjArr(fileFrontmatterArr: fileFrontmatter[]): ParentObj[] {
    const settings = this.settings;
    const parentFields = settings.parentFieldName
      .split(",")
      .map((str) => str.trim());

    return fileFrontmatterArr.map((fileFrontmatter) => {
      const parents: string[] = parentFields
        .map((parentField) => getFields(fileFrontmatter, parentField))
        .flat();

      return { current: fileFrontmatter.file, parents };
    });
  }

  populateParentGraph(
    g: Graph,
    currFileName: string,
    parentObj: ParentObj
  ): void {
    if (parentObj["parents"]) {
      g.setNode(currFileName, currFileName);
      parentObj["parents"].forEach((node) =>
        g.setEdge(currFileName, node, "parents")
      );
    }
  }

  async initParentGraph(): Promise<Graph> {
    const fileFrontmatterArr = getFileFrontmatterArr(this.app);
    const parentObjArr = this.getParentObjArr(fileFrontmatterArr);
    const gParents = new Graph();

    parentObjArr.forEach((parentObj) => {
      const currFileName = parentObj.current.basename;
      this.populateParentGraph(gParents, currFileName, parentObj);
    });

    return gParents;
  }

  getBreadcrumbs(g: Graph, userTo: string = this.settings.indexNote): string[] {
    const from = this.app.workspace.getActiveFile().basename;
    const paths = graphlib.alg.dijkstra(g, from);
    let step = userTo;
    const breadcrumbs: string[] = [];

    // Check if indexNote exists
    if (
      !this.app.metadataCache.getFirstLinkpathDest(
        userTo,
        this.app.workspace.getActiveFile().path
      )
    ) {
      return [`${userTo} is not a note in your vault`];
    } else if (paths[step].distance === Infinity) {
      // Check if a path even exists
      return [`No path to ${userTo} was found from the current note`];
    } else {
      // If it does, walk it until arriving at `from`
      while (paths[step].distance !== 0) {
        breadcrumbs.push(step);
        step = paths[step].predecessor;
      }

      breadcrumbs.push(from);
      return breadcrumbs;
    }
  }

  fillTrailDiv(breadcrumbs: string[], currFile: TFile): void {
    breadcrumbs.forEach((crumb) => {
      const link = this.trailDiv.createEl("a", {
        text: crumb,
        cls: "internal-link breadcrumbs-link",
      });
      link.href = null;
      // A link in the trail will never be unresolved, so no need to check
      // link.classList.add(...this.resolvedClass(crumb, currFile).split(" "));
      link.addEventListener("click", async () => {
        await this.app.workspace.openLinkText(crumb, currFile.path);
      });
      this.trailDiv.createSpan({ text: ` ${this.settings.trailSeperator} ` });
    });
    this.trailDiv.removeChild(this.trailDiv.lastChild);
  }

  async drawTrail(): Promise<void> {
    const gParents = await this.initParentGraph();
    const breadcrumbs = this.getBreadcrumbs(gParents);
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
      if (leaf.view instanceof MatrixView) return;
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
    // Detach matrix view
    [VIEW_TYPE_BREADCRUMBS_MATRIX].forEach((type) =>
      this.app.workspace.getLeavesOfType(type).forEach((leaf) => leaf.detach())
    );

    // Empty trailDiv
    if (this.trailDiv) {
      this.trailDiv.remove();
    }
  }
}
