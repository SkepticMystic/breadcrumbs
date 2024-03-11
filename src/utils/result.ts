import type { BreadcrumbsError } from "src/interfaces/graph";
import type { Result } from "src/interfaces/result";

export const succ = <S>(data: S): Result<S, never> => ({
	ok: true,
	data,

	log: (prefix?: string) => console.log(`${prefix ?? ""} data ${data}`),
});
export const fail = <F>(error: F): Result<never, F> => ({
	ok: false,
	error,

	log: (prefix?: string) => console.log(`${prefix ?? ""} error ${error}`),
});

export const graph_build_fail = (error: BreadcrumbsError) => fail(error);
