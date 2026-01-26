"use client";

import { BookOpen, Menu, X } from "lucide-react";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

type Doc = {
	slug: string;
	title: string;
	content: string;
	filename: string;
};

type DocumentationProps = {
	docs: Doc[];
};

export function Documentation({ docs }: DocumentationProps) {
	const [selectedDoc, setSelectedDoc] = useState(docs[0]?.slug || "");
	const [sidebarOpen, setSidebarOpen] = useState(false);

	const currentDoc = docs.find((doc) => doc.slug === selectedDoc) || docs[0];

	return (
		<div className="flex h-[calc(100vh-4rem)] w-full">
			{/* Mobile Menu Button */}
			<Button
				variant="ghost"
				size="icon"
				className="fixed top-4 left-4 z-50 md:hidden"
				onClick={() => setSidebarOpen(!sidebarOpen)}
			>
				{sidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
			</Button>

			{/* Sidebar */}
			<aside
				className={`
          fixed md:relative inset-y-0 left-0 z-40
          w-64 border-r bg-background
          transform transition-transform duration-200 ease-in-out
          ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}
          md:translate-x-0
        `}
			>
				<div className="flex h-full flex-col">
					<div className="flex items-center gap-2 border-b p-4">
						<BookOpen className="h-5 w-5" />
						<h2 className="font-semibold">Documentation</h2>
					</div>
					<ScrollArea className="flex-1 p-4">
						<nav className="space-y-1">
							{docs.map((doc) => (
								<Button
									key={doc.slug}
									variant={selectedDoc === doc.slug ? "secondary" : "ghost"}
									className="w-full justify-start text-left"
									onClick={() => {
										setSelectedDoc(doc.slug);
										setSidebarOpen(false);
									}}
								>
									{doc.title}
								</Button>
							))}
						</nav>
					</ScrollArea>
				</div>
			</aside>

			{/* Overlay for mobile */}
			{sidebarOpen && (
				<div
					className="fixed inset-0 z-30 bg-black/50 md:hidden"
					onClick={() => setSidebarOpen(false)}
				/>
			)}

			{/* Main Content */}
			<main className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="container max-w-4xl py-8 px-4 md:px-8">
						{currentDoc ? (
							<Card>
								<CardHeader>
									<CardTitle className="text-3xl">{currentDoc.title}</CardTitle>
								</CardHeader>
								<CardContent>
									<article className="prose prose-slate dark:prose-invert max-w-none">
										<ReactMarkdown
											components={{
												// Style code blocks
												code: ({ className, children, ...props }) => {
													const isInline = !className?.includes("language-");
													return isInline ? (
														<code
															className="rounded bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 font-mono text-sm text-slate-900 dark:text-slate-100"
															{...props}
														>
															{children}
														</code>
													) : (
														<code
															className={`block rounded-lg bg-slate-900 dark:bg-slate-950 p-4 font-mono text-sm text-slate-100 dark:text-slate-200 overflow-x-auto ${className}`}
															{...props}
														>
															{children}
														</code>
													);
												},
												// Style links
												a: ({ node, children, ...props }) => (
													<a
														className="text-primary hover:underline"
														target={
															props.href?.startsWith("http")
																? "_blank"
																: undefined
														}
														rel={
															props.href?.startsWith("http")
																? "noopener noreferrer"
																: undefined
														}
														{...props}
													>
														{children}
													</a>
												),
												// Style tables
												table: ({ node, children, ...props }) => (
													<div className="my-6 w-full overflow-x-auto">
														<table
															className="w-full border-collapse"
															{...props}
														>
															{children}
														</table>
													</div>
												),
												th: ({ node, children, ...props }) => (
													<th
														className="border border-border bg-muted px-4 py-2 text-left font-semibold"
														{...props}
													>
														{children}
													</th>
												),
												td: ({ node, children, ...props }) => (
													<td
														className="border border-border px-4 py-2"
														{...props}
													>
														{children}
													</td>
												),
											}}
										>
											{currentDoc.content}
										</ReactMarkdown>
									</article>
								</CardContent>
							</Card>
						) : (
							<Card>
								<CardContent className="py-12 text-center">
									<p className="text-muted-foreground">
										No documentation available.
									</p>
								</CardContent>
							</Card>
						)}
					</div>
				</ScrollArea>
			</main>
		</div>
	);
}
