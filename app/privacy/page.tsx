"use client";

import { Footer } from "@/components/footer";
import { Navbar } from "@/components/navbar";
import { useLanguage } from "@/lib/i18n/use-language";

/**
 * Privacy notice / Aviso de privacidad for soyconverso.com.
 *
 * This page is a set of CLAIMS ABOUT THE CODE. Each fact below has a source,
 * and changing the source without changing this page makes the page false:
 *
 *   - Retention: app/api/cron/purge-old-messages/route.ts (RETENTION_DAYS = 90,
 *     runs daily at 08:00 UTC per vercel.json) and the visitor id key in
 *     app/embed/chat/page.tsx (localStorage "converso_visitor_id").
 *   - What the widget stores: WidgetConversation.metadata (pageUrl, origin),
 *     WidgetMessage, Contact (app/api/embed/capture/route.ts), RateLimit
 *     (lib/rate-limit.ts, keyed by IP).
 *   - Processors: OpenAI (lib/ai/providers.ts, embeddings), Vercel (hosting,
 *     Blob avatars, Analytics in app/layout.tsx), Neon/Databricks (POSTGRES_URL),
 *     Clerk (owner sign-in), Stripe (billing), Sentry (sentry.*.config.ts).
 *   - The WhatsApp channel (lib/features.ts WHATSAPP_ENABLED) is OFF in
 *     production. Turning it on adds Meta Platforms as a processor: add it here
 *     in the same change.
 *
 * Controller identity and contact are the ones CushLabs publishes on
 * https://www.cushlabs.ai/es/privacy/. Spanish is the operative document in
 * Mexico (LFPDPPP), written as its own text, not a translation.
 */

const EFFECTIVE = { en: "October 14, 2026", es: "14 de octubre de 2026" };
const ADDRESS =
	"Calle Garibaldi 119, Barranquitas, Guadalajara, Jalisco, C.P. 44270, México";
const EMAIL = "privacy@cushlabs.ai";

type Section = { title: string; body: Array<string | string[]> };

const PROCESSORS: Array<{
	name: string;
	url: string;
	en: string;
	es: string;
}> = [
	{
		name: "OpenAI OpCo, LLC",
		url: "https://openai.com/policies/privacy-policy/",
		en: "Writes the assistant's replies and turns questions into search vectors. Receives the visitor's messages and the business's matching content.",
		es: "Redacta las respuestas del asistente y convierte las preguntas en vectores de búsqueda. Recibe los mensajes del visitante y el contenido del negocio relacionado.",
	},
	{
		name: "Vercel Inc.",
		url: "https://vercel.com/legal/privacy-policy",
		en: "Hosts the service, stores uploaded assistant avatars, and measures page views (Vercel Analytics).",
		es: "Aloja el servicio, guarda los avatares que suben los negocios y mide visitas a páginas (Vercel Analytics).",
	},
	{
		name: "Databricks, Inc. (Neon)",
		url: "https://www.databricks.com/legal/privacynotice",
		en: "The database where conversations, contacts and business settings are stored.",
		es: "La base de datos donde se guardan conversaciones, contactos y configuración de cada negocio.",
	},
	{
		name: "Functional Software, Inc. (Sentry)",
		url: "https://sentry.io/privacy/",
		en: "Error reports, and short session recordings with on-screen text masked, used only to fix faults.",
		es: "Reportes de errores y grabaciones breves de sesión con el texto en pantalla oculto, solo para corregir fallas.",
	},
	{
		name: "Clerk, Inc.",
		url: "https://clerk.com/legal/privacy",
		en: "Sign-in for business owners. Not used for website visitors.",
		es: "Inicio de sesión de los dueños de negocio. No se usa con los visitantes de los sitios.",
	},
	{
		name: "Stripe, Inc.",
		url: "https://stripe.com/privacy",
		en: "Subscription payments from business owners. We never see or store card numbers.",
		es: "Pagos de suscripción de los dueños de negocio. Nunca vemos ni guardamos números de tarjeta.",
	},
];

