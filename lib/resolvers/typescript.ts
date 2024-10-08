import { join } from "path";
import { rootPath } from "../utils/packages";
import { PackageConfig, PackageResolver } from "./types";

export const typescriptResolver: PackageResolver = async({dependencies, path}, { loadDependency}) => {
	if(dependencies.includes("typescript")){
		const tscPath = join(rootPath, path, "tsconfig.json");
		const typescript = await loadDependency("typescript");
		if(!typescript){
			return null;
		}
		const ts = typescript.default;		
		const tsConfig = ts.readConfigFile(tscPath, ts.sys.readFile);
		
		if(!tsConfig){
			return null;
		}
		const out: PackageConfig = {
			outPath: null,
			srcPath: null
		};

		if(tsConfig?.config?.compilerOptions?.outDir){
			out.outPath = tsConfig.config.compilerOptions.outDir;
		}
		if(tsConfig?.config?.compilerOptions?.rootDir){
			out.srcPath = tsConfig.config.compilerOptions.rootDir;
		}

		if(dependencies.includes("mono-runner")){
			out.readyIPC = true;
		}
		return out;
	}else{
		return null;
	}
};
