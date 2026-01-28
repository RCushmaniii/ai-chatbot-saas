"use client";

import { Handle, Position } from "@xyflow/react";
import { HelpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface QuestionNodeProps {
	data: {
		label: string;
		config?: {
			question?: string;
			variableName?: string;
			validation?: string;
		};
	};
	selected: boolean;
}

export function QuestionNode({ data, selected }: QuestionNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<HelpCircle className="h-4 w-4 text-green-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3 space-y-2">
				<p className="text-xs text-muted-foreground line-clamp-2">
					{data.config?.question || "No question set"}
				</p>
				<div className="flex gap-1">
					{data.config?.variableName && (
						<Badge variant="outline" className="text-xs">
							${data.config.variableName}
						</Badge>
					)}
					{data.config?.validation && (
						<Badge variant="secondary" className="text-xs">
							{data.config.validation}
						</Badge>
					)}
				</div>
			</CardContent>
			<Handle type="source" position={Position.Bottom} />
		</Card>
	);
}
