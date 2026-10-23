const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

/**
 * Resolves assets from the application root in both local and GitHub Pages builds.
 */
export const publicUrl = (path: `/${string}`) => `${basePath}${path}`
