import { join } from "path";
import { rootPath } from "../utils/packages";
import { PackageConfig, PackageResolver } from "./types";
import { existsSync } from "fs";

export const viteResolver: PackageResolver = async({dependencies, path}, {loadDependency, loadBundled}) => {
	if(dependencies.includes("vite")){

		const packageRoot = join(rootPath, path);
		const configPathJs = join(packageRoot, "vite.config.js");
		const configPathTs = join(packageRoot, "vite.config.ts");
		const configPath = existsSync(configPathTs) ? "vite.config.ts" : existsSync(configPathJs) ? "vite.config.js" : null;

		if(!configPath){
			return null;
		}

		const viteConfig = await loadBundled(configPath).catch(() => null);

		if(!viteConfig || !viteConfig.default){
			return null;
		}
		let parsed = viteConfig.default;
		if(typeof viteConfig.default === "function"){
			parsed = await Promise.resolve(viteConfig.default({command: "build", mode: "production", ssrBuild: true}));
		}
		
		if(!parsed){
			return null;
		}

		const out: PackageConfig = {
			outPath: "dist",
			srcPath: "."
		};
		if(parsed.build?.outDir){
			out.outPath = parsed.build.outDir;
		}
		if(parsed.root){
			out.srcPath = parsed.root;
		}
		return out;
	}else{
		return null;
	}
};
