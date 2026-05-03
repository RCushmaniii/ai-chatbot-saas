/**
 * Centralized feature flags.
 *
 * Flags are evaluated at module-load time from environment variables.
 * Use these to gate features that are wired up in code but not yet
 * ready for production traffic (pending vendor verification, missing
 * tests, etc.).
 */

function envFlag(name: string): boolean {
	const raw = process.env[name]?.toLowerCase().trim();
	return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

/**
 * WhatsApp / Chat SDK multi-channel support.
 *
 * Off by default. Enable by setting NEXT_PUBLIC_WHATSAPP_ENABLED=true in the
 * environment once Meta Business verification is complete and the integration
 * has been end-to-end tested in production. The NEXT_PUBLIC_ prefix is required
 * so client components (admin tabs) and server routes share one source of truth.
 */
export const WHATSAPP_ENABLED = envFlag("NEXT_PUBLIC_WHATSAPP_ENABLED");
