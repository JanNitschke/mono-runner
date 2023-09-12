import type { StreamInfo } from "./execute";


const MAX_WIDTH = 160;
const WIDTH_REX = new RegExp(`.{1,${MAX_WIDTH}}`, "g");

const packageToColor = (name: string) => {
	const hash = name.split("").reduce((acc, cur) => {
		return acc + cur.charCodeAt(0);
	}, 0);
	const idx = hash % 6;
	const colors = ["\x1b[31m", "\x1b[32m", "\x1b[33m", "\x1b[34m", "\x1b[35m", "\x1b[35m"];
	return colors[idx];
};


export const drawConsole = (streams: StreamInfo[]) => {
	streams.forEach((s) => {
		const {stream, level, package: pcg} = s;
		const encoder = new TextDecoder();
		const color = packageToColor(pcg);
		const push = (chunk: Uint8Array) => {
			const current = encoder.decode(chunk);
			const lines = current.split("\n").flatMap((line) => {
				const m = line.match(WIDTH_REX);
				if (m) {
					return m;
				} else {
					return [line];
				}
			});
			lines.forEach((line, i) => {
				if (level == "err") {
					console.error(`${color}${pcg}\x1b[0m: ${line}`);
				} else {
					console.log(`${color}${pcg}\x1b[0m: ${line}`);
				}
			});
		};
		(stream as any).on("data", push);
	});
};
