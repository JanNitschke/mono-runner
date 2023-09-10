#!/usr/bin/env node
import { genAlias } from "./alias";
import { ExecOptions, execute } from "./execute";
import { argv } from "node:process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const [runtime, _file, ...args] = argv;

const hasLockfile = (file: string) => {
	return existsSync(join(process.cwd(), file));
}

let pckManager = "npm";
if(process.isBun || hasLockfile("bun.lockb")){
	pckManager = "bun";
}else if(hasLockfile("yarn.lock")){
	pckManager = "yarn";
}else if(hasLockfile("pnpm-lock.yaml")){
	pckManager = "pnpm";
}


const childArgIdx = args.indexOf("--");
const childArgs = childArgIdx > -1?args.slice(childArgIdx + 1):[];
const toolArgs = childArgIdx > -1?args.slice(0, childArgIdx):args;

const options: ExecOptions = {

}

let [project, command] = toolArgs.filter((arg) => !arg.startsWith("-"));

const getArgValue = (name: string) => {
	const arg = toolArgs.find((arg) => arg.startsWith(name));
	const val = arg?arg.split("="):[];
	return val[1];
}

if(toolArgs.includes("--parallel") || toolArgs.includes("-p")){
	options.parallel = true;
}
if(toolArgs.includes("--all")){
	command = project;
	project = "";
}
if(toolArgs.includes("--no-wait")){
	options.noWait = true;
}
if(toolArgs.includes("--continue-failed")){
	options.ignoreCode = true;
}
const overridePckManager = getArgValue("--package-manager");
if(overridePckManager){
	pckManager = overridePckManager;
}
console.log("running scripts using:", pckManager);
console.log("---------");

if(toolArgs.includes("--init")){
	genAlias(toolArgs.includes("--alias"));	
}else{
	await execute(pckManager, project, command, childArgs, options)
}