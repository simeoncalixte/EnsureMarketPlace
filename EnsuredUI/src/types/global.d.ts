// Allow importing CSS files (side-effect imports) in TypeScript
declare module '*.css'

// Specific declaration to be explicit for Mapbox CSS import
declare module 'mapbox-gl/dist/mapbox-gl.css'

declare module 'storybook-addon-remix-react-router' {
	export const withRouter: any
	export const reactRouterParameters: any
	export const reactRouterOutlet: any
	export const reactRouterOutlets: any
	export const reactRouterNestedOutlets: any
	export const reactRouterNestedAncestors: any
}

// Vite injects `import.meta.env`. Declare the env vars referenced in the app
// so TypeScript recognizes `import.meta.env` without pulling in `vite/client`
// (which is not part of the `types` allowlist in tsconfig). This file is a
// module (it has top-level exports), so the augmentation must live inside
// `declare global` to reach the global `ImportMeta` interface.
declare global {
	interface ImportMetaEnv {
		readonly VITE_MAPBOX_TOKEN?: string
		readonly VITE_MAPBOX_FALLBACK_TOKEN?: string
		readonly VITE_CUSTOM_VAR?: string
		readonly STORYBOOK_MAPBOX_TOKEN?: string
		readonly [key: string]: string | boolean | undefined
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv
	}
}

export {}
