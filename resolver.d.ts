type PackageConfig = {
	outPath?: null | string,
	srcPath?: null | string,
};

type PackageInfo = {
	name: string,
	path: string,
	dependencies: string[]
}

type MaybePromise<T> = T | Promise<T>;
type ReadFile = (path: string) => Promise<string|null>;
type LoadModule = (path: string) => Promise<any|null>;
type ResolverUtils = {
	readFile: ReadFile,
	loadModule: LoadModule
};

type PackageResolver = (pcg: PackageInfo, utils: ResolverUtils) => MaybePromise<PackageConfig|null>;