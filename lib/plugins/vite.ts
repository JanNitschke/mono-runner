import type { Plugin } from "vite";
import { getWorkspacePackagesSync, rootPath } from "../utils/packages";
import { join } from "path";

type PathMap = {
	[key: string]: string;
};
type MonoViteConfig = {
	prodRewrite?: PathMap;
	devRewrite?: PathMap;
};



export const ViteMonoPlugin: (config: MonoViteConfig) => Plugin  = (config) => {

	const packages = getWorkspacePackagesSync();
	const packageKeys = Object.keys(packages);

	return {
		name: "mono-vite-plugin",
		config: (opts, env) => {
		},
		resolveId: (id: string) => {
			for (let index = 0; index < packageKeys.length; index++) {
				const key = packageKeys[index];
				if(id.startsWith(key)){
					const path = packages[key];
					const newPath = id.replace(key, path);
					return {
						id: join(rootPath, newPath),
					}
				}
			}
			return undefined;
		}
	}
};