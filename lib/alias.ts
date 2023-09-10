import { writeFileSync } from "fs";
import { getPackageJson, getWorkspacePackages } from "./packages";
import { join } from "path";
import { getPackageConfig } from "./config";

export const genAlias = async () => {
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

	const out = {
		compilerOptions: {
			baseUrl: "./",
			paths: paths,
		},
	};
	writeFileSync(join(process.cwd(), "tsconfig.alias.json"), JSON.stringify(out, null, 2));
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