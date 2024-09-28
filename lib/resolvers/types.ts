export type PackageConfig = {
	outPath?: null | string,
	srcPath?: null | string,
	readyIPC?: boolean
};

export type PackageInfo = {
	name: string,
	path: string,
	dependencies: string[]
}

export type MaybePromise<T> = T | Promise<T>;
export type ReadFile = (path: string) => Promise<string|null>;
export type LoadModule = (path: string) => Promise<any|null>;
export type ResolverUtils = {
	readFile: ReadFile,
	loadModule: LoadModule,
	loadBundled: LoadModule,
	loadDependency: (dependency: string) => Promise<any|null>
};

export type PackageResolver = (pcg: PackageInfo, utils: ResolverUtils) => MaybePromise<PackageConfig|null>;