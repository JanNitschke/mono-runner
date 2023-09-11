import { join } from "path";

export const typescriptResolver: PackageResolver = async({dependencies, path}, {}) => {
	if(dependencies.includes("typescript")){
		const tscPath = join(process.cwd(), path, "tsconfig.json");
		const typescript = await import("typescript");
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
		return out;
	}else{
		return null;
	}
};
