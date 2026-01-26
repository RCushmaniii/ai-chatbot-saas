import Script from "next/script";

export default function DemoEmbedPage() {
	return (
		<>
			<div className="min-h-screen bg-linear-to-b from-blue-50 to-white">
				{/* Header */}
				<header className="bg-white shadow-sm">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
						<div className="flex items-center justify-between">
							<h1 className="text-3xl font-bold text-blue-600">
								NY English Teacher
							</h1>
							<nav className="hidden md:flex space-x-8">
								<a
									href="#services"
									className="text-gray-700 hover:text-blue-600"
								>
									Services
								</a>
								<a href="#about" className="text-gray-700 hover:text-blue-600">
									About
								</a>
								<a
									href="#contact"
									className="text-gray-700 hover:text-blue-600"
								>
									Contact
								</a>
							</nav>
						</div>
					</div>
				</header>

				{/* Hero Section */}
				<section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
					<div className="text-center">
						<h2 className="text-5xl font-bold text-gray-900 mb-6">
							Master English for Your Startup Journey
						</h2>
						<p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
							Personalized English coaching for startup founders. Perfect your
							pitch, communicate with investors, and lead your team with
							confidence.
						</p>
						<div className="flex justify-center gap-4">
							<button
								type="button"
								className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-blue-700 transition"
							>
								Get Started
							</button>
							<button
								type="button"
								className="border-2 border-blue-600 text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
							>
								Learn More
							</button>
						</div>
					</div>
				</section>

				{/* Services Section */}
				<section id="services" className="bg-white py-20">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<h3 className="text-3xl font-bold text-center text-gray-900 mb-12">
							Our Services
						</h3>
						<div className="grid md:grid-cols-3 gap-8">
							<div className="p-6 border rounded-lg hover:shadow-lg transition">
								<div className="text-4xl mb-4">🚀</div>
								<h4 className="text-xl font-semibold mb-2">Startup Founders</h4>
								<p className="text-gray-600">
									Perfect your pitch and communicate effectively with investors
									and teams.
								</p>
							</div>
							<div className="p-6 border rounded-lg hover:shadow-lg transition">
								<div className="text-4xl mb-4">💼</div>
								<h4 className="text-xl font-semibold mb-2">Business English</h4>
								<p className="text-gray-600">
									Professional communication skills for meetings, presentations,
									and negotiations.
								</p>
							</div>
							<div className="p-6 border rounded-lg hover:shadow-lg transition">
								<div className="text-4xl mb-4">🎯</div>
								<h4 className="text-xl font-semibold mb-2">1-on-1 Coaching</h4>
								<p className="text-gray-600">
									Personalized lessons tailored to your specific goals and
									challenges.
								</p>
							</div>
						</div>
					</div>
				</section>

				{/* About Section */}
				<section id="about" className="py-20">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
						<div className="grid md:grid-cols-2 gap-12 items-center">
							<div>
								<h3 className="text-3xl font-bold text-gray-900 mb-6">
									Why Choose NY English Teacher?
								</h3>
								<p className="text-gray-600 mb-4">
									With over 10 years of experience coaching startup founders and
									business professionals, I understand the unique challenges you
									face when communicating in English.
								</p>
								<p className="text-gray-600 mb-4">
									My personalized approach focuses on your specific needs,
									whether it's perfecting your investor pitch, leading team
									meetings, or negotiating deals.
								</p>
								<ul className="space-y-2">
									<li className="flex items-center text-gray-700">
										<span className="text-green-500 mr-2">✓</span>
										Flexible scheduling
									</li>
									<li className="flex items-center text-gray-700">
										<span className="text-green-500 mr-2">✓</span>
										Real-world business scenarios
									</li>
									<li className="flex items-center text-gray-700">
										<span className="text-green-500 mr-2">✓</span>
										Proven results with 100+ founders
									</li>
								</ul>
							</div>
							<div className="bg-blue-100 rounded-lg p-8 text-center">
								<p className="text-6xl mb-4">👨‍🏫</p>
								<h4 className="text-2xl font-bold text-gray-900 mb-2">
									Robert Cushman
								</h4>
								<p className="text-gray-600">English Coach & Startup Mentor</p>
							</div>
						</div>
					</div>
				</section>

				{/* CTA Section */}
				<section id="contact" className="bg-blue-600 py-20">
					<div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
						<h3 className="text-4xl font-bold text-white mb-6">
							Ready to Improve Your English?
						</h3>
						<p className="text-xl text-blue-100 mb-8">
							Book a free consultation and let's discuss your goals.
						</p>
						<button
							type="button"
							className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
						>
							Schedule Free Consultation
						</button>
					</div>
				</section>

				{/* Footer */}
				<footer className="bg-gray-900 text-white py-12">
					<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
						<p className="text-gray-400">
							© 2025 NY English Teacher. All rights reserved.
						</p>
					</div>
				</footer>
			</div>

			{/* Embed Widget Script */}
			<Script
				src="/api/embed?v=3"
				id="demo-bot"
				strategy="afterInteractive"
				data-welcome-message="👋 Hey... ask your questions here!"
				data-language="en"
				data-button-color="#1c4992"
				data-position="bottom-right"
				data-open="false"
				data-show-welcome-message="true"
			/>
		</>
	);
}