const CONTENT: Record<"en" | "es", { title: string; sections: Section[] }> = {
	en: {
		title: "Privacy notice",
		sections: [
			{
				title: "Who we are",
				body: [
					`Converso AI (soyconverso.com) is a service of CushLabs AI Services, operated by Robert Francis Cushman III, ${ADDRESS}. Contact: ${EMAIL}.`,
					"Converso gives businesses a chat assistant for their own website. That means two different relationships:",
					[
						"If you are a business owner with a Converso account, we are responsible for your account data.",
						"If you are chatting with an assistant on a business's website, that business decides how your conversation is used, and we process it on its behalf. Its own privacy notice applies too, and requests about your conversation can go to the business or to us.",
					],
				],
			},
			{
				title: "What we collect",
				body: [
					"From website visitors who use a chat assistant:",
					[
						"The messages you send and the replies you receive.",
						"A random visitor ID saved in your browser (so a return visit can continue a conversation), and an ID for the current visit.",
						"The address of the page you were reading when you chatted, without anything after a question mark, and the website it belongs to.",
						"Your name, email or phone number, only if you type them into the chat to be contacted.",
						"Your IP address, used only to stop abuse by limiting how many messages one connection can send.",
					],
					"From business owners: name and email for sign-in, billing details handled by Stripe, and the content you add to train your assistant's knowledge (web pages, documents, instructions).",
					"We do not collect sensitive personal data, and we ask visitors not to share it in the chat.",
				],
			},
			{
				title: "Why we use it",
				body: [
					"Necessary: to answer your questions using the business's own content, keep the conversation in context, send you the business's reply in your language, prevent abuse, and bill business owners.",
					"Secondary: to show the business which pages lead to conversations and to fix faults. You can object to secondary uses by writing to us; it does not affect the chat.",
					"Your conversations are not used to train AI models, and we do not sell or rent personal data.",
				],
			},
			{
				title: "How long we keep it",
				body: [
					[
						"Chat messages: deleted automatically 90 days after they are sent.",
						"Page address, website and visitor IDs on a conversation: removed automatically once the conversation has been inactive for 90 days. What remains is the date, the channel and whether a contact was left, with no message content.",
						"Contact details you chose to leave: kept until the business deletes them or you ask us to.",
						"IP addresses used for abuse limits: deleted within two days.",
						"The visitor ID in your browser stays until you clear your browser's site data.",
						"Business owner accounts: kept while the account is active, and deleted on request when it closes, except what tax law requires us to keep.",
					],
				],
			},
			{
				title: "Who else processes it",
				body: ["These companies process data for us, only to run the service:"],
			},
			{
				title: "Your rights",
				body: [
					`You can ask to access, correct or delete your data, object to a use of it, or withdraw consent. Write to ${EMAIL} saying which website you chatted on and roughly when, so we can find the conversation. We reply within 20 business days. If you are in Mexico, these are your ARCO rights under the Ley Federal de Protección de Datos Personales en Posesión de los Particulares.`,
				],
			},
			{
				title: "International transfers",
				body: [
					"The processors above operate mainly in the United States, so your data may be processed there. They act only on our instructions.",
				],
			},
			{
				title: "Children",
				body: [
					"Converso is meant for adults. We do not knowingly collect data from anyone under 18. If you believe a child has used a chat, write to us and we will delete it.",
				],
			},
			{
				title: "Security",
				body: [
					"Data travels encrypted (HTTPS/TLS), the database is access-controlled, and each business's data is kept separate from every other business. No system is completely secure.",
				],
			},
			{
				title: "Changes",
				body: [
					"When this notice changes we update the date at the top of this page.",
				],
			},
		],
	},
	es: {
		title: "Aviso de privacidad",
		sections: [
			{
				title: "Responsable",
				body: [
					`Converso AI (soyconverso.com) es un servicio de CushLabs AI Services, operado por Robert Francis Cushman III, con domicilio en ${ADDRESS}. Contacto: ${EMAIL}.`,
					"Converso ofrece a los negocios un asistente de chat para su propio sitio web. Por eso hay dos relaciones distintas:",
					[
						"Si eres dueño de un negocio con cuenta en Converso, somos responsables de los datos de tu cuenta.",
						"Si estás chateando con el asistente en el sitio de un negocio, ese negocio es el responsable de tu conversación y nosotros la tratamos por su cuenta, como encargados. También aplica su propio aviso de privacidad, y puedes dirigir tus solicitudes al negocio o a nosotros.",
					],
				],
			},
			{
				title: "Datos que recabamos",
				body: [
					"De los visitantes que usan un asistente de chat:",
					[
						"Los mensajes que envías y las respuestas que recibes.",
						"Un identificador aleatorio guardado en tu navegador (para continuar la conversación si regresas) y uno de la visita actual.",
						"La dirección de la página que estabas leyendo, sin lo que va después del signo de interrogación, y el sitio al que pertenece.",
						"Tu nombre, correo o teléfono, solo si los escribes en el chat para que te contacten.",
						"Tu dirección IP, solo para evitar abusos limitando cuántos mensajes puede enviar una conexión.",
					],
					"De los dueños de negocio: nombre y correo para iniciar sesión, datos de facturación que maneja Stripe y el contenido que agregas para que tu asistente aprenda (páginas web, documentos, instrucciones).",
					"No recabamos datos personales sensibles y pedimos a los visitantes no compartirlos en el chat.",
				],
			},
			{
				title: "Finalidades",
				body: [
					"Necesarias: responder tus preguntas con el contenido del propio negocio, mantener el contexto de la conversación, contestarte en tu idioma, evitar abusos y cobrar a los dueños de negocio.",
					"Secundarias: mostrar al negocio qué páginas generan conversaciones y corregir fallas. Puedes oponerte a las finalidades secundarias escribiéndonos; no afecta el uso del chat.",
					"Tus conversaciones no se usan para entrenar modelos de IA, y no vendemos ni rentamos datos personales.",
				],
			},
			{
				title: "Plazos de conservación",
				body: [
					[
						"Mensajes del chat: se eliminan automáticamente 90 días después de enviarse.",
						"Dirección de la página, sitio e identificadores de visitante de una conversación: se eliminan automáticamente cuando la conversación lleva 90 días sin actividad. Solo queda la fecha, el canal y si se dejó un contacto, sin el contenido de los mensajes.",
						"Datos de contacto que decidiste dejar: se conservan hasta que el negocio los elimine o tú nos lo pidas.",
						"Direcciones IP usadas para limitar abusos: se eliminan en un plazo máximo de dos días.",
						"El identificador en tu navegador permanece hasta que borres los datos del sitio en tu navegador.",
						"Cuentas de dueños de negocio: se conservan mientras la cuenta esté activa y se eliminan a solicitud al cerrarla, salvo lo que la ley fiscal nos obligue a conservar.",
					],
				],
			},
			{
				title: "Transferencias y encargados",
				body: [
					"Estas empresas tratan datos por nuestra cuenta, solo para operar el servicio. Son encargados, no terceros que usen tus datos para sus propios fines, por lo que no requieren tu consentimiento:",
				],
			},
			{
				title: "Derechos ARCO y revocación del consentimiento",
				body: [
					`Conforme a la Ley Federal de Protección de Datos Personales en Posesión de los Particulares (LFPDPPP), tienes derecho de Acceso, Rectificación, Cancelación y Oposición (derechos ARCO) sobre tus datos, y puedes revocar tu consentimiento o limitar su uso. Escribe a ${EMAIL} indicando tu nombre, el sitio donde chateaste y la fecha aproximada, para que podamos encontrar la conversación. Respondemos en un plazo máximo de 20 días hábiles.`,
				],
			},
			{
				title: "Transferencias internacionales",
				body: [
					"Los encargados mencionados operan principalmente en Estados Unidos, por lo que tus datos pueden tratarse ahí. Solo actúan conforme a nuestras instrucciones.",
				],
			},
			{
				title: "Menores de edad",
				body: [
					"Converso está dirigido a personas adultas. No recabamos a sabiendas datos de menores de 18 años. Si crees que un menor usó el chat, escríbenos y lo eliminaremos.",
				],
			},
			{
				title: "Seguridad",
				body: [
					"Los datos viajan cifrados (HTTPS/TLS), el acceso a la base de datos está controlado y los datos de cada negocio se mantienen separados de los de cualquier otro. Ningún sistema es completamente seguro.",
				],
			},
			{
				title: "Cambios a este aviso",
				body: [
					"Cuando este aviso cambie, actualizaremos la fecha al inicio de esta página.",
				],
			},
		],
	},
};

