import { spawn } from "node:child_process";
import { LocalPackage, getLocalPackages, rootPath } from "./packages";
import { join } from "node:path";
import { lstat, readdir } from "node:fs/promises";
import { drawConsole } from "./out";
import { getPackageConfig } from "./config";
import { rmSync } from "node:fs";

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
	const end = Date.now() + timeout;
	return new Promise((resolve) => {
		const check = async () => {
			if (end < Date.now()) {
				resolve(false);
				return;
			}
			const isDir = await lstat(filePath)
				.then((stat) => stat.isDirectory())
				.catch(() => false);
			if (isDir) {
				const fileCount = await readdir(filePath)
					.then((files) => {
						return files?.length || 0;
					})
					.catch(() => 0);
				if (fileCount > 0) {
					resolve(true);
					return;
				}
			}
			setTimeout(check, 100);
		};
		setTimeout(check, 100);
	});
};

const findNodeBin = async (path: string, name: string):Promise<string|false> => {
	let current = path;
	while (current.length >= rootPath.length){
		const binPath = join(current, "node_modules", ".bin", name);
		if(await lstat(binPath).then(() => true).catch(() => false)){
			return binPath;
		}
		current = join(current, "..");
	}
	return false;
};

type ScriptInfo = {
	exec?: string;
	args: string[];
	envs: Record<string, string>;
}


const parseScript = (script: string): ScriptInfo => {
	if(!script){
		return {
			exec: undefined,
			args: [],
			envs: {}
		};
	}
	const parts = script.split(" ");
	const hasAnd = script.includes("&");

	const envs: Record<string, string> = {};
	for (let idx = 0; idx < parts.length; idx++) {
		if (parts[idx].includes("=")) {
			const [env, value] = parts[idx].split("=");
			envs[env] = value;
		}else{
			if(hasAnd){
				return {
					exec: undefined,
					args: parts.slice(idx),
					envs
				};
			}else{
				return {
					exec: parts[idx],
					args: parts.slice(idx + 1),
					envs
				};
			}
		}
	}
	return {
		exec: undefined,
		args: parts,
		envs
	};
	
}

const spawnWorker = async (
	runtime: string,
	pcg: LocalPackage,
	command: string,
	args: string[] = [],
	noWait: boolean
) => {
	return new Promise<{
		out: any;
		err: any;
		ready: Promise<boolean>;
		exit: Promise<number>;
		kill: () => void;
	}>(async(resolve) => {


		const currentDir = join(rootPath, pcg.path);
		const script = pcg.scriptCommands[command];


		let {exec, args: execArgs, envs} = parseScript(script.trim());
		const env: any = {
			...process.env,
			...envs
		}
		delete env.NODE_CHANNEL_FD;

		const bin = exec?await findNodeBin(currentDir, exec):false;

		if(!bin){
			console.log(`Could not directly start ${pcg.name} - starting using ${runtime}`);
			execArgs = ["run", command, ...args];
		}

		console.log(`Running ${pcg.name} - ${command}:  ${bin || runtime} ${execArgs.join(" ")}`);
		const p = spawn(bin || runtime, execArgs, {
			cwd: currentDir,
			stdio: ["pipe", "pipe", "pipe", "ipc"],
			env: {
				...env,
				MONO_ROOT: rootPath,
			},
		});
	
		const exit = new Promise<number>((resolve) => {
			p.on("exit", (e) => {
				if(e !== 0){
					console.error(`Error in ${pcg.name} - ${e}`);
				}
				resolve(e || 0);
			});
		});


		const ready = new Promise<boolean>((resolve) => {
			if(noWait){
				resolve(true);
			}else{
				p.on("message", (e) => {
					if(e && e.event === "READY"){
						resolve(true);
					}
				});
			}
		});

		p.on("spawn", () => {
			
			resolve({
				out: p.stdout as any,
				err: p.stderr as any,
				ready,
				exit,
				kill: () => {
					p.kill();
				},
			});
		});
	});
};

const isReady = async (packageName: string, packagePath: string, packageDeps: string[], ready?: Promise<boolean>) => {
	const config = await getPackageConfig({
		name: packageName,
		path: packagePath,
		dependencies: packageDeps,
	});
	if(config && config.readyIPC){
		// timeout after 15 seconds
		const res = await Promise.any([ready?.then(() => true), sleep(15000).then(() => false)]);
		if(res === false){
			console.log(`${packageName} timed out - continuing...`)
		}
		// some compilers emit the ready hook before writing the files
		await sleep(1000);
		return true;
	}else if (config && config.outPath) {
		const path = join(rootPath, packagePath, config.outPath);
		rmSync(path, { recursive: true, force: true });
		await sleep(1000);
		const exists = await holdBeforeFolderExists(path, 10000);
		if (exists) {
			return true;
		} else {
			return false;
		}
	} else {
		return;
	}
};

const startScriptAndDeps = async (
	runtime: string,
	localPackage: LocalPackage | LocalPackage[],
	command: string,
	args: string[],
	options: ExecOptions
) => {
	const started: Map<string, Promise<void>> = new Map();
	const { parallel = false, noWait = false, ignoreCode = false } = options;
	let exitCode = 0;

	const allExits: Promise<number>[] = [];

	const startScript = async (pcg: LocalPackage) => {
	
		const deps = pcg.localDependencies.map(async (dep) => {
			if (started.has(dep.name)) {
				return started.get(dep.name);
			}
			const scr = startScript(dep);
			started.set(dep.name, scr);
			return await scr;
		});
		if (!noWait) {
			await Promise.all(deps);
		}
		if(!pcg.scripts.includes(command)){
			return;
		}
		const workerPrm = spawnWorker(runtime, pcg, command, args, noWait);
		workerPrm.then((worker) => {
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
				},
			]);
		});
		if (parallel) {
			const worker = await workerPrm;
			await isReady(pcg.name, pcg.path, pcg.dependencies, worker.ready);
			if (pcg === localPackage) {
				exitCode = Math.max(exitCode, await worker.exit);
				if (exitCode !== 0 && !ignoreCode) {
					process.exit(exitCode);
				}
			} else if (Array.isArray(localPackage)) {
				allExits.push(worker.exit);
			}
		} else {
			exitCode = Math.max(await (await workerPrm).exit);
			if (exitCode !== 0 && !ignoreCode) {
				process.exit(exitCode);
			}
		}
	};

	if (Array.isArray(localPackage)) {
		localPackage.forEach((pcg) => {
			started.set(pcg.name, Promise.resolve());
		});

		await Promise.all(localPackage.map((pcg) => startScript(pcg)));
		const code = (await Promise.all(allExits)).reduce((a, b) => Math.max(a, b), 0);
		return code;
	} else {
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
	// packet finden,
	// script für deps starten ....
	// script für packet starten
	// ausgabe

	const packages = await getLocalPackages();

	if (pcg === "") {
		const exitCode = await startScriptAndDeps(runtime, packages, command, args, options);
		
		process.exit(exitCode);
		
	} else {
		const localPackage = packages.find((p) => p.name === pcg);

		if (!localPackage) {
			console.error(`Package ${pcg} not found`);
			return;
		}

		const exitCode = await startScriptAndDeps(runtime, localPackage, command, args, options);
		if (options.parallel) {
			process.exit(exitCode);
		}
	}
};
