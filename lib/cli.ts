#!/usr/bin/env bun
import { genAlias } from "./alias";
import { ExecOptions, execute } from "./execute";
import { argv } from "node:process";


const [runtime, _file, ...args] = argv;
const childArgIdx = args.indexOf("--");
const childArgs = childArgIdx > -1?args.slice(childArgIdx + 1):[];
const toolArgs = childArgIdx > -1?args.slice(0, childArgIdx):args;

const options: ExecOptions = {

}

const [project, command] = toolArgs.filter((arg) => !arg.startsWith("-"));

if(toolArgs.includes("--parallel") || toolArgs.includes("-p")){
	options.parallel = true;
}

if(project === "--init"){
	genAlias();	
}else{
	await execute(runtime, project, command, childArgs, options)
}