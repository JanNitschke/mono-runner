import type { StreamInfo } from "./execute";

const MAX_WIDTH = process.stdout.columns || 160;
const getWidthRegex = (pcg: string) => {
  const width = MAX_WIDTH - pcg.length - 2;
  return new RegExp(`.{1,${width}}`, "g");
};

const packageToColor = (name: string) => {
  const hash = name.split("").reduce((acc, cur) => {
    return acc + cur.charCodeAt(0);
  }, 0);
  const idx = hash % 6;
  const colors = [
    "\x1b[31m",
    "\x1b[32m",
    "\x1b[33m",
    "\x1b[34m",
    "\x1b[35m",
    "\x1b[35m",
  ];
  return colors[idx];
};

export const drawConsole = (streams: StreamInfo[], quiet?: boolean) => {
  streams.forEach((s) => {
    const { stream, level, package: pcg } = s;
    const encoder = new TextDecoder();
    const color = packageToColor(pcg);
    const regex = getWidthRegex(pcg);

    const push = (chunk: Uint8Array) => {
      const current = encoder.decode(chunk);
      const lines = current.split("\n").flatMap((line) => {
        const m = line.match(regex);
        if (m) {
          return m;
        } else {
          return [line];
        }
      });
      if (quiet && level == "err") {
        console.error(`${pcg}\: \n`);
      }
      lines.forEach((line, i) => {
        if (level == "err") {
          if (quiet) {
            console.error(`${line}`);
          } else {
            console.error(`${color}${pcg}\x1b[0m: ${line}`);
          }
        } else if (!quiet) {
          console.log(`${color}${pcg}\x1b[0m: ${line}`);
        }
      });
      if (quiet && level == "err") {
        console.error(`\n\n`);
      }
    };
    (stream as any).on("data", push);
  });
};
