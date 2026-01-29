/**
 * Converso Landing Page Constants
 * Contains pricing plans, FAQs, and other static content data
 */

export interface PricingPlan {
	name: string;
	nameEn: string;
	price: number;
	priceAnnual: number;
	description: string;
	features: string[];
	cta: string;
	popular: boolean;
}

export interface FAQ {
	q: string;
	qEs: string;
	a: string;
	aEs: string;
}

/**
 * Pricing plans for Converso
 * Prices are in USD
 */
export const PRICING_PLANS: PricingPlan[] = [
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

/**
 * Frequently Asked Questions - Bilingual
 */
export const FAQS: FAQ[] = [
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

/**
 * Feature cards for the features section
 */
export const FEATURES = [
	{
		icon: "message",
		title: "Bilingüe Nativo",
		titleEn: "Native Bilingual",
		description:
			"Responde naturalmente en español e inglés sin configuración adicional",
		descriptionEn:
			"Responds naturally in Spanish and English without additional setup",
	},
	{
		icon: "brain",
		title: "IA Inteligente",
		titleEn: "Smart AI",
		description:
			"Aprende de tu negocio y responde con precisión basándose en tu conocimiento",
		descriptionEn:
			"Learns from your business and responds accurately based on your knowledge",
	},
	{
		icon: "globe",
		title: "24/7 Disponible",
		titleEn: "24/7 Available",
		description:
			"Atiende clientes a cualquier hora, incluso cuando estás cerrado",
		descriptionEn: "Serves customers at any time, even when you're closed",
	},
	{
		icon: "chart",
		title: "Analytics",
		titleEn: "Analytics",
		description: "Entiende qué preguntan tus clientes y mejora tu servicio",
		descriptionEn:
			"Understand what your customers are asking and improve your service",
	},
	{
		icon: "shield",
		title: "Seguro",
		titleEn: "Secure",
		description:
			"Encriptación de grado empresarial para proteger tu información",
		descriptionEn: "Enterprise-grade encryption to protect your information",
	},
	{
		icon: "plug",
		title: "Fácil Integración",
		titleEn: "Easy Integration",
		description: "Instala en minutos con un simple código en tu sitio web",
		descriptionEn: "Install in minutes with a simple code on your website",
	},
] as const;

/**
 * How it works steps
 */
export const HOW_IT_WORKS_STEPS = [
	{
		step: 1,
		title: "Crea tu Bot",
		titleEn: "Create Your Bot",
		description:
			"Regístrate gratis y crea tu primer chatbot en segundos. Personaliza colores y mensaje de bienvenida.",
		descriptionEn:
			"Sign up for free and create your first chatbot in seconds. Customize colors and welcome message.",
	},
	{
		step: 2,
		title: "Entrénalo",
		titleEn: "Train It",
		description:
			"Sube documentos, FAQs, o scrape tu sitio web. Converso aprende tu negocio automáticamente.",
		descriptionEn:
			"Upload documents, FAQs, or scrape your website. Converso learns your business automatically.",
	},
	{
		step: 3,
		title: "Instálalo",
		titleEn: "Install It",
		description:
			"Copia un snippet de código a tu sitio web. Compatible con Shopify, WordPress, y más.",
		descriptionEn:
			"Copy a code snippet to your website. Compatible with Shopify, WordPress, and more.",
	},
	{
		step: 4,
		title: "Listo",
		titleEn: "Ready",
		description:
			"Tu chatbot bilingüe está listo. Monitorea conversaciones y mejora continuamente.",
		descriptionEn:
			"Your bilingual chatbot is ready. Monitor conversations and improve continuously.",
	},
] as const;
