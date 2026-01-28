"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Textarea } from "@/components/ui/textarea";

type UploadItem = {
	name: string;
	size: number;
	status: "uploading" | "complete" | "error";
	errorMessage?: string;
};

export function AdminKnowledgeBase() {
	const [content, setContent] = useState("");
	const [url, setUrl] = useState("https://www.nyenglishteacher.com");
	const [type, setType] = useState("general");
	const [language, setLanguage] = useState("en");
	const [isLoading, setIsLoading] = useState(false);
	const [isUploading, setIsUploading] = useState(false);
	const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();

		if (!content.trim()) {
			toast.error("Please enter some content");
			return;
		}

		setIsLoading(true);

		try {
			const response = await fetch("/api/admin/knowledge", {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					content: content.trim(),
					url,
					metadata: { type, language },
				}),
			});

			if (!response.ok) {
				throw new Error("Failed to add content");
			}

			toast.success("Content added successfully!");
			setContent("");
			setType("general");
		} catch (error) {
			console.error("Error adding content:", error);
			toast.error("Failed to add content. Please try again.");
		} finally {
			setIsLoading(false);
		}
	};

	const chunkText = (text: string, maxLength = 1500) => {
		const chunks: string[] = [];
		let current = text.trim();

		while (current.length > maxLength) {
			let splitIndex = current.lastIndexOf("\n\n", maxLength);
			if (splitIndex === -1) {
				splitIndex = maxLength;
			}
			const chunk = current.slice(0, splitIndex).trim();
			if (chunk) {
				chunks.push(chunk);
			}
			current = current.slice(splitIndex).trim();
		}

		if (current.length > 0) {
			chunks.push(current);
		}

		return chunks;
	};

	const handleFileUpload = async (
		event: React.ChangeEvent<HTMLInputElement>,
	) => {
		const files = event.target.files;

		if (!files || files.length === 0) {
			return;
		}

		setIsUploading(true);

		try {
			for (const file of Array.from(files)) {
				const lowerName = file.name.toLowerCase();

				setUploadItems((prev) => [
					...prev,
					{ name: file.name, size: file.size, status: "uploading" },
				]);

				// Handle PDFs via dedicated server-side extraction endpoint.
				if (lowerName.endsWith(".pdf")) {
					const formData = new FormData();
					formData.append("file", file);
					formData.append("type", type);
					formData.append("language", language);
					formData.append("url", url);

					const response = await fetch("/api/admin/knowledge/pdf", {
						method: "POST",
						body: formData,
					});

					if (!response.ok) {
						let errorMessage = `Failed to add content from ${file.name}`;
						try {
							const errorData = await response.json();
							if (errorData.error) {
								errorMessage = errorData.error;
							}
						} catch (_e) {
							// If JSON parsing fails, use the default error message
						}

						setUploadItems((prev) =>
							prev.map((item) =>
								item.name === file.name
									? { ...item, status: "error", errorMessage }
									: item,
							),
						);

						toast.error(errorMessage);
						continue;
					}

					setUploadItems((prev) =>
						prev.map((item) =>
							item.name === file.name ? { ...item, status: "complete" } : item,
						),
					);

					continue;
				}

				// Handle CSV files
				if (lowerName.endsWith(".csv")) {
					const { processCSV, splitCSVIntoChunks } = await import(
						"@/lib/ingestion/processors/csv-processor"
					);
					const text = await file.text();
					const result = await processCSV(text);
					const chunks = splitCSVIntoChunks(result);

					for (const chunk of chunks) {
						const response = await fetch("/api/admin/knowledge", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								content: chunk,
								url,
								metadata: {
									type,
									language,
									sourceFile: file.name,
									format: "csv",
								},
							}),
						});

						if (!response.ok) {
							setUploadItems((prev) =>
								prev.map((item) =>
									item.name === file.name
										? {
												...item,
												status: "error",
												errorMessage: "Failed to process CSV",
											}
										: item,
								),
							);
							toast.error(`Failed to add content from ${file.name}`);
						}
					}

					setUploadItems((prev) =>
						prev.map((item) =>
							item.name === file.name ? { ...item, status: "complete" } : item,
						),
					);
					continue;
				}

				// Handle DOCX files
				if (lowerName.endsWith(".docx")) {
					const { processDOCXFile, splitDOCXIntoChunks } = await import(
						"@/lib/ingestion/processors/docx-processor"
					);
					const result = await processDOCXFile(file);
					const chunks = splitDOCXIntoChunks(result.content);

					for (const chunk of chunks) {
						const response = await fetch("/api/admin/knowledge", {
							method: "POST",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								content: chunk,
								url,
								metadata: {
									type,
									language,
									sourceFile: file.name,
									format: "docx",
								},
							}),
						});

						if (!response.ok) {
							setUploadItems((prev) =>
								prev.map((item) =>
									item.name === file.name
										? {
												...item,
												status: "error",
												errorMessage: "Failed to process DOCX",
											}
										: item,
								),
							);
							toast.error(`Failed to add content from ${file.name}`);
						}
					}

					setUploadItems((prev) =>
						prev.map((item) =>
							item.name === file.name ? { ...item, status: "complete" } : item,
						),
					);
					continue;
				}

				// Handle plain text / markdown directly on the client.
				if (!lowerName.endsWith(".txt") && !lowerName.endsWith(".md")) {
					const errorMessage = `Unsupported file type for ${file.name}. Supported: .txt, .md, .pdf, .csv, .docx`;
					toast.error(errorMessage);
					setUploadItems((prev) =>
						prev.map((item) =>
							item.name === file.name
								? { ...item, status: "error", errorMessage }
								: item,
						),
					);
					continue;
				}

				const text = await file.text();
				const chunks = chunkText(text);

				for (const chunk of chunks) {
					const response = await fetch("/api/admin/knowledge", {
						method: "POST",
						headers: {
							"Content-Type": "application/json",
						},
						body: JSON.stringify({
							content: chunk,
							url,
							metadata: { type, language, sourceFile: file.name },
						}),
					});

					if (!response.ok) {
						let errorMessage = `Failed to add content from ${file.name}`;
						try {
							const errorData = await response.json();
							if (errorData.error) {
								errorMessage = errorData.error;
							}
						} catch (_e) {
							// If JSON parsing fails, use the default error message
						}

						setUploadItems((prev) =>
							prev.map((item) =>
								item.name === file.name
									? { ...item, status: "error", errorMessage }
									: item,
							),
						);

						toast.error(errorMessage);
					}
				}

				setUploadItems((prev) =>
					prev.map((item) =>
						item.name === file.name ? { ...item, status: "complete" } : item,
					),
				);
			}

			toast.success("File content added to knowledge base!");
		} catch (error) {
			console.error("Error uploading files:", error);
			const errorMessage =
				error instanceof Error
					? error.message
					: "Failed to process one or more files. Please try again.";
			toast.error(errorMessage);
		} finally {
			setIsUploading(false);
			// Reset the input so the same file can be selected again if needed
			event.target.value = "";
		}
	};

	return (
		<div className="space-y-6">
			<Card>
				<CardHeader>
					<CardTitle>Add New Content</CardTitle>
					<CardDescription>
						Add information that the chatbot can use to answer questions
					</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-4">
						<div className="space-y-2">
							<Label htmlFor="content">Content</Label>
							<Textarea
								id="content"
								placeholder="Enter the information you want to add to the knowledge base..."
								value={content}
								onChange={(e) => setContent(e.target.value)}
								rows={8}
								className="resize-none"
							/>
							<p className="text-sm text-muted-foreground">
								Write clear, detailed information. The AI will use this to
								answer user questions.
							</p>
						</div>

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div className="space-y-2">
								<Label htmlFor="type">Content Type</Label>
								<Select value={type} onValueChange={setType}>
									<SelectTrigger id="type">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="general">General Info</SelectItem>
										<SelectItem value="services">Services</SelectItem>
										<SelectItem value="pricing">Pricing</SelectItem>
										<SelectItem value="faq">FAQ</SelectItem>
										<SelectItem value="coaching-approach">
											Coaching Approach
										</SelectItem>
										<SelectItem value="target-audience">
											Target Audience
										</SelectItem>
										<SelectItem value="testimonial">Testimonial</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="language">Language</Label>
								<Select value={language} onValueChange={setLanguage}>
									<SelectTrigger id="language">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="en">English</SelectItem>
										<SelectItem value="es">Spanish</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="url">URL (optional)</Label>
							<Input
								id="url"
								type="url"
								placeholder="https://www.nyenglishteacher.com"
								value={url}
								onChange={(e) => setUrl(e.target.value)}
							/>
						</div>

						<Button type="submit" disabled={isLoading} className="w-full">
							{isLoading ? "Adding..." : "Add to Knowledge Base"}
						</Button>
					</form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Upload Files</CardTitle>
					<CardDescription>
						Upload documents to automatically add their contents to the
						knowledge base. Supported formats: .txt, .md, .pdf, .csv, and .docx.
						Longer files will be split into smaller chunks for better search
						results.
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-2">
						<Label htmlFor="file-type">Content Type for Uploaded Files</Label>
						<p className="text-sm text-muted-foreground">
							The selected type and language below will be applied to all
							uploaded files.
						</p>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div className="space-y-2">
							<Label htmlFor="upload-type">Content Type</Label>
							<Select value={type} onValueChange={setType}>
								<SelectTrigger id="upload-type">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="general">General Info</SelectItem>
									<SelectItem value="services">Services</SelectItem>
									<SelectItem value="pricing">Pricing</SelectItem>
									<SelectItem value="faq">FAQ</SelectItem>
									<SelectItem value="coaching-approach">
										Coaching Approach
									</SelectItem>
									<SelectItem value="target-audience">
										Target Audience
									</SelectItem>
									<SelectItem value="testimonial">Testimonial</SelectItem>
									<SelectItem value="blog">Blog Article</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="space-y-2">
							<Label htmlFor="upload-language">Language</Label>
							<Select value={language} onValueChange={setLanguage}>
								<SelectTrigger id="upload-language">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="en">English</SelectItem>
									<SelectItem value="es">Spanish</SelectItem>
								</SelectContent>
							</Select>
						</div>
					</div>

					<div className="space-y-2">
						<Label htmlFor="file-upload">Files</Label>
						<div
							className="flex flex-col items-center justify-center rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 px-4 py-8 text-center cursor-pointer hover:bg-muted/70 transition-colors"
							onClick={() => {
								const input = document.getElementById(
									"file-upload",
								) as HTMLInputElement | null;
								input?.click();
							}}
							onDragOver={(e) => {
								e.preventDefault();
								e.stopPropagation();
							}}
							onDrop={(e) => {
								e.preventDefault();
								e.stopPropagation();

								const input = document.getElementById(
									"file-upload",
								) as HTMLInputElement | null;
								if (input) {
									// Create a DataTransfer to reuse the existing handler
									const dataTransfer = new DataTransfer();
									Array.from(e.dataTransfer.files).forEach((file) => {
										dataTransfer.items.add(file);
									});
									input.files = dataTransfer.files;

									const event = {
										target: input,
									} as unknown as React.ChangeEvent<HTMLInputElement>;

									void handleFileUpload(event);
								}
							}}
						>
							<div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-background shadow-sm">
								<span className="text-xl">⬆️</span>
							</div>
							<p className="text-sm font-medium">
								<span className="text-primary">Click to upload</span> or drag
								and drop
							</p>
							<p className="text-xs text-muted-foreground mt-1">
								Supports .txt, .md, .pdf, .csv, and .docx files.
							</p>
							<Input
								id="file-upload"
								type="file"
								multiple
								className="hidden"
								accept=".txt,.md,.pdf,.csv,.docx,text/plain,text/markdown,application/pdf,text/csv,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
								onChange={handleFileUpload}
								disabled={isUploading}
							/>
						</div>

						{uploadItems.length > 0 && (
							<div className="mt-4 space-y-2">
								{uploadItems.map((item) => (
									<div
										key={`${item.name}-${item.size}-${item.status}`}
										className="rounded-md border bg-background px-3 py-2 text-sm"
									>
										<div className="flex items-center justify-between">
											<div className="flex flex-col">
												<span className="font-medium truncate max-w-xs">
													{item.name}
												</span>
												<span className="text-xs text-muted-foreground">
													{(item.size / 1024).toFixed(0)} KB
												</span>
											</div>
											<div className="text-xs">
												{item.status === "uploading" && (
													<span className="text-blue-600">Uploading…</span>
												)}
												{item.status === "complete" && (
													<span className="text-emerald-600">Complete</span>
												)}
												{item.status === "error" && (
													<span className="text-destructive">Error</span>
												)}
											</div>
										</div>
										{item.status === "error" && item.errorMessage && (
											<div className="mt-1 text-xs text-destructive">
												{item.errorMessage}
											</div>
										)}
										<div className="mt-2 h-1.5 w-full rounded-full bg-muted">
											<div
												className={
													item.status === "complete"
														? "h-1.5 w-full rounded-full bg-emerald-500"
														: item.status === "error"
															? "h-1.5 w-1/3 rounded-full bg-destructive"
															: "h-1.5 w-1/2 rounded-full bg-blue-500 animate-pulse"
												}
											/>
										</div>
									</div>
								))}
							</div>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Quick Tips</CardTitle>
				</CardHeader>
				<CardContent className="space-y-2 text-sm text-muted-foreground">
					<p>
						• <strong>Be specific:</strong> Include details like pricing,
						services, and processes
					</p>
					<p>
						• <strong>Use natural language:</strong> Write as if explaining to a
						customer
					</p>
					<p>
						• <strong>Add both languages:</strong> Create English and Spanish
						versions for bilingual support
					</p>
					<p>
						• <strong>Update regularly:</strong> Keep information current as
						your services evolve
					</p>
				</CardContent>
			</Card>
		</div>
	);
}
