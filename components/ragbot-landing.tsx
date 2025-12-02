"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

// Minimal icons as inline SVG
const CheckIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export function RagbotLandingPage() {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [activeTab, setActiveTab] = useState("support");
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(false);
  const [demoStep, setDemoStep] = useState(0);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Detect reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Flashlight cursor effect
  useEffect(() => {
    if (prefersReducedMotion) return;
    
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [prefersReducedMotion]);

  // Demo widget animation
  useEffect(() => {
    const interval = setInterval(() => {
      setDemoStep((prev) => (prev + 1) % 4);
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const demoQuestions = [
    "What's our PTO policy?",
    "How do I reset my password?",
    "What are the Q4 sales targets?"
  ];

  const demoAnswer = "Based on HR_Policy.pdf §3.2, full-time employees receive 15 days of PTO annually, accruing at 1.25 days per month.";

  return (
    <div className="relative min-h-screen bg-black text-white overflow-x-hidden">
      {/* Grain overlay */}
      <div className="fixed inset-0 opacity-[0.015] pointer-events-none z-50" 
           style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 200 200\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'noiseFilter\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.9\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23noiseFilter)\'/%3E%3C/svg%3E")' }} 
      />

      {/* Flashlight cursor effect */}
      {!prefersReducedMotion && (
        <div
          className="fixed pointer-events-none z-40 transition-opacity duration-300"
          style={{
            left: mousePosition.x,
            top: mousePosition.y,
            width: "600px",
            height: "600px",
            transform: "translate(-50%, -50%)",
            background: `radial-gradient(circle, rgba(255, 90, 31, 0.08) 0%, transparent 70%)`,
          }}
        />
      )}

      {/* Sticky Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-white/10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/home" className="flex items-center gap-3 group">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5F] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="text-xl font-bold tracking-tight">RAGBOT</span>
            </Link>

            {/* Center Nav */}
            <div className="hidden lg:flex items-center gap-8 text-sm font-medium tracking-wide">
              <a href="#product" className="text-white/70 hover:text-white transition-colors">PRODUCT</a>
              <a href="#how-it-works" className="text-white/70 hover:text-white transition-colors">HOW IT WORKS</a>
              <a href="#use-cases" className="text-white/70 hover:text-white transition-colors">USE CASES</a>
              <a href="#pricing" className="text-white/70 hover:text-white transition-colors">PRICING</a>
              <a href="#security" className="text-white/70 hover:text-white transition-colors">SECURITY</a>
              <a href="#faq" className="text-white/70 hover:text-white transition-colors">FAQ</a>
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-4">
              <Link 
                href="/demo" 
                className="hidden sm:block text-sm font-medium text-white/70 hover:text-white transition-colors tracking-wide"
              >
                BOOK A DEMO
              </Link>
              <Link 
                href="/register" 
                className="relative px-6 py-2.5 bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5F] rounded-lg text-sm font-bold tracking-wide overflow-hidden group"
              >
                <span className="relative z-10">START FREE</span>
                <div className="absolute inset-0 bg-gradient-to-r from-[#FF8A5F] to-[#FF5A1F] opacity-0 group-hover:opacity-100 transition-opacity" />
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-24 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <h1 className="text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 tracking-tight">
                Answers from your docs.
                <br />
                <span className="text-[#FF5A1F]">Instantly.</span>
                <br />
                With citations.
              </h1>
              
              <p className="text-xl text-white/70 mb-4 leading-relaxed max-w-xl">
                Deploy an AI assistant trained on your knowledge base. 
                Accurate answers. Source transparency. Enterprise-grade security.
              </p>

              <p className="text-sm text-white/50 mb-10 max-w-xl">
                Permissions-aware RAG for customer support, sales enablement, and internal teams.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <Link 
                  href="/register" 
                  className="px-8 py-4 bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5F] rounded-lg font-bold text-lg hover:shadow-[0_0_30px_rgba(255,90,31,0.3)] transition-all"
                >
                  Start free
                </Link>
                <Link 
                  href="/demo" 
                  className="px-8 py-4 border-2 border-white/20 rounded-lg font-bold text-lg hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all"
                >
                  Book a demo
                </Link>
              </div>

              {/* Trust bar */}
              <div className="border-t border-white/10 pt-8">
                <p className="text-xs text-white/40 mb-4 tracking-widest">TRUSTED BY</p>
                <div className="flex items-center gap-8 opacity-40">
                  <div className="text-sm font-bold">ACME CORP</div>
                  <div className="text-sm font-bold">TECHSTART</div>
                  <div className="text-sm font-bold">GLOBEX</div>
                  <div className="text-sm font-bold">INITECH</div>
                  <div className="text-sm font-bold">HOOLI</div>
                </div>
              </div>
            </div>

            {/* Right: Interactive Demo Widget */}
            <div className="relative">
              <div className="bg-gradient-to-br from-white/5 to-white/[0.02] border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                {/* Demo header */}
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-[#FF5A1F] animate-pulse" />
                    <span className="text-xs text-white/50 tracking-wide">RAG MODE: ON • SOURCES SHOWN</span>
                  </div>
                </div>

                {/* Suggested questions */}
                <div className="space-y-2 mb-6">
                  {demoQuestions.map((q, i) => (
                    <button
                      key={i}
                      className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                        demoStep === i + 1
                          ? "border-[#FF5A1F] bg-[#FF5A1F]/10"
                          : "border-white/10 hover:border-white/20"
                      }`}
                    >
                      <span className="text-sm">{q}</span>
                    </button>
                  ))}
                </div>

                {/* Answer display */}
                {demoStep > 0 && (
                  <div className="bg-black/40 border border-white/10 rounded-lg p-4 space-y-3">
                    <p className="text-sm leading-relaxed">{demoAnswer}</p>
                    <div className="flex items-center gap-2 text-xs text-[#FF5A1F]">
                      <span className="font-mono">Source: HR_Policy.pdf §3.2</span>
                    </div>
                  </div>
                )}
              </div>

              {/* Orange signal accent */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-[#FF5A1F]/20 blur-3xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Pain/Problem Stat Band */}
      <section className="relative py-16 px-6 border-y border-white/10 bg-gradient-to-r from-[#FF5A1F]/5 to-transparent">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 items-center">
            <div className="md:col-span-2">
              <p className="text-2xl font-bold leading-tight">
                Most teams waste hours searching docs—or answer customers inconsistently.
              </p>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FF5A1F] mb-2">67%</div>
              <div className="text-sm text-white/60">Reduced tickets</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FF5A1F] mb-2">3x</div>
              <div className="text-sm text-white/60">Faster onboarding</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-[#FF5A1F] mb-2">89%</div>
              <div className="text-sm text-white/60">Deflection rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-4">How it works</h2>
            <p className="text-xl text-white/60">Three steps to deployment</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-12 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-[#FF5A1F]/30 to-transparent" />

            {[
              {
                num: "01",
                title: "Connect sources",
                desc: "Link Drive, Notion, Confluence, or upload docs. We handle the rest."
              },
              {
                num: "02",
                title: "Index + permissions",
                desc: "Permissions-aware retrieval. Users only see what they're allowed to."
              },
              {
                num: "03",
                title: "Deploy + analyze",
                desc: "Embed on site or Slack. Track gaps, improve answers, measure impact."
              }
            ].map((step, i) => (
              <div key={i} className="relative">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5F] flex items-center justify-center text-2xl font-bold mb-6 relative z-10">
                  {step.num}
                </div>
                <h3 className="text-2xl font-bold mb-3">{step.title}</h3>
                <p className="text-white/60 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Core Capabilities */}
      <section id="product" className="py-32 px-6 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-5xl font-bold mb-4">Core capabilities</h2>
            <p className="text-xl text-white/60">Enterprise-ready RAG, out of the box</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                title: "Citations + source transparency",
                desc: "Every answer links to the source doc and section. Build trust.",
                link: "#"
              },
              {
                title: "Access control / permissions",
                desc: "Respects your org's permissions. HR sees HR docs. Sales sees sales.",
                link: "#"
              },
              {
                title: "Hallucination reduction",
                desc: "Guardrails, confidence scoring, and fallback to human handoff.",
                link: "#"
              },
              {
                title: "Human handoff / ticketing",
                desc: "Seamless escalation to support or sales when AI can't answer.",
                link: "#"
              },
              {
                title: "Analytics & knowledge gaps",
                desc: "See what users ask, where answers fail, what docs to add.",
                link: "#"
              },
              {
                title: "Multilingual support",
                desc: "Answer in 95+ languages. Same knowledge base, global reach.",
                link: "#"
              }
            ].map((cap, i) => (
              <div 
                key={i} 
                className="group p-8 border border-white/10 rounded-xl hover:border-[#FF5A1F]/50 hover:bg-white/[0.02] transition-all hover:shadow-[0_0_30px_rgba(255,90,31,0.1)] hover:-translate-y-1"
              >
                <h3 className="text-xl font-bold mb-3">{cap.title}</h3>
                <p className="text-white/60 text-sm leading-relaxed mb-4">{cap.desc}</p>
                <a href={cap.link} className="text-sm text-[#FF5A1F] hover:underline">Learn more →</a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Use Cases */}
      <section id="use-cases" className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Use cases</h2>
            <p className="text-xl text-white/60">One platform, many workflows</p>
          </div>

          {/* Tab controls */}
          <div className="flex flex-wrap justify-center gap-4 mb-12">
            {["support", "sales", "hr", "it"].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-6 py-3 rounded-lg font-medium transition-all relative ${
                  activeTab === tab
                    ? "bg-white/10 text-white"
                    : "text-white/50 hover:text-white"
                }`}
              >
                {tab === "support" && "Customer Support"}
                {tab === "sales" && "Sales Enablement"}
                {tab === "hr" && "HR / People Ops"}
                {tab === "it" && "IT Helpdesk"}
                {activeTab === tab && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF5A1F]" />
                )}
              </button>
            ))}
          </div>

          {/* Tab content */}
          <div className="bg-white/[0.02] border border-white/10 rounded-2xl p-12">
            {activeTab === "support" && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-6">Customer Support</h3>
                  <ul className="space-y-4 text-white/70">
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Deflect 60%+ of tier-1 tickets automatically</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Instant answers from help docs, policies, and FAQs</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Escalate complex issues to agents with full context</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-64 flex items-center justify-center text-white/30">
                  [Support dashboard mockup]
                </div>
              </div>
            )}
            {activeTab === "sales" && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-6">Sales Enablement</h3>
                  <ul className="space-y-4 text-white/70">
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Reps find product specs, pricing, case studies instantly</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Qualify leads with AI before human handoff</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Reduce time-to-close with accurate, cited answers</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-64 flex items-center justify-center text-white/30">
                  [Sales chat mockup]
                </div>
              </div>
            )}
            {activeTab === "hr" && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-6">HR / People Ops</h3>
                  <ul className="space-y-4 text-white/70">
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Answer PTO, benefits, and policy questions 24/7</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Onboard new hires faster with self-serve knowledge</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Maintain compliance with cited, auditable answers</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-64 flex items-center justify-center text-white/30">
                  [HR bot mockup]
                </div>
              </div>
            )}
            {activeTab === "it" && (
              <div className="grid md:grid-cols-2 gap-12 items-center">
                <div>
                  <h3 className="text-3xl font-bold mb-6">IT Helpdesk</h3>
                  <ul className="space-y-4 text-white/70">
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Resolve password resets, VPN issues, app access instantly</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Reduce helpdesk load by 70%+ with self-service</span>
                    </li>
                    <li className="flex items-start gap-3">
                      <CheckIcon />
                      <span>Create tickets automatically for complex issues</span>
                    </li>
                  </ul>
                </div>
                <div className="bg-black/40 border border-white/10 rounded-lg p-6 h-64 flex items-center justify-center text-white/30">
                  [IT helpdesk mockup]
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-32 px-6 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">What teams say</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote: "Ragbot cut our support tickets by 65% in the first month. Game changer.",
                name: "Sarah Chen",
                title: "VP Support",
                company: "TechCorp",
                metric: "65% fewer tickets"
              },
              {
                quote: "Our sales team finds answers in seconds instead of searching Notion for hours.",
                name: "Marcus Johnson",
                title: "Head of Sales",
                company: "GrowthCo",
                metric: "3x faster responses"
              },
              {
                quote: "The citation feature builds trust. Customers see we're not making things up.",
                name: "Priya Patel",
                title: "CTO",
                company: "Fintech Inc",
                metric: "89% accuracy"
              }
            ].map((testimonial, i) => (
              <div key={i} className="bg-white/[0.02] border border-white/10 rounded-xl p-8 hover:border-[#FF5A1F]/30 transition-all">
                <div className="text-4xl text-[#FF5A1F] mb-4">"</div>
                <p className="text-white/80 mb-6 leading-relaxed">{testimonial.quote}</p>
                <div className="border-t border-white/10 pt-6">
                  <div className="font-bold">{testimonial.name}</div>
                  <div className="text-sm text-white/50">{testimonial.title}, {testimonial.company}</div>
                  <div className="text-sm text-[#FF5A1F] mt-2 font-mono">{testimonial.metric}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Integrations Grid */}
      <section className="py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Integrations</h2>
            <p className="text-xl text-white/60">Connect your stack in minutes</p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              "Slack", "Teams", "Notion", "Confluence", "Zendesk",
              "Intercom", "Google Drive", "SharePoint", "HubSpot", "Salesforce"
            ].map((integration, i) => (
              <div 
                key={i} 
                className="aspect-square border border-white/10 rounded-xl flex items-center justify-center hover:border-[#FF5A1F]/50 hover:bg-white/[0.02] transition-all group"
              >
                <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">{integration}</span>
              </div>
            ))}
            <div className="aspect-square border border-white/10 rounded-xl flex items-center justify-center hover:border-[#FF5A1F]/50 hover:bg-white/[0.02] transition-all group">
              <span className="text-sm font-medium text-white/50 group-hover:text-white transition-colors">+ API</span>
            </div>
          </div>
        </div>
      </section>

      {/* Security / Trust */}
      <section id="security" className="py-32 px-6 bg-gradient-to-b from-transparent to-white/[0.02]">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Security-first RAG</h2>
            <p className="text-xl text-white/60">Enterprise-grade from day one</p>
          </div>

          <div className="grid md:grid-cols-2 gap-8 mb-12">
            {[
              {
                title: "End-to-end encryption",
                desc: "Data encrypted in transit and at rest. Zero-knowledge architecture."
              },
              {
                title: "Data retention controls",
                desc: "You own your data. Delete anytime. Configurable retention policies."
              },
              {
                title: "RBAC / SSO-ready",
                desc: "Role-based access control. SAML/OIDC support. Audit logs."
              },
              {
                title: "Compliance ready",
                desc: "SOC 2 Type II, GDPR, HIPAA-ready infrastructure."
              }
            ].map((item, i) => (
              <div key={i} className="flex gap-4">
                <div className="flex-shrink-0 w-12 h-12 rounded-lg bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5F] flex items-center justify-center">
                  <CheckIcon />
                </div>
                <div>
                  <h3 className="font-bold mb-2">{item.title}</h3>
                  <p className="text-sm text-white/60">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap justify-center gap-4">
            {["SOC 2", "GDPR", "HIPAA", "ISO 27001"].map((badge, i) => (
              <div key={i} className="px-6 py-3 border border-white/20 rounded-lg text-sm font-medium text-white/60">
                {badge}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">Pricing</h2>
            <p className="text-xl text-white/60 mb-8">Simple, transparent, scalable</p>
            
            {/* Annual toggle */}
            <div className="inline-flex items-center gap-4 bg-white/5 border border-white/10 rounded-lg p-1">
              <button 
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2 rounded-md transition-all ${!isAnnual ? "bg-white/10 text-white" : "text-white/50"}`}
              >
                Monthly
              </button>
              <button 
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2 rounded-md transition-all ${isAnnual ? "bg-white/10 text-white" : "text-white/50"}`}
              >
                Annual <span className="text-[#FF5A1F] text-xs ml-1">Save 20%</span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
              <div className="text-sm text-white/50 mb-2 tracking-widest">STARTER</div>
              <div className="text-5xl font-bold mb-6">
                ${isAnnual ? "79" : "99"}
                <span className="text-xl text-white/50">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>1,000 queries/month</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>5 data sources</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Basic analytics</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Email support</span>
                </li>
              </ul>
              <Link 
                href="/register" 
                className="block w-full text-center px-6 py-3 border-2 border-white/20 rounded-lg font-bold hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all"
              >
                Start free
              </Link>
            </div>

            {/* Pro (highlighted) */}
            <div className="border-2 border-[#FF5A1F] rounded-2xl p-8 relative bg-gradient-to-b from-[#FF5A1F]/5 to-transparent">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-[#FF5A1F] rounded-full text-xs font-bold">
                MOST POPULAR
              </div>
              <div className="text-sm text-white/50 mb-2 tracking-widest">PRO</div>
              <div className="text-5xl font-bold mb-6">
                ${isAnnual ? "239" : "299"}
                <span className="text-xl text-white/50">/mo</span>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>10,000 queries/month</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Unlimited data sources</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Advanced analytics + gaps</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Priority support</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Custom branding</span>
                </li>
              </ul>
              <Link 
                href="/register" 
                className="block w-full text-center px-6 py-3 bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5F] rounded-lg font-bold hover:shadow-[0_0_30px_rgba(255,90,31,0.3)] transition-all"
              >
                Start free
              </Link>
            </div>

            {/* Enterprise */}
            <div className="border border-white/10 rounded-2xl p-8 hover:border-white/20 transition-all">
              <div className="text-sm text-white/50 mb-2 tracking-widest">ENTERPRISE</div>
              <div className="text-5xl font-bold mb-6">
                Custom
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Unlimited queries</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Dedicated infrastructure</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>SSO / SAML</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>SLA + dedicated support</span>
                </li>
                <li className="flex items-start gap-3 text-sm">
                  <CheckIcon />
                  <span>Custom contracts</span>
                </li>
              </ul>
              <Link 
                href="/demo" 
                className="block w-full text-center px-6 py-3 border-2 border-white/20 rounded-lg font-bold hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all"
              >
                Talk to sales
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-32 px-6 bg-gradient-to-b from-white/[0.02] to-transparent">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-5xl font-bold mb-4">FAQ</h2>
          </div>

          <div className="space-y-4">
            {[
              {
                q: "How do you prevent hallucinations?",
                a: "We use retrieval-augmented generation (RAG) with confidence scoring, source citations, and fallback mechanisms. If the AI isn't confident, it escalates to a human or says 'I don't know' rather than guessing."
              },
              {
                q: "Can it respect doc permissions?",
                a: "Yes. Ragbot integrates with your existing access controls (Google Drive, Notion, etc.). Users only see answers from docs they have permission to access."
              },
              {
                q: "Can I deploy on my domain?",
                a: "Absolutely. You can embed the widget on your site, use our API, or deploy to Slack/Teams. White-label options available on Pro and Enterprise plans."
              },
              {
                q: "What data do you store?",
                a: "We store indexed versions of your documents (encrypted), query logs for analytics, and conversation history (configurable retention). You can delete all data anytime."
              },
              {
                q: "How long does setup take?",
                a: "Most teams are live in under 15 minutes. Connect your data sources, configure permissions, and deploy. No coding required."
              },
              {
                q: "Do you support multiple languages?",
                a: "Yes. Ragbot can answer in 95+ languages. Your knowledge base can be in one language, and users can ask in another."
              },
              {
                q: "What if the AI can't answer?",
                a: "You can configure fallback behaviors: escalate to a human agent, create a support ticket, or provide a custom message. All configurable in the dashboard."
              },
              {
                q: "Is there a free trial?",
                a: "Yes. Start with a 14-day free trial on any plan. No credit card required. Full access to all features."
              }
            ].map((faq, i) => (
              <div key={i} className="border border-white/10 rounded-xl overflow-hidden">
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/[0.02] transition-all"
                >
                  <span className="font-bold text-lg">{faq.q}</span>
                  <div className={`transition-transform ${openFaq === i ? "rotate-180" : ""}`}>
                    <ChevronDownIcon />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 text-white/70 leading-relaxed border-t border-white/10 pt-6">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 px-6 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-[#FF5A1F]/10 via-transparent to-[#FF5A1F]/10" />
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-6xl font-bold mb-6">
            Ready to deploy?
          </h2>
          <p className="text-2xl text-white/70 mb-12">
            Start answering questions from your docs in minutes.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-6 justify-center mb-8">
            <Link 
              href="/register" 
              className="px-12 py-5 bg-gradient-to-r from-[#FF5A1F] to-[#FF8A5F] rounded-xl font-bold text-xl hover:shadow-[0_0_40px_rgba(255,90,31,0.4)] transition-all"
            >
              Start free
            </Link>
            <Link 
              href="/demo" 
              className="px-12 py-5 border-2 border-white/20 rounded-xl font-bold text-xl hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all"
            >
              Book demo
            </Link>
          </div>

          <p className="text-sm text-white/40">
            No credit card required • 14-day free trial • Setup in minutes • Enterprise-grade security
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/10 py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Product */}
            <div>
              <div className="text-sm font-bold mb-4 tracking-widest text-white/50">PRODUCT</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <div className="text-sm font-bold mb-4 tracking-widest text-white/50">RESOURCES</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li><Link href="/documentation" className="hover:text-white transition-colors">Documentation</Link></li>
                <li><a href="#" className="hover:text-white transition-colors">API Reference</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Guides</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
              </ul>
            </div>

            {/* Company */}
            <div>
              <div className="text-sm font-bold mb-4 tracking-widest text-white/50">COMPANY</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">About</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Partners</a></li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-sm font-bold mb-4 tracking-widest text-white/50">LEGAL</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li><a href="#" className="hover:text-white transition-colors">Privacy</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Terms</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
                <li><a href="#" className="hover:text-white transition-colors">DPA</a></li>
              </ul>
            </div>

            {/* Social */}
            <div>
              <div className="text-sm font-bold mb-4 tracking-widest text-white/50">CONNECT</div>
              <div className="flex gap-4">
                <a href="#" className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all">
                  <span className="text-xs">𝕏</span>
                </a>
                <a href="#" className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all">
                  <span className="text-xs">in</span>
                </a>
                <a href="#" className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-[#FF5A1F] hover:bg-[#FF5A1F]/10 transition-all">
                  <span className="text-xs">GH</span>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-[#FF5A1F] to-[#FF8A5F] rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-sm">R</span>
              </div>
              <span className="font-bold">RAGBOT by CushLabs.AI</span>
            </div>
            <div className="text-sm text-white/40">
              © 2025 CushLabs.AI. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
