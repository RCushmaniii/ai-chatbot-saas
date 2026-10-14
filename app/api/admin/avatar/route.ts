import { put } from "@vercel/blob";
import { requirePermission } from "@/lib/auth";
import { detectImageType } from "@/lib/embed/image-type";
import { isAllowedImageUrl } from "@/lib/embed/sanitize";
import { rateLimit } from "@/lib/rate-limit";

/**
 * Avatar upload for the widget header (components/admin-widget-appearance.tsx).
 *
 * The file goes to this project's own Vercel Blob store, so the URL it returns
 * passes isAllowedImageUrl() — the only kind of image the widget will show on a
 * customer's site. This route returns the URL; saving it is a separate,
 * validated POST to /api/admin/settings, so an upload the owner then Undoes
 * never reaches a visitor.
 *
 * The type is decided by the file's first bytes, never by its name or the
 * browser's claim, and SVG is refused outright: an SVG can carry script.
 */
const MAX_BYTES = 1024 * 1024;

export async function POST(request: Request) {
	const { user, error } = await requirePermission("bot:configure");
	if (error) return error;

	const limited = await rateLimit(request, "admin-avatar", {
		maxRequests: 20,
		windowSeconds: 3600,
	});
	if (limited) return limited;

	let file: FormDataEntryValue | null;
	try {
		file = (await request.formData()).get("file");
	} catch {
		return Response.json({ error: "No file received" }, { status: 400 });
	}
	if (!(file instanceof Blob) || file.size === 0) {
		return Response.json({ error: "No file received" }, { status: 400 });
	}
	if (file.size > MAX_BYTES) {
		return Response.json(
			{ error: "The image must be 1 MB or smaller" },
			{ status: 400 },
		);
	}

	const bytes = new Uint8Array(await file.arrayBuffer());
	const kind = detectImageType(bytes);
	if (!kind) {
		return Response.json(
			{ error: "Use a PNG, JPG or WebP image" },
			{ status: 400 },
		);
	}

	try {
		const blob = await put(
			`widget-avatars/${user.id}.${kind.ext}`,
			Buffer.from(bytes),
			{
				access: "public",
				contentType: kind.type,
				addRandomSuffix: true,
			},
		);
		if (!isAllowedImageUrl(blob.url)) {
			// Would mean the store is not a public Vercel Blob store; the widget
			// would refuse to show it, so refuse to hand it out.
			console.error("[admin-avatar] unexpected Blob URL shape");
			return Response.json({ error: "Upload failed" }, { status: 500 });
		}
		return Response.json({ url: blob.url });
	} catch (err) {
		console.error("[admin-avatar] upload failed:", err);
		return Response.json({ error: "Upload failed" }, { status: 500 });
	}
}
