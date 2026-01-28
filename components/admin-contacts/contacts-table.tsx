"use client";

import { Edit, MoreHorizontal, Trash } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "@/components/ui/table";
import type { Contact } from "@/lib/db/schema";

interface ContactsTableProps {
	contacts: Contact[];
	loading: boolean;
	onSelect: (contact: Contact) => void;
	onEdit: (contact: Contact) => void;
	onDelete: (id: string) => void;
}

const statusColors: Record<string, string> = {
	new: "bg-blue-100 text-blue-800",
	engaged: "bg-yellow-100 text-yellow-800",
	qualified: "bg-green-100 text-green-800",
	converted: "bg-purple-100 text-purple-800",
};

export function ContactsTable({
	contacts,
	loading,
	onSelect,
	onEdit,
	onDelete,
}: ContactsTableProps) {
	if (loading) {
		return (
			<div className="flex h-40 items-center justify-center">
				<div className="text-muted-foreground">Loading contacts...</div>
			</div>
		);
	}

	if (contacts.length === 0) {
		return (
			<div className="flex h-40 items-center justify-center">
				<div className="text-muted-foreground">No contacts found</div>
			</div>
		);
	}

	return (
		<Table>
			<TableHeader>
				<TableRow>
					<TableHead>Name</TableHead>
					<TableHead>Email</TableHead>
					<TableHead>Phone</TableHead>
					<TableHead>Status</TableHead>
					<TableHead>Lead Score</TableHead>
					<TableHead>Tags</TableHead>
					<TableHead>Last Seen</TableHead>
					<TableHead className="w-12" />
				</TableRow>
			</TableHeader>
			<TableBody>
				{contacts.map((contact) => (
					<TableRow
						key={contact.id}
						className="cursor-pointer"
						onClick={() => onSelect(contact)}
					>
						<TableCell className="font-medium">{contact.name || "-"}</TableCell>
						<TableCell>{contact.email || "-"}</TableCell>
						<TableCell>{contact.phone || "-"}</TableCell>
						<TableCell>
							<Badge
								variant="secondary"
								className={statusColors[contact.status]}
							>
								{contact.status}
							</Badge>
						</TableCell>
						<TableCell>{contact.leadScore || 0}</TableCell>
						<TableCell>
							<div className="flex flex-wrap gap-1">
								{(contact.tags as string[])?.slice(0, 3).map((tag) => (
									<Badge key={tag} variant="outline" className="text-xs">
										{tag}
									</Badge>
								))}
								{(contact.tags as string[])?.length > 3 && (
									<Badge variant="outline" className="text-xs">
										+{(contact.tags as string[]).length - 3}
									</Badge>
								)}
							</div>
						</TableCell>
						<TableCell className="text-muted-foreground text-sm">
							{contact.lastSeenAt
								? new Date(contact.lastSeenAt).toLocaleDateString()
								: "-"}
						</TableCell>
						<TableCell>
							<DropdownMenu>
								<DropdownMenuTrigger asChild>
									<Button
										variant="ghost"
										size="icon"
										onClick={(e) => e.stopPropagation()}
									>
										<MoreHorizontal className="h-4 w-4" />
									</Button>
								</DropdownMenuTrigger>
								<DropdownMenuContent align="end">
									<DropdownMenuItem
										onClick={(e) => {
											e.stopPropagation();
											onEdit(contact);
										}}
									>
										<Edit className="mr-2 h-4 w-4" />
										Edit
									</DropdownMenuItem>
									<DropdownMenuItem
										className="text-destructive"
										onClick={(e) => {
											e.stopPropagation();
											onDelete(contact.id);
										}}
									>
										<Trash className="mr-2 h-4 w-4" />
										Delete
									</DropdownMenuItem>
								</DropdownMenuContent>
							</DropdownMenu>
						</TableCell>
					</TableRow>
				))}
			</TableBody>
		</Table>
	);
}
