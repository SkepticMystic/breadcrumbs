export const LOG_LEVELS = ["DEBUG", "ERROR", "SILENT"] as const;
export type LogLevels = (typeof LOG_LEVELS)[number];

const LEVEL_COLOURS: Record<LogLevels, string | null> = {
	DEBUG: "#999",
	ERROR: "#f00",
	SILENT: null,
};

const build_prefix = (level: LogLevels) => {
	const colour = LEVEL_COLOURS[level];

	const prefix = `[BC:${level}][${new Date().toISOString().split("T")[1]}]`;

	return [
		colour ? `%c${prefix}` : prefix,
		colour ? `color: ${LEVEL_COLOURS[level]};` : "",
		"\n",
	];
};

class Logger {
	level_i!: number;

	constructor(level: LogLevels) {
		this.set_level(level);
	}

	debug(...args: unknown[]) {
		if (this.level_i <= 0) {
			console.debug(...build_prefix("DEBUG"), ...args);
		}
	}

	error(...args: unknown[]) {
		if (this.level_i <= 1) {
			console.error(...build_prefix("ERROR"), ...args);
		}
	}

	set_level(level: LogLevels) {
		this.level_i = LOG_LEVELS.findIndex((l) => l === level);
	}
}

export const log = new Logger("SILENT");
