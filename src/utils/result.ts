import type { Result } from "src/interfaces/result";

export const succ = <S>(data: S): Result<S, never> => ({ ok: true, data });
export const fail = <F>(error: F): Result<never, F> => ({ ok: false, error });

export const log_result = (res: Result, prefix?: string) => {
	if (res.ok) {
		console.log((prefix ?? "") + "succ", res.data);
	} else {
		console.log((prefix ?? "") + "fail", res.error);
	}
};
