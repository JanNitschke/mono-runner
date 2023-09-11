
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
			outPath: ".svelte-kit",
			srcPath: "src/lib"
		}
	}else{
		return null;
	}
};