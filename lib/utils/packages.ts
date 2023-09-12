import { access, readFile, readdir } from "node:fs/promises";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "path";

export type LocalPackage = {
	name: string;
	path: string;
	localDependencies: LocalPackage[];
	dependencies: string[];
	scripts: string[];
};

export type LocalPackageInfo = {
	[name: string]: string;
};


export const rootPath = process.env.MONO_ROOT || process.cwd();

export const readFileJSON = async (path: string) => {
	const data = await readFile(path, { encoding: "utf-8" });
	return JSON.parse(data);
};
export const readFileJSONSync = (path: string) => {
	const data = readFileSync(path, { encoding: "utf-8" });
	return JSON.parse(data);
};

export const getWorkspaces = async (): Promise<string[]> => {
	try {
		const pJson = await readFileJSON(join(rootPath, "package.json"));
		const base = pJson.workspaces || [];
		const workspaces =  base.map((w: string) => w.replace("/*", ""));

		const existing: string[] = [];
		await Promise.all(workspaces.map(async(w: string) => {
			const path = join(rootPath, w);
			if(await access(path).then(() => true).catch(() => false)){
				existing.push(w);
			}
		}));
		return existing;
	} catch (e) {
		console.error("Please run this command in a directory with a valid package.json file.");
		return [];
	}
};

export const getWorkspacesSync = (): string[] => {
	try {
		const pJson = readFileJSONSync(join(rootPath, "package.json"));
		const base = pJson.workspaces || [];
		const workspaces: string[] = base.map((w: string) => w.replace("/*", ""));

		const existing: string[] = [];
		workspaces.forEach((w) => {
			const path = join(rootPath, w);
			if(existsSync(path)){
				existing.push(w);
			}
		});
		return existing;
	} catch (e) {
		console.error("Please run this command in a directory with a valid package.json file.");
		return [];
	}
};


export const getPackageJson = async (path: string):Promise<any> => {
	const pJson = await readFileJSON(join(path, "package.json"));
	return pJson;
};

export const getPackageJsonSync = (path: string): any => {
	const pJson = readFileJSONSync(join(path, "package.json"));
	return pJson;
};

export const listPackages = async (workspace: string) => {
	const root = join(rootPath, workspace);
	const dirs = await readdir(root, { withFileTypes: true });
	const packages = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

	const packageJsons = (
		await Promise.all(
			packages.map((p) =>
				getPackageJson(join(root, p))
					.then((pJson) => ({ ...pJson, path: p}))
					.catch(() => null)
			)
		)
	).filter((p) => p !== null);

	const packageInfo: LocalPackageInfo = {};

	packageJsons.forEach((p) => {
		const { name, path } = p;
		packageInfo[name] = `${workspace}/${path}`;
	});
	return packageInfo;
};


export const listPackagesSync = (workspace: string) => {
	const root = join(rootPath, workspace);
	const dirs = readdirSync(root, { withFileTypes: true });
	const packages = dirs.filter((d) => d.isDirectory()).map((d) => d.name);

	const packageJsons = packages.map((p) => {
		try{
			const pJson = getPackageJsonSync(join(root, p));
			return { ...pJson, path: p};
		}catch(e){
			return null;
		}
	}).filter((p) => p !== null);

	const packageInfo: LocalPackageInfo = {};

	packageJsons.forEach((p) => {
		const { name, path } = p;
		packageInfo[name] = `${workspace}/${path}`;
	});
	return packageInfo;
};


export const getWorkspacePackages = async (): Promise<LocalPackageInfo> => {
	const workspaces = await getWorkspaces();
	const packages = await Promise.all(workspaces.map((w) => listPackages(w)));
	const info = packages.reduce((acc, cur) => ({ ...acc, ...cur }), {});
	return info;
};

export const getWorkspacePackagesSync = (): LocalPackageInfo => {
	const workspaces = getWorkspacesSync();
	const packages = workspaces.map((w) => listPackagesSync(w));
	const info = packages.reduce((acc, cur) => ({ ...acc, ...cur }), {});
	return info;
};

const formatPackageInfo = async(info: LocalPackageInfo): Promise<LocalPackage[]> => {

	const packages = Object.keys(info).map((name) => ({
		name,
		path: info[name],
		localDependencies: [],
		dependencies: [],
		scripts: []
	}));

	const prms = packages.map(async(pcg: LocalPackage) => {
		const { path } = pcg;
		const root = join(rootPath, path);
		const pJson = await getPackageJson(root);
		const { dependencies = {}, devDependencies = {} } = pJson;
		const deps = Object.keys({ ...dependencies, ...devDependencies });
		const locals = packages.filter((p) => deps.includes(p.name));

		pcg.localDependencies = locals;
		pcg.dependencies = deps;
		pcg.scripts = Object.keys(pJson.scripts || {});
	});
	await Promise.all(prms);

	return packages;
};

export const getLocalPackages = async (): Promise<LocalPackage[]> => {
	const info = await getWorkspacePackages();
	const packages = await formatPackageInfo(info);
	return packages;
};
