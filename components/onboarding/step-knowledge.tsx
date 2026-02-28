"use client";

import { useState } from "react";
import {
	FileText,
	Globe,
	Loader2,
	Type,
	CheckCircle2,
	Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "@/components/ui/card";
import type { OnboardingStrings } from "./types";

type KnowledgeMode = null | "website" | "pdf" | "text";
type UploadStatus = "idle" | "loading" | "success" | "error";

interface StepKnowledgeProps {
	onKnowledgeAdded: () => void;
	t: OnboardingStrings;
}

/**
 * Map an API error code to a translated string.
 * Falls back to a generic translated error if the code is unknown.
 */
function getErrorMessage(
	errorCode: string | undefined,
	fallbackMessage: string,
	t: OnboardingStrings,
): string {
	const errorMap: Record<string, string> = {
		URL_REQUIRED: t.errorUrlRequired,
		INVALID_URL: t.errorInvalidUrl,
		NO_SITEMAP_FOUND: t.errorNoSitemap,
		EMPTY_SITEMAP: t.errorEmptySitemap,
		INGESTION_FAILED: t.errorIngestionFailed,
		INGESTION_TIMEOUT: t.errorTimeout,
	};
	return errorMap[errorCode || ""] || fallbackMessage;
}

interface ImportResult {
	pagesProcessed?: number;
	chunksCreated?: number;
}

export function StepKnowledge({ onKnowledgeAdded, t }: StepKnowledgeProps) {
	const [mode, setMode] = useState<KnowledgeMode>(null);
	const [status, setStatus] = useState<UploadStatus>("idle");
	const [errorMsg, setErrorMsg] = useState("");
	const [importResult, setImportResult] = useState<ImportResult | null>(null);

	// Website fields
	const [websiteUrl, setWebsiteUrl] = useState("");

	// Text fields
	const [textContent, setTextContent] = useState("");

	// PDF fields
	const [pdfFile, setPdfFile] = useState<File | null>(null);

	const handleWebsiteImport = async () => {
		if (!websiteUrl.trim()) return;
		setStatus("loading");
		setErrorMsg("");
		setImportResult(null);
		try {
			const res = await fetch("/api/admin/knowledge/ingest", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ sitemapUrl: websiteUrl.trim() }),
			});
			const data = await res.json();
			if (!res.ok) {
				throw { code: data.error, message: data.message || "Import failed" };
			}
			setStatus("success");
			setImportResult({
				pagesProcessed: data.pagesProcessed,
				chunksCreated: data.chunksCreated,
			});
			onKnowledgeAdded();
		} catch (err: any) {
			setStatus("error");
			if (err.code) {
				setErrorMsg(getErrorMessage(err.code, err.message, t));
			} else {
				setErrorMsg(
					getErrorMessage(undefined, t.errorIngestionFailed, t),
				);
			}
		}
	};

	const handlePdfUpload = async () => {
		if (!pdfFile) return;
		setStatus("loading");
		setErrorMsg("");
		try {
			const formData = new FormData();
			formData.append("file", pdfFile);
			formData.append("type", "general");
			formData.append("language", "en");

			const res = await fetch("/api/admin/knowledge/pdf", {
				method: "POST",
				body: formData,
			});
			if (!res.ok) {
				throw new Error("UPLOAD_FAILED");
			}
			setStatus("success");
			onKnowledgeAdded();
		} catch {
			setStatus("error");
			setErrorMsg(t.errorUploadFailed);
		}
	};

	const handleTextSubmit = async () => {
		if (!textContent.trim()) return;
		setStatus("loading");
		setErrorMsg("");
		try {
			const res = await fetch("/api/admin/knowledge", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content: textContent.trim(),
					metadata: { type: "general", language: "en" },
				}),
			});
			if (!res.ok) {
				throw new Error("ADD_FAILED");
			}
			setStatus("success");
			onKnowledgeAdded();
		} catch {
			setStatus("error");
			setErrorMsg(t.errorAddFailed);
		}
	};

	// Success state
	if (status === "success") {
		const detail =
			importResult?.pagesProcessed != null
				? t.contentAddedDetail
						.replace("{pages}", String(importResult.pagesProcessed))
						.replace("{chunks}", String(importResult.chunksCreated || 0))
				: "";

		return (
			<Card>
				<CardContent className="flex flex-col items-center justify-center py-12 gap-4">
					<CheckCircle2 className="w-12 h-12 text-green-500" />
					<p className="text-lg font-medium">{t.contentAdded}</p>
					{detail && (
						<p className="text-sm text-muted-foreground">{detail}</p>
					)}
				</CardContent>
			</Card>
		);
	}

	// Mode selection
	if (!mode) {
		return (
			<Card>
				<CardHeader className="text-center">
					<CardTitle className="text-2xl">{t.knowledgeTitle}</CardTitle>
					<CardDescription className="text-base">
						{t.knowledgeSubtitle}
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-3 max-w-md mx-auto">
					<button
						type="button"
						onClick={() => setMode("website")}
						className="w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
					>
						<Globe className="w-6 h-6 mt-0.5 text-primary flex-shrink-0" />
						<div>
							<p className="font-medium">{t.knowledgeWebsite}</p>
							<p className="text-sm text-muted-foreground">
								{t.knowledgeWebsiteDesc}
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => setMode("pdf")}
						className="w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
					>
						<FileText className="w-6 h-6 mt-0.5 text-primary flex-shrink-0" />
						<div>
							<p className="font-medium">{t.knowledgePdf}</p>
							<p className="text-sm text-muted-foreground">
								{t.knowledgePdfDesc}
							</p>
						</div>
					</button>

					<button
						type="button"
						onClick={() => setMode("text")}
						className="w-full flex items-start gap-4 p-4 rounded-lg border hover:bg-accent transition-colors text-left"
					>
						<Type className="w-6 h-6 mt-0.5 text-primary flex-shrink-0" />
						<div>
							<p className="font-medium">{t.knowledgeText}</p>
							<p className="text-sm text-muted-foreground">
								{t.knowledgeTextDesc}
							</p>
						</div>
					</button>
				</CardContent>
			</Card>
		);
	}

	// Active mode form
	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-xl flex items-center gap-2">
					<Button
						variant="ghost"
						size="sm"
						onClick={() => {
							setMode(null);
							setStatus("idle");
							setErrorMsg("");
						}}
					>
						&larr;
					</Button>
					{mode === "website" && t.knowledgeWebsite}
					{mode === "pdf" && t.knowledgePdf}
					{mode === "text" && t.knowledgeText}
				</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{mode === "website" && (
					<>
						<div className="space-y-2">
							<Input
								type="text"
								value={websiteUrl}
								onChange={(e) => setWebsiteUrl(e.target.value)}
								placeholder={t.websiteUrlPlaceholder}
								disabled={status === "loading"}
								onKeyDown={(e) => {
									if (e.key === "Enter" && websiteUrl.trim()) {
										handleWebsiteImport();
									}
								}}
							/>
							<p className="text-xs text-muted-foreground">
								{t.websiteUrlHelp}
							</p>
						</div>
						<Button
							onClick={handleWebsiteImport}
							disabled={!websiteUrl.trim() || status === "loading"}
							className="w-full"
						>
							{status === "loading" ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									{t.importingDetail}
								</>
							) : (
								<>
									<Globe className="w-4 h-4 mr-2" />
									{t.importWebsite}
								</>
							)}
						</Button>
					</>
				)}

				{mode === "pdf" && (
					<>
						<div className="border-2 border-dashed rounded-lg p-6 text-center">
							<input
								type="file"
								accept=".pdf"
								onChange={(e) => setPdfFile(e.target.files?.[0] ?? null)}
								className="hidden"
								id="pdf-upload"
								disabled={status === "loading"}
							/>
							<label
								htmlFor="pdf-upload"
								className="cursor-pointer flex flex-col items-center gap-2"
							>
								<Upload className="w-8 h-8 text-muted-foreground" />
								{pdfFile ? (
									<p className="font-medium">{pdfFile.name}</p>
								) : (
									<p className="text-muted-foreground">
										{t.selectPdf}
									</p>
								)}
							</label>
						</div>
						<Button
							onClick={handlePdfUpload}
							disabled={!pdfFile || status === "loading"}
							className="w-full"
						>
							{status === "loading" ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									{t.uploading}
								</>
							) : (
								<>
									<FileText className="w-4 h-4 mr-2" />
									{t.knowledgePdf}
								</>
							)}
						</Button>
					</>
				)}

				{mode === "text" && (
					<>
						<Textarea
							value={textContent}
							onChange={(e) => setTextContent(e.target.value)}
							placeholder={t.textContentPlaceholder}
							rows={8}
							disabled={status === "loading"}
						/>
						<Button
							onClick={handleTextSubmit}
							disabled={!textContent.trim() || status === "loading"}
							className="w-full"
						>
							{status === "loading" ? (
								<>
									<Loader2 className="w-4 h-4 mr-2 animate-spin" />
									{t.processing}
								</>
							) : (
								<>
									<Type className="w-4 h-4 mr-2" />
									{t.knowledgeText}
								</>
							)}
						</Button>
					</>
				)}

				{status === "error" && errorMsg && (
					<p className="text-sm text-destructive">{errorMsg}</p>
				)}
			</CardContent>
		</Card>
	);
}
