import type BreadcrumbsPlugin from "src/main";

export const LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"] as const;
export type LogLevels = (typeof LOG_LEVELS)[number];

const get_level_i = (level: LogLevels) =>
	LOG_LEVELS.findIndex((l) => l === level);

export class Logger {
	level: LogLevels;

	constructor(plugin: BreadcrumbsPlugin) {
		this.level = plugin.settings.debug.level;
	}

	debug(...args: any[]) {
		if (get_level_i(this.level) <= 0) {
			console.log("bc.debug |", ...args);
		}
	}

	info(...args: any[]) {
		if (get_level_i(this.level) <= 1) {
			console.log("bc.info |", ...args);
		}
	}

	warn(...args: any[]) {
		if (get_level_i(this.level) <= 2) {
			// NOTE: Don't actually console.warn
			// The user doesn't need a stack trace
			console.log("bc.warn |", ...args);
		}
	}

	error(...args: any[]) {
		if (get_level_i(this.level) <= 3) {
			console.error("bc.error |", ...args);
		}
	}

	start_group(...args: any[]) {
		if (get_level_i(this.level) <= 0) {
			console.group(...args);
		} else {
			console.groupCollapsed(...args);
		}
	}

	end_group() {
		console.groupEnd();
	}
}
