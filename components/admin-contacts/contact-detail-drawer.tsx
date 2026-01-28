"use client";

import { Edit, Mail, Phone, User } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Sheet,
	SheetContent,
	SheetDescription,
	SheetHeader,
	SheetTitle,
} from "@/components/ui/sheet";
import type { Contact, ContactActivity } from "@/lib/db/schema";

interface ContactDetailDrawerProps {
	contact: Contact | null;
	open: boolean;
	onClose: () => void;
	onEdit: (contact: Contact) => void;
}

const statusColors: Record<string, string> = {
	new: "bg-blue-100 text-blue-800",
	engaged: "bg-yellow-100 text-yellow-800",
	qualified: "bg-green-100 text-green-800",
	converted: "bg-purple-100 text-purple-800",
};

const activityIcons: Record<string, string> = {
	page_view: "👁️",
	chat_started: "💬",
	message_sent: "📨",
	email_captured: "📧",
	phone_captured: "📞",
	playbook_completed: "✅",
	handoff_requested: "🤝",
	converted: "🎉",
};

export function ContactDetailDrawer({
	contact,
	open,
	onClose,
	onEdit,
}: ContactDetailDrawerProps) {
	const [activities, setActivities] = useState<ContactActivity[]>([]);
	const [loadingActivities, setLoadingActivities] = useState(false);

	useEffect(() => {
		if (contact) {
			setLoadingActivities(true);
			// Note: Activities endpoint would need to be implemented
			// For now, we'll just show an empty state
			setActivities([]);
			setLoadingActivities(false);
		}
	}, [contact]);

	if (!contact) return null;

	return (
		<Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
				<SheetHeader>
					<div className="flex items-start justify-between">
						<div>
							<SheetTitle className="flex items-center gap-2">
								<User className="h-5 w-5" />
								{contact.name || "Unknown Contact"}
							</SheetTitle>
							<SheetDescription>
								Contact details and activity history
							</SheetDescription>
						</div>
						<Button variant="outline" size="sm" onClick={() => onEdit(contact)}>
							<Edit className="mr-2 h-4 w-4" />
							Edit
						</Button>
					</div>
				</SheetHeader>

				<div className="mt-6 space-y-6">
					{/* Contact Info */}
					<div className="space-y-4">
						<h3 className="font-medium text-sm">Contact Information</h3>
						<div className="space-y-2">
							{contact.email && (
								<div className="flex items-center gap-2 text-sm">
									<Mail className="h-4 w-4 text-muted-foreground" />
									<a
										href={`mailto:${contact.email}`}
										className="text-primary hover:underline"
									>
										{contact.email}
									</a>
								</div>
							)}
							{contact.phone && (
								<div className="flex items-center gap-2 text-sm">
									<Phone className="h-4 w-4 text-muted-foreground" />
									<a
										href={`tel:${contact.phone}`}
										className="text-primary hover:underline"
									>
										{contact.phone}
									</a>
								</div>
							)}
						</div>
					</div>

					{/* Status & Score */}
					<div className="flex gap-4">
						<div>
							<div className="mb-1 text-xs text-muted-foreground">Status</div>
							<Badge
								variant="secondary"
								className={statusColors[contact.status]}
							>
								{contact.status}
							</Badge>
						</div>
						<div>
							<div className="mb-1 text-xs text-muted-foreground">
								Lead Score
							</div>
							<div className="font-medium">{contact.leadScore || 0}</div>
						</div>
					</div>

					{/* Tags */}
					{(contact.tags as string[])?.length > 0 && (
						<div>
							<div className="mb-2 text-xs text-muted-foreground">Tags</div>
							<div className="flex flex-wrap gap-1">
								{(contact.tags as string[]).map((tag) => (
									<Badge key={tag} variant="outline">
										{tag}
									</Badge>
								))}
							</div>
						</div>
					)}

					{/* Custom Fields */}
					{contact.customFields &&
						Object.keys(contact.customFields as Record<string, string>).length >
							0 && (
							<div>
								<div className="mb-2 text-xs text-muted-foreground">
									Custom Fields
								</div>
								<div className="space-y-1">
									{Object.entries(
										contact.customFields as Record<string, string>,
									).map(([key, value]) => (
										<div key={key} className="flex justify-between text-sm">
											<span className="text-muted-foreground">{key}:</span>
											<span>{value}</span>
										</div>
									))}
								</div>
							</div>
						)}

					{/* Timestamps */}
					<div className="border-t pt-4">
						<div className="grid grid-cols-2 gap-4 text-sm">
							<div>
								<div className="text-xs text-muted-foreground">First Seen</div>
								<div>
									{contact.firstSeenAt
										? new Date(contact.firstSeenAt).toLocaleString()
										: "-"}
								</div>
							</div>
							<div>
								<div className="text-xs text-muted-foreground">Last Seen</div>
								<div>
									{contact.lastSeenAt
										? new Date(contact.lastSeenAt).toLocaleString()
										: "-"}
								</div>
							</div>
						</div>
					</div>

					{/* Activity Timeline */}
					<div className="border-t pt-4">
						<h3 className="mb-4 font-medium text-sm">Activity Timeline</h3>
						{loadingActivities ? (
							<div className="text-sm text-muted-foreground">
								Loading activities...
							</div>
						) : activities.length === 0 ? (
							<div className="text-sm text-muted-foreground">
								No activities recorded yet
							</div>
						) : (
							<div className="space-y-3">
								{activities.map((activity) => (
									<div key={activity.id} className="flex gap-3 text-sm">
										<span>{activityIcons[activity.type] || "•"}</span>
										<div className="flex-1">
											<div>{activity.description || activity.type}</div>
											<div className="text-xs text-muted-foreground">
												{new Date(activity.createdAt).toLocaleString()}
											</div>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</div>
			</SheetContent>
		</Sheet>
	);
}
