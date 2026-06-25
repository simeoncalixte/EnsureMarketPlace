// Ambient declarations for static image assets resolved by Vite to a URL
// string. This file must stay a script (no top-level import/export) so the
// wildcard module declarations register globally — `global.d.ts` is a module,
// which is why these do not live there.
declare module '*.jpg' {
	const src: string
	export default src
}

declare module '*.png' {
	const src: string
	export default src
}

declare module '*.webp' {
	const src: string
	export default src
}
