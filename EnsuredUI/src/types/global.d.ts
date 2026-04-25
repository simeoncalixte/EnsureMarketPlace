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

export {}
