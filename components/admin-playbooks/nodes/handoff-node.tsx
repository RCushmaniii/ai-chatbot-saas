"use client";

import { Handle, Position } from "@xyflow/react";
import { Headphones } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface HandoffNodeProps {
	data: {
		label: string;
		config?: {
			department?: string;
			priority?: number;
		};
	};
	selected: boolean;
}

export function HandoffNode({ data, selected }: HandoffNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<Headphones className="h-4 w-4 text-red-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3 space-y-1">
				{data.config?.department && (
					<Badge variant="outline" className="text-xs">
						{data.config.department}
					</Badge>
				)}
				{data.config?.priority !== undefined && (
					<Badge variant="secondary" className="text-xs">
						Priority: {data.config.priority}
					</Badge>
				)}
				{!data.config?.department && (
					<p className="text-xs text-muted-foreground">
						Transfer to live agent
					</p>
				)}
			</CardContent>
		</Card>
	);
}
