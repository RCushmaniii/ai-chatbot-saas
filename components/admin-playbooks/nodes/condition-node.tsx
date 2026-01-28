"use client";

import { Handle, Position } from "@xyflow/react";
import { GitBranch } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ConditionNodeProps {
	data: {
		label: string;
		config?: {
			conditions?: Array<{
				variable: string;
				operator: string;
				value: string;
			}>;
		};
	};
	selected: boolean;
}

export function ConditionNode({ data, selected }: ConditionNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<GitBranch className="h-4 w-4 text-orange-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3 space-y-1">
				{data.config?.conditions?.map((condition, i) => (
					<Badge
						key={`${condition.variable}-${i}`}
						variant="outline"
						className="text-xs block w-fit"
					>
						{condition.variable} {condition.operator} {condition.value}
					</Badge>
				))}
				{(!data.config?.conditions || data.config.conditions.length === 0) && (
					<p className="text-xs text-muted-foreground">No conditions set</p>
				)}
			</CardContent>
			<Handle type="source" position={Position.Bottom} />
		</Card>
	);
}
