import Script from "next/script";
import { Brain, Target, Calendar, Zap, MessageSquare, TrendingUp, ArrowRight, Check } from "lucide-react";

export default function SaaSDemoPage() {
  return (
    <>
      <div className="min-h-screen bg-linear-to-b from-slate-50 via-white to-slate-50">
        {/* Navigation */}
        <header className="bg-white/80 backdrop-blur-md shadow-sm sticky top-0 z-50 border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center">
                  <MessageSquare className="h-6 w-6 text-white" />
                </div>
                <span className="text-2xl font-bold text-slate-900">AI Chat Solutions</span>
              </div>
              <nav className="hidden md:flex space-x-8">
                <a href="#features" className="text-slate-700 hover:text-indigo-600 font-medium transition-colors">Features</a>
                <a href="#demo" className="text-slate-700 hover:text-indigo-600 font-medium transition-colors">Live Demo</a>
                <a href="#pricing" className="text-slate-700 hover:text-indigo-600 font-medium transition-colors">Pricing</a>
              </nav>
              <button className="bg-white text-indigo-600 px-6 py-2.5 rounded-xl hover:bg-slate-50 transition-all font-semibold border-2 border-indigo-600 hover:border-indigo-700">
                Get Your Bot
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <section className="py-20 md:py-32 px-4 sm:px-6 lg:px-8">
          <div className="max-w-7xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-indigo-100">
              <Zap className="h-4 w-4" />
              <span>24/7 Lead Generation on Autopilot</span>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-slate-900 mb-6 leading-tight tracking-tight">
              Stop Losing Website Visitors.<br />
              <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                Start Capturing Leads 24/7.
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-slate-600 mb-12 max-w-3xl mx-auto leading-relaxed">
              Turn passive traffic into booked meetings. Our AI learns your entire website in minutes 
              to answer questions, qualify leads, and fill your calendar—while you sleep.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <a href="#demo" className="group bg-indigo-600 text-white px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all font-semibold text-lg shadow-lg hover:shadow-xl flex items-center gap-3 scroll-smooth">
                Test Live Demo
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="group-hover:translate-y-1 transition-transform">
                  <path d="M12 5v14M19 12l-7 7-7-7"/>
                </svg>
              </a>
              <button className="bg-white text-slate-700 px-8 py-4 rounded-xl hover:bg-slate-50 transition-all font-semibold text-lg border-2 border-slate-200 hover:border-slate-300">
                View Features
              </button>
            </div>
            
            {/* Stats */}
            <div className="mt-20 grid grid-cols-3 gap-8 max-w-3xl mx-auto">
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">10min</div>
                <div className="text-slate-500 font-medium">Setup Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">Zero</div>
                <div className="text-slate-500 font-medium">Wait Time</div>
              </div>
              <div>
                <div className="text-4xl font-bold text-indigo-600 mb-2">Higher</div>
                <div className="text-slate-500 font-medium">Conversion</div>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities Section */}
        <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-white">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-20">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-6">What This Bot Can Do</h2>
              <p className="text-xl text-slate-600 max-w-2xl mx-auto">
                See the capabilities in action with our live demo below
              </p>
            </div>
            
            <div className="grid md:grid-cols-3 gap-8">
              {/* Card 1 */}
              <div className="group bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Brain className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Learns Your Business Instantly</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Upload your website content (just like we did with NY English Teacher). 
                  The bot learns your pricing, services, and bio in minutes.
                </p>
              </div>

              {/* Card 2 */}
              <div className="group bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Qualifies Leads on Autopilot</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  The bot asks the right questions to screen potential clients before they 
                  ever reach your calendar.
                </p>
              </div>

              {/* Card 3 */}
              <div className="group bg-white p-8 rounded-2xl border-2 border-slate-200 hover:border-indigo-400 hover:shadow-2xl transition-all duration-300 hover:-translate-y-2">
                <div className="w-16 h-16 bg-linear-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform shadow-lg">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-4">Books Meetings Directly</h3>
                <p className="text-slate-600 leading-relaxed text-lg">
                  Seamlessly guide visitors from "Just browsing" to "Booked Consultation" 
                  with direct calendar links.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Live Demo Context Section */}
        <section id="demo" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900 text-white">
          <div className="max-w-7xl mx-auto">
            <div className="grid md:grid-cols-2 gap-16 items-center">
              <div>
                <div className="inline-flex items-center gap-2 bg-indigo-500/20 text-indigo-300 px-4 py-2 rounded-full text-sm font-semibold mb-8 border border-indigo-500/30">
                  <TrendingUp className="h-4 w-4" />
                  <span>Live Demo</span>
                </div>
                <h2 className="text-4xl md:text-5xl font-bold mb-6 leading-tight">
                  Real-World Example:<br />
                  The English Coach
                </h2>
                <p className="text-slate-300 text-lg mb-10 leading-relaxed">
                  We fed this bot the website of a real New York English teacher. In less than 10 minutes, 
                  it learned his pricing, teaching style, and biography. Go ahead—try to stump it.
                </p>
                
                <div className="space-y-5 mb-10">
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-slate-300 text-lg">
                      Ask: <span className="text-white font-bold">"How much do lessons cost?"</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-slate-300 text-lg">
                      Ask: <span className="text-white font-bold">"Can you help me with a job interview?"</span>
                    </p>
                  </div>
                  <div className="flex items-start gap-4">
                    <div className="w-7 h-7 bg-indigo-500 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                      <Check className="h-4 w-4 text-white" />
                    </div>
                    <p className="text-slate-300 text-lg">
                      Ask: <span className="text-white font-bold">"Why should I hire Robert?"</span>
                    </p>
                  </div>
                </div>

                <div className="bg-slate-800/50 backdrop-blur-sm p-6 rounded-2xl border border-slate-700">
                  <p className="text-sm text-slate-400 mb-2 font-medium">AI Persona</p>
                  <p className="text-white font-bold text-xl mb-1">Robert Cushman</p>
                  <p className="text-indigo-300 font-medium">NY English Teacher</p>
                  <p className="text-slate-400 text-sm mt-3">Trained on 50+ pages of content</p>
                </div>
              </div>

              {/* Visual Element */}
              <div className="relative">
                <div className="bg-linear-to-br from-indigo-500 to-purple-600 rounded-3xl p-1">
                  <div className="bg-slate-900 rounded-3xl p-8">
                    <div className="bg-slate-800 rounded-2xl p-6 mb-4">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-indigo-500 rounded-full flex items-center justify-center">
                          <MessageSquare className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <div className="text-white font-semibold">AI Assistant</div>
                          <div className="text-slate-400 text-sm">Always online</div>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-slate-700/50 rounded-lg p-3 text-slate-300 text-sm">
                          What are the prices for classes?
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-slate-300 text-sm">
                          How do I book a session?
                        </div>
                        <div className="bg-slate-700/50 rounded-lg p-3 text-slate-300 text-sm">
                          What services do you offer?
                        </div>
                      </div>
                    </div>
                    <div className="text-center">
                      <p className="text-indigo-400 font-bold text-base">
                        👉 Click the chat bubble to try it live
                      </p>
                    </div>
                  </div>
                </div>
                {/* Glow effect */}
                <div className="absolute inset-0 bg-linear-to-br from-indigo-500/20 to-purple-600/20 rounded-3xl blur-3xl -z-10"></div>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-4 sm:px-6 lg:px-8 bg-linear-to-br from-indigo-600 to-purple-700">
          <div className="max-w-4xl mx-auto text-center text-white">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Ready to Turn Your Website Into a Sales Machine?
            </h2>
            <p className="text-xl text-indigo-100 mb-10 leading-relaxed">
              No coding required. Just paste your URL, and your AI sales rep is ready to work.
            </p>
            <button className="bg-white text-indigo-600 px-10 py-5 rounded-xl hover:bg-slate-50 transition-all font-bold text-xl shadow-2xl hover:shadow-3xl hover:scale-105">
              Build My Chatbot Now
            </button>
            <p className="text-indigo-200 mt-6 text-sm">No credit card required • 14-day free trial</p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-slate-900 text-white py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <p className="text-slate-400">© 2025 AI Chat Solutions. All rights reserved.</p>
          </div>
        </footer>
      </div>

      {/* Embed Widget Script */}
      <Script
        src="/api/embed?v=6"
        id="demo-bot"
        strategy="afterInteractive"
        data-welcome-message="👋 Hi! I'm the AI Assistant for NY English Teacher. I can answer questions about pricing, services, or help you book a free consultation. Try asking me: 'How much are classes?'"
        data-language="en"
        data-button-color="#4f46e5"
        data-position="bottom-right"
        data-open="false"
        data-show-welcome-message="true"
      />
    </>
  );
}