export default function PrivacyPage() {
	const { lang } = useLanguage();
	const content = CONTENT[lang];

	return (
		<>
			<Navbar />
			<main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
				<h1 className="text-3xl font-bold tracking-tight">{content.title}</h1>
				<p className="mt-2 text-sm text-muted-foreground">
					{lang === "en" ? "Effective" : "Vigente desde el"} {EFFECTIVE[lang]}
				</p>
				{content.sections.map((section, i) => (
					<section key={section.title} className="mt-10 space-y-3">
						<h2 className="text-xl font-semibold">{section.title}</h2>
						{section.body.map((part) =>
							Array.isArray(part) ? (
								<ul key={part[0]} className="list-disc space-y-2 pl-6">
									{part.map((item) => (
										<li key={item}>{item}</li>
									))}
								</ul>
							) : (
								<p key={part}>{part}</p>
							),
						)}
						{i === 4 && (
							<ul className="space-y-3">
								{PROCESSORS.map((p) => (
									<li key={p.name}>
										<a
											href={p.url}
											target="_blank"
											rel="noopener noreferrer"
											className="font-medium underline"
										>
											{p.name}
										</a>
										: {p[lang]}
									</li>
								))}
							</ul>
						)}
					</section>
				))}
			</main>
			<Footer />
		</>
	);
}
