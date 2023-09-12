import { join } from "path";
import {
	getWorkspacePackagesSync,
	rootPath,
} from "../utils/packages";



export const createSassImporter = () => {
	const packages = getWorkspacePackagesSync();

	const resolve = (request: string) => {
		for (const [name, path] of Object.entries(packages)) {
			if (request.startsWith(name)) {
				return join(rootPath, path, request.substring(name.length));
			}
		}
	
		return request;
	};

	return (request: string, source: any, done?: (result: { file: string }) => void) => {
		const mod = resolve(request);
		if (done) {
			done({
				file: mod,
			});
		} else {
			return {
				file: mod,
			};
		}
	};
};
