"use client";

import { Handle, Position } from "@xyflow/react";
import { StopCircle } from "lucide-react";
import { Card, CardHeader, CardTitle } from "@/components/ui/card";

interface StopNodeProps {
	data: {
		label: string;
	};
	selected: boolean;
}

export function StopNode({ data, selected }: StopNodeProps) {
	return (
		<Card className={`w-48 ${selected ? "ring-2 ring-primary" : ""}`}>
			<Handle type="target" position={Position.Top} />
			<CardHeader className="py-3 px-3">
				<CardTitle className="flex items-center gap-2 text-sm">
					<StopCircle className="h-4 w-4 text-gray-500" />
					{data.label}
				</CardTitle>
			</CardHeader>
		</Card>
	);
}
