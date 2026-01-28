"use client";

import { Download, Plus, Search, Upload } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import type { Contact } from "@/lib/db/schema";
import { ContactDetailDrawer } from "./contact-detail-drawer";
import { ContactForm } from "./contact-form";
import { ContactsTable } from "./contacts-table";

export function AdminContactsTab() {
	const [contacts, setContacts] = useState<Contact[]>([]);
	const [total, setTotal] = useState(0);
	const [loading, setLoading] = useState(true);
	const [search, setSearch] = useState("");
	const [status, setStatus] = useState<string>("all");
	const [selectedContact, setSelectedContact] = useState<Contact | null>(null);
	const [showForm, setShowForm] = useState(false);
	const [editingContact, setEditingContact] = useState<Contact | null>(null);

	const fetchContacts = useCallback(async () => {
		setLoading(true);
		try {
			const params = new URLSearchParams();
			if (search) params.set("search", search);
			if (status && status !== "all") params.set("status", status);

			const response = await fetch(`/api/admin/contacts?${params}`);
			const data = await response.json();

			setContacts(data.contacts || []);
			setTotal(data.total || 0);
		} catch (error) {
			console.error("Error fetching contacts:", error);
		} finally {
			setLoading(false);
		}
	}, [search, status]);

	useEffect(() => {
		fetchContacts();
	}, [fetchContacts]);

	const handleExport = async () => {
		const response = await fetch("/api/admin/contacts/export");
		const blob = await response.blob();
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `contacts-${Date.now()}.csv`;
		a.click();
		URL.revokeObjectURL(url);
	};

	const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		const formData = new FormData();
		formData.append("file", file);

		try {
			const response = await fetch("/api/admin/contacts/import", {
				method: "POST",
				body: formData,
			});
			const result = await response.json();
			alert(
				`Imported: ${result.imported}, Updated: ${result.updated}, Errors: ${result.errors}`,
			);
			fetchContacts();
		} catch (error) {
			console.error("Import error:", error);
			alert("Error importing contacts");
		}

		e.target.value = "";
	};

	const handleDelete = async (id: string) => {
		if (!confirm("Are you sure you want to delete this contact?")) return;

		try {
			await fetch(`/api/admin/contacts/${id}`, { method: "DELETE" });
			fetchContacts();
			if (selectedContact?.id === id) {
				setSelectedContact(null);
			}
		} catch (error) {
			console.error("Delete error:", error);
		}
	};

	const handleFormSuccess = () => {
		setShowForm(false);
		setEditingContact(null);
		fetchContacts();
	};

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<div>
						<CardTitle>Contacts</CardTitle>
						<CardDescription>
							Manage leads and contacts captured through your chatbot
						</CardDescription>
					</div>
					<div className="flex gap-2">
						<Button variant="outline" size="sm" onClick={handleExport}>
							<Download className="mr-2 h-4 w-4" />
							Export
						</Button>
						<label>
							<input
								type="file"
								accept=".csv"
								className="hidden"
								onChange={handleImport}
							/>
							<Button variant="outline" size="sm" asChild>
								<span>
									<Upload className="mr-2 h-4 w-4" />
									Import
								</span>
							</Button>
						</label>
						<Button size="sm" onClick={() => setShowForm(true)}>
							<Plus className="mr-2 h-4 w-4" />
							Add Contact
						</Button>
					</div>
				</div>
			</CardHeader>
			<CardContent>
				<div className="mb-4 flex gap-4">
					<div className="relative flex-1">
						<Search className="absolute top-2.5 left-2.5 h-4 w-4 text-muted-foreground" />
						<Input
							placeholder="Search contacts..."
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="pl-8"
						/>
					</div>
					<Select value={status} onValueChange={setStatus}>
						<SelectTrigger className="w-40">
							<SelectValue placeholder="All statuses" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="all">All Statuses</SelectItem>
							<SelectItem value="new">New</SelectItem>
							<SelectItem value="engaged">Engaged</SelectItem>
							<SelectItem value="qualified">Qualified</SelectItem>
							<SelectItem value="converted">Converted</SelectItem>
						</SelectContent>
					</Select>
				</div>

				<ContactsTable
					contacts={contacts}
					loading={loading}
					onSelect={setSelectedContact}
					onEdit={(contact) => {
						setEditingContact(contact);
						setShowForm(true);
					}}
					onDelete={handleDelete}
				/>

				<div className="mt-4 text-sm text-muted-foreground">
					Showing {contacts.length} of {total} contacts
				</div>
			</CardContent>

			<ContactDetailDrawer
				contact={selectedContact}
				open={!!selectedContact}
				onClose={() => setSelectedContact(null)}
				onEdit={(contact) => {
					setEditingContact(contact);
					setShowForm(true);
					setSelectedContact(null);
				}}
			/>

			<ContactForm
				contact={editingContact}
				open={showForm}
				onClose={() => {
					setShowForm(false);
					setEditingContact(null);
				}}
				onSuccess={handleFormSuccess}
			/>
		</Card>
	);
}
