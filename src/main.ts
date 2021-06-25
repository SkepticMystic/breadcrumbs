import { FrontMatterCache, Plugin, TFile, WorkspaceLeaf } from "obsidian";
import { BreadcrumbsSettingTab } from "src/BreadcrumbsSettingTab";
import {
  dropHeaderOrAlias,
  splitLinksRegex,
  VIEW_TYPE_BREADCRUMBS_MATRIX,
  VIEW_TYPE_BREADCRUMBS_TRAIL,
} from "src/constants";
import MatrixView from "src/MatrixView";
import type fileFrontmatter from "src/MatrixView";
import { Graph } from "graphlib";
import * as graphlib from "graphlib";

interface BreadcrumbsSettings {
  showRelationType: boolean;
  parentFieldName: string;
  siblingFieldName: string;
  childFieldName: string;
  indexNote: string;
  trailSeperator: string;
}

const DEFAULT_SETTINGS: BreadcrumbsSettings = {
  showRelationType: true,
  parentFieldName: "parent",
  siblingFieldName: "sibling",
  childFieldName: "child",
  indexNote: "Index",
  trailSeperator: "→",
};
export default class BreadcrumbsPlugin extends Plugin {
  settings: BreadcrumbsSettings;
  matrixView: MatrixView;
  trailDiv: HTMLDivElement;
  previewView: HTMLDivElement;

  async onload(): Promise<void> {
    console.log("loading breadcrumbs plugin");

    await this.loadSettings();

    this.registerView(
      VIEW_TYPE_BREADCRUMBS_MATRIX,
      (leaf: WorkspaceLeaf) => (this.matrixView = new MatrixView(leaf, this))
    );

    setTimeout(
      () =>
        this.app.workspace.onLayoutReady(async () => {
          await this.drawTrail();
        }),
      4000
    );

    this.registerEvent(
      this.app.workspace.on("active-leaf-change", async () => {
        await this.drawTrail();
      })
    );

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

    this.app.workspace.onLayoutReady(() => {
      this.initView(VIEW_TYPE_BREADCRUMBS_MATRIX);
      this.trailDiv = createDiv({
        cls: "breadcrumbs-trail is-readable-line-width",
      });
      this.drawTrail();
    });

    this.addSettingTab(new BreadcrumbsSettingTab(this.app, this));
  }

  // SECTION Breadcrumbs

  getFileFrontmatterArr(): fileFrontmatter[] {
    const files: TFile[] = this.app.vault.getMarkdownFiles();
    const fileFrontMatterArr: fileFrontmatter[] = [];

    if (this.app.plugins.plugins.dataview !== undefined) {
      this.app.workspace.onLayoutReady(() => {
        files.forEach((file) => {
          const dv: FrontMatterCache =
            this.app.plugins.plugins.dataview.api.page(file.path);
          fileFrontMatterArr.push({ file, frontmatter: dv });
        });
      });
    } else {
      files.forEach((file) => {
        const obs: FrontMatterCache =
          this.app.metadataCache.getFileCache(file).frontmatter;
        fileFrontMatterArr.push({
          file,
          frontmatter: obs,
        });
      });
    }
    return fileFrontMatterArr;
  }

  splitAndDrop(str: string): string[] | [] {
    return str
      ?.match(splitLinksRegex)
      ?.map((link) => link.match(dropHeaderOrAlias)?.[1]);
  }

  getFields(fileFrontmatter: fileFrontmatter, field: string): string[] {
    const fieldItems: string | [] = fileFrontmatter.frontmatter[field] ?? [];
    if (typeof fieldItems === "string") {
      return this.splitAndDrop(fieldItems);
    } else {
      return [fieldItems].flat().map((link) => link.path);
    }
  }

  getParentObjArr(fileFrontmatterArr: fileFrontmatter[]) {
    const settings = this.settings;
    return fileFrontmatterArr.map((fileFrontmatter) => {
      const parents = this.getFields(fileFrontmatter, settings.parentFieldName);

      return { current: fileFrontmatter.file, parents };
    });
  }

  populateParentGraph(g: Graph, currFileName: string, parentObj): void {
    if (parentObj["parents"]) {
      g.setNode(currFileName, currFileName);
      parentObj["parents"].forEach((node) =>
        g.setEdge(currFileName, node, "parents")
      );
    }
  }

  async initParentGraph(): Promise<Graph> {
    const fileFrontmatterArr = this.getFileFrontmatterArr();
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

    // Check if a path even exists
    if (paths[step].distance === Infinity) {
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

  async drawTrail(): Promise<void> {
    const gParents = await this.initParentGraph();
    const breadcrumbs = this.getBreadcrumbs(gParents);
    const currFile = this.app.workspace.getActiveFile();
    const settings = this.settings;

    this.previewView = document.querySelector(
      "div.mod-active div.view-content div.markdown-preview-view"
    );
    this.previewView.prepend(this.trailDiv);
    this.trailDiv.empty();

    breadcrumbs.forEach((crumb) => {
      const link = this.trailDiv.createEl("a", { text: crumb });
      link.href = null;
      link.classList.add(...this.resolvedClass(crumb, currFile).split(" "));
      link.addEventListener("click", async () => {
        await this.app.workspace.openLinkText(crumb, currFile.path);
      });
      this.trailDiv.createSpan({ text: ` ${settings.trailSeperator} ` });
    });

    this.trailDiv.removeChild(this.trailDiv.lastChild);
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
    [VIEW_TYPE_BREADCRUMBS_MATRIX, VIEW_TYPE_BREADCRUMBS_TRAIL].forEach(
      (type) =>
        this.app.workspace
          .getLeavesOfType(type)
          .forEach((leaf) => leaf.detach())
    );
    this.trailDiv.remove();
  }
}
