import "server-only";

import { and, asc, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
	type Playbook,
	type PlaybookExecution,
	type PlaybookStep,
	playbook,
	playbookExecution,
	playbookStep,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ===========================================
// PLAYBOOK QUERIES
// ===========================================

export async function getPlaybooksByBusinessId({
	businessId,
	botId,
	status,
}: {
	businessId: string;
	botId?: string;
	status?: Playbook["status"];
}): Promise<Playbook[]> {
	try {
		const conditions = [eq(playbook.businessId, businessId)];

		if (botId) {
			conditions.push(eq(playbook.botId, botId));
		}

		if (status) {
			conditions.push(eq(playbook.status, status));
		}

		return await db
			.select()
			.from(playbook)
			.where(and(...conditions))
			.orderBy(desc(playbook.priority), desc(playbook.createdAt));
	} catch (error) {
		console.error("Error fetching playbooks:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get playbooks");
	}
}

export async function getPlaybookById({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<Playbook | null> {
	try {
		const [result] = await db
			.select()
			.from(playbook)
			.where(and(eq(playbook.id, id), eq(playbook.businessId, businessId)))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching playbook:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get playbook");
	}
}

export async function createPlaybook({
	businessId,
	botId,
	name,
	description,
	triggerType,
	triggerConfig,
	priority = 0,
}: {
	businessId: string;
	botId?: string;
	name: string;
	description?: string;
	triggerType: Playbook["triggerType"];
	triggerConfig?: Playbook["triggerConfig"];
	priority?: number;
}): Promise<Playbook> {
	try {
		const [newPlaybook] = await db
			.insert(playbook)
			.values({
				businessId,
				botId,
				name,
				description,
				triggerType,
				triggerConfig,
				priority,
				status: "draft",
			})
			.returning();

		return newPlaybook;
	} catch (error) {
		console.error("Error creating playbook:", error);
		throw new ChatSDKError("bad_request:database", "Failed to create playbook");
	}
}

export async function updatePlaybook({
	id,
	businessId,
	name,
	description,
	triggerType,
	triggerConfig,
	priority,
	status,
}: {
	id: string;
	businessId: string;
	name?: string;
	description?: string;
	triggerType?: Playbook["triggerType"];
	triggerConfig?: Playbook["triggerConfig"];
	priority?: number;
	status?: Playbook["status"];
}): Promise<Playbook> {
	try {
		const updateData: Partial<Playbook> = { updatedAt: new Date() };

		if (name !== undefined) updateData.name = name;
		if (description !== undefined) updateData.description = description;
		if (triggerType !== undefined) updateData.triggerType = triggerType;
		if (triggerConfig !== undefined) updateData.triggerConfig = triggerConfig;
		if (priority !== undefined) updateData.priority = priority;
		if (status !== undefined) updateData.status = status;

		const [updated] = await db
			.update(playbook)
			.set(updateData)
			.where(and(eq(playbook.id, id), eq(playbook.businessId, businessId)))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating playbook:", error);
		throw new ChatSDKError("bad_request:database", "Failed to update playbook");
	}
}

export async function deletePlaybook({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<void> {
	try {
		// Delete related executions
		await db
			.delete(playbookExecution)
			.where(eq(playbookExecution.playbookId, id));

		// Delete related steps
		await db.delete(playbookStep).where(eq(playbookStep.playbookId, id));

		// Delete playbook
		await db
			.delete(playbook)
			.where(and(eq(playbook.id, id), eq(playbook.businessId, businessId)));
	} catch (error) {
		console.error("Error deleting playbook:", error);
		throw new ChatSDKError("bad_request:database", "Failed to delete playbook");
	}
}

export async function publishPlaybook({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<Playbook> {
	return updatePlaybook({ id, businessId, status: "active" });
}

export async function pausePlaybook({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<Playbook> {
	return updatePlaybook({ id, businessId, status: "paused" });
}

// ===========================================
// PLAYBOOK STEP QUERIES
// ===========================================

export async function getPlaybookSteps({
	playbookId,
}: {
	playbookId: string;
}): Promise<PlaybookStep[]> {
	try {
		return await db
			.select()
			.from(playbookStep)
			.where(eq(playbookStep.playbookId, playbookId))
			.orderBy(asc(playbookStep.position));
	} catch (error) {
		console.error("Error fetching playbook steps:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get playbook steps",
		);
	}
}

export async function getPlaybookStepById({
	id,
}: {
	id: string;
}): Promise<PlaybookStep | null> {
	try {
		const [result] = await db
			.select()
			.from(playbookStep)
			.where(eq(playbookStep.id, id))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching playbook step:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get playbook step",
		);
	}
}

export async function createPlaybookStep({
	playbookId,
	type,
	name,
	config,
	position,
	nextStepId,
	positionX = 0,
	positionY = 0,
}: {
	playbookId: string;
	type: PlaybookStep["type"];
	name?: string;
	config?: PlaybookStep["config"];
	position?: number;
	nextStepId?: string;
	positionX?: number;
	positionY?: number;
}): Promise<PlaybookStep> {
	try {
		// If no position specified, add to end
		if (position === undefined) {
			const [maxPosition] = await db
				.select({
					max: sql<number>`COALESCE(MAX(${playbookStep.position}), -1)`,
				})
				.from(playbookStep)
				.where(eq(playbookStep.playbookId, playbookId));
			position = (maxPosition?.max ?? -1) + 1;
		}

		const [newStep] = await db
			.insert(playbookStep)
			.values({
				playbookId,
				type,
				name,
				config,
				position,
				nextStepId,
				positionX,
				positionY,
			})
			.returning();

		return newStep;
	} catch (error) {
		console.error("Error creating playbook step:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create playbook step",
		);
	}
}

export async function updatePlaybookStep({
	id,
	type,
	name,
	config,
	position,
	nextStepId,
	positionX,
	positionY,
}: {
	id: string;
	type?: PlaybookStep["type"];
	name?: string;
	config?: PlaybookStep["config"];
	position?: number;
	nextStepId?: string | null;
	positionX?: number;
	positionY?: number;
}): Promise<PlaybookStep> {
	try {
		const updateData: Partial<PlaybookStep> = {};

		if (type !== undefined) updateData.type = type;
		if (name !== undefined) updateData.name = name;
		if (config !== undefined) updateData.config = config;
		if (position !== undefined) updateData.position = position;
		if (nextStepId !== undefined) updateData.nextStepId = nextStepId;
		if (positionX !== undefined) updateData.positionX = positionX;
		if (positionY !== undefined) updateData.positionY = positionY;

		const [updated] = await db
			.update(playbookStep)
			.set(updateData)
			.where(eq(playbookStep.id, id))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating playbook step:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update playbook step",
		);
	}
}

export async function deletePlaybookStep({
	id,
}: {
	id: string;
}): Promise<void> {
	try {
		// Remove references to this step from other steps
		await db
			.update(playbookStep)
			.set({ nextStepId: null })
			.where(eq(playbookStep.nextStepId, id));

		// Delete the step
		await db.delete(playbookStep).where(eq(playbookStep.id, id));
	} catch (error) {
		console.error("Error deleting playbook step:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to delete playbook step",
		);
	}
}

export async function updatePlaybookStepsBulk({
	steps,
}: {
	steps: Array<{
		id: string;
		position?: number;
		positionX?: number;
		positionY?: number;
		nextStepId?: string | null;
	}>;
}): Promise<void> {
	try {
		for (const step of steps) {
			await updatePlaybookStep(step);
		}
	} catch (error) {
		console.error("Error updating playbook steps:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update playbook steps",
		);
	}
}

// ===========================================
// PLAYBOOK EXECUTION QUERIES
// ===========================================

export async function getPlaybookExecutions({
	playbookId,
	conversationId,
	status,
	limit = 50,
}: {
	playbookId?: string;
	conversationId?: string;
	status?: PlaybookExecution["status"];
	limit?: number;
}): Promise<PlaybookExecution[]> {
	try {
		const conditions = [];

		if (playbookId) {
			conditions.push(eq(playbookExecution.playbookId, playbookId));
		}

		if (conversationId) {
			conditions.push(eq(playbookExecution.conversationId, conversationId));
		}

		if (status) {
			conditions.push(eq(playbookExecution.status, status));
		}

		return await db
			.select()
			.from(playbookExecution)
			.where(conditions.length > 0 ? and(...conditions) : undefined)
			.orderBy(desc(playbookExecution.startedAt))
			.limit(limit);
	} catch (error) {
		console.error("Error fetching playbook executions:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get playbook executions",
		);
	}
}

export async function getActivePlaybookExecution({
	conversationId,
}: {
	conversationId: string;
}): Promise<PlaybookExecution | null> {
	try {
		const [result] = await db
			.select()
			.from(playbookExecution)
			.where(
				and(
					eq(playbookExecution.conversationId, conversationId),
					eq(playbookExecution.status, "active"),
				),
			)
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching active execution:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get active execution",
		);
	}
}

export async function countPlaybooksByBusinessId({
	businessId,
}: {
	businessId: string;
}): Promise<number> {
	try {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(playbook)
			.where(eq(playbook.businessId, businessId));

		return result?.count ?? 0;
	} catch (error) {
		console.error("Error counting playbooks:", error);
		throw new ChatSDKError("bad_request:database", "Failed to count playbooks");
	}
}

export async function countPlaybookSteps({
	playbookId,
}: {
	playbookId: string;
}): Promise<number> {
	try {
		const [result] = await db
			.select({ count: sql<number>`count(*)::int` })
			.from(playbookStep)
			.where(eq(playbookStep.playbookId, playbookId));

		return result?.count ?? 0;
	} catch (error) {
		console.error("Error counting playbook steps:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to count playbook steps",
		);
	}
}
