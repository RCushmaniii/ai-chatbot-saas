"use client";

import { Handle, Position } from "@xyflow/react";
import { Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ActionNodeProps {
	data: {
		label: string;
		config?: {
			actionType?: string;
		};
	};
	selected: boolean;
}

const actionLabels: Record<string, string> = {
	capture_contact: "Capture Contact",
	add_tag: "Add Tag",
	set_score: "Set Lead Score",
	webhook: "Webhook",
};

export function ActionNode({ data, selected }: ActionNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Zap className="h-4 w-4 text-yellow-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3">
				<Badge variant="secondary" className="text-xs">
					{data.config?.actionType
						? actionLabels[data.config.actionType] || data.config.actionType
						: "No action set"}
				</Badge>
			</CardContent>
			<Handle type="source" position={Position.Bottom} />
		</Card>
	);
}
