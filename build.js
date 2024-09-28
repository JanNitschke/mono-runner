const ncc = require("@vercel/ncc");
const fs = require("fs");
const fsp = require("fs/promises");
const path = require("path");

const externals = ["vite", "typescript"];

const build = async (input) => {
	const abs = path.join(__dirname, input);
	const res = await ncc(abs, {
		externals,
		filterAssetBase: path.join(__dirname, "lib"),
	});
	return res;
};

const clearFolder = async(folder) => {
	const dir = await fsp.readdir(folder);
	const prms = dir.map(async (file) => {
		const curPath = path.join(folder, file);
		if((await fsp.lstat(curPath)).isDirectory()) {
			await clearFolder(curPath);
		}
		await fsp.unlink(path.join(folder, file)).catch(() => {});
	});
	await Promise.all(prms);
};

const run = async () => {
	const outDir = path.join(__dirname, "dist");
	!fs.existsSync(outDir) && fs.mkdirSync(outDir);
	clearFolder(outDir);
	
	const res = build("./lib/index.ts");
	const cli = build("./lib/cli.ts");
	const tsc = build("./lib/tsc.ts");

	const [{ code: resCode, assets }, { code: cliCode }, { code: tscCode}] = await Promise.all([res, cli, tsc]);
	fs.writeFileSync("./dist/index.js", resCode, {});
	fs.writeFileSync("./dist/cli.js", cliCode);
	fs.writeFileSync("./dist/tsc.mjs", tscCode);
	fs.chmodSync("./dist/index.js", "755");
	fs.chmodSync("./dist/cli.js", "755");
	fs.chmodSync("./dist/tsc.mjs", "755");

	for (const key in assets) {
		if (Object.hasOwnProperty.call(assets, key)) {
			if (!key.endsWith(".d.ts") || !key.startsWith("lib/")) continue;
			const element = assets[key];
			const relative = path.relative("lib", key);
			const output = path.join(outDir, relative);
			const outFolder = path.dirname(output);
			!fs.existsSync(outFolder) && fs.mkdirSync(outFolder, { recursive: true });
			fs.writeFileSync(output, element.source);
		}
	}
};

run();
