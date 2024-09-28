import { writeFileSync } from "fs";
import { getLocalPackages, getPackageJson, getWorkspacePackages, rootPath } from "./packages";
import { join, relative,  } from "path";
import { getPackageConfig } from "./config";
import ts from "typescript";
import { lstat } from "fs/promises";

const addToTsConfig = (name: string, folderPath: string, paths: Record<string, string>) => {
	const tscPath = join(rootPath, folderPath, "tsconfig.json");
	const tsConfig = ts.readConfigFile(tscPath, ts.sys.readFile);
	if(!tsConfig){
		console.warn(`could parse tsconfig.json file for ${name}`);
		return;
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

		writeFileSync(tscPath, JSON.stringify(config, null, 2));

};






export const genAlias = async (dryrun: boolean) => {
	const paths: Record<string, string> = {};

	const packages = await getLocalPackages();
	const allPackageNames = packages.map((p) => p.name);
	const dependencies = packages.flatMap((p) => p.dependencies.filter((d) => allPackageNames.includes(d)));	

	const pathPromises = packages.map(async(p) => {
		const {name, path} = p;
		if(!dependencies.includes(name)){
			// only include packages that others are dependent on
			console.info(`No packages depend on ${name}, skipping...`);
			return;
		}
		const config = await getPackageConfig(p);
		
		if(!config || !config.srcPath){
			paths[name] = path;
		}else{
			const {srcPath} = config;
			const combined = join(path, srcPath);
			paths[name] = combined;
		}
	});

	await Promise.all(pathPromises);


	const promises = packages.map(async (p) => {
		const {name, path, localDependencies} = p;
		const tsconfig = await lstat(join(rootPath, path, "tsconfig.json")).catch(() => null);
		if(!tsconfig || !tsconfig.isFile()){
			console.info(`No tsconfig.json file found in ${name}, skipping...`);
			return;
		}
		const deps = localDependencies.map(d => {
			const {name} = d;
			const absPath = paths[name];
			const relPath = relative(path, absPath);
			return [name, relPath];
		}).filter((d) => d !== undefined).reduce((acc, [name, out]) => {
			return {...acc, [name]: [out], [`${name}/*`]: [`${out}/*`]};
		}, {});

		if(Object.keys(deps).length === 0){
			if(dryrun){
				console.log(`No local dependencies found for ${name}, skipping...`);
			}
			return;
		}

		if(dryrun){
			console.log(`--- adding to ${name} tsconfig.json --- `);
			console.log(JSON.stringify(deps, null, 2));
			console.log(`------------`);
		}else{
			await addToTsConfig(name, path, deps);
		}
		
	});
	await Promise.all(promises);

	/*
	const base = {
		compilerOptions: {
			baseUrl: "./",
			paths: paths,
		},
	};

	if(alias){
		const out = base;
		writeFileSync(join(rootPath, "tsconfig.alias.json"), JSON.stringify(out, null, 2));
	}else{
		const tscPath = join(rootPath, "tsconfig.json");
		const tsConfig = ts.readConfigFile(tscPath, ts.sys.readFile);

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

		writeFileSync(join(rootPath, "tsconfig.json"), JSON.stringify(config, null, 2));

	}*/
	
};
