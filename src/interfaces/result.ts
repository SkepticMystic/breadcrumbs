export type Result<S = unknown, F = unknown> =
	| { ok: true; data: S }
	| { ok: false; error: F };
