import { join } from "path";
import { readFileJSON } from "./packages";
import { build } from "esbuild";
import { lstat, unlink } from "fs/promises";


const isDirectory = (path: string) => {
	return lstat(path).then((stat) => stat.isDirectory()).catch(() => false);
}	

const getMain = async(path: string) => {
	if(!isDirectory(path)){
		return path;
	}
	const packageJson = join(path, "package.json");
	const content = await readFileJSON(packageJson).catch(() => null);
	if(!content){
		return path
	}else{
		const main = content.module || content.main || "index.js";
		return join(path, main);
	}
}



export const loadBundled = async(base: string, file: string) => {
	const workspace = join(process.cwd(), base);
	const inFile = await getMain(join(workspace, file));
	const outPath = inFile + ".mono.temp.mjs";
	try{
		const res = await build({
			bundle: true,
			entryPoints: [inFile],
			absWorkingDir: workspace,
			format: "esm",
			platform: "node",
			packages: "external",
			logLevel: "silent",
			outfile: outPath
		}).catch((e) => null);
		if(!res){
			return null;
		}
		const mod = await import(outPath);
		return mod;
	}catch(ex){
		return null;
	}finally{
		await unlink(outPath).catch(() => null);
	}	
};

const parseImport = async(base: string, module: string) => {
	
	const mainPath = await getMain(join(base, module));
	const mod = await import(mainPath).catch((e) => {
		return null;
	});
	if(!mod){
		throw new Error("import failed not found");
	}
	return mod;
	
};


export const importFromPackage = async(packagePath: string, dependency: string) => {
	const basePath = process.cwd();
	const baseModules = join("/node_modules", dependency)	;
	const packageModules =  join(packagePath, "/node_modules", dependency);
	try{
		return await parseImport(basePath, packageModules).catch((e) => {
			return parseImport(basePath, baseModules);
		}).catch((e) => {
			return parseImport(basePath, dependency);
		}).catch(() => null);
	}catch(ex){
		return null;
	}
};