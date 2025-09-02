// the exiftool library currently reloads zeroperl each call
// this caches the wasm file in memory.
// However, it did not make this work. For now it does work good enough.

// let zeroperlCache: ArrayBuffer | null = null;
// let zeroperlFetchPromise: Promise<ArrayBuffer> | null = null;

// export const fetchCachedZeroperl: typeof fetch = async (
// 	url,
// 	...args
// ): Promise<Response> => {
// 	if (typeof url !== "string" || !url.includes("zeroperl")) {
// 		// not cached
// 		return fetch(url, ...args);
// 	}

// 	if (zeroperlCache) {
// 		return new Response(zeroperlCache);
// 	}

// 	if (!zeroperlFetchPromise) {
// 		zeroperlFetchPromise = (async () => {
// 			const res = await fetch(url, ...args);
// 			const buffer = await res.arrayBuffer();
// 			zeroperlCache = buffer; // cache it
// 			return buffer;
// 		})();
// 	}

// 	const buffer = await zeroperlFetchPromise;
// 	return new Response(buffer.slice(0), {
// 		headers: { "Content-Type": "application/wasm" },
// 	});
// };
