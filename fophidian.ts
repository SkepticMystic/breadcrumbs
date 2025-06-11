import type { BuildOptionSpec, CollectedContextSpec } from "./fophidian.types";
import esbuild from "esbuild";
import type { Plugin } from "esbuild";

type Callback = (config: BuildOptionSpec, custom: CollectedContextSpec) => void;
export interface Pipe {
	esbuildContext: BuildOptionSpec;
	collectedContext: CollectedContextSpec;
	assign: (payload: BuildOptionSpec) => Pipe;
	withInjectPlugins: (...plugins: Plugin[]) => Pipe;
	genBuild: (isProd: boolean, utils: { debug: boolean }) => Promise<Pipe>;
	_apply: (func: Callback) => Pipe;
	tap: (property: string) => Pipe;
}
export interface PipeConstructor {
	new (esbuildContext: BuildOptionSpec): Pipe;
}

export function Pipe(this: Pipe, esbuildContext: BuildOptionSpec) {
	this.esbuildContext = esbuildContext;
	this.collectedContext = {
		manifestId: "",
		esbuild_path: "",
	};
}

// update Build options but with a context to do extra stuff
Pipe.prototype._apply = function (
	func: (
		config: BuildOptionSpec,
		custom: CollectedContextSpec,
	) => CollectedContextSpec,
) {
	func(this.esbuildContext, this.collectedContext);
};

// update BuildOptions but only simpleproperty assignments;
Pipe.prototype.assign = function (payload: BuildOptionSpec) {
	this._apply(
		(
			esbuildContext: BuildOptionSpec,
			collectedContext: CollectedContextSpec,
		) => {
			Object.assign(esbuildContext, payload);
			return collectedContext;
		},
	);
	return this;
};

type Dirs = {
	prodDir: string;
	devDir: string;
};
Pipe.prototype.genBuild = async function (
	isProd: boolean,
	fig = { debug: false },
) {
	const { debug } = fig;
	const context = await esbuild.context(this.esbuildContext).catch((err) => {
		const message = "Esbuild build api error";
		throw new Error(JSON.stringify({ err, message }));
	});
	if (debug) {
		console.log("Esbuild context created", this.esbuildContext);
	}
	if (isProd === false) {
		return await context.watch();
	}
	if (isProd) {
		return await context.dispose();
	}
	return this;
};

Pipe.prototype.withInjectPlugins = function (...plugins: Plugin[]) {
	this._apply((config: BuildOptionSpec, custom: CollectedContextSpec) => {
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		config.plugins!.push(...plugins);
		return custom;
	});
	return this;
};

Pipe.prototype.tap = function (property: keyof BuildOptionSpec): Pipe {
	this._apply((config: BuildOptionSpec, custom: CollectedContextSpec) => {
		console.log({ [property]: config[property] });
	});
	return this;
};
