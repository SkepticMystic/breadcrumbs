import type { BuildOptions } from "esbuild";

export type BuildOptionSpec = BuildOptions;
// eslint-disable-next-line @typescript-eslint/no-unused-vars

/**
 * All Func Specs typically return the DataCarryOverSpec
 */
export type FuncSpec = (
	config: BuildOptionSpec,
	collectedContext: CollectedContextSpec,
) => CollectedContextSpec;
export type CollectedContextSpec = {
	manifestId?: string;
	esbuild_path: string;
};
