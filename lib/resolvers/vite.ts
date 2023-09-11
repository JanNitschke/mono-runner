import { join } from "path";

export const viteResolver: PackageResolver = async({dependencies, path}, {loadModule}) => {
	if(dependencies.includes("vite")){

		const vite = await import("vite");

		if(!vite){
			return null;
		}
		let config = await vite.loadConfigFromFile({mode: "production", command: "build"}, join(process.cwd(), path, "vite.config.js")).catch(() => null);
		if(!config){
			config = await vite.loadConfigFromFile({mode: "production", command: "build"}, join(process.cwd(),path, "vite.config.ts")).catch(() => null);
		}


		if(!config || !config.config){
			return null;
		}


		const out: PackageConfig = {
			outPath: "dist",
			srcPath: "./"
		};
		if(config.config.build?.outDir){
			out.outPath = config.config.build.outDir;
		}
		if(config.config.root){
			out.srcPath = config.config.root;
		}
		return out;
	}else{
		return null;
	}
};
