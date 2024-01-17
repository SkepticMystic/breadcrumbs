export type Result<S = unknown, F = unknown> = {
	log: (prefix?: string) => void;
} & ({ ok: true; data: S } | { ok: false; error: F });
