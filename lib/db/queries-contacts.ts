import "server-only";

import { and, desc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { ChatSDKError } from "../errors";
import {
	type Contact,
	type ContactActivity,
	contact,
	contactActivity,
} from "./schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

// ===========================================
// CONTACT QUERIES
// ===========================================

export async function getContactsByBusinessId({
	businessId,
	limit = 50,
	offset = 0,
	search,
	status,
	tags,
}: {
	businessId: string;
	limit?: number;
	offset?: number;
	search?: string;
	status?: Contact["status"];
	tags?: string[];
}): Promise<{ contacts: Contact[]; total: number }> {
	try {
		const conditions = [eq(contact.businessId, businessId)];

		if (search) {
			conditions.push(
				or(
					ilike(contact.name, `%${search}%`),
					ilike(contact.email, `%${search}%`),
					ilike(contact.phone, `%${search}%`),
				)!,
			);
		}

		if (status) {
			conditions.push(eq(contact.status, status));
		}

		if (tags && tags.length > 0) {
			// Check if any of the tags match
			conditions.push(
				sql`${contact.tags} ?| array[${sql.join(
					tags.map((t) => sql`${t}`),
					sql`, `,
				)}]`,
			);
		}

		const [contacts, [{ count: total }]] = await Promise.all([
			db
				.select()
				.from(contact)
				.where(and(...conditions))
				.orderBy(desc(contact.lastSeenAt))
				.limit(limit)
				.offset(offset),
			db
				.select({ count: sql<number>`count(*)::int` })
				.from(contact)
				.where(and(...conditions)),
		]);

		return { contacts, total };
	} catch (error) {
		console.error("Error fetching contacts:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get contacts");
	}
}

export async function getContactById({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<Contact | null> {
	try {
		const [result] = await db
			.select()
			.from(contact)
			.where(and(eq(contact.id, id), eq(contact.businessId, businessId)))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching contact:", error);
		throw new ChatSDKError("bad_request:database", "Failed to get contact");
	}
}

export async function createContact({
	businessId,
	email,
	phone,
	name,
	status = "new",
	leadScore = 0,
	tags = [],
	customFields,
}: {
	businessId: string;
	email?: string | null;
	phone?: string | null;
	name?: string | null;
	status?: Contact["status"];
	leadScore?: number;
	tags?: string[];
	customFields?: Record<string, string>;
}): Promise<Contact> {
	try {
		const [newContact] = await db
			.insert(contact)
			.values({
				businessId,
				email,
				phone,
				name,
				status,
				leadScore,
				tags,
				customFields,
			})
			.returning();

		return newContact;
	} catch (error) {
		console.error("Error creating contact:", error);
		throw new ChatSDKError("bad_request:database", "Failed to create contact");
	}
}

export async function updateContact({
	id,
	businessId,
	email,
	phone,
	name,
	status,
	leadScore,
	tags,
	customFields,
}: {
	id: string;
	businessId: string;
	email?: string | null;
	phone?: string | null;
	name?: string | null;
	status?: Contact["status"];
	leadScore?: number;
	tags?: string[];
	customFields?: Record<string, string>;
}): Promise<Contact> {
	try {
		const updateData: Partial<Contact> = { updatedAt: new Date() };

		if (email !== undefined) updateData.email = email;
		if (phone !== undefined) updateData.phone = phone;
		if (name !== undefined) updateData.name = name;
		if (status !== undefined) updateData.status = status;
		if (leadScore !== undefined) updateData.leadScore = leadScore;
		if (tags !== undefined) updateData.tags = tags;
		if (customFields !== undefined) updateData.customFields = customFields;

		const [updated] = await db
			.update(contact)
			.set(updateData)
			.where(and(eq(contact.id, id), eq(contact.businessId, businessId)))
			.returning();

		return updated;
	} catch (error) {
		console.error("Error updating contact:", error);
		throw new ChatSDKError("bad_request:database", "Failed to update contact");
	}
}

export async function deleteContact({
	id,
	businessId,
}: {
	id: string;
	businessId: string;
}): Promise<void> {
	try {
		// Delete related activities first
		await db.delete(contactActivity).where(eq(contactActivity.contactId, id));

		await db
			.delete(contact)
			.where(and(eq(contact.id, id), eq(contact.businessId, businessId)));
	} catch (error) {
		console.error("Error deleting contact:", error);
		throw new ChatSDKError("bad_request:database", "Failed to delete contact");
	}
}

export async function deleteContacts({
	ids,
	businessId,
}: {
	ids: string[];
	businessId: string;
}): Promise<void> {
	try {
		// Delete related activities first
		await db
			.delete(contactActivity)
			.where(inArray(contactActivity.contactId, ids));

		await db
			.delete(contact)
			.where(and(inArray(contact.id, ids), eq(contact.businessId, businessId)));
	} catch (error) {
		console.error("Error deleting contacts:", error);
		throw new ChatSDKError("bad_request:database", "Failed to delete contacts");
	}
}

export async function getContactByEmail({
	businessId,
	email,
}: {
	businessId: string;
	email: string;
}): Promise<Contact | null> {
	try {
		const [result] = await db
			.select()
			.from(contact)
			.where(and(eq(contact.businessId, businessId), eq(contact.email, email)))
			.limit(1);

		return result || null;
	} catch (error) {
		console.error("Error fetching contact by email:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get contact by email",
		);
	}
}

// ===========================================
// CONTACT ACTIVITY QUERIES
// ===========================================

export async function getContactActivities({
	contactId,
	limit = 50,
}: {
	contactId: string;
	limit?: number;
}): Promise<ContactActivity[]> {
	try {
		return await db
			.select()
			.from(contactActivity)
			.where(eq(contactActivity.contactId, contactId))
			.orderBy(desc(contactActivity.createdAt))
			.limit(limit);
	} catch (error) {
		console.error("Error fetching contact activities:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to get contact activities",
		);
	}
}

export async function createContactActivity({
	contactId,
	type,
	description,
	metadata,
}: {
	contactId: string;
	type: ContactActivity["type"];
	description?: string;
	metadata?: Record<string, unknown>;
}): Promise<ContactActivity> {
	try {
		const [activity] = await db
			.insert(contactActivity)
			.values({
				contactId,
				type,
				description,
				metadata,
			})
			.returning();

		return activity;
	} catch (error) {
		console.error("Error creating contact activity:", error);
		throw new ChatSDKError(
			"bad_request:database",
			"Failed to create contact activity",
		);
	}
}

// ===========================================
// CONTACT EXPORT
// ===========================================

export async function exportContacts({
	businessId,
	ids,
}: {
	businessId: string;
	ids?: string[];
}): Promise<Contact[]> {
	try {
		const conditions = [eq(contact.businessId, businessId)];

		if (ids && ids.length > 0) {
			conditions.push(inArray(contact.id, ids));
		}

		return await db
			.select()
			.from(contact)
			.where(and(...conditions))
			.orderBy(desc(contact.createdAt));
	} catch (error) {
		console.error("Error exporting contacts:", error);
		throw new ChatSDKError("bad_request:database", "Failed to export contacts");
	}
}

// ===========================================
// CONTACT IMPORT
// ===========================================

export async function importContacts({
	businessId,
	contacts: contactsData,
}: {
	businessId: string;
	contacts: Array<{
		email?: string | null;
		phone?: string | null;
		name?: string | null;
		tags?: string[];
		customFields?: Record<string, string>;
	}>;
}): Promise<{ imported: number; updated: number; errors: number }> {
	let imported = 0;
	let updated = 0;
	let errors = 0;

	for (const data of contactsData) {
		try {
			if (data.email) {
				// Check if contact already exists
				const existing = await getContactByEmail({
					businessId,
					email: data.email,
				});

				if (existing) {
					await updateContact({
						id: existing.id,
						businessId,
						...data,
					});
					updated++;
				} else {
					await createContact({
						businessId,
						...data,
					});
					imported++;
				}
			} else {
				// No email - create new contact
				await createContact({
					businessId,
					...data,
				});
				imported++;
			}
		} catch {
			errors++;
		}
	}

	return { imported, updated, errors };
}
