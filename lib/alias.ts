import { writeFileSync } from "fs";
import { getPackageJson, getWorkspacePackages } from "./packages";
import { join,  } from "path";
import { getPackageConfig } from "./config";
import { getTsconfig } from "get-tsconfig";

export const genAlias = async (alias: boolean) => {
	const info = await getWorkspacePackages();
	const paths: Record<string, string[]> = {};
	const prms = Object.keys(info).map(async(name) => {
		const path = info[name];

		const pcgJson = getPackageJson(join(process.cwd(), path));
		const { dependencies = {}, devDependencies = {} } = await pcgJson;
		const deps = Object.keys({ ...dependencies, ...devDependencies });
		
		const config = await getPackageConfig({name, path, dependencies: deps});

		if(!config || !config.srcPath){
			paths[`${name}/*`] = [`${path}/*`];
			paths[name] = [path];
		}else{
			const {srcPath} = config;
			const combined = join(path, srcPath);
			paths[`${name}/*`] = [`${combined}/*`];
			paths[name] = [combined];
		}
	});

	await Promise.all(prms);

	const base = {
		compilerOptions: {
			baseUrl: "./",
			paths: paths,
		},
	};

	if(alias){
		const out = base;
		writeFileSync(join(process.cwd(), "tsconfig.alias.json"), JSON.stringify(out, null, 2));
	}else{
		const tscPath = join(process.cwd(), "tsconfig.json");
		const tsConfig = getTsconfig(tscPath);

		if(!tsConfig){
			console.log("could not find tsconfig.json file, creating one...");
			writeFileSync(tscPath, JSON.stringify(base, null, 2));
			return
		}
		const config = tsConfig.config;

		if(!config.compilerOptions){
			config.compilerOptions = {};
		}
		if(!config.compilerOptions.baseUrl){
			config.compilerOptions.baseUrl = "./";
		}			
		if(!config.compilerOptions.paths){
			config.compilerOptions.paths = paths;
		}else{
			config.compilerOptions.paths = {...config.compilerOptions.paths, ...paths};
		}

		writeFileSync(join(process.cwd(), "tsconfig.json"), JSON.stringify(config, null, 2));


	}
	
};



/*

{
  "compilerOptions": {
    "baseUrl": "packages",
    "paths": {
      "@dev/ui": [
        "ui/src/lib"
      ],
      "@dev/ui/*": [
        "ui/src/lib/*"
      ]
    }
  }
}

 */