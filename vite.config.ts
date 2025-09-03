import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import solidPlugin from "vite-plugin-solid";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
	plugins: [
		tsconfigPaths(),
		solidPlugin(),
		tailwindcss(),
		// viteStaticCopy({
		// 	targets: [
		// 		{
		// 			src: path.join(
		// 				import.meta.dirname,
		// 				"node_modules",
		// 				"mediainfo.js",
		// 				"dist",
		// 				"MediaInfoModule.wasm",
		// 			),
		// 			dest: "",
		// 		},
		// 	],
		// }),
	],
	server: {
		port: 3000,
	},
	build: {
		target: "esnext",
	},
	base: "/gphotos-prepare-duck/",
});
