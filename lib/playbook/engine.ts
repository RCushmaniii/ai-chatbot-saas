import "server-only";

import { and, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import {
	type Contact,
	contact,
	contactActivity,
	liveChatQueue,
	type Playbook,
	type PlaybookExecution,
	type PlaybookStep,
	playbook,
	playbookExecution,
	playbookStep,
	widgetConversation,
} from "@/lib/db/schema";

const client = postgres(process.env.POSTGRES_URL!);
const db = drizzle(client);

export type StepResult = {
	type: "message" | "question" | "options" | "handoff" | "complete" | "error";
	content?: string;
	options?: Array<{ label: string; value: string }>;
	variableName?: string;
	validation?: "email" | "phone" | "text" | "number";
	nextStepId?: string | null;
	error?: string;
};

export type ExecutionState = {
	executionId: string;
	playbookId: string;
	currentStepId: string | null;
	variables: Record<string, unknown>;
	status: "active" | "completed" | "abandoned" | "handed_off";
};

export class PlaybookEngine {
	/**
	 * Check if any playbook should trigger based on the message and context
	 */
	async checkTriggers(
		message: string,
		context: {
			businessId: string;
			botId?: string;
			conversationId: string;
			isFirstMessage?: boolean;
			currentUrl?: string;
		},
	): Promise<Playbook | null> {
		// Get all active playbooks for this business, ordered by priority
		const playbooks = await db
			.select()
			.from(playbook)
			.where(
				and(
					eq(playbook.businessId, context.businessId),
					eq(playbook.status, "active"),
					context.botId
						? eq(playbook.botId, context.botId)
						: sql`(${playbook.botId} IS NULL OR ${playbook.botId} = ${context.botId})`,
				),
			)
			.orderBy(sql`${playbook.priority} DESC`);

		const lowerMessage = message.toLowerCase();

		for (const pb of playbooks) {
			const config = pb.triggerConfig as {
				keywords?: string[];
				intents?: string[];
				urlPatterns?: string[];
			};

			switch (pb.triggerType) {
				case "first_message":
					if (context.isFirstMessage) {
						return pb;
					}
					break;

				case "keyword":
					if (
						config?.keywords?.some((kw) =>
							lowerMessage.includes(kw.toLowerCase()),
						)
					) {
						return pb;
					}
					break;

				case "url":
					if (
						context.currentUrl &&
						config?.urlPatterns?.some((pattern) => {
							const regex = new RegExp(pattern, "i");
							return regex.test(context.currentUrl!);
						})
					) {
						return pb;
					}
					break;

				case "intent":
					// Intent matching would require NLP - for now, simple keyword-like matching
					if (
						config?.intents?.some((intent) =>
							lowerMessage.includes(intent.toLowerCase()),
						)
					) {
						return pb;
					}
					break;

				case "manual":
					// Manual triggers are not triggered automatically
					break;
			}
		}

		return null;
	}

	/**
	 * Start a playbook execution for a conversation
	 */
	async startPlaybook(
		playbookId: string,
		conversationId: string,
	): Promise<ExecutionState> {
		// Get the first step of the playbook
		const [firstStep] = await db
			.select()
			.from(playbookStep)
			.where(eq(playbookStep.playbookId, playbookId))
			.orderBy(playbookStep.position)
			.limit(1);

		const [execution] = await db
			.insert(playbookExecution)
			.values({
				playbookId,
				conversationId,
				currentStepId: firstStep?.id || null,
				variables: {},
				status: "active",
			})
			.returning();

		return {
			executionId: execution.id,
			playbookId: execution.playbookId,
			currentStepId: execution.currentStepId,
			variables: (execution.variables as Record<string, unknown>) || {},
			status: execution.status,
		};
	}

	/**
	 * Get the active playbook execution for a conversation
	 */
	async getActiveExecution(
		conversationId: string,
	): Promise<PlaybookExecution | null> {
		const [execution] = await db
			.select()
			.from(playbookExecution)
			.where(
				and(
					eq(playbookExecution.conversationId, conversationId),
					eq(playbookExecution.status, "active"),
				),
			)
			.limit(1);

		return execution || null;
	}

	/**
	 * Process the current step and optionally advance based on user input
	 */
	async processStep(
		executionId: string,
		userInput?: string,
	): Promise<StepResult> {
		// Get the execution
		const [execution] = await db
			.select()
			.from(playbookExecution)
			.where(eq(playbookExecution.id, executionId));

		if (!execution || execution.status !== "active") {
			return { type: "error", error: "Execution not found or not active" };
		}

		if (!execution.currentStepId) {
			// No more steps - mark as complete
			await this.updateExecutionStatus(executionId, "completed");
			return { type: "complete" };
		}

		// Get the current step
		const [step] = await db
			.select()
			.from(playbookStep)
			.where(eq(playbookStep.id, execution.currentStepId));

		if (!step) {
			return { type: "error", error: "Step not found" };
		}

		const variables = (execution.variables as Record<string, unknown>) || {};

		// If user input provided, process it based on step type
		if (userInput !== undefined) {
			return this.handleUserInput(execution, step, userInput, variables);
		}

		// Otherwise, return the step's prompt
		return this.getStepPrompt(step, variables);
	}

	/**
	 * Get the prompt/content for a step
	 */
	private getStepPrompt(
		step: PlaybookStep,
		variables: Record<string, unknown>,
	): StepResult {
		const config = step.config as PlaybookStep["config"];

		switch (step.type) {
			case "message":
				return {
					type: "message",
					content: this.interpolateVariables(config?.message || "", variables),
					nextStepId: step.nextStepId,
				};

			case "question":
				return {
					type: "question",
					content: this.interpolateVariables(config?.question || "", variables),
					variableName: config?.variableName,
					validation: config?.validation,
				};

			case "options":
				return {
					type: "options",
					content: this.interpolateVariables(
						config?.question || "Please select an option:",
						variables,
					),
					options: config?.options?.map((opt) => ({
						label: this.interpolateVariables(opt.label, variables),
						value: opt.value,
					})),
				};

			case "handoff":
				return {
					type: "handoff",
					content: config?.department
						? `Transferring to ${config.department}...`
						: "Transferring to a live agent...",
				};

			case "stop":
				return { type: "complete" };

			default:
				return {
					type: "message",
					content: "",
					nextStepId: step.nextStepId,
				};
		}
	}

	/**
	 * Handle user input and advance the execution
	 */
	private async handleUserInput(
		execution: PlaybookExecution,
		step: PlaybookStep,
		userInput: string,
		variables: Record<string, unknown>,
	): Promise<StepResult> {
		const config = step.config as PlaybookStep["config"];
		let nextStepId = step.nextStepId;
		const newVariables = { ...variables };

		switch (step.type) {
			case "question":
				// Validate input if needed
				if (config?.validation) {
					const isValid = this.validateInput(userInput, config.validation);
					if (!isValid) {
						return {
							type: "question",
							content: this.getValidationErrorMessage(config.validation),
							variableName: config.variableName,
							validation: config.validation,
						};
					}
				}
				// Store the variable
				if (config?.variableName) {
					newVariables[config.variableName] = userInput;
				}
				break;

			case "options": {
				// Find the selected option and get its nextStepId
				const selectedOption = config?.options?.find(
					(opt) => opt.value === userInput || opt.label === userInput,
				);
				if (selectedOption?.nextStepId) {
					nextStepId = selectedOption.nextStepId;
				}
				// Store the selection
				if (config?.variableName) {
					newVariables[config.variableName] = userInput;
				}
				break;
			}

			case "condition":
				// Evaluate conditions to determine next step
				nextStepId = this.evaluateConditions(config, newVariables);
				break;

			case "action":
				// Execute the action
				await this.executeAction(step, execution, newVariables);
				break;

			case "handoff":
				// Create handoff queue item
				await this.createHandoff(execution, config);
				await this.updateExecutionStatus(execution.id, "handed_off");
				return { type: "handoff" };
		}

		// Update execution with new variables
		await db
			.update(playbookExecution)
			.set({
				variables: newVariables,
				currentStepId: nextStepId,
			})
			.where(eq(playbookExecution.id, execution.id));

		// If no next step, complete the execution
		if (!nextStepId) {
			await this.updateExecutionStatus(execution.id, "completed");
			return { type: "complete" };
		}

		// Get the next step and return its prompt
		const [nextStep] = await db
			.select()
			.from(playbookStep)
			.where(eq(playbookStep.id, nextStepId));

		if (!nextStep) {
			await this.updateExecutionStatus(execution.id, "completed");
			return { type: "complete" };
		}

		// Handle action steps automatically (they don't need user input)
		if (nextStep.type === "action") {
			await this.executeAction(nextStep, execution, newVariables);
			// Continue to the next step after action
			return this.handleUserInput(
				{ ...execution, currentStepId: nextStep.nextStepId },
				nextStep,
				"",
				newVariables,
			);
		}

		// Handle condition steps automatically
		if (nextStep.type === "condition") {
			const conditionNextStepId = this.evaluateConditions(
				nextStep.config as PlaybookStep["config"],
				newVariables,
			);
			await db
				.update(playbookExecution)
				.set({ currentStepId: conditionNextStepId })
				.where(eq(playbookExecution.id, execution.id));

			if (!conditionNextStepId) {
				await this.updateExecutionStatus(execution.id, "completed");
				return { type: "complete" };
			}

			const [conditionNextStep] = await db
				.select()
				.from(playbookStep)
				.where(eq(playbookStep.id, conditionNextStepId));

			if (conditionNextStep) {
				return this.getStepPrompt(conditionNextStep, newVariables);
			}
		}

		return this.getStepPrompt(nextStep, newVariables);
	}

	/**
	 * Execute an action step
	 */
	async executeAction(
		step: PlaybookStep,
		execution: PlaybookExecution,
		variables: Record<string, unknown>,
	): Promise<void> {
		const config = step.config as PlaybookStep["config"];

		switch (config?.actionType) {
			case "capture_contact":
				await this.captureContact(execution, variables);
				break;

			case "add_tag":
				await this.addContactTag(
					execution,
					(config.actionConfig?.tag as string) || "",
				);
				break;

			case "set_score":
				await this.setLeadScore(
					execution,
					(config.actionConfig?.score as number) || 0,
				);
				break;

			case "webhook":
				await this.triggerWebhook(
					(config.actionConfig?.url as string) || "",
					variables,
				);
				break;
		}
	}

	/**
	 * Capture contact information from variables
	 */
	private async captureContact(
		execution: PlaybookExecution,
		variables: Record<string, unknown>,
	): Promise<void> {
		// Get the conversation to find businessId
		const [conversation] = await db
			.select()
			.from(widgetConversation)
			.where(eq(widgetConversation.id, execution.conversationId));

		if (!conversation) return;

		const email = (variables.email as string) || null;
		const phone = (variables.phone as string) || null;
		const name = (variables.name as string) || null;

		// Check if contact already exists
		let existingContact: Contact | undefined;
		if (email) {
			[existingContact] = await db
				.select()
				.from(contact)
				.where(
					and(
						eq(contact.businessId, conversation.businessId),
						eq(contact.email, email),
					),
				)
				.limit(1);
		}

		let contactId: string;
		if (existingContact) {
			// Update existing contact
			await db
				.update(contact)
				.set({
					phone: phone || existingContact.phone,
					name: name || existingContact.name,
					lastSeenAt: new Date(),
					updatedAt: new Date(),
				})
				.where(eq(contact.id, existingContact.id));
			contactId = existingContact.id;
		} else {
			// Create new contact
			const [newContact] = await db
				.insert(contact)
				.values({
					businessId: conversation.businessId,
					email,
					phone,
					name,
					status: "engaged",
				})
				.returning();
			contactId = newContact.id;
		}

		// Link contact to conversation
		await db
			.update(widgetConversation)
			.set({ contactId })
			.where(eq(widgetConversation.id, execution.conversationId));

		// Log activity
		await db.insert(contactActivity).values({
			contactId,
			type: email ? "email_captured" : "phone_captured",
			description: `Contact captured via playbook`,
			metadata: { playbookId: execution.playbookId, variables },
		});
	}

	/**
	 * Add a tag to the contact
	 */
	private async addContactTag(
		execution: PlaybookExecution,
		tag: string,
	): Promise<void> {
		const [conversation] = await db
			.select()
			.from(widgetConversation)
			.where(eq(widgetConversation.id, execution.conversationId));

		if (!conversation?.contactId) return;

		const [existingContact] = await db
			.select()
			.from(contact)
			.where(eq(contact.id, conversation.contactId));

		if (!existingContact) return;

		const currentTags = (existingContact.tags as string[]) || [];
		if (!currentTags.includes(tag)) {
			await db
				.update(contact)
				.set({
					tags: [...currentTags, tag],
					updatedAt: new Date(),
				})
				.where(eq(contact.id, conversation.contactId));
		}
	}

	/**
	 * Set the lead score for a contact
	 */
	private async setLeadScore(
		execution: PlaybookExecution,
		score: number,
	): Promise<void> {
		const [conversation] = await db
			.select()
			.from(widgetConversation)
			.where(eq(widgetConversation.id, execution.conversationId));

		if (!conversation?.contactId) return;

		await db
			.update(contact)
			.set({
				leadScore: score,
				updatedAt: new Date(),
			})
			.where(eq(contact.id, conversation.contactId));
	}

	/**
	 * Trigger a webhook
	 */
	private async triggerWebhook(
		url: string,
		variables: Record<string, unknown>,
	): Promise<void> {
		if (!url) return;

		try {
			await fetch(url, {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(variables),
			});
		} catch (error) {
			console.error("Webhook trigger failed:", error);
		}
	}

	/**
	 * Create a handoff queue item
	 */
	private async createHandoff(
		execution: PlaybookExecution,
		config: PlaybookStep["config"],
	): Promise<void> {
		const [conversation] = await db
			.select()
			.from(widgetConversation)
			.where(eq(widgetConversation.id, execution.conversationId));

		if (!conversation) return;

		// Update conversation status
		await db
			.update(widgetConversation)
			.set({ status: "handed_off" })
			.where(eq(widgetConversation.id, execution.conversationId));

		// Create queue item
		await db.insert(liveChatQueue).values({
			conversationId: execution.conversationId,
			businessId: conversation.businessId,
			priority: config?.priority || 0,
			department: config?.department,
			status: "waiting",
		});

		// Log activity if contact exists
		if (conversation.contactId) {
			await db.insert(contactActivity).values({
				contactId: conversation.contactId,
				type: "handoff_requested",
				description: "Requested live agent handoff",
				metadata: { department: config?.department },
			});
		}
	}

	/**
	 * Update execution status
	 */
	private async updateExecutionStatus(
		executionId: string,
		status: PlaybookExecution["status"],
	): Promise<void> {
		await db
			.update(playbookExecution)
			.set({
				status,
				completedAt: status === "completed" ? new Date() : null,
			})
			.where(eq(playbookExecution.id, executionId));
	}

	/**
	 * Evaluate condition branches
	 */
	private evaluateConditions(
		config: PlaybookStep["config"],
		variables: Record<string, unknown>,
	): string | null {
		if (!config?.conditions) return config?.defaultNextStepId || null;

		for (const condition of config.conditions) {
			const value = variables[condition.variable];
			if (value === undefined) continue;

			const strValue = String(value).toLowerCase();
			const condValue = condition.value.toLowerCase();

			let matches = false;
			switch (condition.operator) {
				case "equals":
					matches = strValue === condValue;
					break;
				case "contains":
					matches = strValue.includes(condValue);
					break;
				case "startsWith":
					matches = strValue.startsWith(condValue);
					break;
				case "regex":
					try {
						matches = new RegExp(condition.value, "i").test(String(value));
					} catch {
						matches = false;
					}
					break;
			}

			if (matches) {
				return condition.nextStepId;
			}
		}

		return config.defaultNextStepId || null;
	}

	/**
	 * Validate user input based on type
	 */
	private validateInput(input: string, type: string): boolean {
		switch (type) {
			case "email":
				return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input);
			case "phone":
				return /^[+]?[\d\s()-]{7,}$/.test(input);
			case "number":
				return !Number.isNaN(Number(input));
			default:
				return input.trim().length > 0;
		}
	}

	/**
	 * Get validation error message
	 */
	private getValidationErrorMessage(type: string): string {
		switch (type) {
			case "email":
				return "Please enter a valid email address.";
			case "phone":
				return "Please enter a valid phone number.";
			case "number":
				return "Please enter a valid number.";
			default:
				return "Please provide a valid response.";
		}
	}

	/**
	 * Interpolate variables in a string
	 */
	private interpolateVariables(
		text: string,
		variables: Record<string, unknown>,
	): string {
		return text.replace(/\{\{(\w+)\}\}/g, (_, key) => {
			return variables[key] !== undefined
				? String(variables[key])
				: `{{${key}}}`;
		});
	}
}

// Singleton instance
export const playbookEngine = new PlaybookEngine();
