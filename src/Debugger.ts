import { debug, info, levels } from "loglevel";
import type BCPlugin from "src/main";

export class Debugger {
  plugin: BCPlugin;
  constructor(plugin: BCPlugin) {
    this.plugin = plugin;
  }

  debugLessThan = (level: number) =>
    levels[this.plugin.settings.debugMode] < level;

  start2G(group: string) {
    if (this.debugLessThan(3)) console.groupCollapsed(group);
  }
  end2G(...msgs: any[]) {
    if (this.debugLessThan(3)) {
      if (msgs.length) info(...msgs);
      console.groupEnd();
    }
  }
  start1G(group: string) {
    if (this.debugLessThan(2)) console.groupCollapsed(group);
  }
  end1G(...msgs: any[]) {
    if (this.debugLessThan(2)) {
      if (msgs.length) debug(...msgs);
      console.groupEnd();
    }
  }

  startGs(...groups: string[]) {
    this.start2G(groups[0]);
    if (groups[1]) this.start1G(groups[1]);
  }

  /**
   * End a debug and info group, logging `msgs` in `endDebugGroup`
   * @param  {1|2} count The number of groups to end. `1` ends Trace, 2 ends both
   * @param  {any[]} ...msgs
   */
  endGs(count: 1 | 2, ...msgs: any[]) {
    if (count === 1) this.end2G(...msgs);
    else {
      this.end1G();
      this.end2G(...msgs);
    }
  }
}
