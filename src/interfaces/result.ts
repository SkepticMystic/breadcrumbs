export type Result<S = unknown, F = unknown> = {
	log: (prefix?: string) => void;

	data_or: <T>(or: S) => S | T;
	error_or: <T>(or: F) => F | T;
} & ({ ok: true; data: S } | { ok: false; error: F });
