"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Contact } from "@/lib/db/schema";

interface ContactFormProps {
	contact: Contact | null;
	open: boolean;
	onClose: () => void;
	onSuccess: () => void;
}

export function ContactForm({
	contact,
	open,
	onClose,
	onSuccess,
}: ContactFormProps) {
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		name: contact?.name || "",
		email: contact?.email || "",
		phone: contact?.phone || "",
		status: contact?.status || "new",
		leadScore: contact?.leadScore || 0,
		tags: (contact?.tags as string[])?.join(", ") || "",
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			const payload = {
				name: formData.name || null,
				email: formData.email || null,
				phone: formData.phone || null,
				status: formData.status,
				leadScore: formData.leadScore,
				tags: formData.tags
					.split(",")
					.map((t) => t.trim())
					.filter(Boolean),
			};

			const url = contact
				? `/api/admin/contacts/${contact.id}`
				: "/api/admin/contacts";
			const method = contact ? "PUT" : "POST";

			const response = await fetch(url, {
				method,
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(payload),
			});

			if (!response.ok) {
				throw new Error("Failed to save contact");
			}

			onSuccess();
		} catch (error) {
			console.error("Error saving contact:", error);
			alert("Error saving contact");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{contact ? "Edit Contact" : "Add Contact"}</DialogTitle>
					<DialogDescription>
						{contact
							? "Update contact information"
							: "Create a new contact record"}
					</DialogDescription>
				</DialogHeader>

				<form onSubmit={handleSubmit}>
					<div className="space-y-4 py-4">
						<div className="space-y-2">
							<Label htmlFor="name">Name</Label>
							<Input
								id="name"
								value={formData.name}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, name: e.target.value }))
								}
								placeholder="Contact name"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="email">Email</Label>
							<Input
								id="email"
								type="email"
								value={formData.email}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, email: e.target.value }))
								}
								placeholder="email@example.com"
							/>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phone">Phone</Label>
							<Input
								id="phone"
								value={formData.phone}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, phone: e.target.value }))
								}
								placeholder="+1 234 567 8900"
							/>
						</div>

						<div className="grid grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="status">Status</Label>
								<Select
									value={formData.status}
									onValueChange={(value) =>
										setFormData((prev) => ({
											...prev,
											status: value as
												| "new"
												| "engaged"
												| "qualified"
												| "converted",
										}))
									}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="new">New</SelectItem>
										<SelectItem value="engaged">Engaged</SelectItem>
										<SelectItem value="qualified">Qualified</SelectItem>
										<SelectItem value="converted">Converted</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="leadScore">Lead Score</Label>
								<Input
									id="leadScore"
									type="number"
									min={0}
									max={100}
									value={formData.leadScore}
									onChange={(e) =>
										setFormData((prev) => ({
											...prev,
											leadScore: Number.parseInt(e.target.value, 10) || 0,
										}))
									}
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="tags">Tags (comma-separated)</Label>
							<Input
								id="tags"
								value={formData.tags}
								onChange={(e) =>
									setFormData((prev) => ({ ...prev, tags: e.target.value }))
								}
								placeholder="lead, website, demo"
							/>
						</div>
					</div>

					<DialogFooter>
						<Button type="button" variant="outline" onClick={onClose}>
							Cancel
						</Button>
						<Button type="submit" disabled={loading}>
							{loading ? "Saving..." : contact ? "Update" : "Create"}
						</Button>
					</DialogFooter>
				</form>
			</DialogContent>
		</Dialog>
	);
}
