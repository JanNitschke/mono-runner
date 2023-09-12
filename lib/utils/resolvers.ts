import { svelteKitResolver, sveltePackageResolver } from "../resolvers/svelte";
import { typescriptResolver } from "../resolvers/typescript";
import { viteResolver } from "../resolvers/vite";

export const defaultResolvers = [
	typescriptResolver,
	sveltePackageResolver,
	svelteKitResolver,
	viteResolver,
];

export default defaultResolvers;

export { svelteKitResolver, sveltePackageResolver, viteResolver, typescriptResolver };