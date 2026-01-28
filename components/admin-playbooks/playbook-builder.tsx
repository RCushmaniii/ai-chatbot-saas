"use client";

import {
	addEdge,
	applyEdgeChanges,
	applyNodeChanges,
	Background,
	Controls,
	type Edge,
	type Node,
	type OnConnect,
	type OnEdgesChange,
	type OnNodesChange,
	ReactFlow,
	ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { ArrowLeft, Pause, Play, Plus, Save } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { Playbook, PlaybookStep } from "@/lib/db/schema";
import { ActionNode } from "./nodes/action-node";
import { ConditionNode } from "./nodes/condition-node";
import { HandoffNode } from "./nodes/handoff-node";
import { MessageNode } from "./nodes/message-node";
import { OptionsNode } from "./nodes/options-node";
import { QuestionNode } from "./nodes/question-node";
import { StopNode } from "./nodes/stop-node";

interface PlaybookBuilderProps {
	playbook: Playbook;
	onBack: () => void;
}

const nodeTypes = {
	message: MessageNode,
	question: QuestionNode,
	options: OptionsNode,
	condition: ConditionNode,
	action: ActionNode,
	handoff: HandoffNode,
	stop: StopNode,
};

function stepsToNodes(steps: PlaybookStep[]): Node[] {
	return steps.map((step, index) => ({
		id: step.id,
		type: step.type,
		position: { x: step.positionX || 250, y: step.positionY || index * 150 },
		data: {
			...step,
			label: step.name || step.type,
		},
	}));
}

function stepsToEdges(steps: PlaybookStep[]): Edge[] {
	const edges: Edge[] = [];

	for (const step of steps) {
		if (step.nextStepId) {
			edges.push({
				id: `${step.id}-${step.nextStepId}`,
				source: step.id,
				target: step.nextStepId,
				type: "smoothstep",
			});
		}

		// Handle options with their own nextStepIds
		const config = step.config as PlaybookStep["config"];
		if (step.type === "options" && config?.options) {
			for (const option of config.options) {
				if (option.nextStepId && option.nextStepId !== step.nextStepId) {
					edges.push({
						id: `${step.id}-${option.value}-${option.nextStepId}`,
						source: step.id,
						target: option.nextStepId,
						type: "smoothstep",
						label: option.label,
					});
				}
			}
		}

		// Handle conditions
		if (step.type === "condition" && config?.conditions) {
			for (const condition of config.conditions) {
				if (condition.nextStepId) {
					edges.push({
						id: `${step.id}-cond-${condition.nextStepId}`,
						source: step.id,
						target: condition.nextStepId,
						type: "smoothstep",
						label: `${condition.variable} ${condition.operator} ${condition.value}`,
					});
				}
			}
			if (config.defaultNextStepId) {
				edges.push({
					id: `${step.id}-default-${config.defaultNextStepId}`,
					source: step.id,
					target: config.defaultNextStepId,
					type: "smoothstep",
					label: "default",
					style: { strokeDasharray: "5,5" },
				});
			}
		}
	}

	return edges;
}

function PlaybookBuilderInner({ playbook, onBack }: PlaybookBuilderProps) {
	const [nodes, setNodes] = useState<Node[]>([]);
	const [edges, setEdges] = useState<Edge[]>([]);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);

	const fetchSteps = useCallback(async () => {
		try {
			const response = await fetch(`/api/admin/playbooks/${playbook.id}/steps`);
			const data = await response.json();
			setNodes(stepsToNodes(data || []));
			setEdges(stepsToEdges(data || []));
		} catch (error) {
			console.error("Error fetching steps:", error);
		} finally {
			setLoading(false);
		}
	}, [playbook.id]);

	useEffect(() => {
		fetchSteps();
	}, [fetchSteps]);

	const onNodesChange: OnNodesChange = useCallback(
		(changes) => setNodes((nds) => applyNodeChanges(changes, nds)),
		[],
	);

	const onEdgesChange: OnEdgesChange = useCallback(
		(changes) => setEdges((eds) => applyEdgeChanges(changes, eds)),
		[],
	);

	const onConnect: OnConnect = useCallback(
		(connection) => setEdges((eds) => addEdge(connection, eds)),
		[],
	);

	const addNode = async (type: PlaybookStep["type"]) => {
		try {
			const response = await fetch(
				`/api/admin/playbooks/${playbook.id}/steps`,
				{
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						type,
						name: `New ${type}`,
						positionX: 250,
						positionY: nodes.length * 150,
						config:
							type === "message"
								? { message: "Hello! How can I help you?" }
								: type === "question"
									? {
											question: "What is your email?",
											variableName: "email",
											validation: "email",
										}
									: type === "options"
										? {
												question: "Please select an option:",
												options: [
													{ label: "Option 1", value: "option1" },
													{ label: "Option 2", value: "option2" },
												],
											}
										: {},
					}),
				},
			);

			if (!response.ok) throw new Error("Failed to add step");

			fetchSteps();
		} catch (error) {
			console.error("Error adding step:", error);
		}
	};

	const savePositions = async () => {
		setSaving(true);
		try {
			await fetch(`/api/admin/playbooks/${playbook.id}/steps`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					steps: nodes.map((node) => ({
						id: node.id,
						positionX: Math.round(node.position.x),
						positionY: Math.round(node.position.y),
					})),
				}),
			});
		} catch (error) {
			console.error("Error saving positions:", error);
		} finally {
			setSaving(false);
		}
	};

	const toggleStatus = async () => {
		try {
			if (playbook.status === "active") {
				await fetch(`/api/admin/playbooks/${playbook.id}/publish`, {
					method: "DELETE",
				});
			} else {
				await fetch(`/api/admin/playbooks/${playbook.id}/publish`, {
					method: "POST",
				});
			}
			onBack();
		} catch (error) {
			console.error("Status toggle error:", error);
		}
	};

	const statusColors: Record<string, string> = {
		draft: "bg-gray-100 text-gray-800",
		active: "bg-green-100 text-green-800",
		paused: "bg-yellow-100 text-yellow-800",
	};

	return (
		<Card className="h-[calc(100vh-200px)] min-h-[600px]">
			<CardHeader className="border-b">
				<div className="flex items-center justify-between">
					<div className="flex items-center gap-4">
						<Button variant="ghost" size="icon" onClick={onBack}>
							<ArrowLeft className="h-4 w-4" />
						</Button>
						<div>
							<CardTitle className="flex items-center gap-2">
								{playbook.name}
								<Badge
									variant="secondary"
									className={statusColors[playbook.status]}
								>
									{playbook.status}
								</Badge>
							</CardTitle>
							<CardDescription>{playbook.description}</CardDescription>
						</div>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" onClick={toggleStatus}>
							{playbook.status === "active" ? (
								<>
									<Pause className="mr-2 h-4 w-4" />
									Pause
								</>
							) : (
								<>
									<Play className="mr-2 h-4 w-4" />
									Activate
								</>
							)}
						</Button>
						<Button onClick={savePositions} disabled={saving}>
							<Save className="mr-2 h-4 w-4" />
							{saving ? "Saving..." : "Save Layout"}
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent className="h-full p-0">
				<div className="flex h-full">
					{/* Sidebar with node types */}
					<div className="w-48 border-r p-4">
						<div className="mb-4 font-medium text-sm">Add Step</div>
						<div className="space-y-2">
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("message")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Message
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("question")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Question
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("options")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Options
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("condition")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Condition
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("action")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Action
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("handoff")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Handoff
							</Button>
							<Button
								variant="outline"
								size="sm"
								className="w-full justify-start"
								onClick={() => addNode("stop")}
							>
								<Plus className="mr-2 h-3 w-3" />
								Stop
							</Button>
						</div>
					</div>

					{/* Flow canvas */}
					<div className="flex-1">
						{loading ? (
							<div className="flex h-full items-center justify-center">
								Loading...
							</div>
						) : (
							<ReactFlow
								nodes={nodes}
								edges={edges}
								onNodesChange={onNodesChange}
								onEdgesChange={onEdgesChange}
								onConnect={onConnect}
								nodeTypes={nodeTypes}
								fitView
							>
								<Background />
								<Controls />
							</ReactFlow>
						)}
					</div>
				</div>
			</CardContent>
		</Card>
	);
}

export function PlaybookBuilder(props: PlaybookBuilderProps) {
	return (
		<ReactFlowProvider>
			<PlaybookBuilderInner {...props} />
		</ReactFlowProvider>
	);
}
