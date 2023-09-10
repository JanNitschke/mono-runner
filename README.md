# mono-runner

A script runner for mono repos that just works.

Designed for typescript, svelte kit and svelte package. Extendable for other frameworks. Works with yarn/pnpm/bun workspaces and runs scripts with the correct package manager. 

You can use Mono to run separate compilers and dev servers for your packages at once, build only dependent packages or format everything at once. No additional configuration needed.

# usage

## Run a script

mono automatically runs scripts for all dependencies, their dependencies, and so on...

```bash
mono <package> <script>

mono app build
```
by default mono waits for the script to finish before executing the parents script. Thats less then ideal for compilers in watch mode or dev servers. The ```--parallel``` flag allows multiple scripts to be started without waiting for each other.

```bash
mono <package> <script> --parallel

mono app dev --parallel
```
Mono will run the development servers in order and wait for the initial build to be completed before starting its dependents. This only works for supported frameworks, but is easily extendable (see configuration). Mono also provides the ```--no-wait``` flag to run scripts .

```bash
mono <package> <script> --parallel --no-wait

mono app format --parallel --no-wait
```

Mono can also be used to run a script in all packages using the ```--all``` flag instead of a package name.

```bash
mono <script> --all

mono --all build
mono format --all --no-wait
```

This will run the script on all packages but still respect the dependency order.Combine with ```--no-wait``` to run on all packages at the same time.

Arguments for mono and the script its running are split by ```--```. Everything you write behind that is passed to the script processes.
```bash
mono <package> <script> -- <args>
mono --all format --no-wait -- --tab-with=4
```

## Package managers

Mono detects your package manager using lock files in your working directory. This can be overridden using the ```--package-manager=<name>``` flag

```bash
mono <package> <script> -- <args>
mono app build --package-manager=yarn
```

## Typescript
Mono can add typescript path aliases to all local packages to your ts config. It even links to the source folder of supported frameworks to allow your IDE to link to source.

```bash
mono --init
```
This will modify or create a tsconfig.json. If you don't want mono to write directly to jour tsconfig use the ```--alias``` flag to create a tsconfig.alias.json instead. You can then link to this file in your tscofig.json using the extends field.

```bash
mono --init --alias
```

# package.json

mono does not fix package json exports for you. Please make sure that the exports field in your package.json 's points to your build output. Your package json should at least look like this:
```json
"exports":{
	"./*": "./dist/*"
}
```


# Extending
mono currently supports automatic configuration for svelte kit and package projects. You can create custom resolvers to support your favorite frameworks or custom compilers. Just add a mono.config.js file and implement the resolver function
```typescript
type Resolver = ({
	name: string,
	path: string,
	dependencies: string[]
}) => {
	outPath?: string,
	srcPath?: string
}|null;
```
Parallel mode will watch outPath to determine if the dev server has started. 

Init will alias typescript to the srcPath. 

If both default to the packages folder. Return null if your resolver does not match the package.

add a mono.config.js that lists your resolvers:

```javascript
export const resolvers = [
	(pcg) => {
		if(pcg.dependencies.includes("@my/framework")){
			return {
				outPath: "./.build",
				srcPath: "./lib"
			}
		}else{
			return null;
		}
	}
];
```
resolvers will run top to bottom and stop at the first match.