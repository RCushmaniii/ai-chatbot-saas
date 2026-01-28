import "server-only";

import { and, desc, eq, ne, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
	type Agent,
	agent,
	type LiveChatQueue,
	liveChatQueue,
	type WidgetConversation,
	type WidgetMessage,
	widgetConversation,
	widgetMessage,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ===========================================
// AGENT QUERIES
// ===========================================

export async function getAgentsByBusinessId({
	businessId,
	status,
}: {
	businessId: string;
	status?: Agent["status"];
}): Promise<Agent[]> {
	try {
		const conditions = [eq(agent.businessId, businessId)];

		if (status) {
			conditions.push(eq(agent.status, status));
		}

		return await db
			.select()
			.from(agent)
			.where(and(...conditions))
			.orderBy(desc(agent.lastActiveAt));
	} catch (error) {
		console.error("Error fetching agents:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get agents");
	}
}

export async function getAgentByUserId({
	userId,
	businessId,
}: {
	userId: string;
	businessId: string;
}): Promise<Agent | null> {
	try {
		const [result] = await db
			.select()
			.from(agent)
			.where(and(eq(agent.userId, userId), eq(agent.businessId, businessId)))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching agent:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get agent");
	}
}

export async function getAgentById({
	id,
}: {
	id: string;
}): Promise<Agent | null> {
	try {
		const [result] = await db
			.select()
			.from(agent)
			.where(eq(agent.id, id))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching agent:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get agent");
	}
}

export async function createAgent({
	userId,
	businessId,
	maxConcurrentChats = 5,
	departments = [],
}: {
	userId: string;
	businessId: string;
	maxConcurrentChats?: number;
	departments?: string[];
}): Promise<Agent> {
	try {
		const [newAgent] = await db
			.insert(agent)
			.values({
				userId,
				businessId,
				maxConcurrentChats,
				departments,
				status: "offline",
			})
			.returning();

		return newAgent;
	} catch (error) {
		console.error("Error creating agent:", error);
		throw new ChatSDKError("bad_request:database", "Failed to create agent");
	}
}

export async function updateAgentStatus({
	id,
	status,
}: {
	id: string;
	status: Agent["status"];
}): Promise<Agent> {
	try {
		const [updated] = await db
			.update(agent)
			.set({
				status,
				lastActiveAt: new Date(),
			})
			.where(eq(agent.id, id))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating agent status:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update agent status",
		);
	}
}

export async function updateAgent({
	id,
	maxConcurrentChats,
	departments,
}: {
	id: string;
	maxConcurrentChats?: number;
	departments?: string[];
}): Promise<Agent> {
	try {
		const updateData: Partial<Agent> = {};

		if (maxConcurrentChats !== undefined)
			updateData.maxConcurrentChats = maxConcurrentChats;
		if (departments !== undefined) updateData.departments = departments;

		const [updated] = await db
			.update(agent)
			.set(updateData)
			.where(eq(agent.id, id))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating agent:", error);
		throw new ChatSDKError("bad_request:database", "Failed to update agent");
	}
}

export async function getAvailableAgent({
	businessId,
	department,
}: {
	businessId: string;
	department?: string;
}): Promise<Agent | null> {
	try {
		const conditions = [
			eq(agent.businessId, businessId),
			eq(agent.status, "online"),
			sql`${agent.currentChatCount} < ${agent.maxConcurrentChats}`,
		];

		if (department) {
			conditions.push(sql`${agent.departments} ? ${department}`);
		}

		const [result] = await db
			.select()
			.from(agent)
			.where(and(...conditions))
			.orderBy(agent.currentChatCount)
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error finding available agent:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to find available agent",
		);
	}
}

export async function incrementAgentChatCount({
	id,
}: {
	id: string;
}): Promise<void> {
	try {
		await db
			.update(agent)
			.set({
				currentChatCount: sql`${agent.currentChatCount} + 1`,
				lastActiveAt: new Date(),
			})
			.where(eq(agent.id, id));
	} catch (error) {
		console.error("Error incrementing chat count:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to increment chat count",
		);
	}
}

