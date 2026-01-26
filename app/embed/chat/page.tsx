"use client";

import { nanoid } from "nanoid";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";

function EmbedChatContent() {
	const _searchParams = useSearchParams();
	const [embedSettings, setEmbedSettings] = useState<any>(null);
	const [_isLoadingSettings, setIsLoadingSettings] = useState(true);

	// Fetch embed settings from admin
	useEffect(() => {
		fetch("/api/embed/settings")
			.then((res) => res.json())
			.then((data) => {
				setEmbedSettings(data);
				setIsLoadingSettings(false);
			})
			.catch((err) => {
				console.error("Failed to load embed settings:", err);
				setIsLoadingSettings(false);
			});
	}, []);

	const placeholder = embedSettings?.placeholder || "Type your message...";
	const botIcon = embedSettings?.botIcon || "🎓";
	const suggestedQuestions = embedSettings?.suggestedQuestions || [
		"What are the prices for classes?",
		"What services do you offer?",
		"How do I book a session?",
	];

	const [messages, setMessages] = useState<
		Array<{ role: string; content: string }>
	>([]);
	const [input, setInput] = useState("");
	const [isLoading, setIsLoading] = useState(false);
	const messagesEndRef = useRef<HTMLDivElement>(null);
	const chatId = useRef(nanoid());

	const scrollToBottom = () => {
		messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
	};

	useEffect(() => {
		scrollToBottom();
	}, [scrollToBottom]);

	const handleClose = () => {
		window.parent.postMessage("close-chat", "*");
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (!input.trim() || isLoading) return;

		const userMessage = input.trim();
		setInput("");
		setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
		setIsLoading(true);

		try {
			const response = await fetch("/api/embed/chat", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					chatId: chatId.current,
					message: userMessage,
				}),
			});

			if (!response.ok) throw new Error("Failed to send message");

			const data = await response.json();
			setMessages((prev) => [
				...prev,
				{ role: "assistant", content: data.response },
			]);
		} catch (error) {
			console.error("Error:", error);
			setMessages((prev) => [
				...prev,
				{
					role: "assistant",
					content: "Sorry, I encountered an error. Please try again.",
				},
			]);
		} finally {
			setIsLoading(false);
		}
	};

	return (
		<div className="flex flex-col h-screen bg-white">
			{/* Header */}
			<div className="flex items-center justify-between p-4 border-b bg-white shadow-sm">
				<div className="flex items-center gap-3">
					<div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-2xl">
						{botIcon}
					</div>
					<h1 className="text-lg font-semibold text-gray-900">
						NY English Teacher
					</h1>
				</div>
				<button
					type="button"
					onClick={handleClose}
					className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500 hover:text-gray-700"
					aria-label="Close chat"
				>
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="20"
						height="20"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						strokeWidth="2"
						strokeLinecap="round"
						strokeLinejoin="round"
					>
						<path d="M18 6 6 18" />
						<path d="m6 6 12 12" />
					</svg>
				</button>
			</div>

			{/* Messages */}
			<div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
				{messages.length === 0 && (
					<div className="flex flex-col items-center justify-center h-full space-y-4 px-4">
						<div className="text-center mb-6">
							<h2 className="text-xl font-semibold text-gray-800 mb-2">
								Welcome! 👋
							</h2>
							<p className="text-gray-600">How can I help you today?</p>
						</div>
						<div className="w-full max-w-md space-y-2">
							<p className="text-sm font-medium text-gray-700 mb-3">
								Quick questions:
							</p>
							{suggestedQuestions.map((question: string, idx: number) => (
								<button
									type="button"
									key={idx}
									onClick={() => setInput(question)}
									className="w-full text-left px-4 py-3 bg-white border border-gray-200 rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all text-sm text-gray-700 hover:text-blue-700"
								>
									{question}
								</button>
							))}
						</div>
					</div>
				)}
				{messages.map((msg, idx) => (
					<div
						key={idx}
						className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
					>
						<div
							className={`max-w-[85%] rounded-2xl px-4 py-3 shadow-sm wrap-break-word ${
								msg.role === "user"
									? "bg-blue-600"
									: "bg-white border border-gray-200"
							}`}
							style={
								msg.role === "user"
									? {
											color: "#ffffff",
											wordBreak: "break-word",
											overflowWrap: "break-word",
										}
									: { wordBreak: "break-word", overflowWrap: "break-word" }
							}
						>
							<div className="text-sm leading-relaxed">
								<ReactMarkdown
									components={{
										p: ({ children }) => (
											<p
												className="mb-2 last:mb-0 wrap-break-word"
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</p>
										),
										strong: ({ children }) => (
											<strong
												className="font-semibold wrap-break-word"
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</strong>
										),
										a: ({ href, children }) => (
											<a
												href={href}
												target="_blank"
												rel="noopener noreferrer"
												className={
													msg.role === "user"
														? "underline hover:opacity-80 break-all"
														: "text-blue-600 hover:underline break-all"
												}
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</a>
										),
										ul: ({ children }) => (
											<ul
												className="list-disc pl-4 mb-2"
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</ul>
										),
										ol: ({ children }) => (
											<ol
												className="list-decimal pl-4 mb-2"
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</ol>
										),
										li: ({ children }) => (
											<li
												className="mb-1"
												style={msg.role === "user" ? { color: "#ffffff" } : {}}
											>
												{children}
											</li>
										),
									}}
								>
									{msg.content}
								</ReactMarkdown>
							</div>
						</div>
					</div>
				))}
				{isLoading && (
					<div className="flex justify-start">
						<div className="bg-gray-100 rounded-lg px-4 py-2">
							<div className="flex space-x-2">
								<div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: "0.1s" }}
								></div>
								<div
									className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
									style={{ animationDelay: "0.2s" }}
								></div>
							</div>
						</div>
					</div>
				)}
				<div ref={messagesEndRef} />
			</div>

			{/* Input */}
			<form onSubmit={handleSubmit} className="p-4 border-t bg-white shadow-lg">
				<div className="flex gap-3">
					<input
						type="text"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						placeholder={placeholder}
						className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-gray-900 placeholder-gray-400 bg-white"
						disabled={isLoading}
					/>
					<button
						type="submit"
						disabled={isLoading || !input.trim()}
						className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-medium shadow-sm hover:shadow-md"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							strokeWidth="2"
							strokeLinecap="round"
							strokeLinejoin="round"
							className="inline-block"
						>
							<path d="m22 2-7 20-4-9-9-4Z" />
							<path d="M22 2 11 13" />
						</svg>
					</button>
				</div>
			</form>
		</div>
	);
}

export default function EmbedChatPage() {
	return (
		<Suspense
			fallback={
				<div className="flex items-center justify-center h-screen">
					Loading...
				</div>
			}
		>
			<EmbedChatContent />
		</Suspense>
	);
}
