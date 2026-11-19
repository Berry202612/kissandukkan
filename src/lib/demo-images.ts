/** Real product photos live on Vercel Blob. Anything else is a DEMO image (linked from a source site for a private presentation). */
export const isDemoImage = (url?: string | null) => Boolean(url && !/^https:\/\/[\w.-]+\.public\.blob\.vercel-storage\.com\//.test(url));
