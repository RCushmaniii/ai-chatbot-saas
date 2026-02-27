export default function OnboardingLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<div className="min-h-dvh bg-background flex flex-col">
			{/* Header */}
			<header className="border-b px-6 py-4">
				<div className="max-w-3xl mx-auto flex items-center justify-between">
					<span className="text-xl font-bold tracking-tight">Converso</span>
				</div>
			</header>

			{/* Content */}
			<main className="flex-1 px-4 py-8">
				<div className="max-w-3xl mx-auto">{children}</div>
			</main>
		</div>
	);
}
