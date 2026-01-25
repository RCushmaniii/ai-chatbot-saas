"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { SignInButton, SignUpButton, SignedIn, SignedOut } from "@clerk/nextjs";

// Icons
const CheckIcon = () => (
  <svg className="w-5 h-5 text-brand-jade" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

const MessageIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

const BrainIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
  </svg>
);

const GlobeIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const ChartIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
  </svg>
);

const ShieldIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

const PlugIcon = () => (
  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
  </svg>
);

export function ConversoLandingPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);
  const [isAnnual, setIsAnnual] = useState(true);
  const [demoMessages, setDemoMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [isTyping, setIsTyping] = useState(false);

  // Demo chat simulation
  useEffect(() => {
    const demoSequence = async () => {
      await new Promise((r) => setTimeout(r, 2000));
      setDemoMessages([{ role: "user", content: "Hola, what are your business hours?" }]);
      setIsTyping(true);
      await new Promise((r) => setTimeout(r, 1500));
      setIsTyping(false);
      setDemoMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Hello! We're open Monday to Friday from 9am to 6pm CST, and Saturdays from 10am to 2pm. How can I help you today?",
        },
      ]);
    };
    demoSequence();
  }, []);

  const plans = [
    {
      name: "Gratis",
      nameEn: "Free",
      price: 0,
      priceAnnual: 0,
      description: "Perfecto para probar",
      features: [
        "1 chatbot",
        "50 mensajes/mes",
        "10 páginas de conocimiento",
        "Widget básico",
        "Soporte por email",
      ],
      cta: "Empezar Gratis",
      popular: false,
    },
    {
      name: "Starter",
      nameEn: "Starter",
      price: 19,
      priceAnnual: 15,
      description: "Para negocios en crecimiento",
      features: [
        "3 chatbots",
        "1,000 mensajes/mes",
        "100 páginas de conocimiento",
        "Widget personalizable",
        "Analytics básicos",
        "Soporte prioritario",
      ],
      cta: "Comenzar Prueba",
      popular: true,
    },
    {
      name: "Pro",
      nameEn: "Pro",
      price: 49,
      priceAnnual: 39,
      description: "Para empresas establecidas",
      features: [
        "10 chatbots",
        "5,000 mensajes/mes",
        "500 páginas de conocimiento",
        "API access",
        "Analytics avanzados",
        "Integraciones premium",
        "Soporte 24/7",
      ],
      cta: "Comenzar Prueba",
      popular: false,
    },
    {
      name: "Business",
      nameEn: "Business",
      price: 99,
      priceAnnual: 79,
      description: "Para grandes organizaciones",
      features: [
        "Chatbots ilimitados",
        "25,000 mensajes/mes",
        "2,000 páginas de conocimiento",
        "White-label",
        "SSO / SAML",
        "Gerente de cuenta dedicado",
        "SLA garantizado",
      ],
      cta: "Contactar Ventas",
      popular: false,
    },
  ];

  const faqs = [
    {
      q: "Is Converso bilingual?",
      qEs: "¿Converso es bilingüe?",
      a: "Yes! Converso understands and responds in both English and Spanish automatically. Your customers can write in either language and get natural, fluent responses.",
      aEs: "¡Sí! Converso entiende y responde en inglés y español automáticamente. Tus clientes pueden escribir en cualquier idioma y recibir respuestas naturales y fluidas.",
    },
    {
      q: "How long does setup take?",
      qEs: "¿Cuánto tiempo toma la configuración?",
      a: "Most businesses are live in under 15 minutes. Upload your FAQs, product info, or connect your knowledge base, and Converso learns instantly.",
      aEs: "La mayoría de los negocios están en línea en menos de 15 minutos. Sube tus FAQs, información de productos, o conecta tu base de conocimiento.",
    },
    {
      q: "Can I customize the chatbot's appearance?",
      qEs: "¿Puedo personalizar la apariencia del chatbot?",
      a: "Absolutely. Match your brand colors, add your logo, customize the greeting message, and even adjust the chatbot's personality and tone.",
      aEs: "Absolutamente. Personaliza los colores de tu marca, agrega tu logo, personaliza el mensaje de bienvenida, e incluso ajusta la personalidad del chatbot.",
    },
    {
      q: "What if the AI can't answer a question?",
      qEs: "¿Qué pasa si la IA no puede responder?",
      a: "You can configure fallback behaviors: collect contact info for follow-up, escalate to a human agent, or provide alternative resources. You're always in control.",
      aEs: "Puedes configurar comportamientos de respaldo: recopilar información de contacto, escalar a un agente humano, o proporcionar recursos alternativos.",
    },
    {
      q: "Is there a free trial?",
      qEs: "¿Hay una prueba gratuita?",
      a: "Yes! Start with our free plan forever, or try any paid plan free for 14 days. No credit card required.",
      aEs: "¡Sí! Comienza con nuestro plan gratuito para siempre, o prueba cualquier plan de pago gratis por 14 días. Sin tarjeta de crédito.",
    },
    {
      q: "How secure is my data?",
      qEs: "¿Qué tan segura está mi información?",
      a: "Enterprise-grade security with encryption at rest and in transit, SOC 2 compliance, and you own your data. Delete anytime.",
      aEs: "Seguridad de nivel empresarial con encriptación en reposo y en tránsito, cumplimiento SOC 2, y tú eres dueño de tus datos.",
    },
  ];

  return (
    <div className="min-h-screen bg-surface-sand">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-surface-sand/90 border-b border-ink/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-3 group">
              <div className="w-10 h-10 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-xl flex items-center justify-center shadow-md">
                <span className="text-white font-bold text-lg">C</span>
              </div>
              <span className="text-2xl font-display font-bold text-ink tracking-tight">
                Converso
              </span>
            </Link>

            {/* Center Nav */}
            <div className="hidden lg:flex items-center gap-8 text-sm font-medium">
              <a href="#features" className="text-ink/70 hover:text-ink transition-colors">
                Características
              </a>
              <a href="#how-it-works" className="text-ink/70 hover:text-ink transition-colors">
                Cómo Funciona
              </a>
              <a href="#pricing" className="text-ink/70 hover:text-ink transition-colors">
                Precios
              </a>
              <a href="#faq" className="text-ink/70 hover:text-ink transition-colors">
                FAQ
              </a>
            </div>

            {/* Right CTAs */}
            <div className="flex items-center gap-4">
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="hidden sm:block text-sm font-medium text-ink/70 hover:text-ink transition-colors">
                    Iniciar Sesión
                  </button>
                </SignInButton>
                <SignUpButton mode="modal">
                  <button className="px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5">
                    Empezar Gratis
                  </button>
                </SignUpButton>
              </SignedOut>
              <SignedIn>
                <Link
                  href="/"
                  className="px-6 py-2.5 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-sm font-bold text-white shadow-md hover:shadow-lg transition-all"
                >
                  Ir al Dashboard
                </Link>
              </SignedIn>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-16 pb-24 px-6 overflow-hidden">
        {/* Background decorations */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-brand-cielito/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-brand-jade/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2" />

        <div className="max-w-7xl mx-auto relative">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm mb-6">
                <span className="w-2 h-2 bg-brand-jade rounded-full animate-pulse" />
                <span className="text-sm font-medium text-ink/70">
                  Ahora con soporte bilingüe automático
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-display font-bold leading-[1.1] mb-6 text-ink">
                El chatbot que{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand-cielito to-brand-jade">
                  habla tu idioma
                </span>
              </h1>

              <p className="text-xl text-ink/70 mb-4 leading-relaxed max-w-xl">
                Converso es la inteligencia artificial que atiende a tus clientes en español e
                inglés, 24/7. Respuestas instantáneas basadas en tu conocimiento de negocio.
              </p>

              <p className="text-sm text-ink/50 mb-8 max-w-xl">
                Perfecto para negocios en México y Norteamérica que atienden clientes bilingües.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 mb-12">
                <SignedOut>
                  <SignUpButton mode="modal">
                    <button className="px-8 py-4 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1">
                      Empieza Gratis
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/"
                    className="px-8 py-4 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl font-bold text-lg text-white shadow-lg hover:shadow-xl transition-all hover:-translate-y-1 text-center"
                  >
                    Ir al Dashboard
                  </Link>
                </SignedIn>
                <Link
                  href="#demo"
                  className="px-8 py-4 border-2 border-ink/20 rounded-xl font-bold text-lg text-ink hover:border-brand-cielito hover:bg-brand-cielito/5 transition-all"
                >
                  Ver Demo
                </Link>
              </div>

              {/* Trust indicators */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-ink/50">
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Sin tarjeta de crédito</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Configuración en minutos</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckIcon />
                  <span>Cancela cuando quieras</span>
                </div>
              </div>
            </div>

            {/* Right: Live Demo Widget */}
            <div className="relative" id="demo">
              <div className="bg-white rounded-2xl shadow-2xl border border-ink/5 overflow-hidden">
                {/* Widget header */}
                <div className="bg-gradient-to-r from-brand-cielito to-brand-jade p-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageIcon />
                    </div>
                    <div className="text-white">
                      <div className="font-bold">Asistente Virtual</div>
                      <div className="text-sm text-white/80 flex items-center gap-2">
                        <span className="w-2 h-2 bg-green-400 rounded-full" />
                        En línea
                      </div>
                    </div>
                  </div>
                </div>

                {/* Chat area */}
                <div className="h-80 p-4 space-y-4 bg-gray-50">
                  {/* Welcome message */}
                  <div className="flex gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className="text-white text-xs font-bold">C</span>
                    </div>
                    <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm max-w-[80%]">
                      <p className="text-sm text-ink">
                        ¡Hola! Soy tu asistente virtual bilingüe. ¿En qué puedo ayudarte hoy?
                      </p>
                    </div>
                  </div>

                  {/* Demo messages */}
                  {demoMessages.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                    >
                      {msg.role === "assistant" && (
                        <div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
                          <span className="text-white text-xs font-bold">C</span>
                        </div>
                      )}
                      <div
                        className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                          msg.role === "user"
                            ? "bg-brand-cielito text-white rounded-tr-sm"
                            : "bg-white shadow-sm rounded-tl-sm"
                        }`}
                      >
                        <p className="text-sm">{msg.content}</p>
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isTyping && (
                    <div className="flex gap-3">
                      <div className="w-8 h-8 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-full flex-shrink-0 flex items-center justify-center">
                        <span className="text-white text-xs font-bold">C</span>
                      </div>
                      <div className="bg-white rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
                        <div className="flex gap-1">
                          <span className="w-2 h-2 bg-ink/30 rounded-full animate-bounce" />
                          <span
                            className="w-2 h-2 bg-ink/30 rounded-full animate-bounce"
                            style={{ animationDelay: "0.1s" }}
                          />
                          <span
                            className="w-2 h-2 bg-ink/30 rounded-full animate-bounce"
                            style={{ animationDelay: "0.2s" }}
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Input area */}
                <div className="p-4 border-t border-ink/5 bg-white">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Escribe tu mensaje..."
                      className="flex-1 px-4 py-3 bg-gray-100 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-cielito/50"
                      disabled
                    />
                    <button className="px-4 py-3 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-xl text-white font-medium">
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>

              {/* Decorative elements */}
              <div className="absolute -bottom-4 -right-4 w-24 h-24 bg-brand-terracotta/20 blur-2xl rounded-full" />
              <div className="absolute -top-4 -left-4 w-16 h-16 bg-brand-jade/20 blur-2xl rounded-full" />
            </div>
          </div>
        </div>
      </section>

      {/* Stats Bar */}
      <section className="py-12 px-6 bg-white border-y border-ink/5">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-display font-bold text-brand-cielito mb-2">85%</div>
              <div className="text-sm text-ink/60">Consultas resueltas automáticamente</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-brand-jade mb-2">24/7</div>
              <div className="text-sm text-ink/60">Disponibilidad sin interrupciones</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-brand-terracotta mb-2">3x</div>
              <div className="text-sm text-ink/60">Más rápido que soporte tradicional</div>
            </div>
            <div>
              <div className="text-4xl font-display font-bold text-ink mb-2">2 min</div>
              <div className="text-sm text-ink/60">Tiempo de configuración</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-ink mb-4">
              Todo lo que necesitas para atender mejor
            </h2>
            <p className="text-xl text-ink/60 max-w-2xl mx-auto">
              Converso combina inteligencia artificial avanzada con facilidad de uso para que
              cualquier negocio pueda ofrecer atención de clase mundial.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                icon: <GlobeIcon />,
                title: "100% Bilingüe",
                description:
                  "Detecta automáticamente el idioma y responde en español o inglés. Perfecto para clientes en México y USA.",
              },
              {
                icon: <BrainIcon />,
                title: "Aprende Tu Negocio",
                description:
                  "Entrena al chatbot con tus FAQs, productos y políticas. Respuestas precisas basadas en tu conocimiento.",
              },
              {
                icon: <MessageIcon />,
                title: "Widget Personalizable",
                description:
                  "Colores, logo, mensajes de bienvenida. Haz que el chatbot se sienta parte de tu marca.",
              },
              {
                icon: <ChartIcon />,
                title: "Analytics en Tiempo Real",
                description:
                  "Ve qué preguntan tus clientes, identifica oportunidades y mejora continuamente.",
              },
              {
                icon: <PlugIcon />,
                title: "Integraciones",
                description:
                  "Conecta con WhatsApp, Messenger, tu CRM, y más. Un chatbot, múltiples canales.",
              },
              {
                icon: <ShieldIcon />,
                title: "Seguro y Confiable",
                description:
                  "Encriptación de datos, cumplimiento de privacidad, y control total sobre tu información.",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="group p-8 bg-white rounded-2xl border border-ink/5 shadow-sm hover:shadow-lg hover:border-brand-cielito/30 transition-all hover:-translate-y-1"
              >
                <div className="w-12 h-12 bg-gradient-to-br from-brand-cielito/10 to-brand-jade/10 rounded-xl flex items-center justify-center mb-6 text-brand-cielito group-hover:from-brand-cielito group-hover:to-brand-jade group-hover:text-white transition-all">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-bold text-ink mb-3">{feature.title}</h3>
                <p className="text-ink/60 leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-6 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-ink mb-4">
              Listo en 3 simples pasos
            </h2>
            <p className="text-xl text-ink/60">Sin código, sin complicaciones, sin esperas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-12 relative">
            {/* Connector line */}
            <div className="hidden md:block absolute top-16 left-1/6 right-1/6 h-0.5 bg-gradient-to-r from-brand-cielito via-brand-jade to-brand-terracotta" />

            {[
              {
                num: "1",
                title: "Crea tu cuenta",
                description:
                  "Regístrate gratis en segundos. Sin tarjeta de crédito, sin compromisos.",
                color: "from-brand-cielito to-brand-cielito",
              },
              {
                num: "2",
                title: "Entrena tu chatbot",
                description:
                  "Sube documentos, FAQs o simplemente escribe las respuestas que quieres dar.",
                color: "from-brand-jade to-brand-jade",
              },
              {
                num: "3",
                title: "Instala en tu sitio",
                description:
                  "Copia y pega una línea de código. Tu chatbot está listo para atender.",
                color: "from-brand-terracotta to-brand-terracotta",
              },
            ].map((step, i) => (
              <div key={i} className="text-center relative">
                <div
                  className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${step.color} flex items-center justify-center text-white text-2xl font-bold mb-6 shadow-lg relative z-10`}
                >
                  {step.num}
                </div>
                <h3 className="text-xl font-display font-bold text-ink mb-3">{step.title}</h3>
                <p className="text-ink/60 leading-relaxed">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-cielito/5 to-brand-jade/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-ink mb-4">
              Lo que dicen nuestros clientes
            </h2>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                quote:
                  "Converso redujo nuestras llamadas de soporte en un 60%. Los clientes aman poder escribir en español o inglés.",
                name: "María González",
                title: "Directora de Servicio",
                company: "TechMex",
              },
              {
                quote:
                  "La configuración fue increíblemente fácil. En menos de una hora teníamos un chatbot funcionando en nuestro sitio.",
                name: "Carlos Ruiz",
                title: "Fundador",
                company: "Tienda Digital MX",
              },
              {
                quote:
                  "El soporte bilingüe automático es perfecto para nuestros clientes en ambos lados de la frontera.",
                name: "Jennifer Smith",
                title: "VP Operations",
                company: "BorderTrade Co",
              },
            ].map((testimonial, i) => (
              <div key={i} className="bg-white rounded-2xl p-8 shadow-sm border border-ink/5">
                <div className="text-4xl text-brand-cielito mb-4">"</div>
                <p className="text-ink/80 mb-6 leading-relaxed">{testimonial.quote}</p>
                <div className="border-t border-ink/5 pt-6">
                  <div className="font-bold text-ink">{testimonial.name}</div>
                  <div className="text-sm text-ink/50">
                    {testimonial.title}, {testimonial.company}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-display font-bold text-ink mb-4">
              Precios simples y transparentes
            </h2>
            <p className="text-xl text-ink/60 mb-8">
              Empieza gratis, escala cuando lo necesites
            </p>

            {/* Toggle */}
            <div className="inline-flex items-center gap-4 bg-white border border-ink/10 rounded-xl p-1 shadow-sm">
              <button
                onClick={() => setIsAnnual(false)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  !isAnnual ? "bg-brand-cielito text-white shadow" : "text-ink/60"
                }`}
              >
                Mensual
              </button>
              <button
                onClick={() => setIsAnnual(true)}
                className={`px-6 py-2.5 rounded-lg font-medium transition-all ${
                  isAnnual ? "bg-brand-cielito text-white shadow" : "text-ink/60"
                }`}
              >
                Anual{" "}
                <span className="text-xs ml-1 text-brand-jade font-bold">
                  {isAnnual ? "-20%" : ""}
                </span>
              </button>
            </div>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan, i) => (
              <div
                key={i}
                className={`relative bg-white rounded-2xl p-8 border-2 transition-all hover:-translate-y-1 ${
                  plan.popular
                    ? "border-brand-cielito shadow-xl"
                    : "border-ink/5 shadow-sm hover:border-brand-cielito/30 hover:shadow-lg"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 bg-gradient-to-r from-brand-cielito to-brand-jade rounded-full text-xs font-bold text-white">
                    MÁS POPULAR
                  </div>
                )}

                <div className="text-sm font-medium text-ink/50 mb-2">{plan.name}</div>
                <div className="text-4xl font-display font-bold text-ink mb-1">
                  ${isAnnual ? plan.priceAnnual : plan.price}
                  <span className="text-lg text-ink/50 font-normal">/mes</span>
                </div>
                <div className="text-sm text-ink/50 mb-6">{plan.description}</div>

                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-start gap-3 text-sm text-ink/70">
                      <CheckIcon />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <SignedOut>
                  <SignUpButton mode="modal">
                    <button
                      className={`w-full py-3 rounded-xl font-bold transition-all ${
                        plan.popular
                          ? "bg-gradient-to-r from-brand-cielito to-brand-jade text-white hover:shadow-lg"
                          : "border-2 border-ink/20 text-ink hover:border-brand-cielito hover:bg-brand-cielito/5"
                      }`}
                    >
                      {plan.cta}
                    </button>
                  </SignUpButton>
                </SignedOut>
                <SignedIn>
                  <Link
                    href="/"
                    className={`block w-full py-3 rounded-xl font-bold text-center transition-all ${
                      plan.popular
                        ? "bg-gradient-to-r from-brand-cielito to-brand-jade text-white hover:shadow-lg"
                        : "border-2 border-ink/20 text-ink hover:border-brand-cielito hover:bg-brand-cielito/5"
                    }`}
                  >
                    Ir al Dashboard
                  </Link>
                </SignedIn>
              </div>
            ))}
          </div>

          <p className="text-center text-sm text-ink/50 mt-8">
            14 días de prueba gratis en planes de pago. Sin tarjeta de crédito requerida.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-white">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-display font-bold text-ink mb-4">
              Preguntas Frecuentes
            </h2>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div
                key={i}
                className="border border-ink/10 rounded-xl overflow-hidden bg-surface-sand/50"
              >
                <button
                  onClick={() => setOpenFaq(openFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left hover:bg-white/50 transition-all"
                >
                  <div>
                    <span className="font-bold text-ink block">{faq.qEs}</span>
                    <span className="text-sm text-ink/50">{faq.q}</span>
                  </div>
                  <div
                    className={`transition-transform text-ink/50 ${openFaq === i ? "rotate-180" : ""}`}
                  >
                    <ChevronDownIcon />
                  </div>
                </button>
                {openFaq === i && (
                  <div className="px-6 pb-6 border-t border-ink/5 pt-4 space-y-2">
                    <p className="text-ink/70 leading-relaxed">{faq.aEs}</p>
                    <p className="text-sm text-ink/50 italic">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 px-6 bg-gradient-to-br from-brand-cielito to-brand-jade relative overflow-hidden">
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            }}
          />
        </div>

        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h2 className="text-4xl md:text-5xl font-display font-bold text-white mb-6">
            ¿Listo para transformar tu atención al cliente?
          </h2>
          <p className="text-xl text-white/80 mb-10 max-w-2xl mx-auto">
            Únete a cientos de negocios que ya usan Converso para atender mejor a sus clientes.
            Empieza gratis hoy.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <SignedOut>
              <SignUpButton mode="modal">
                <button className="px-10 py-5 bg-white rounded-xl font-bold text-lg text-brand-cielito shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1">
                  Empieza Gratis Ahora
                </button>
              </SignUpButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/"
                className="px-10 py-5 bg-white rounded-xl font-bold text-lg text-brand-cielito shadow-xl hover:shadow-2xl transition-all hover:-translate-y-1"
              >
                Ir al Dashboard
              </Link>
            </SignedIn>
            <a
              href="mailto:hola@soyconverso.com"
              className="px-10 py-5 border-2 border-white/30 rounded-xl font-bold text-lg text-white hover:bg-white/10 transition-all"
            >
              Hablar con Ventas
            </a>
          </div>

          <p className="text-sm text-white/60">
            Sin tarjeta de crédito • 14 días gratis • Configuración en minutos
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-ink text-white py-16 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-12">
            {/* Brand */}
            <div className="md:col-span-2">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-brand-cielito to-brand-jade rounded-xl flex items-center justify-center">
                  <span className="text-white font-bold">C</span>
                </div>
                <span className="text-xl font-display font-bold">Converso</span>
              </div>
              <p className="text-white/60 text-sm leading-relaxed mb-4">
                El chatbot inteligente y bilingüe para negocios en México y Norteamérica.
              </p>
              <p className="text-white/40 text-xs">© 2025 Converso. Todos los derechos reservados.</p>
            </div>

            {/* Product */}
            <div>
              <div className="text-sm font-bold mb-4 text-white/50">PRODUCTO</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li>
                  <a href="#features" className="hover:text-white transition-colors">
                    Características
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="hover:text-white transition-colors">
                    Precios
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Integraciones
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    API
                  </a>
                </li>
              </ul>
            </div>

            {/* Resources */}
            <div>
              <div className="text-sm font-bold mb-4 text-white/50">RECURSOS</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li>
                  <Link href="/documentation" className="hover:text-white transition-colors">
                    Documentación
                  </Link>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Blog
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Guías
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-white transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <div className="text-sm font-bold mb-4 text-white/50">LEGAL</div>
              <ul className="space-y-3 text-sm text-white/60">
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Privacidad
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Términos
                  </a>
                </li>
                <li>
                  <a href="#" className="hover:text-white transition-colors">
                    Seguridad
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-sm text-white/40">Hecho con amor en México y USA</div>
            <div className="flex gap-4">
              <a
                href="#"
                className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
              >
                <span className="text-xs">𝕏</span>
              </a>
              <a
                href="#"
                className="w-10 h-10 border border-white/20 rounded-lg flex items-center justify-center hover:border-brand-cielito hover:bg-brand-cielito/10 transition-all"
              >
                <span className="text-xs">in</span>
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
