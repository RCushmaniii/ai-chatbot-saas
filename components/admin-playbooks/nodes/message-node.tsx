"use client";

import { Handle, Position } from "@xyflow/react";
import { MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface MessageNodeProps {
	data: {
		label: string;
		config?: {
			message?: string;
		};
	};
	selected: boolean;
}

export function MessageNode({ data, selected }: MessageNodeProps) {
	return (
		<Card className={`w-64 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-2 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<MessageSquare className="h-4 w-4 text-blue-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
			<CardContent className="py-2 px-3">
				<p className="text-xs text-muted-foreground line-clamp-2">
					{data.config?.message || "No message set"}
				</p>
			</CardContent>
			<Handle type="source" position={Position.Bottom} />
		</Card>
	);
}
