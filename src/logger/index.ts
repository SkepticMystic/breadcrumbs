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
			console.log("%c[BC:DEBUG]", "color: #999;", ...args);
		}
	}

	info(...args: any[]) {
		if (get_level_i(this.level) <= 1) {
			console.log("[BC:INFO]", ...args);
		}
	}

	warn(...args: any[]) {
		if (get_level_i(this.level) <= 2) {
			// NOTE: Don't actually console.warn
			// The user doesn't need a stack trace
			console.log("%c[BC:WARN]", "color: #f90;", ...args);
		}
	}

	error(...args: any[]) {
		if (get_level_i(this.level) <= 3) {
			console.error("%c[BC:ERROR]", "color: #f00;", ...args);
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
