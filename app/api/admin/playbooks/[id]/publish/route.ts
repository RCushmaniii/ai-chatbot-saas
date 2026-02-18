import { NextResponse } from "next/server";
import { requirePermission } from "@/lib/auth";
import { ensureDefaultTenantForUser } from "@/lib/db/queries";
import {
	getPlaybookById,
	getPlaybookSteps,
	pausePlaybook,
	publishPlaybook,
} from "@/lib/db/queries-playbooks";
import { ChatSDKError } from "@/lib/errors";

export async function POST(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		// Check that playbook has at least one step
		const steps = await getPlaybookSteps({ playbookId: id });
		if (steps.length === 0) {
			return NextResponse.json(
				{ error: "Playbook must have at least one step to publish" },
				{ status: 400 },
			);
		}

		const updated = await publishPlaybook({ id, businessId });

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in POST /api/admin/playbooks/[id]/publish:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}

export async function DELETE(
	request: Request,
	{ params }: { params: Promise<{ id: string }> },
) {
	try {
		const { user, error } = await requirePermission("bot:configure");
		if (error) return error;

		const { businessId } = await ensureDefaultTenantForUser({
			userId: user.id,
		});

		const { id } = await params;

		// Verify playbook belongs to business
		const playbook = await getPlaybookById({ id, businessId });
		if (!playbook) {
			return NextResponse.json(
				{ error: "Playbook not found" },
				{ status: 404 },
			);
		}

		const updated = await pausePlaybook({ id, businessId });

		return NextResponse.json(updated);
	} catch (error) {
		console.error("Error in DELETE /api/admin/playbooks/[id]/publish:", error);
		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}
		return new ChatSDKError("bad_request:api").toResponse();
	}
}
