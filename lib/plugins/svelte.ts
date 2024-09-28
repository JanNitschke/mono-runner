import { join } from "path";
import { getWorkspacePackagesSync, rootPath } from "../utils/packages";

export const svelteMonoAlias = () => {

	const packages = getWorkspacePackagesSync();
	const alias: Record<string, string> = {};


	Object.entries(packages).forEach(([key, value]) => {
		alias[key] = join(rootPath, value);
	});
	return alias;
}