import type { Language } from './products';

export const legalDocuments = ['notice', 'terms', 'privacy'] as const;
export type LegalDocument = (typeof legalDocuments)[number];

const paths = {
  en: { notice: '/legal/notice/', terms: '/legal/terms/', privacy: '/legal/privacy/' },
  es: { notice: '/es/legal/aviso-legal/', terms: '/es/legal/condiciones-de-venta/', privacy: '/es/legal/privacidad/' },
} as const;

export function legalPath(language: Language, document: LegalDocument) {
  return paths[language][document];
}

export function legalSlug(language: Language, document: LegalDocument) {
  return legalPath(language, document).split('/').at(-2)!;
}

const seller = 'Programax Ventures LLC';
const address = '37 N Gould St. Ste 201, Sheridan, Wyoming 82801, USA';
const support = { label: 'info@programax.tech', href: 'mailto:info@programax.tech' };
const privacy = { label: 'info@gymclass.cc', href: 'mailto:info@gymclass.cc' };
const academy = { label: 'Circle Academy', href: 'https://circleacademy.es/' };
const aepd = { label: 'AEPD', href: 'https://www.aepd.es/' };
const pickup = 'Circle Academy, Carrer de Ferrer de Blanes, 5, Gràcia, 08012 Barcelona';

type Section = { heading: string; paragraphs: string[]; link?: { label: string; href: string } };
type LegalPage = { title: string; description: string; sections: Section[] };

