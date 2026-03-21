import { streamWithFallback } from '@/lib/ai';

export const maxDuration = 120;

function errorResponse(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function POST(req: Request) {
  let body: unknown;

  try {
    body = await req.json();
  } catch {
    return errorResponse('Invalid JSON body.', 400);
  }

  if (!body || typeof body !== 'object') {
    return errorResponse('Request body must be an object.', 400);
  }

  const client =
    'client' in body && typeof body.client === 'string' ? body.client.trim() : '';
  const reportType =
    'reportType' in body && typeof body.reportType === 'string'
      ? body.reportType.trim().toLowerCase()
      : '';
  const context =
    'context' in body && typeof body.context === 'string'
      ? body.context.trim()
      : '';

  const typePrompts: Record<string, string> = {
    leadgen: "Analyse le funnel Lead Gen: Ad Spend, Clicks, CPC, CTR, CPL, Leads, Booking Rate, Appointments, Closes, Revenue, ROAS.",
    coach: "Analyse le funnel Coach/High-Ticket: Leads, Applications, R1, R2, Ventes, Cash Collected, ROAS, Cash ROAS.",
    ecommerce: "Analyse le funnel eCommerce: Ajout panier, Checkout Initiated, Ventes, Total Ventes, ROAS.",
  };

  if (!client) {
    return errorResponse('Client is required.', 400);
  }

  if (!reportType) {
    return errorResponse('Report type is required.', 400);
  }

  return streamWithFallback({
    messages: [
      {
        content: `Client: ${client}\nType: ${reportType}\nContexte: ${context || 'Aucun'}\n\nGenere 3-5 recommandations strategiques specifiques.`,
        role: 'user',
      },
    ],
    purpose: 'recommendations',
    system: `Tu es un expert en marketing digital chez Partenaire.io. Genere des recommandations specifiques et actionnables en francais. ${typePrompts[reportType] || typePrompts.leadgen}`,
  });
}
