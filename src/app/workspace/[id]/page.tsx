'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { mdToHtml, buildPrintableHtml } from '@/lib/render-deliverable';

// ─── ENV ────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ─── HELPERS ────────────────────────────────────────────────────────────

/** Supabase REST wrapper */
async function supaRest(method: string, path: string, body?: any) {
  const headers: Record<string, string> = {
    apikey: SUPA_KEY,
    Authorization: `Bearer ${SUPA_KEY}`,
    'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation';
  const res = await fetch(`${SUPA_URL}/rest/v1/${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  return res;
}

/** Consume a streaming Response body into a single string */
async function readStream(res: Response): Promise<string> {
  const reader = res.body?.getReader();
  if (!reader) return '';
  const decoder = new TextDecoder();
  let text = '';
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
  }
  return text;
}

/** Open deliverable in styled popup using shared renderer */
function openPrintable(title: string, markdown: string, clientName: string, deliverableType?: string) {
  const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  const html = buildPrintableHtml(markdown, title, clientName, date, deliverableType);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── DELIVERABLE TYPE DEFINITIONS ───────────────────────────────────────

interface Field { key: string; label: string; type: 'text' | 'textarea' | 'select'; options?: string[] }
interface DeliverableType { id: string; label: string; desc: string; icon: string; fields: Field[] }

const DELIVERABLE_TYPES: DeliverableType[] = [
  { id: 'strategie_360', label: 'Stratégie 360', desc: 'Stratégie complète 6 phases', icon: '🎯',
    fields: [{ key: 'strategy_type', label: 'Type de stratégie', type: 'select',
      options: ['strategie_360','audit_rapide','plan_lancement','optimisation','scaling'] }] },
  { id: 'rapport_leadgen', label: 'Rapport Lead Gen', desc: 'Analyse performance lead generation', icon: '📊', fields: [] },
  { id: 'rapport_ecommerce', label: 'Rapport E-commerce', desc: 'Analyse performance e-commerce', icon: '🛒', fields: [] },
  { id: 'rapport_coaching', label: 'Rapport Coaching', desc: 'Analyse performance coaching', icon: '📈', fields: [] },
  { id: 'diagnostic', label: 'Diagnostic Rapide', desc: "Analyse rapide d'un problème", icon: '🔍',
    fields: [{ key: 'problem', label: 'Problème à diagnostiquer', type: 'textarea' }] },
  { id: 'brief_creatif', label: 'Brief Créatif', desc: 'Brief pour créatifs et copies', icon: '🎨',
    fields: [{ key: 'brief_context', label: 'Contexte du brief', type: 'textarea' }] },
  { id: 'resume_client', label: 'Résumé Client', desc: 'Résumé exécutif du client', icon: '📋', fields: [] },
];

// ─── CONTENT GENERATION ─────────────────────────────────────────────────

interface ClientData {
  id: string; name: string; industry?: string; status?: string;
  health_score?: number; meta_data?: any; retainer_monthly?: number;
}

async function generateContent(
  type: string, client: ClientData, inputs: Record<string, string>
): Promise<string> {
  const clientName = client.name;
  const industry = client.industry || 'Non défini';

  // ── Strategy → FastAPI (no auth cookies needed) ──
  if (type === 'strategie_360') {
    const res = await fetch('/api/strategy/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_name: clientName, industry,
        strategy_type: inputs.strategy_type || 'strategie_360',
        context: inputs.notes || '',
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erreur stratégie (${res.status}): ${errText || 'Serveur inaccessible'}`);
    }
    const data = await res.json();
    const phases = ['audit','research','strategy','build','launch','scale','kpis'];
    return phases.filter(p => data[p])
      .map(p => `## ${p.charAt(0).toUpperCase() + p.slice(1)}\n\n${data[p]}`)
      .join('\n\n---\n\n');
  }

  // ── Reports → Next.js streaming (needs credentials) ──
  if (type.startsWith('rapport_')) {
    const typeMap: Record<string,string> = {
      rapport_leadgen: 'leadgen', rapport_ecommerce: 'ecommerce', rapport_coaching: 'coach',
    };
    const res = await fetch('/api/recommendations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client: clientName,
        reportType: typeMap[type] || 'leadgen',
        context: inputs.notes || '',
      }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erreur rapport (${res.status}): ${errText || 'Vérifiez votre connexion'}`);
    }
    return await readStream(res);
  }

  // ── Diagnostic / Brief / Résumé → Next.js chat streaming ──
  const systemPrompts: Record<string,string> = {
    diagnostic: `Tu es un expert en diagnostic marketing. Analyse le problème décrit pour ${clientName} (${industry}). Fournis un diagnostic structuré avec causes possibles, impact, et recommandations d'action prioritaires.`,
    brief_creatif: `Tu es un directeur créatif senior. Crée un brief créatif professionnel pour ${clientName} (${industry}). Inclus: objectifs, audience cible, ton et style, messages clés, formats recommandés, et inspirations.`,
    resume_client: `Tu es un account manager senior. Crée un résumé exécutif complet pour ${clientName} (${industry}). Inclus: situation actuelle, performances clés, enjeux principaux, opportunités, et prochaines étapes recommandées.`,
  };

  const userMessage = type === 'diagnostic'
    ? `Diagnostique ce problème pour ${clientName}: ${inputs.problem || 'Analyse générale'}`
    : type === 'brief_creatif'
    ? `Crée un brief créatif pour ${clientName}: ${inputs.brief_context || 'Brief général'}`
    : `Crée un résumé exécutif complet pour ${clientName}`;

  const res = await fetch('/api/chat', {
    method: 'POST', credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      system: systemPrompts[type] || systemPrompts.diagnostic,
      messages: [{ role: 'user', content: userMessage }],
    }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Erreur génération (${res.status}): ${errText || 'Vérifiez votre connexion'}`);
  }
  return await readStream(res);
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────

export default function WorkspacePage() {
  const params = useParams();
  const clientId = params?.id as string;

  // ── State ──
  const [client, setClient] = useState<ClientData | null>(null);
  const [loadingClient, setLoadingClient] = useState(true);
  const [clientError, setClientError] = useState('');

  const [tab, setTab] = useState<'overview' | 'deliverables' | 'context'>('overview');

  const [selectedType, setSelectedType] = useState<string>('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [generating, setGenerating] = useState(false);
  const [genStatus, setGenStatus] = useState('');
  const [output, setOutput] = useState('');
  const [genError, setGenError] = useState('');

  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const [notes, setNotes] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Load client on mount ──
  useEffect(() => {
    if (!clientId) return;
    setLoadingClient(true);
    fetch(`https://app.partenaire.io/api/client-hub/clients`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((clients: ClientData[]) => {
        const found = clients.find((c: ClientData) => c.id === clientId);
        if (!found) throw new Error('Client introuvable dans la liste');
        setClient(found);
        setNotes(found.meta_data?.notes || '');
      })
      .catch(e => setClientError(e.message))
      .finally(() => setLoadingClient(false));
  }, [clientId]);

  // ── Load deliverable history from Supabase ──
  const loadHistory = useCallback(async () => {
    if (!clientId) return;
    setLoadingHistory(true);
    try {
      const res = await supaRest('GET',
        `client_deliverables?client_id=eq.${clientId}&order=created_at.desc&limit=20`);
      if (res.ok) setHistory(await res.json());
    } catch (_) { /* silent */ }
    setLoadingHistory(false);
  }, [clientId]);

  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Generate handler ──
  const handleGenerate = async () => {
    if (!client || !selectedType) return;
    setGenerating(true);
    setGenError('');
    setOutput('');
    const typeDef = DELIVERABLE_TYPES.find(d => d.id === selectedType);
    setGenStatus(`Génération "${typeDef?.label}" en cours…`);
    try {
      const allInputs = { ...inputs, notes };
      const content = await generateContent(selectedType, client, allInputs);
      setOutput(content);
      setGenStatus('Sauvegarde…');

      // Save to Supabase
      await supaRest('POST', 'client_deliverables', {
        client_id: clientId,
        type: selectedType,
        title: `${typeDef?.label} — ${client.name}`,
        content,
        metadata: { inputs: allInputs, generated_at: new Date().toISOString() },
      });
      setGenStatus('');
      loadHistory(); // refresh timeline
    } catch (e: any) {
      setGenError(e.message || 'Erreur inconnue');
      setGenStatus('');
    } finally {
      setGenerating(false);
    }
  };

  // ── Save notes ──
  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    try {
      // Update via client-hub if available, otherwise store in Supabase
      const meta = { ...(client.meta_data || {}), notes };
      await supaRest('PATCH',
        `client_hub_clients?id=eq.${clientId}`,
        { meta_data: meta });
      setClient({ ...client, meta_data: meta });
    } catch (_) { /* best effort */ }
    setSavingNotes(false);
  };


  const downloadDocx = async () => {
    if (!output || !client || !selectedType) return;
    try {
      const res = await fetch('/api/deliverable/export-docx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: selectedType,
          client_name: client.name,
          industry: client.industry || '',
          content: output,
        }),
      });
      if (!res.ok) throw new Error('Erreur export DOCX');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = selectedType + '_' + client.name.replace(/ /g, '_') + '.docx';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) {
      alert('Erreur DOCX: ' + (e instanceof Error ? e.message : 'Erreur inconnue'));
    }
  };


  // ─── RENDER ───────────────────────────────────────────────────────────

  // Loading / Error states
  if (loadingClient) 

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-[#E8912D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Chargement du client…</p>
      </div>
    </div>
  );

  if (clientError || !client) return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-6 max-w-md text-center">
        <p className="text-red-400 text-lg font-semibold mb-2">Erreur</p>
        <p className="text-gray-400">{clientError || 'Client introuvable'}</p>
        <a href="/dashboard/clients" className="inline-block mt-4 text-[#E8912D] hover:underline text-sm">
          ← Retour aux clients
        </a>
      </div>
    </div>
  );

  const typeDef = DELIVERABLE_TYPES.find(d => d.id === selectedType);

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* ── Header ── */}
      <div className="border-b border-white/10 bg-[#0a0a0a]/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div>
            <a href="/dashboard/clients" className="text-gray-500 text-xs hover:text-gray-300 mb-1 inline-block">
              ← Clients
            </a>
            <h1 className="text-xl font-bold">{client.name}</h1>
            <p className="text-sm text-gray-500">{client.industry || 'Industrie non définie'}</p>
          </div>
          <div className="flex items-center gap-3">
            {client.health_score != null && (
              <div className={`text-xs font-medium px-2.5 py-1 rounded-full ${
                client.health_score >= 75 ? 'bg-green-500/20 text-green-400' :
                client.health_score >= 50 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-red-500/20 text-red-400'
              }`}>
                Score: {client.health_score}
              </div>
            )}
            {client.status && (
              <div className="text-xs font-medium px-2.5 py-1 rounded-full bg-[#E8912D]/20 text-[#E8912D]">
                {client.status}
              </div>
            )}
          </div>
        </div>

        {/* ── Tabs ── */}
        <div className="max-w-6xl mx-auto px-6 flex gap-1">
          {([
            ['overview', "Vue d'ensemble"],
            ['deliverables', 'Livrables'],
            ['context', 'Contexte'],
          ] as const).map(([key, label]) => (
            <button key={key} onClick={() => setTab(key)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === key
                  ? 'border-[#E8912D] text-[#E8912D]'
                  : 'border-transparent text-gray-500 hover:text-gray-300'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">

        {/* ════════════ TAB: VUE D'ENSEMBLE ════════════ */}
        {tab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Stats cards */}
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              {[
                { label: 'Retainer mensuel', value: client.retainer_monthly ? `${client.retainer_monthly.toLocaleString()} $` : '—' },
                { label: 'Score santé', value: client.health_score != null ? `${client.health_score}/100` : '—' },
                { label: 'Statut', value: client.status || '—' },
                { label: 'Industrie', value: client.industry || '—' },
              ].map((s, i) => (
                <div key={i} className="bg-white/5 border border-white/10 rounded-lg p-4">
                  <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                  <p className="text-lg font-semibold text-white">{s.value}</p>
                </div>
              ))}
            </div>

            {/* Quick actions */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Actions rapides</h3>
              <div className="space-y-2">
                {DELIVERABLE_TYPES.slice(0, 4).map(dt => (
                  <button key={dt.id}
                    onClick={() => { setSelectedType(dt.id); setTab('deliverables'); }}
                    className="w-full text-left px-3 py-2 rounded-md bg-white/5 hover:bg-[#E8912D]/10 border border-white/5 hover:border-[#E8912D]/30 transition-all text-sm"
                  >
                    <span className="mr-2">{dt.icon}</span>{dt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recent deliverables */}
            <div className="lg:col-span-3 bg-white/5 border border-white/10 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-4">Derniers livrables</h3>
              {history.length === 0 ? (
                <p className="text-gray-600 text-sm">Aucun livrable généré encore.</p>
              ) : (
                <div className="space-y-2">
                  {history.slice(0, 5).map((h: any) => (
                    <div key={h.id} className="flex items-center justify-between px-3 py-2 rounded-md bg-white/5">
                      <div>
                        <p className="text-sm text-white">{h.title}</p>
                        <p className="text-xs text-gray-500">{new Date(h.created_at).toLocaleDateString('fr-CA')}</p>
                      </div>
                      <button onClick={() => openPrintable(h.title, h.content || '', client.name)}
                        className="text-xs text-[#E8912D] hover:underline">Ouvrir</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ════════════ TAB: LIVRABLES ════════════ */}
        {tab === 'deliverables' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left: Type selection */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-400 mb-2">Type de livrable</h3>
              {DELIVERABLE_TYPES.map(dt => (
                <button key={dt.id}
                  onClick={() => { setSelectedType(dt.id); setInputs({}); setOutput(''); setGenError(''); }}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all ${
                    selectedType === dt.id
                      ? 'bg-[#E8912D]/10 border-[#E8912D]/50 text-white'
                      : 'bg-white/5 border-white/10 text-gray-400 hover:border-white/20 hover:text-white'
                  }`}
                >
                  <span className="mr-2 text-lg">{dt.icon}</span>
                  <span className="font-medium text-sm">{dt.label}</span>
                  <p className="text-xs text-gray-500 mt-0.5 ml-7">{dt.desc}</p>
                </button>
              ))}
            </div>

            {/* Right: Form + output */}
            <div className="lg:col-span-2 space-y-6">
              {/* Dynamic fields */}
              {typeDef && typeDef.fields.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-lg p-5 space-y-4">
                  <h3 className="text-sm font-semibold text-gray-400">Paramètres</h3>
                  {typeDef.fields.map(f => (
                    <div key={f.key}>
                      <label className="block text-xs text-gray-500 mb-1">{f.label}</label>
                      {f.type === 'select' ? (
                        <select
                          value={inputs[f.key] || f.options?.[0] || ''}
                          onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white focus:border-[#E8912D] focus:outline-none"
                        >
                          {f.options?.map(o => <option key={o} value={o} className="bg-[#1a1a1a]">{o}</option>)}
                        </select>
                      ) : f.type === 'textarea' ? (
                        <textarea
                          value={inputs[f.key] || ''}
                          onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                          rows={3}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#E8912D] focus:outline-none resize-none"
                          placeholder={f.label}
                        />
                      ) : (
                        <input type="text"
                          value={inputs[f.key] || ''}
                          onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                          className="w-full bg-white/5 border border-white/10 rounded-md px-3 py-2 text-sm text-white placeholder-gray-600 focus:border-[#E8912D] focus:outline-none"
                          placeholder={f.label}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Generate button */}
              {selectedType && (
                <button onClick={handleGenerate} disabled={generating}
                  className={`w-full py-3 rounded-lg font-semibold text-sm transition-all ${
                    generating
                      ? 'bg-[#E8912D]/30 text-[#E8912D] cursor-wait'
                      : 'bg-[#E8912D] text-white hover:bg-[#d07e25] active:scale-[0.98]'
                  }`}
                >
                  {generating ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      {genStatus || 'Génération en cours…'}
                    </span>
                  ) : (
                    `Générer ${typeDef?.label || ''}`
                  )}
                </button>
              )}

              {/* Error display */}
              {genError && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4">
                  <p className="text-red-400 text-sm font-medium">Erreur de génération</p>
                  <p className="text-red-300/70 text-xs mt-1">{genError}</p>
                </div>
              )}

              {/* Output */}
              {output && (
                <div className="bg-white/5 border border-white/10 rounded-lg overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
                    <h3 className="text-sm font-semibold text-[#E8912D]">Résultat</h3>
                    <div className="flex items-center gap-3">
                      <button onClick={() => openPrintable(
                        `${typeDef?.label} — ${client.name}`, output, client.name, typeDef?.id
                      )} className="text-xs text-[#E8912D] hover:underline flex items-center gap-1">
                        ↗ Ouvrir
                      </button>
                      <button onClick={downloadDocx}
                        className="text-xs bg-[#E8912D] text-white px-3 py-1 rounded hover:bg-[#d17e24] flex items-center gap-1">
                        ⬇ Télécharger DOCX
                      </button>
                    </div>
                  </div>
                  <div className="p-6 max-h-[600px] overflow-y-auto text-sm leading-relaxed"
                    style={{ fontFamily: "'Inter', system-ui, sans-serif" }}
                    dangerouslySetInnerHTML={{ __html: mdToHtml(output) }}
                  />
                </div>
              )}

              {/* History timeline */}
              <div className="bg-white/5 border border-white/10 rounded-lg p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-semibold text-gray-400">Historique</h3>
                  <button onClick={loadHistory} disabled={loadingHistory}
                    className="text-xs text-gray-500 hover:text-[#E8912D]">
                    {loadingHistory ? '…' : '↻ Rafraîchir'}
                  </button>
                </div>
                {history.length === 0 ? (
                  <p className="text-gray-600 text-sm">Aucun livrable.</p>
                ) : (
                  <div className="space-y-3">
                    {history.map((h: any) => (
                      <div key={h.id} className="flex items-start gap-3 group">
                        <div className="mt-1.5 w-2 h-2 rounded-full bg-[#E8912D] shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm text-white truncate">{h.title}</p>
                            <span className="text-xs text-gray-600 shrink-0 ml-2">
                              {new Date(h.created_at).toLocaleDateString('fr-CA')}
                            </span>
                          </div>
                          <div className="flex gap-2 mt-1">
                            <button onClick={() => { setOutput(h.content || ''); }}
                              className="text-xs text-gray-500 hover:text-white">Afficher</button>
                            <button onClick={() => openPrintable(h.title, h.content || '', client.name)}
                              className="text-xs text-gray-500 hover:text-[#E8912D]">Ouvrir</button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ════════════ TAB: CONTEXTE ════════════ */}
        {tab === 'context' && (
          <div className="max-w-2xl space-y-6">
            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Notes & Contexte client</h3>
              <p className="text-xs text-gray-600 mb-3">
                Ces notes sont utilisées comme contexte lors de la génération des livrables.
              </p>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={12}
                className="w-full bg-white/5 border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder-gray-600 focus:border-[#E8912D] focus:outline-none resize-none"
                placeholder="Ajoutez des notes sur ce client : objectifs, problématiques, historique, KPI cibles…"
              />
              <button onClick={saveNotes} disabled={savingNotes}
                className="mt-3 px-5 py-2 rounded-lg bg-[#E8912D] text-white text-sm font-medium hover:bg-[#d07e25] disabled:opacity-50 transition-all"
              >
                {savingNotes ? 'Sauvegarde…' : 'Sauvegarder les notes'}
              </button>
            </div>

            {/* Client metadata display */}
            <div className="bg-white/5 border border-white/10 rounded-lg p-5">
              <h3 className="text-sm font-semibold text-gray-400 mb-3">Informations client</h3>
              <dl className="space-y-2 text-sm">
                {[
                  ['ID', client.id],
                  ['Nom', client.name],
                  ['Industrie', client.industry || '—'],
                  ['Statut', client.status || '—'],
                  ['Score santé', client.health_score != null ? `${client.health_score}/100` : '—'],
                  ['Retainer', client.retainer_monthly ? `${client.retainer_monthly.toLocaleString()} $/mois` : '—'],
                ].map(([k, v]) => (
                  <div key={k as string} className="flex justify-between">
                    <dt className="text-gray-500">{k}</dt>
                    <dd className="text-white">{v}</dd>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
