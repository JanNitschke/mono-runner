import { PackageResolver } from "./types";

export const collappPackageResolver: PackageResolver = ({dependencies}) => {
	if(dependencies.includes("@collapp/package")){
		return {
			outPath: "dist",
			srcPath: "src/lib",
			readyIPC: true
		}
	}else{
		return null;
	}
};


export const sveltePackageResolver: PackageResolver = ({dependencies}) => {
	if(dependencies.includes("@sveltejs/package")){
		return {
			outPath: "dist",
			srcPath: "src/lib"
		}
	}else{
		return null;
	}
};

export const svelteKitResolver: PackageResolver = ({dependencies}) => {
	if(dependencies.includes("@sveltejs/kit")){
		return {
			outPath: ".svelte-kit/generated",
			srcPath: "src/lib"
		}
	}else{
		return null;
	}
};