export const legalCopy: Record<Language, Record<LegalDocument, LegalPage>> = {
  en: {
    notice: {
      title: 'Legal notice',
      description: 'Who operates the BJJ Keychain storefront and how to contact us.',
      sections: [
        { heading: 'Website operator and seller', paragraphs: [
          `BJJ Keychain (keychain.gymclass.cc) is operated by ${seller}, a limited liability company registered in Wyoming, United States, on 18 September 2023 (Wyoming entity ID 2023-001332059).`,
          `Registered office: ${address}.`,
        ], link: support },
        { heading: 'Buying from this website', paragraphs: [
          'The terms of sale explain how orders, delivery, withdrawal and guarantees work. The privacy notice explains how we handle your personal data.',
        ] },
      ],
    },
    terms: {
      title: 'Terms of sale',
      description: 'How orders, delivery, withdrawal and guarantees work at BJJ Keychain.',
      sections: [
        { heading: 'Seller and prices', paragraphs: [
          `The seller is ${seller}, Wyoming entity ID 2023-001332059. Registered office: ${address}.`,
          'Prices are in euros. Checkout shows the final price, including any delivery charge, before you submit the order.',
        ], link: support },
        { heading: 'Orders and payment', paragraphs: [
          'Your card is authorised when you submit the order. This places a temporary hold, not a charge. We review the order and, if we accept it, confirm and charge it within 7 days. If we do not accept the order, we release the authorisation and do not charge you. Your bank determines when the hold disappears from your account.',
        ] },
        { heading: 'Pickup and delivery', paragraphs: [
          `Free pickup is available at ${pickup}. We will arrange pickup with you.`,
          'Postal delivery costs €5 and is available only in mainland Spain. We do not ship to the Balearic Islands, Canary Islands, Ceuta or Melilla. If a shipping address is ineligible, we cancel the order and release the authorisation without charging you.',
          'For postal orders, we deliver no later than 30 calendar days after acceptance unless we agree otherwise with you.',
        ], link: academy },
        { heading: 'Right of withdrawal', paragraphs: [
          `If you are a consumer, you may withdraw without giving a reason within 14 calendar days of receiving the goods. To withdraw, email ${support.label} or send a clear statement to our registered office before the deadline. You can use the form below, but it is not required.`,
          'Contact us for return instructions. Send the goods back within 14 calendar days of notifying us. You pay the direct cost of return shipping.',
          'We refund payments received, including the cost of standard outbound delivery where applicable, within 14 calendar days of being notified, using the original payment method and without a refund fee. We may withhold the refund until we receive the goods or you provide proof that you sent them back, whichever comes first.',
          'We do not offer voluntary returns outside the statutory withdrawal period. This does not limit your rights if the goods are faulty or not as described.',
        ] },
        { heading: 'Model withdrawal form', paragraphs: [
          'Complete and send this form only if you wish to withdraw from the contract.',
          `To: ${seller}, ${address}, ${support.label}
I/We (*) hereby give notice that I/we (*) withdraw from my/our (*) contract of sale of the following goods (*):
Ordered on (*) / received on (*):
Name of consumer(s):
Address of consumer(s):
Signature of consumer(s) (only if submitted on paper):
Date:
(*) Delete as appropriate.`,
        ] },
        { heading: 'Legal guarantee', paragraphs: [
          'For consumer purchases subject to Spanish law, goods have a three-year legal guarantee from delivery for lack of conformity. If an item is faulty or not as described, contact us. Your remedies under applicable law may include repair, replacement, a price reduction or a refund.',
        ], link: support },
      ],
    },
    privacy: {
      title: 'Privacy',
      description: 'What data we use to run the storefront and fulfil orders, and how to exercise your rights.',
      sections: [
        { heading: 'Data controller', paragraphs: [
          `${seller} is the controller. Its registered office is ${address}. Use the email below for privacy and data rights requests.`,
        ], link: privacy },
        { heading: 'Data and why we use it', paragraphs: [
          'When you order through Stripe Checkout, we receive the name, email, phone number, shipping address and order details needed to review and fulfil the order, take payment, arrange delivery or pickup, and respond to questions about it. The legal basis is taking steps at your request and performing the sales contract. We also keep records where the law requires it.',
          'Stripe handles card details. We do not receive your full card number.',
        ] },
        { heading: 'Service providers and international transfers', paragraphs: [
          'Cloudflare hosts the site. Stripe processes payments and provides Checkout; Stripe may act as an independent controller for processing it carries out for its own legal and regulatory purposes. For shipped orders, we share the delivery details needed by the postal service.',
          'The seller is based in the United States. Where GDPR transfer rules apply to service providers, transfers are subject to applicable safeguards, such as the EU–US Data Privacy Framework where the recipient is certified, or the European Commission’s standard contractual clauses. You can contact us for information about applicable safeguards.',
        ] },
        { heading: 'Retention', paragraphs: [
          'We keep order data for as long as needed to handle the order and for the periods required by applicable commercial and recordkeeping law.',
        ] },
        { heading: 'Your rights', paragraphs: [
          'Depending on the circumstances, you can ask for access, rectification, erasure, restriction, portability or object to processing. Contact us at the privacy email above. You can also lodge a complaint with the Spanish Data Protection Agency (AEPD).',
        ], link: aepd },
        { heading: 'Cookies', paragraphs: [
          'The storefront does not set its own cookies. It uses your browser’s session storage to remember your cart in the current tab. Stripe sets necessary cookies on its hosted checkout to provide and secure payment.',
        ] },
      ],
    },
  },
  es: {
    notice: {
      title: 'Aviso legal',
      description: 'Quién gestiona la tienda BJJ Keychain y cómo contactar con nosotros.',
      sections: [
        { heading: 'Titular del sitio web y vendedor', paragraphs: [
          `BJJ Keychain (keychain.gymclass.cc) es un sitio de ${seller}, sociedad de responsabilidad limitada inscrita en Wyoming, Estados Unidos, el 18 de septiembre de 2023 (número de registro 2023-001332059).`,
          `Domicilio social: ${address}.`,
        ], link: support },
        { heading: 'Compras en este sitio web', paragraphs: [
          'Las condiciones de venta explican cómo funcionan los pedidos, la entrega, el desistimiento y la garantía. El aviso de privacidad explica cómo tratamos tus datos personales.',
        ] },
      ],
    },
    terms: {
      title: 'Condiciones de venta',
      description: 'Cómo funcionan los pedidos, la entrega, el desistimiento y la garantía en BJJ Keychain.',
      sections: [
        { heading: 'Vendedor y precios', paragraphs: [
          `El vendedor es ${seller}, inscrita en Wyoming con el número 2023-001332059. Domicilio social: ${address}.`,
          'Los precios se muestran en euros. Antes de que envíes el pedido, la página de pago muestra el precio final, incluidos los gastos de entrega que correspondan.',
        ], link: support },
        { heading: 'Pedidos y pago', paragraphs: [
          'Al enviar el pedido, se autoriza el pago con tarjeta. La autorización es una retención temporal, no un cobro. Revisamos el pedido y, si lo aceptamos, lo confirmamos y cobramos en un plazo de 7 días. Si no lo aceptamos, liberamos la autorización sin cobrarte. Tu banco determina cuándo desaparece la retención de tu cuenta.',
        ] },
        { heading: 'Recogida y entrega', paragraphs: [
          `Puedes recoger tu pedido gratis en ${pickup}. Acordaremos contigo la recogida.`,
          'El envío postal cuesta 5 € y solo está disponible en España peninsular. No enviamos a Baleares, Canarias, Ceuta o Melilla. Si el destino no es válido, cancelamos el pedido y liberamos la autorización sin realizar ningún cobro.',
          'Los pedidos con envío se entregan como máximo en 30 días naturales desde su aceptación, salvo que acordemos otro plazo contigo.',
        ], link: academy },
        { heading: 'Derecho de desistimiento', paragraphs: [
          `Si eres consumidor, puedes desistir sin indicar el motivo en un plazo de 14 días naturales desde la recepción de los bienes. Para desistir, escribe a ${support.label} o envía una declaración inequívoca a nuestro domicilio social antes de que venza el plazo. Puedes usar el formulario de abajo, pero no es obligatorio.`,
          'Ponte en contacto con nosotros para recibir las instrucciones de devolución. Envía los bienes de vuelta en los 14 días naturales siguientes a la comunicación del desistimiento. Tú asumes el coste directo de la devolución.',
          'Reembolsaremos los pagos recibidos, incluido el coste de la entrega ordinaria cuando corresponda, en los 14 días naturales siguientes a recibir tu comunicación, por el mismo medio de pago y sin gastos. Podemos retener el reembolso hasta recibir los bienes o hasta que presentes una prueba de su devolución, lo que ocurra primero.',
          'No ofrecemos devoluciones voluntarias fuera del plazo legal de desistimiento. Esto no limita tus derechos si los bienes son defectuosos o no se ajustan a lo anunciado.',
        ] },
        { heading: 'Modelo de formulario de desistimiento', paragraphs: [
          'Cumplimenta y envía este formulario solo si deseas desistir del contrato.',
          `A la atención de: ${seller}, ${address}, ${support.label}
Por la presente le comunico/comunicamos (*) que desisto de mi/desistimos de nuestro (*) contrato de venta del siguiente bien (*):
Pedido el (*) / recibido el (*):
Nombre del consumidor y usuario o de los consumidores y usuarios:
Domicilio del consumidor y usuario o de los consumidores y usuarios:
Firma del consumidor y usuario o de los consumidores y usuarios (solo si se presenta en papel):
Fecha:
(*) Táchese lo que no proceda.`,
        ] },
        { heading: 'Garantía legal', paragraphs: [
          'En las compras de consumo sujetas a la legislación española, los bienes tienen una garantía legal de tres años desde la entrega por falta de conformidad. Si un artículo es defectuoso o no se ajusta a lo anunciado, ponte en contacto con nosotros. Según la ley aplicable, las soluciones pueden incluir la reparación, la sustitución, una reducción del precio o un reembolso.',
        ], link: support },
      ],
    },
    privacy: {
      title: 'Privacidad',
      description: 'Qué datos usamos para gestionar la tienda y los pedidos, y cómo ejercer tus derechos.',
      sections: [
        { heading: 'Responsable del tratamiento', paragraphs: [
          `${seller} es la responsable del tratamiento. Su domicilio social es ${address}. Utiliza el correo de abajo para consultas de privacidad y solicitudes de ejercicio de derechos.`,
        ], link: privacy },
        { heading: 'Qué datos usamos y para qué', paragraphs: [
          'Al hacer un pedido mediante Stripe Checkout, recibimos el nombre, correo electrónico, teléfono, dirección de envío y datos del pedido necesarios para revisarlo y gestionarlo, cobrarlo, organizar la entrega o recogida y atender consultas sobre el pedido. La base jurídica son las medidas precontractuales solicitadas y la ejecución del contrato de compraventa. También conservamos registros cuando exista una obligación legal.',
          'Stripe gestiona los datos de la tarjeta. No recibimos el número completo de tu tarjeta.',
        ] },
        { heading: 'Proveedores y transferencias internacionales', paragraphs: [
          'Cloudflare aloja el sitio web. Stripe procesa los pagos y presta el servicio de Checkout; Stripe puede actuar como responsable independiente respecto al tratamiento que realice para cumplir sus propias obligaciones legales y regulatorias. Para los pedidos con envío, compartimos con el servicio postal los datos necesarios para la entrega.',
          'El vendedor está establecido en Estados Unidos. Cuando sean aplicables las reglas del RGPD sobre transferencias a proveedores, se aplicarán las garantías correspondientes, como el Marco de Privacidad de Datos UE–EE. UU. si el destinatario está certificado o las cláusulas contractuales tipo de la Comisión Europea. Puedes escribirnos para consultar las garantías aplicables.',
        ] },
        { heading: 'Conservación', paragraphs: [
          'Conservamos los datos del pedido durante el tiempo necesario para gestionarlo y durante los plazos exigidos por la normativa mercantil y de conservación de registros aplicable.',
        ] },
        { heading: 'Tus derechos', paragraphs: [
          'Según el caso, puedes ejercer los derechos de acceso, rectificación, supresión, limitación, portabilidad y oposición. Escríbenos al correo de privacidad indicado arriba. También puedes presentar una reclamación ante la Agencia Española de Protección de Datos (AEPD).',
        ], link: aepd },
        { heading: 'Cookies', paragraphs: [
          'La tienda no instala cookies propias. Utiliza el almacenamiento de sesión del navegador para recordar tu carrito en la pestaña actual. Stripe utiliza cookies necesarias en su página de pago para prestar y proteger el servicio.',
        ] },
      ],
    },
  },
};
