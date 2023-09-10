import { join } from "node:path";
import { LocalPackage } from "./packages";
import { existsSync } from "node:fs";

type PackageConfig = {
	outPath: null | string,
	srcPath: null | string,
};

type PackageInfo = {
	name: string,
	path: string,
	dependencies: string[]
}

type PackageHandler = (pcg: PackageInfo) => PackageConfig|null;

const defaultHandlers: PackageHandler[] = [
	(pcg) => {
		if(pcg.dependencies.includes("@sveltejs/package")){
			return {
				outPath: "dist",
				srcPath: "src/lib"
			}
		}else{
			return null;
		}
	}
];


export const getPackageConfig = async(pcg: PackageInfo): Promise<PackageConfig|null> => {
	const handlers = [...defaultHandlers];
	const configPath = join(process.cwd(), "mono.config.js");

	if(existsSync(configPath)){
		const data = await import(configPath).then((mod) => {
			return mod.resolvers;
		}).catch(() => null);
		if(data){
			handlers.push(...data);
		}
	}
	
	for(let idx = 0; idx < handlers.length; idx++){
		const handler = handlers[idx];
		const config = handler(pcg);
		if(config){
			return config;
		}
	}
	return null;
};