export async function decrementAgentChatCount({
	id,
}: {
	id: string;
}): Promise<void> {
	try {
		await db
			.update(agent)
			.set({
				currentChatCount: sql`GREATEST(${agent.currentChatCount} - 1, 0)`,
			})
			.where(eq(agent.id, id));
	} catch (error) {
		console.error("Error decrementing chat count:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to decrement chat count",
		);
	}
}

// ===========================================
// LIVE CHAT QUEUE QUERIES
// ===========================================

export async function getLiveChatQueue({
	businessId,
	status,
}: {
	businessId: string;
	status?: LiveChatQueue["status"];
}): Promise<LiveChatQueue[]> {
	try {
		const conditions = [eq(liveChatQueue.businessId, businessId)];

		if (status) {
			conditions.push(eq(liveChatQueue.status, status));
		} else {
			// By default, exclude resolved
			conditions.push(ne(liveChatQueue.status, "resolved"));
		}

		return await db
			.select()
			.from(liveChatQueue)
			.where(and(...conditions))
			.orderBy(desc(liveChatQueue.priority), liveChatQueue.waitingSince);
	} catch (error) {
		console.error("Error fetching queue:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get queue");
	}
}

export async function getQueueItemById({
	id,
}: {
	id: string;
}): Promise<LiveChatQueue | null> {
	try {
		const [result] = await db
			.select()
			.from(liveChatQueue)
			.where(eq(liveChatQueue.id, id))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching queue item:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get queue item");
	}
}

export async function createQueueItem({
	conversationId,
	businessId,
	priority = 0,
	department,
	aiSummary,
}: {
	conversationId: string;
	businessId: string;
	priority?: number;
	department?: string;
	aiSummary?: string;
}): Promise<LiveChatQueue> {
	try {
		const [queueItem] = await db
			.insert(liveChatQueue)
			.values({
				conversationId,
				businessId,
				priority,
				department,
				aiSummary,
				status: "waiting",
			})
			.returning();

		return queueItem;
	} catch (error) {
		console.error("Error creating queue item:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create queue item",
		);
	}
}

export async function assignQueueItem({
	id,
	agentId,
}: {
	id: string;
	agentId: string;
}): Promise<LiveChatQueue> {
	try {
		const [updated] = await db
			.update(liveChatQueue)
			.set({
				assignedAgentId: agentId,
				status: "assigned",
				assignedAt: new Date(),
			})
			.where(eq(liveChatQueue.id, id))
			.returning();

		// Increment agent's chat count
		await incrementAgentChatCount({ id: agentId });

		return updated;
	} catch (error) {
		console.error("Error assigning queue item:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to assign queue item",
		);
	}
}

export async function resolveQueueItem({
	id,
}: {
	id: string;
}): Promise<LiveChatQueue> {
	try {
		// Get the queue item to find the agent
		const [item] = await db
			.select()
			.from(liveChatQueue)
			.where(eq(liveChatQueue.id, id))
			.limit(1);

		const [updated] = await db
			.update(liveChatQueue)
			.set({
				status: "resolved",
				resolvedAt: new Date(),
			})
			.where(eq(liveChatQueue.id, id))
			.returning();

		// Decrement agent's chat count if assigned
		if (item?.assignedAgentId) {
			await decrementAgentChatCount({ id: item.assignedAgentId });
		}

		return updated;
	} catch (error) {
		console.error("Error resolving queue item:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to resolve queue item",
		);
	}
}

