/**
 * PNG, JPEG and WebP, identified by file signature. SVG is deliberately absent:
 * an SVG can carry script, and these images are shown on customers' sites.
 */
const SIGNATURES: Array<{
	type: string;
	ext: string;
	test: (b: Uint8Array) => boolean;
}> = [
	{
		type: "image/png",
		ext: "png",
		test: (b) =>
			b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47,
	},
	{
		type: "image/jpeg",
		ext: "jpg",
		test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
	},
	{
		type: "image/webp",
		ext: "webp",
		test: (b) =>
			b[0] === 0x52 &&
			b[1] === 0x49 &&
			b[2] === 0x46 &&
			b[3] === 0x46 &&
			b[8] === 0x57 &&
			b[9] === 0x45 &&
			b[10] === 0x42 &&
			b[11] === 0x50,
	},
];

/** The image type from its first bytes, or null. Never trusts a name or MIME claim. */
export function detectImageType(bytes: Uint8Array) {
	return SIGNATURES.find((s) => s.test(bytes)) ?? null;
}
