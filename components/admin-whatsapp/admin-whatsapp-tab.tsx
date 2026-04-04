"use client";

import {
	AlertCircle,
	Check,
	Loader2,
	Phone,
	Plus,
	Shield,
	Trash2,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface PhoneMapping {
	id: string;
	phoneNumberId: string;
	displayPhoneNumber: string;
	displayName: string | null;
	isActive: boolean;
	createdAt: string;
}

export function AdminWhatsAppTab() {
	const [mappings, setMappings] = useState<PhoneMapping[]>([]);
	const [whatsappEnabled, setWhatsappEnabled] = useState(false);
	const [loading, setLoading] = useState(true);
	const [saving, setSaving] = useState(false);
	const [showForm, setShowForm] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [success, setSuccess] = useState<string | null>(null);

	const [phoneNumberId, setPhoneNumberId] = useState("");
	const [displayPhoneNumber, setDisplayPhoneNumber] = useState("");
	const [displayName, setDisplayName] = useState("");
	const [accessToken, setAccessToken] = useState("");

	const fetchMappings = useCallback(async () => {
		try {
			const response = await fetch("/api/admin/whatsapp");
			const data = await response.json();
			setMappings(data.mappings || []);
			setWhatsappEnabled(data.whatsappEnabled);
		} catch (err) {
			console.error("Error fetching WhatsApp config:", err);
		} finally {
			setLoading(false);
		}
	}, []);

	useEffect(() => {
		fetchMappings();
	}, [fetchMappings]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);
		setSuccess(null);
		setSaving(true);

		try {
			const response = await fetch("/api/admin/whatsapp", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					phoneNumberId,
					displayPhoneNumber,
					displayName: displayName || null,
					accessToken,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Failed to add phone number");
				return;
			}

			setSuccess("WhatsApp phone number added successfully.");
			setPhoneNumberId("");
			setDisplayPhoneNumber("");
			setDisplayName("");
			setAccessToken("");
			setShowForm(false);
			fetchMappings();
		} catch (err) {
			console.error("Error adding phone:", err);
			setError("Failed to add phone number. Please try again.");
		} finally {
			setSaving(false);
		}
	};

	const handleDelete = async (id: string) => {
		try {
			const response = await fetch(`/api/admin/whatsapp?id=${id}`, {
				method: "DELETE",
			});

			if (!response.ok) {
				const data = await response.json();
				setError(data.error || "Failed to remove phone number");
				return;
			}

			setSuccess("Phone number deactivated.");
			fetchMappings();
		} catch (err) {
			console.error("Error removing phone:", err);
			setError("Failed to remove phone number.");
		}
	};

	if (loading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
			</div>
		);
	}

	if (!whatsappEnabled) {
		return (
			<Card>
				<CardHeader>
					<CardTitle className="flex items-center gap-2">
						<Phone className="h-5 w-5" />
						WhatsApp Business
					</CardTitle>
					<CardDescription>
						Connect your WhatsApp Business number to receive and respond to
						customer messages with AI.
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Alert>
						<Shield className="h-4 w-4" />
						<AlertTitle>Upgrade Required</AlertTitle>
						<AlertDescription>
							WhatsApp integration is available on Pro and Business plans.
							Upgrade your plan to connect WhatsApp.
						</AlertDescription>
					</Alert>
				</CardContent>
			</Card>
		);
	}

	const activeMappings = mappings.filter((m) => m.isActive);

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="flex items-center gap-2">
								<Phone className="h-5 w-5" />
								WhatsApp Business
							</CardTitle>
							<CardDescription>
								Connect your WhatsApp Business phone numbers to enable AI
								responses for customer messages.
							</CardDescription>
						</div>
						{!showForm && (
							<Button onClick={() => setShowForm(true)} size="sm">
								<Plus className="mr-2 h-4 w-4" />
								Add Number
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent className="space-y-4">
					{error && (
						<Alert variant="destructive">
							<AlertCircle className="h-4 w-4" />
							<AlertDescription>{error}</AlertDescription>
						</Alert>
					)}

					{success && (
						<Alert>
							<Check className="h-4 w-4" />
							<AlertDescription>{success}</AlertDescription>
						</Alert>
					)}

					{showForm && (
						<Card className="border-dashed">
							<CardHeader>
								<CardTitle className="text-base">
									Add WhatsApp Phone Number
								</CardTitle>
								<CardDescription>
									Enter the details from your Meta Business Manager WhatsApp
									setup.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<form onSubmit={handleSubmit} className="space-y-4">
									<div className="grid gap-4 sm:grid-cols-2">
										<div className="space-y-2">
											<Label htmlFor="phoneNumberId">
												Phone Number ID
											</Label>
											<Input
												id="phoneNumberId"
												value={phoneNumberId}
												onChange={(e) => setPhoneNumberId(e.target.value)}
												placeholder="e.g. 123456789012345"
												required
											/>
											<p className="text-xs text-muted-foreground">
												From Meta Business Manager &gt; WhatsApp &gt; Phone
												Numbers
											</p>
										</div>
										<div className="space-y-2">
											<Label htmlFor="displayPhoneNumber">
												Display Phone Number
											</Label>
											<Input
												id="displayPhoneNumber"
												value={displayPhoneNumber}
												onChange={(e) =>
													setDisplayPhoneNumber(e.target.value)
												}
												placeholder="e.g. +52 55 1234 5678"
												required
											/>
										</div>
									</div>
									<div className="space-y-2">
										<Label htmlFor="displayName">
											Business Name (optional)
										</Label>
										<Input
											id="displayName"
											value={displayName}
											onChange={(e) => setDisplayName(e.target.value)}
											placeholder="e.g. Mi Negocio"
										/>
									</div>
									<div className="space-y-2">
										<Label htmlFor="accessToken">
											WhatsApp Access Token
										</Label>
										<Input
											id="accessToken"
											type="password"
											value={accessToken}
											onChange={(e) => setAccessToken(e.target.value)}
											placeholder="System user token from Meta Business Manager"
											required
										/>
										<p className="text-xs text-muted-foreground">
											System user permanent token with whatsapp_business_messaging
											permission.
										</p>
									</div>
									<div className="flex gap-2">
										<Button type="submit" disabled={saving}>
											{saving && (
												<Loader2 className="mr-2 h-4 w-4 animate-spin" />
											)}
											Add Phone Number
										</Button>
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setShowForm(false);
												setError(null);
											}}
										>
											Cancel
										</Button>
									</div>
								</form>
							</CardContent>
						</Card>
					)}

					{activeMappings.length === 0 && !showForm ? (
						<div className="py-8 text-center text-muted-foreground">
							<Phone className="mx-auto mb-3 h-8 w-8 opacity-50" />
							<p>No WhatsApp phone numbers configured.</p>
							<p className="text-sm">
								Add a phone number to start receiving WhatsApp messages.
							</p>
						</div>
					) : (
						<div className="space-y-3">
							{activeMappings.map((mapping) => (
								<div
									key={mapping.id}
									className="flex items-center justify-between rounded-lg border p-4"
								>
									<div className="space-y-1">
										<div className="flex items-center gap-2">
											<span className="font-medium">
												{mapping.displayPhoneNumber}
											</span>
											<Badge variant="secondary" className="text-xs">
												Active
											</Badge>
										</div>
										{mapping.displayName && (
											<p className="text-sm text-muted-foreground">
												{mapping.displayName}
											</p>
										)}
										<p className="font-mono text-xs text-muted-foreground">
											ID: {mapping.phoneNumberId}
										</p>
									</div>
									<Button
										variant="ghost"
										size="sm"
										onClick={() => handleDelete(mapping.id)}
										className="text-destructive hover:text-destructive"
									>
										<Trash2 className="h-4 w-4" />
									</Button>
								</div>
							))}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle className="text-base">Webhook Configuration</CardTitle>
					<CardDescription>
						Configure these settings in your Meta Business Manager.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3">
					<div className="space-y-1">
						<Label className="text-sm font-medium">Webhook URL</Label>
						<code className="block rounded bg-muted px-3 py-2 text-sm">
							{typeof window !== "undefined"
								? `${window.location.origin}/api/webhooks/whatsapp`
								: "/api/webhooks/whatsapp"}
						</code>
					</div>
					<div className="space-y-1">
						<Label className="text-sm font-medium">Subscribed Fields</Label>
						<p className="text-sm text-muted-foreground">
							messages, messaging_postbacks
						</p>
					</div>
					<div className="space-y-1">
						<Label className="text-sm font-medium">Verify Token</Label>
						<p className="text-sm text-muted-foreground">
							Set in your WHATSAPP_VERIFY_TOKEN environment variable.
						</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}
