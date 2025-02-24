import { klarPackageResolver, svelteKitResolver, sveltePackageResolver } from "../resolvers/svelte";
import { typescriptResolver } from "../resolvers/typescript";
import { viteResolver } from "../resolvers/vite";

export const defaultResolvers = [
	klarPackageResolver,
	sveltePackageResolver,
	svelteKitResolver,
	viteResolver,
	typescriptResolver
];

export default defaultResolvers;

export { svelteKitResolver, sveltePackageResolver, viteResolver, typescriptResolver };