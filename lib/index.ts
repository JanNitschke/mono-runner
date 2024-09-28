import { defaultResolvers } from "./utils/resolvers"; 
export * from "./utils/resolvers";
export {createSassImporter} from "./plugins/sass";
export { ViteMonoPlugin } from "./plugins/vite";
export { svelteMonoAlias } from "./plugins/svelte";

export default defaultResolvers;