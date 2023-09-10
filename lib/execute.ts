import { spawn } from "node:child_process";
import { LocalPackage, getLocalPackages } from "./packages";
import { join } from "node:path";
import { existsSync, lstatSync } from "node:fs";
import { drawConsole } from "./out";
import { getPackageConfig } from "./config";

export type ExecOptions = {
	parallel?: boolean;
	noWait?: boolean;
	ignoreCode?: boolean;
};

export type StreamInfo = {
	level: "out" | "err";
	stream: any;
	package: string;
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const holdBeforeFolderExists = async (filePath: string, timeout: number) => {
	await sleep(1000);
	timeout = timeout < 1000 ? 1000 : timeout;
	try {
		var nom = 0;
		return new Promise((resolve) => {
			var inter = setInterval(() => {
				nom = nom + 100;
				if (nom >= timeout) {
					clearInterval(inter);
					//maybe exists, but my time is up!
					resolve(false);
				}

				if (existsSync(filePath) && lstatSync(filePath).isDirectory()) {
					clearInterval(inter);
					resolve(true);
				}
			}, 100);
		});
	} catch (error) {
		return false;
	}
};

const spawnWorker = (runtime: string, pcg: LocalPackage, command: string, args: string[] = []) => {
	
	const p = spawn(runtime, ["run", command, ...args], {
		cwd: join(process.cwd(), pcg.path),
		env: process.env,
	});

	const exit = new Promise<number>((resolve) => {
		p.on("exit", (e) => {
			resolve(e || 0);
		});
	});

	return {
		out: p.stdout as any,
		err: p.stderr as any,
		exit,
		kill: () => {
			p.kill();
		},
	};
};

const isReady = async(packageName: string, packagePath: string, packageDeps: string[]) => { 

	const config = await getPackageConfig({name: packageName, path: packagePath, dependencies: packageDeps});

	if(config && config.outPath){
		const path = join(process.cwd(), packagePath, config.outPath);
		const exists = await holdBeforeFolderExists(path, 10000);
		if(exists){
			return true;
		}else{
			return false;
		}
	}else{
		return
	}
}


const startScriptAndDeps = async (
	runtime: string,
	localPackage: LocalPackage|LocalPackage[],
	command: string,
	args: string[],
	options: ExecOptions
) => {
	const started: Map<string, Promise<void>> = new Map();
	const { parallel = false, noWait = false, ignoreCode = false} = options;
	let exitCode = 0;

	const allExits: Promise<number>[] = [];

	const startScript = async (pcg: LocalPackage) => {
		const deps = pcg.localDependencies.map(async (dep) => {
			if (started.has(dep.name)) {
				return started.get(dep.name);
			}
			if(!dep.scripts.includes(command)){
				return;
			}
			const scr = startScript(dep);
			started.set(dep.name, scr);
			return await scr;
		});
		if(!noWait){
			await Promise.all(deps);
		}
		const worker = spawnWorker(runtime, pcg, command, args);

		drawConsole([
			{
				level: "out",
				stream: worker.out,
				package: pcg.name,
			},
			{
				level: "err",
				stream: worker.err,
				package: pcg.name,
			}
		])
		if(parallel){
			await isReady(pcg.name, pcg.path, pcg.dependencies);
			if(pcg === localPackage){
				exitCode = Math.max(exitCode, await worker.exit);
				if(exitCode !== 0 && !ignoreCode){
					process.exit(exitCode);
				}
			}else if(Array.isArray(localPackage)){
				allExits.push(worker.exit);
			}
		}else{
			exitCode = Math.max(await worker.exit);
			if(exitCode !== 0 && !ignoreCode){
				process.exit(exitCode);
			}
		}
	};

	if(Array.isArray(localPackage)){
		await Promise.all(localPackage.map((pcg) => startScript(pcg)));
		const code = (await Promise.all(allExits)).reduce((a, b) => Math.max(a, b), 0);
		return code;
	}else{
		await startScript(localPackage);
	}

	return exitCode;
};

export const execute = async (
	runtime: string,
	pcg: string,
	command: string,
	args: string[],
	options: ExecOptions
) => {
	// packetfinden,
	// script für deps starten ....
	// script für packet starten
	// ausgabe

	const packages = await getLocalPackages();
	
	if(pcg === ""){	
		const streams = await startScriptAndDeps(
			runtime,
			packages,
			command,
			args,
			options
		);
	}else{

		const localPackage = packages.find((p) => p.name === pcg);

		if (!localPackage) {
			console.error(`Package ${pcg} not found`);
			return;
		}
	
		const exitCode = await startScriptAndDeps(
			runtime,
			localPackage,
			command,
			args,
			options
		);
		if(options.parallel){
			process.exit(exitCode);
		};
		
	}
};