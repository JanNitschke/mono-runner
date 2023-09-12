import { join } from "node:path";
import { existsSync } from "node:fs";
import { defaultResolvers } from "./resolvers";
import { readFile, unlink, writeFile } from "node:fs/promises";
import { rootPath } from "./packages";
import { PackageConfig, PackageInfo, PackageResolver, ResolverUtils } from "../resolvers/types";

const loadResolvers = async(path: string): Promise<PackageResolver[]|null> => {
	if(!existsSync(path)){
		return null;
	}
	const data = await import(path).then((mod) => {
		return mod.resolvers;
	}).catch(() => null);
	return data;
};



export const getPackageConfig = async(pcg: PackageInfo): Promise<PackageConfig|null> => {

	const configPath = join(rootPath, "mono.config.js");

	const resolvers = (await loadResolvers(configPath)) || defaultResolvers;

	const readPackageFile = async(path: string): Promise<string|null> => {
		const filePath = join(rootPath,pcg.path, path);
		if(!existsSync(filePath)){
			return null;
		}
		return await readFile(filePath, "utf-8");
	};


	const loadTypescript = async(path: string) => {

		const typescript = await import("typescript");
		const ts = typescript.default;
		const data = await readPackageFile(path);
		if(!data){
			return null;
		}

		const mod = ts.transpileModule(data, {
			fileName: path,
			compilerOptions: {
				outFile: "out.js",
				sourceRoot: join(rootPath, pcg.path),
				target: ts.ScriptTarget.ESNext,
			}
		}).outputText;
		
		
		if(!mod){
			return null;
		}
		const tempPath = join(rootPath, pcg.path, `${path}.mono.temp.js`);

		try{
			await writeFile(tempPath, mod);
			const module = await import(tempPath);
			if(module){
				return module;
			}else{
				return null;
			}
		}catch(e){
			console.error(e);
			return null;
		}finally{
			await unlink(tempPath);
		}
		return null;		
	}

	const loadModule = async(path: string): Promise<any|null> => {
		const filePath = join(rootPath,pcg.path, path);
		if(path.endsWith(".ts")){
			return await loadTypescript(path).catch((e) => {
				console.log(e);
				return null;
			});
		}
		if(!existsSync(filePath)){
			return null;
		}
		return await import(filePath).catch(() => null);
	};


	const utils: ResolverUtils = {
		readFile: readPackageFile,
		loadModule: loadModule,
	};
	
	for(let idx = 0; idx < resolvers.length; idx++){
		const handler = resolvers[idx];
		const config = await Promise.resolve(handler(pcg, utils));
		if(config){
			return config;
		}
	}
	return null;
};