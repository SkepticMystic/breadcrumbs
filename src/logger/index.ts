export const LOG_LEVELS = ["DEBUG", "INFO", "WARN", "ERROR"] as const;
export type LogLevels = (typeof LOG_LEVELS)[number];

const LEVEL_COLOURS: Record<LogLevels, string> = {
	DEBUG: "#999",
	INFO: "#fff",
	WARN: "#f90",
	ERROR: "#f00",
};

const build_prefix = (level: LogLevels) => [
	`%c[BC:${level}][${new Date().toISOString().split("T")[1]}]`,
	`color: ${LEVEL_COLOURS[level]};`,
	"\n",
];

class Logger {
	level_i!: number;

	constructor(level: LogLevels) {
		this.set_level(level);
	}

	debug(...args: any[]) {
		if (this.level_i <= 0) {
			console.log(...build_prefix("DEBUG"), ...args);
		}
	}

	info(...args: any[]) {
		if (this.level_i <= 1) {
			console.log(...build_prefix("INFO"), ...args);
		}
	}

	warn(...args: any[]) {
		if (this.level_i <= 2) {
			// NOTE: Don't actually console.warn
			// The user doesn't need a stack trace
			console.log(...build_prefix("WARN"), ...args);
		}
	}

	error(...args: any[]) {
		if (this.level_i <= 3) {
			console.log(...build_prefix("ERROR"), ...args);
		}
	}

	set_level(level: LogLevels) {
		this.level_i = LOG_LEVELS.findIndex((l) => l === level);
	}
}

export const log = new Logger("INFO");
