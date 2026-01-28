"use client";

import { Handle, Position } from "@xyflow/react";
import { List } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface OptionsNodeProps {
	data: {
		label: string;
		config?: {
			question?: string;
			options?: Array<{ label: string; value: string }>;
		};
	};
	selected: boolean;
}

export function OptionsNode({ data, selected }: OptionsNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<List className="h-4 w-4 text-purple-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3 space-y-2">
				<p className="text-xs text-muted-foreground line-clamp-1">
					{data.config?.question || "Select an option"}
				</p>
				<div className="flex flex-wrap gap-1">
					{data.config?.options?.map((option) => (
						<Badge key={option.value} variant="outline" className="text-xs">
							{option.label}
						</Badge>
					))}
				</div>
			</CardContent>
			<Handle type="source" position={Position.Bottom} />
		</Card>
	);
}