export async function getQueueStats({
	businessId,
}: {
	businessId: string;
}): Promise<{
	waiting: number;
	assigned: number;
	avgWaitTime: number;
}> {
	try {
		const [stats] = await db
			.select({
				waiting: sql<number>`COUNT(*) FILTER (WHERE ${liveChatQueue.status} = 'waiting')::int`,
				assigned: sql<number>`COUNT(*) FILTER (WHERE ${liveChatQueue.status} = 'assigned')::int`,
				avgWaitTime: sql<number>`COALESCE(AVG(
          EXTRACT(EPOCH FROM (COALESCE(${liveChatQueue.assignedAt}, NOW()) - ${liveChatQueue.waitingSince}))
        ) FILTER (WHERE ${liveChatQueue.assignedAt} IS NOT NULL), 0)::int`,
			})
			.from(liveChatQueue)
			.where(eq(liveChatQueue.businessId, businessId));

		return {
			waiting: stats?.waiting ?? 0,
			assigned: stats?.assigned ?? 0,
			avgWaitTime: stats?.avgWaitTime ?? 0,
		};
	} catch (error) {
		console.error("Error fetching queue stats:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get queue stats");
	}
}

// ===========================================
// WIDGET CONVERSATION QUERIES
// ===========================================

export async function getWidgetConversation({
	id,
}: {
	id: string;
}): Promise<WidgetConversation | null> {
	try {
		const [result] = await db
			.select()
			.from(widgetConversation)
			.where(eq(widgetConversation.id, id))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching conversation:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get conversation",
		);
	}
}

export async function getWidgetConversationBySession({
	businessId,
	visitorId,
	sessionId,
}: {
	businessId: string;
	visitorId: string;
	sessionId: string;
}): Promise<WidgetConversation | null> {
	try {
		const [result] = await db
			.select()
			.from(widgetConversation)
			.where(
				and(
					eq(widgetConversation.businessId, businessId),
					eq(widgetConversation.visitorId, visitorId),
					eq(widgetConversation.sessionId, sessionId),
				),
			)
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching conversation:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get conversation",
		);
	}
}

export async function createWidgetConversation({
	businessId,
	botId,
	visitorId,
	sessionId,
	contactId,
	metadata,
}: {
	businessId: string;
	botId?: string;
	visitorId: string;
	sessionId: string;
	contactId?: string;
	metadata?: WidgetConversation["metadata"];
}): Promise<WidgetConversation> {
	try {
		const [conversation] = await db
			.insert(widgetConversation)
			.values({
				businessId,
				botId,
				visitorId,
				sessionId,
				contactId,
				metadata,
				status: "active",
			})
			.returning();

		return conversation;
	} catch (error) {
		console.error("Error creating conversation:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create conversation",
		);
	}
}

export async function updateWidgetConversation({
	id,
	contactId,
	status,
}: {
	id: string;
	contactId?: string;
	status?: WidgetConversation["status"];
}): Promise<WidgetConversation> {
	try {
		const updateData: Partial<WidgetConversation> = { updatedAt: new Date() };

		if (contactId !== undefined) updateData.contactId = contactId;
		if (status !== undefined) updateData.status = status;

		const [updated] = await db
			.update(widgetConversation)
			.set(updateData)
			.where(eq(widgetConversation.id, id))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating conversation:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to update conversation",
		);
	}
}

// ===========================================
// WIDGET MESSAGE QUERIES
// ===========================================

export async function getWidgetMessages({
	conversationId,
	limit = 100,
}: {
	conversationId: string;
	limit?: number;
}): Promise<WidgetMessage[]> {
	try {
		return await db
			.select()
			.from(widgetMessage)
			.where(eq(widgetMessage.conversationId, conversationId))
			.orderBy(widgetMessage.createdAt)
			.limit(limit);
	} catch (error) {
		console.error("Error fetching messages:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get messages");
	}
}

export async function createWidgetMessage({
	conversationId,
	role,
	content,
	playbookStepId,
	metadata,
}: {
	conversationId: string;
	role: WidgetMessage["role"];
	content: string;
	playbookStepId?: string;
	metadata?: Record<string, unknown>;
}): Promise<WidgetMessage> {
	try {
		const [message] = await db
			.insert(widgetMessage)
			.values({
				conversationId,
				role,
				content,
				playbookStepId,
				metadata,
			})
			.returning();

		return message;
	} catch (error) {
		console.error("Error creating message:", error);
		throw new ChatSDKError("bad_request:database", "Failed to create message");
	}
}
