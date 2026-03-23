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
    leadgen: "Analyse le funnel Lead Gen: Ad Spend, Clicks, CPC, CTR, CPL, Leads, Booking Rate, Appointments, Closes, Revenue, ROAS. Structure: 1) Resume executif (2-3 phrases), 2) Forces identifiees, 3) Faiblesses et opportunites, 4) Recommandations priorisees (Haute/Moyenne/Basse), 5) Plan d'action 30 jours.",
    coach: "Analyse le funnel Coach/High-Ticket: Leads, Applications, R1, R2, Ventes, Cash Collected, ROAS, Cash ROAS. Structure: 1) Resume executif, 2) Analyse du pipeline, 3) Taux de conversion par etape, 4) Recommandations pour augmenter le close rate, 5) Plan d'action 30 jours.",
    ecommerce: "Analyse le funnel eCommerce: Ajout panier, Checkout Initiated, Ventes, Total Ventes, ROAS, AOV, Taux de retour. Structure: 1) Resume executif, 2) Performance par categorie, 3) Opportunites d'optimisation (panier abandonne, upsell, email), 4) Recommandations priorisees, 5) Plan d'action 30 jours.",
    multicanal: "Analyse MULTI-CANAL combinant Meta Ads + Google Ads. Compare les performances par plateforme. Structure: 1) Resume executif multi-canal, 2) Performance Meta Ads (Spend, Leads, CPL, ROAS), 3) Performance Google Ads (Spend, Clicks, Conversions, CPA, ROAS), 4) Comparaison et allocation budgetaire recommandee, 5) Synergies cross-canal, 6) Plan d'optimisation 30 jours.",
    social: "Analyse des RESEAUX SOCIAUX organiques: portee, engagement, croissance des abonnes, performance du contenu. Structure: 1) Resume executif, 2) Metriques cles (portee, engagement rate, croissance), 3) Types de contenu qui performent le mieux, 4) Frequence de publication recommandee, 5) Idees de contenu pour les 30 prochains jours, 6) Strategie de hashtags et tendances.",
    video: "Analyse de la PERFORMANCE VIDEO: vues, retention, engagement, CTR, partages. Structure: 1) Resume executif, 2) Metriques video (vues, watch time, retention, engagement), 3) Types de videos qui performent (Reels, TikTok, YouTube), 4) Recommandations de format et duree, 5) Calendrier de contenu video 30 jours, 6) Tendances et hooks a exploiter.",
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
        content: `Client: ${client}\nType de rapport: ${reportType}\nContexte et donnees:\n${context || 'Aucun contexte disponible'}\n\nGenere un rapport d'analyse professionnel avec des recommandations strategiques specifiques, priorisees et actionnables. Utilise des headers et une structure claire.`,
        role: 'user',
      },
    ],
    purpose: 'recommendations',
    system: `Tu es un strategiste marketing senior chez Partenaire.io, une agence de croissance qui gere 69+ clients au Quebec.

REGLES DE FORMAT:
- Utilise des headers markdown (## pour sections, ### pour sous-sections)
- Chaque recommandation doit etre SPECIFIQUE au client, pas generique
- Inclus des chiffres concrets et des benchmarks de l'industrie
- Priorise: Haute (impact immediat), Moyenne (moyen terme), Basse (nice-to-have)
- Maximum 400 mots. CONCIS et DIRECT.
- Termine avec un plan d'action clair en 3 etapes

${typePrompts[reportType] || typePrompts.leadgen}`,
  });
}
