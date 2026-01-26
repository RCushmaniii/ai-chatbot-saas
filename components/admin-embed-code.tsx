"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";
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
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";

export function AdminEmbedCode() {
	const [copied, setCopied] = useState(false);
	const [settings, setSettings] = useState({
		welcomeMessage: "👋 Hey... ask your questions here!",
		welcomeGif: "",
		showWelcomeMessage: true,
		buttonColor: "#1c4992",
		buttonSize: 1,
		strokeLength: 5,
		position: "bottom-right",
		openDelay: 5000,
		autoOpen: true,
		language: "en",
		placeholder: "Type your message...",
		suggestedQuestions: [
			"What are the prices for classes?",
			"What services do you offer?",
			"How do I book a session?",
		],
	});

	const botId = "YOUR_BOT_ID"; // This will be dynamic based on user's bot

	const generateEmbedCode = () => {
		const params = [];
		if (settings.welcomeMessage)
			params.push(`welcomeMessage="${settings.welcomeMessage}"`);
		if (settings.language) params.push(`language="${settings.language}"`);
		if (settings.placeholder)
			params.push(`placeholder="${settings.placeholder}"`);
		if (settings.position) params.push(`position="${settings.position}"`);
		if (settings.autoOpen) params.push(`open="true"`);
		if (settings.openDelay) params.push(`openDelay="${settings.openDelay}"`);
		if (settings.buttonColor)
			params.push(`buttonColor="${settings.buttonColor}"`);
		if (settings.buttonSize !== 1)
			params.push(`buttonSize="${settings.buttonSize}"`);
		if (settings.showWelcomeMessage === false)
			params.push(`showWelcomeMessage="false"`);
		if (settings.welcomeGif) params.push(`welcomeGif="${settings.welcomeGif}"`);

		return `<script 
  async 
  src="${typeof window !== "undefined" ? window.location.origin : ""}/api/embed" 
  id="${botId}"
  ${params.join("\n  ")}
></script>`;
	};

	const copyToClipboard = () => {
		navigator.clipboard.writeText(generateEmbedCode());
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="space-y-6">
			<div>
				<h2 className="text-2xl font-bold">Chat Bubble Widget</h2>
				<p className="text-muted-foreground">
					Customize your chat bubble and generate embed code for your website
				</p>
			</div>

			<div className="grid gap-6 md:grid-cols-2">
				{/* Settings Panel */}
				<Card>
					<CardHeader>
						<CardTitle>Widget Settings</CardTitle>
						<CardDescription>
							Customize the appearance and behavior
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{/* Welcome Message */}
						<div className="space-y-2">
							<Label htmlFor="welcomeMessage">Welcome Message</Label>
							<Textarea
								id="welcomeMessage"
								value={settings.welcomeMessage}
								onChange={(e) =>
									setSettings({ ...settings, welcomeMessage: e.target.value })
								}
								placeholder="Enter welcome message"
								rows={2}
							/>
						</div>

						{/* Show Welcome Message Toggle */}
						<div className="flex items-center justify-between">
							<Label htmlFor="showWelcome">Show Welcome Message</Label>
							<Switch
								id="showWelcome"
								checked={settings.showWelcomeMessage}
								onCheckedChange={(checked) =>
									setSettings({ ...settings, showWelcomeMessage: checked })
								}
							/>
						</div>

						{/* Welcome GIF URL */}
						<div className="space-y-2">
							<Label htmlFor="welcomeGif">Welcome GIF URL (optional)</Label>
							<Input
								id="welcomeGif"
								type="url"
								value={settings.welcomeGif}
								onChange={(e) =>
									setSettings({ ...settings, welcomeGif: e.target.value })
								}
								placeholder="https://giphy.com/gifs/..."
							/>
						</div>

						{/* Button Color */}
						<div className="space-y-2">
							<Label htmlFor="buttonColor">Button Color</Label>
							<div className="flex gap-2">
								<Input
									id="buttonColor"
									type="color"
									value={settings.buttonColor}
									onChange={(e) =>
										setSettings({ ...settings, buttonColor: e.target.value })
									}
									className="w-20 h-10"
								/>
								<Input
									type="text"
									value={settings.buttonColor}
									onChange={(e) =>
										setSettings({ ...settings, buttonColor: e.target.value })
									}
									placeholder="#4f48e5"
								/>
							</div>
						</div>

						{/* Button Size */}
						<div className="space-y-2">
							<Label htmlFor="buttonSize">
								Button Size: {settings.buttonSize}x
							</Label>
							<Input
								id="buttonSize"
								type="range"
								min="0.5"
								max="2"
								step="0.1"
								value={settings.buttonSize}
								onChange={(e) =>
									setSettings({
										...settings,
										buttonSize: parseFloat(e.target.value),
									})
								}
							/>
						</div>

						{/* Position */}
						<div className="space-y-2">
							<Label htmlFor="position">Position</Label>
							<Select
								value={settings.position}
								onValueChange={(value) =>
									setSettings({ ...settings, position: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="bottom-right">Bottom Right</SelectItem>
									<SelectItem value="bottom-left">Bottom Left</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Auto Open */}
						<div className="flex items-center justify-between">
							<Label htmlFor="autoOpen">Auto Open on Page Load</Label>
							<Switch
								id="autoOpen"
								checked={settings.autoOpen}
								onCheckedChange={(checked) =>
									setSettings({ ...settings, autoOpen: checked })
								}
							/>
						</div>

						{/* Open Delay */}
						{settings.autoOpen && (
							<div className="space-y-2">
								<Label htmlFor="openDelay">Open Delay (ms)</Label>
								<Input
									id="openDelay"
									type="number"
									value={settings.openDelay}
									onChange={(e) =>
										setSettings({
											...settings,
											openDelay: parseInt(e.target.value, 10),
										})
									}
									placeholder="5000"
								/>
							</div>
						)}

						{/* Language */}
						<div className="space-y-2">
							<Label htmlFor="language">Default Language</Label>
							<Select
								value={settings.language}
								onValueChange={(value) =>
									setSettings({ ...settings, language: value })
								}
							>
								<SelectTrigger>
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en">English</SelectItem>
									<SelectItem value="es">Español</SelectItem>
								</SelectContent>
							</Select>
						</div>

						{/* Placeholder */}
						<div className="space-y-2">
							<Label htmlFor="placeholder">Input Placeholder</Label>
							<Input
								id="placeholder"
								value={settings.placeholder}
								onChange={(e) =>
									setSettings({ ...settings, placeholder: e.target.value })
								}
								placeholder="Type your message..."
							/>
						</div>

						{/* Suggested Questions */}
						<div className="space-y-2">
							<Label>Suggested Questions</Label>
							<p className="text-sm text-muted-foreground">
								Questions shown when chat opens (one per line)
							</p>
							<Textarea
								value={settings.suggestedQuestions.join("\n")}
								onChange={(e) =>
									setSettings({
										...settings,
										suggestedQuestions: e.target.value
											.split("\n")
											.filter((q) => q.trim()),
									})
								}
								placeholder="What are your services?&#10;How much do classes cost?&#10;How do I book?"
								rows={4}
							/>
						</div>
					</CardContent>
				</Card>

				{/* Preview & Code Panel */}
				<div className="space-y-6">
					{/* Preview */}
					<Card>
						<CardHeader>
							<CardTitle>Preview</CardTitle>
							<CardDescription>
								See how your chat bubble will look
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="relative h-64 bg-gray-100 rounded-lg overflow-hidden">
								<div className="absolute inset-0 flex items-center justify-center">
									<div className="text-center space-y-3">
										<p className="text-muted-foreground">
											Live preview coming soon
										</p>
										<Button
											variant="outline"
											onClick={() => window.open("/demo", "_blank")}
											className="gap-2"
										>
											<svg
												xmlns="http://www.w3.org/2000/svg"
												width="16"
												height="16"
												viewBox="0 0 24 24"
												fill="none"
												stroke="currentColor"
												strokeWidth="2"
												strokeLinecap="round"
												strokeLinejoin="round"
											>
												<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
												<polyline points="15 3 21 3 21 9" />
												<line x1="10" y1="14" x2="21" y2="3" />
											</svg>
											Open Demo Page
										</Button>
									</div>
								</div>
								{/* Chat bubble preview */}
								<div
									className={`absolute ${settings.position === "bottom-right" ? "bottom-4 right-4" : "bottom-4 left-4"}`}
								>
									<button
										style={{
											backgroundColor: settings.buttonColor,
											transform: `scale(${settings.buttonSize})`,
										}}
										className="w-16 h-16 rounded-full shadow-lg flex items-center justify-center text-white text-2xl hover:scale-110 transition-transform"
									>
										💬
									</button>
								</div>
							</div>
							<p className="text-sm text-muted-foreground text-center">
								Button color:{" "}
								<span className="font-mono">{settings.buttonColor}</span> •
								Position: {settings.position}
							</p>
						</CardContent>
					</Card>

					{/* Embed Code */}
					<Card>
						<CardHeader>
							<CardTitle>Embed Code</CardTitle>
							<CardDescription>
								Copy and paste this code into your website
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="relative">
								<pre className="bg-gray-900 text-gray-100 p-4 rounded-lg overflow-x-auto text-sm">
									<code>{generateEmbedCode()}</code>
								</pre>
								<Button
									size="sm"
									variant="secondary"
									className="absolute top-2 right-2"
									onClick={copyToClipboard}
								>
									{copied ? (
										<>
											<Check className="w-4 h-4 mr-2" />
											Copied!
										</>
									) : (
										<>
											<Copy className="w-4 h-4 mr-2" />
											Copy
										</>
									)}
								</Button>
							</div>

							<div className="space-y-2">
								<h4 className="font-semibold">Installation Instructions:</h4>
								<ol className="list-decimal list-inside space-y-1 text-sm text-muted-foreground">
									<li>Copy the embed code above</li>
									<li>
										Paste it before the closing <code>&lt;/body&gt;</code> tag
										in your HTML
									</li>
									<li>
										The chat bubble will appear on your website automatically
									</li>
								</ol>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
