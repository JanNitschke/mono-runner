import { collappPackageResolver, svelteKitResolver, sveltePackageResolver } from "../resolvers/svelte";
import { typescriptResolver } from "../resolvers/typescript";
import { viteResolver } from "../resolvers/vite";

export const defaultResolvers = [
	collappPackageResolver,
	sveltePackageResolver,
	svelteKitResolver,
	viteResolver,
	typescriptResolver
];

export default defaultResolvers;

export { svelteKitResolver, sveltePackageResolver, viteResolver, typescriptResolver };