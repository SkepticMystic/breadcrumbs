import type { App } from "obsidian";
import type { BCAPII, Directions } from "./interfaces";
import type BCPlugin from "./main";
import {
  buildObsGraph,
  dfsAllPaths,
  getSubForFields,
  getSubInDirs,
} from "./Utils/graphUtils";

export class BCAPI implements BCAPII {
  app: App;
  plugin: BCPlugin;

  public constructor(app: App, plugin: BCPlugin) {
    this.app = app;
    this.plugin = plugin;
  }

  public buildObsGraph = () => buildObsGraph(this.app);

  public getSubInDirs = (dirs: Directions[], g = this.plugin.mainG) =>
    getSubInDirs(g, ...dirs);

  public getSubForFields = (fields: string[], g = this.plugin.mainG) =>
    getSubForFields(g, fields);

  public dfsAllPaths = (fromNode: string, g = this.plugin.mainG) =>
    dfsAllPaths(g, fromNode);
}
