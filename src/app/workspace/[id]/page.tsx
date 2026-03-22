'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { mdToHtml, buildPrintableHtml } from '@/lib/render-deliverable';
import { BentoGrid } from '@/components/ui/bento-grid';

// ─── ENV ────────────────────────────────────────────────────────────────
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPA_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// ─── ANIMATION VARIANTS ────────────────────────────────────────────────
const fadeIn = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 } };
const stagger = { animate: { transition: { staggerChildren: 0.06 } } };
const cardHover = { rest: { scale: 1 }, hover: { scale: 1.015, transition: { duration: 0.2 } } };

// ─── HELPERS ────────────────────────────────────────────────────────────
async function supaRest(method: string, path: string, body?: any) {
  const headers: Record<string, string> = {
    apikey: SUPA_KEY, Authorization: `Bearer ${SUPA_KEY}`, 'Content-Type': 'application/json',
  };
  if (method === 'POST') headers['Prefer'] = 'return=representation';
  return fetch(`${SUPA_URL}/rest/v1/${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
}

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

function openPrintable(title: string, markdown: string, clientName: string, deliverableType?: string) {
  const date = new Date().toLocaleDateString('fr-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  const html = buildPrintableHtml(markdown, title, clientName, date, deliverableType);
  const w = window.open('', '_blank');
  if (w) { w.document.write(html); w.document.close(); }
}

// ─── DELIVERABLE TYPES ─────────────────────────────────────────────────
interface Field { key: string; label: string; type: 'text' | 'textarea' | 'select'; options?: string[] }
interface DeliverableType { id: string; label: string; desc: string; icon: string; fields: Field[] }

const DELIVERABLE_TYPES: DeliverableType[] = [
  { id: 'strategie_360', label: 'Stratégie 360', desc: '6 phases', icon: '🎯',
    fields: [{ key: 'strategy_type', label: 'Type de stratégie', type: 'select',
      options: ['strategie_360','audit_rapide','plan_lancement','optimisation','scaling'] }] },
  { id: 'rapport_leadgen', label: 'Rapport Lead Gen', desc: 'Lead Gen', icon: '📊', fields: [] },
  { id: 'rapport_ecommerce', label: 'Rapport E-commerce', desc: 'E-commerce', icon: '🛒', fields: [] },
  { id: 'rapport_coaching', label: 'Rapport Coaching', desc: 'Coaching', icon: '📈', fields: [] },
  { id: 'diagnostic', label: 'Diagnostic Rapide', desc: "Problème spécifique", icon: '🔍',
    fields: [{ key: 'problem', label: 'Problème à diagnostiquer', type: 'textarea' }] },
  { id: 'brief_creatif', label: 'Brief Créatif', desc: 'Créatifs & copies', icon: '🎨',
    fields: [{ key: 'brief_context', label: 'Contexte du brief', type: 'textarea' }] },
  { id: 'resume_client', label: 'Résumé Client', desc: "Vue d'ensemble", icon: '📋', fields: [] },
];

// ─── CONTENT GENERATION ─────────────────────────────────────────────────
interface ClientData {
  id: string; name: string; industry?: string; status?: string;
  health_score?: number; meta_data?: any; retainer_monthly?: number; facebook_url?: string; instagram_url?: string; tiktok_url?: string; youtube_url?: string; linkedin_url?: string;
}

async function generateContent(
  type: string, client: ClientData, inputs: Record<string, string>
): Promise<string> {
  const clientName = client.name;
  const industry = client.industry || 'Non défini';

  if (type === 'strategie_360') {
    const res = await fetch('/api/strategy/generate', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
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

  if (type.startsWith('rapport_')) {
    const typeMap: Record<string,string> = {
      rapport_leadgen: 'leadgen', rapport_ecommerce: 'ecommerce', rapport_coaching: 'coach',
    };
    const res = await fetch('/api/recommendations', {
      method: 'POST', credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ client: clientName, reportType: typeMap[type] || 'leadgen', context: inputs.notes || '' }),
    });
    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Erreur rapport (${res.status}): ${errText || 'Vérifiez votre connexion'}`);
    }
    return await readStream(res);
  }

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
    body: JSON.stringify({ system: systemPrompts[type] || systemPrompts.diagnostic, messages: [{ role: 'user', content: userMessage }] }),
  });
  if (!res.ok) {
    const errText = await res.text().catch(() => '');
    throw new Error(`Erreur génération (${res.status}): ${errText || 'Vérifiez votre connexion'}`);
  }
  return await readStream(res);
}


// ─── REUSABLE UI COMPONENTS ─────────────────────────────────────────────

function KpiCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <motion.div
      variants={cardHover} initial="rest" whileHover="hover"
      className="group relative overflow-hidden rounded-2xl bg-[#1a1a1f] p-6 cursor-default
        transition-colors duration-200 hover:bg-[#1f1f25]"
    >
      <div className="absolute inset-0 rounded-2xl border border-white/[0.04] group-hover:border-[#E8912D]/20 transition-colors duration-300" />
      <p className="text-xs tracking-wide text-gray-500 uppercase mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>{label}</p>
      <p className={`text-2xl font-bold ${accent ? 'text-[#E8912D]' : 'text-white'}`} style={{ fontFamily: 'Arial, sans-serif' }}>
        {value}
      </p>
    </motion.div>
  );
}

function DeliverableCard({ dt, selected, onClick }: { dt: DeliverableType; selected: boolean; onClick: () => void }) {
  return (
    <motion.button
      variants={cardHover} initial="rest" whileHover="hover"
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-5 transition-all duration-200 relative overflow-hidden ${
        selected
          ? 'bg-[#E8912D]/8 ring-1 ring-[#E8912D]/40'
          : 'bg-[#1a1a1f] hover:bg-[#1f1f25]'
      }`}
    >
      {!selected && <div className="absolute inset-0 rounded-2xl border border-white/[0.04] group-hover:border-white/10 transition-colors" />}
      <div className="flex items-start gap-4">
        <span className="text-2xl mt-0.5">{dt.icon}</span>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-white" style={{ fontFamily: 'Arial, sans-serif' }}>{dt.label}</p>
          <p className="text-xs text-gray-500 mt-1 leading-relaxed">{dt.desc}</p>
        </div>
      </div>
    </motion.button>
  );
}

function HistoryItem({ h, onShow, onOpen }: { h: any; onShow: () => void; onOpen: () => void }) {
  return (
    <motion.div variants={fadeIn}
      className="flex items-center justify-between py-3 group"
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <div className="w-1.5 h-1.5 rounded-full bg-[#E8912D] shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="text-sm text-white truncate" style={{ fontFamily: 'Arial, sans-serif' }}>{h.title}</p>
          <p className="text-xs text-gray-600 mt-0.5">{new Date(h.created_at).toLocaleDateString('fr-CA')}</p>
        </div>
      </div>
      <div className="flex items-center gap-3 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
        <button onClick={onShow} className="text-xs text-gray-400 hover:text-white transition-colors">Afficher</button>
        <button onClick={onOpen} className="text-xs text-[#E8912D] hover:text-[#f0a040] transition-colors">Ouvrir</button>
      </div>
    </motion.div>
  );
}

// ─── MAIN COMPONENT ─────────────────────────────────────────────────────
export default function WorkspacePage() {
  const params = useParams();
  const clientId = params?.id as string;

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
  const [socialUrls, setSocialUrls] = useState<{facebook_url?: string; instagram_url?: string; tiktok_url?: string; youtube_url?: string; linkedin_url?: string}>({});
  const [savingSocials, setSavingSocials] = useState(false);
  const [googleAds, setGoogleAds] = useState<any>(null);
  const [savingNotes, setSavingNotes] = useState(false);

  // ── Load client ──
  useEffect(() => {
    if (!clientId) return;
    setLoadingClient(true);
    fetch(`https://app.partenaire.io/api/client-hub/clients`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((clients: ClientData[]) => {
        const found = clients.find((c: ClientData) => c.id === clientId);
        if (!found) throw new Error('Client introuvable');
        setClient(found);
        setNotes(found.meta_data?.notes || '');
        setSocialUrls({
          facebook_url: found.facebook_url || '',
          instagram_url: found.instagram_url || '',
          tiktok_url: found.tiktok_url || '',
          youtube_url: found.youtube_url || '',
          linkedin_url: found.linkedin_url || '',
        });
        // Fetch Google Ads data
        fetch('/api/google-ads/by-client/' + clientId + '?days=30', { credentials: 'include' })
          .then(r => r.json())
          .then(d => { if (d.has_google_ads) setGoogleAds(d); })
          .catch(() => {});
      })
      .catch(e => setClientError(e.message))
      .finally(() => setLoadingClient(false));
  }, [clientId]);

  // ── Load history ──
  const loadHistory = useCallback(async () => {
    if (!clientId) return;
    setLoadingHistory(true);
    try {
      const res = await supaRest('GET', `client_deliverables?client_id=eq.${clientId}&order=created_at.desc&limit=20`);
      if (res.ok) setHistory(await res.json());
    } catch (_) {}
    setLoadingHistory(false);
  }, [clientId]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  // ── Generate ──
  const handleGenerate = async () => {
    if (!client || !selectedType) return;
    setGenerating(true); setGenError(''); setOutput('');
    const typeDef = DELIVERABLE_TYPES.find(d => d.id === selectedType);
    setGenStatus(`Génération "${typeDef?.label}" en cours…`);
    try {
      const allInputs = { ...inputs, notes };
      const content = await generateContent(selectedType, client, allInputs);
      setOutput(content);
      setGenStatus('Sauvegarde…');
      await supaRest('POST', 'client_deliverables', {
        client_id: clientId, type: selectedType,
        title: `${typeDef?.label} — ${client.name}`, content,
        metadata: { inputs: allInputs, generated_at: new Date().toISOString() },
      });
      setGenStatus('');
      loadHistory();
    } catch (e: any) {
      setGenError(e.message || 'Erreur inconnue');
      setGenStatus('');
    } finally { setGenerating(false); }
  };

  // ── Save notes ──
  const saveNotes = async () => {
    if (!client) return;
    setSavingNotes(true);
    try {
      const meta = { ...(client.meta_data || {}), notes };
      await supaRest('PATCH', `clients?id=eq.${clientId}`, { meta_data: meta });
      setClient({ ...client, meta_data: meta });
    } catch (_) {}
    setSavingNotes(false);
  };

  // ── Export DOCX ──
  const downloadDocx = async () => {
    if (!output || !client || !selectedType) return;
    try {
      const res = await fetch('/api/deliverable/export-docx', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: selectedType, client_name: client.name, industry: client.industry || '', content: output }),
      });
      if (!res.ok) throw new Error('Erreur export DOCX');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `${selectedType}_${client.name.replace(/ /g, '_')}.docx`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (e) { alert('Erreur DOCX: ' + (e instanceof Error ? e.message : 'Erreur')); }
  };

  // ─── RENDER ────────────────────────────────────────────────────────────

  if (loadingClient) return (
    <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
        <div className="w-8 h-8 border-2 border-[#E8912D] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-500 text-sm" style={{ fontFamily: 'Arial, sans-serif' }}>Chargement…</p>
      </motion.div>
    </div>
  );

  if (clientError || !client) return (
    <div className="min-h-screen bg-[#0f0f12] flex items-center justify-center">
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-red-500/5 rounded-2xl p-8 max-w-sm text-center">
        <p className="text-red-400 font-semibold mb-2" style={{ fontFamily: 'Arial, sans-serif' }}>Erreur</p>
        <p className="text-gray-500 text-sm">{clientError || 'Client introuvable'}</p>
        <a href="/clients" className="inline-block mt-4 text-[#E8912D] text-sm hover:underline">← Retour</a>
      </motion.div>
    </div>
  );

  const typeDef = DELIVERABLE_TYPES.find(d => d.id === selectedType);
  const tabs = [
    { key: 'overview' as const, label: "Vue d'ensemble" },
    { key: 'deliverables' as const, label: 'Livrables' },
    { key: 'context' as const, label: 'Contexte' },
  ];

  return (
    <div className="min-h-screen bg-[#0f0f12] text-white" style={{ fontFamily: 'Arial, sans-serif' }}>

      {/* ── Header — clean, minimal ── */}
      <div className="sticky top-0 z-10 bg-[#0f0f12]/90 backdrop-blur-xl border-b border-white/[0.04]">
        <div className="max-w-5xl mx-auto px-6 pt-5 pb-0">
          <div className="flex items-end justify-between mb-5">
            <div>
              <a href="/clients" className="text-gray-600 text-xs hover:text-gray-400 transition-colors">← Clients</a>
              <h1 className="text-2xl font-bold mt-1 tracking-tight">{client.name}</h1>
              <p className="text-sm text-gray-600 mt-0.5">{client.industry || '—'}</p>
            </div>
            <div className="flex items-center gap-2 pb-1">
              {client.health_score != null && (
                <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                  client.health_score >= 75 ? 'bg-emerald-500/10 text-emerald-400' :
                  client.health_score >= 50 ? 'bg-amber-500/10 text-amber-400' :
                  'bg-red-500/10 text-red-400'
                }`}>{client.health_score}/100</span>
              )}
              {client.status && (
                <span className="text-xs font-medium px-3 py-1 rounded-full bg-[#E8912D]/10 text-[#E8912D]">{client.status}</span>
              )}
            </div>
          </div>

          {/* ── Tabs — simple underline style ── */}
          <div className="flex gap-6">
            {tabs.map(t => (
              <button key={t.key} onClick={() => setTab(t.key)}
                className={`pb-3 text-sm font-medium transition-all relative ${
                  tab === t.key ? 'text-white' : 'text-gray-600 hover:text-gray-400'
                }`}>
                {t.label}
                {tab === t.key && (
                  <motion.div layoutId="tab-underline"
                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#E8912D] rounded-full"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }} />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Tab Content ── */}
      <div className="max-w-5xl mx-auto px-6 py-4 md:py-8">
        <AnimatePresence mode="wait">

          {/* ════════════ OVERVIEW ════════════ */}
          {tab === 'overview' && (
            <motion.div key="overview" {...fadeIn} transition={{ duration: 0.25 }} className="space-y-8">

              {/* Bento KPI Grid */}
              <BentoGrid className="grid-cols-2 lg:grid-cols-4 auto-rows-auto gap-4">
                <KpiCard label="Retainer mensuel" value={client.retainer_monthly ? `${client.retainer_monthly.toLocaleString()} $` : '—'} accent />
                <KpiCard label="Score santé" value={client.health_score != null ? `${client.health_score}/100` : '—'} />
                <KpiCard label="Statut" value={client.status || '—'} />
                <KpiCard label="Industrie" value={client.industry || '—'} />
                {googleAds && (
                  <>
                    <KpiCard label="Google Ads Spend" value={'$' + (googleAds.kpis?.spend || 0).toLocaleString()} />
                    <KpiCard label="Google Ads Conv." value={String((googleAds.kpis?.conversions || 0).toFixed(1))} />
                    <KpiCard label="Google Ads CPA" value={'$' + (googleAds.kpis?.cpa || 0).toFixed(2)} />
                    <KpiCard label="Google Ads ROAS" value={(googleAds.kpis?.roas || 0).toFixed(2) + 'x'} />
                  </>
                )}
              </BentoGrid>

              {/* Quick Actions — 2-col grid */}
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">Actions rapides</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  {DELIVERABLE_TYPES.slice(0, 4).map(dt => (
                    <motion.button key={dt.id} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                      onClick={() => { setSelectedType(dt.id); setTab('deliverables'); }}
                      className="flex items-center gap-3 rounded-2xl bg-[#1a1a1f] p-4
                        hover:bg-[#1f1f25] transition-colors group"
                    >
                      <span className="text-xl">{dt.icon}</span>
                      <span className="text-sm font-medium text-gray-400 group-hover:text-white transition-colors">{dt.label}</span>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Recent Deliverables */}
              <div>
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">Derniers livrables</p>
                {history.length === 0 ? (
                  <p className="text-gray-700 text-sm py-4 md:py-8 text-center">Aucun livrable généré encore.</p>
                ) : (
                  <motion.div variants={stagger} initial="initial" animate="animate"
                    className="divide-y divide-white/[0.04]">
                    {history.slice(0, 5).map((h: any) => (
                      <HistoryItem key={h.id} h={h}
                        onShow={() => setOutput(h.content || '')}
                        onOpen={() => openPrintable(h.title, h.content || '', client.name)} />
                    ))}
                  </motion.div>
                )}
              </div>
            </motion.div>
          )}

          {/* ════════════ DELIVERABLES ════════════ */}
          {tab === 'deliverables' && (
            <motion.div key="deliverables" {...fadeIn} transition={{ duration: 0.25 }}
              className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8">

              {/* Left — Type selection */}
              <div className="space-y-2">
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-3">Type de livrable</p>
                {DELIVERABLE_TYPES.map(dt => (
                  <DeliverableCard key={dt.id} dt={dt} selected={selectedType === dt.id}
                    onClick={() => { setSelectedType(dt.id); setInputs({}); setOutput(''); setGenError(''); }} />
                ))}
              </div>

              {/* Right — Generation area */}
              <div className="space-y-6 min-w-0">
                <AnimatePresence mode="wait">
                  {/* Dynamic fields */}
                  {typeDef && typeDef.fields.length > 0 && (
                    <motion.div key={`fields-${selectedType}`} {...fadeIn} transition={{ duration: 0.2 }}
                      className="rounded-2xl bg-[#1a1a1f] p-6 space-y-4">
                      <p className="text-xs text-gray-600 uppercase tracking-wide">Paramètres</p>
                      {typeDef.fields.map(f => (
                        <div key={f.key}>
                          <label className="block text-xs text-gray-500 mb-1.5">{f.label}</label>
                          {f.type === 'select' ? (
                            <select value={inputs[f.key] || f.options?.[0] || ''}
                              onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white
                                focus:border-[#E8912D]/50 focus:outline-none transition-colors">
                              {f.options?.map(o => <option key={o} value={o} className="bg-[#1a1a1f]">{o}</option>)}
                            </select>
                          ) : f.type === 'textarea' ? (
                            <textarea value={inputs[f.key] || ''}
                              onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                              rows={3}
                              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3 text-sm text-white
                                placeholder-gray-700 focus:border-[#E8912D]/50 focus:outline-none resize-none transition-colors"
                              placeholder={f.label} />
                          ) : (
                            <input type="text" value={inputs[f.key] || ''}
                              onChange={e => setInputs(p => ({ ...p, [f.key]: e.target.value }))}
                              className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5 text-sm text-white
                                placeholder-gray-700 focus:border-[#E8912D]/50 focus:outline-none transition-colors"
                              placeholder={f.label} />
                          )}
                        </div>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Generate button — prominent, centered, orange gradient */}
                {selectedType && (
                  <motion.button onClick={handleGenerate} disabled={generating}
                    whileHover={generating ? {} : { scale: 1.01 }}
                    whileTap={generating ? {} : { scale: 0.98 }}
                    className={`w-full py-4 rounded-2xl font-semibold text-sm tracking-wide transition-all duration-200 ${
                      generating
                        ? 'bg-[#E8912D]/20 text-[#E8912D]/70 cursor-wait'
                        : 'bg-gradient-to-r from-[#E8912D] to-[#d07a1a] text-white shadow-lg shadow-[#E8912D]/10 hover:shadow-[#E8912D]/20'
                    }`}>
                    {generating ? (
                      <span className="flex items-center justify-center gap-3">
                        <span className="w-4 h-4 border-2 border-[#E8912D]/30 border-t-[#E8912D] rounded-full animate-spin" />
                        {genStatus || 'Génération en cours…'}
                      </span>
                    ) : (
                      `Générer ${typeDef?.label || ''}`
                    )}
                  </motion.button>
                )}

                {/* Error */}
                <AnimatePresence>
                  {genError && (
                    <motion.div {...fadeIn} transition={{ duration: 0.2 }}
                      className="rounded-2xl bg-red-500/5 border border-red-500/10 p-5">
                      <p className="text-red-400 text-sm font-medium">Erreur de génération</p>
                      <p className="text-red-400/50 text-xs mt-1">{genError}</p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Output — smooth fade-in */}
                <AnimatePresence>
                  {output && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      transition={{ duration: 0.4, ease: 'easeOut' }}
                      className="rounded-2xl bg-[#1a1a1f] overflow-hidden">
                      <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.04]">
                        <p className="text-sm font-semibold text-[#E8912D]">Résultat</p>
                        <div className="flex items-center gap-4">
                          <button onClick={() => openPrintable(
                            `${typeDef?.label} — ${client.name}`, output, client.name, typeDef?.id
                          )} className="text-xs text-gray-500 hover:text-[#E8912D] transition-colors">
                            ↗ Ouvrir
                          </button>
                          <button onClick={downloadDocx}
                            className="text-xs bg-[#E8912D] text-white px-4 py-1.5 rounded-lg hover:bg-[#d07a1a] transition-colors">
                            Télécharger DOCX
                          </button>
                        </div>
                      </div>
                      <div className="p-6 max-h-[600px] overflow-y-auto text-sm leading-relaxed prose-invert"
                        dangerouslySetInnerHTML={{ __html: mdToHtml(output) }} />
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* History */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs text-gray-600 uppercase tracking-wide">Historique</p>
                    <button onClick={loadHistory} disabled={loadingHistory}
                      className="text-xs text-gray-600 hover:text-[#E8912D] transition-colors">
                      {loadingHistory ? '…' : '↻ Rafraîchir'}
                    </button>
                  </div>
                  {history.length === 0 ? (
                    <p className="text-gray-700 text-sm py-6 text-center">Aucun livrable.</p>
                  ) : (
                    <motion.div variants={stagger} initial="initial" animate="animate"
                      className="divide-y divide-white/[0.04]">
                      {history.map((h: any) => (
                        <HistoryItem key={h.id} h={h}
                          onShow={() => setOutput(h.content || '')}
                          onOpen={() => openPrintable(h.title, h.content || '', client.name)} />
                      ))}
                    </motion.div>
                  )}
                </div>

              </div>
            </motion.div>
          )}

          {/* ════════════ CONTEXT ════════════ */}
          {tab === 'context' && (
            <motion.div key="context" {...fadeIn} transition={{ duration: 0.25 }}
              className="max-w-2xl mx-auto space-y-6">

              {/* Notes */}
              <div className="rounded-2xl bg-[#1a1a1f] p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">Notes & Contexte</p>
                <p className="text-xs text-gray-700 mb-4">Utilisées comme contexte lors de la génération.</p>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={10}
                  className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-3
                    text-sm text-white placeholder-gray-700 focus:border-[#E8912D]/50 focus:outline-none
                    resize-none transition-colors"
                  placeholder="Objectifs, problématiques, historique, KPI cibles…" />
                <motion.button onClick={saveNotes} disabled={savingNotes}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#E8912D] text-white text-sm font-medium
                    hover:bg-[#d07a1a] disabled:opacity-40 transition-all">
                  {savingNotes ? 'Sauvegarde…' : 'Sauvegarder'}
                </motion.button>
              </div>


              {/* Social Media URLs */}
              <div className="rounded-2xl bg-[#1a1a1f] p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-1">{"R\u00e9seaux sociaux"}</p>
                <p className="text-xs text-gray-700 mb-4">{"URLs des comptes pour le tracking automatique."}</p>
                <div className="space-y-3">
                  {[
                    { key: 'facebook_url', label: 'Facebook', placeholder: 'https://facebook.com/...' },
                    { key: 'instagram_url', label: 'Instagram', placeholder: 'https://instagram.com/...' },
                    { key: 'tiktok_url', label: 'TikTok', placeholder: 'https://tiktok.com/@...' },
                    { key: 'youtube_url', label: 'YouTube', placeholder: 'https://youtube.com/...' },
                    { key: 'linkedin_url', label: 'LinkedIn', placeholder: 'https://linkedin.com/...' },
                  ].map((field) => (
                    <div key={field.key}>
                      <label className="text-xs text-gray-500 mb-1 block">{field.label}</label>
                      <input
                        type="url"
                        value={(socialUrls as any)[field.key] || ''}
                        onChange={(e) => setSocialUrls(prev => ({ ...prev, [field.key]: e.target.value }))}
                        className="w-full bg-white/[0.03] border border-white/[0.06] rounded-xl px-4 py-2.5
                          text-sm text-white placeholder-gray-700 focus:border-[#E8912D]/50 focus:outline-none transition-colors"
                        placeholder={field.placeholder}
                      />
                    </div>
                  ))}
                </div>
                <motion.button
                  onClick={async () => {
                    if (!client) return;
                    setSavingSocials(true);
                    try {
                      await supaRest('PATCH', 'clients?id=eq.' + clientId, socialUrls);
                      setClient({ ...client, ...socialUrls });
                    } catch (e) { console.error(e); }
                    setSavingSocials(false);
                  }}
                  disabled={savingSocials}
                  whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.98 }}
                  className="mt-4 px-6 py-2.5 rounded-xl bg-[#E8912D] text-white text-sm font-medium
                    hover:bg-[#d07a1a] disabled:opacity-40 transition-all">
                  {savingSocials ? 'Sauvegarde...' : 'Sauvegarder les r\u00e9seaux sociaux'}
                </motion.button>
              </div>

              {/* Client info */}
              <div className="rounded-2xl bg-[#1a1a1f] p-6">
                <p className="text-xs text-gray-600 uppercase tracking-wide mb-4">Informations client</p>
                <dl className="space-y-3 text-sm">
                  {([
                    ['Nom', client.name],
                    ['Industrie', client.industry || '—'],
                    ['Statut', client.status || '—'],
                    ['Score santé', client.health_score != null ? `${client.health_score}/100` : '—'],
                    ['Retainer', client.retainer_monthly ? `${client.retainer_monthly.toLocaleString()} $/mois` : '—'],
                  ] as const).map(([k, v]) => (
                    <div key={k} className="flex justify-between items-center">
                      <dt className="text-gray-600">{k}</dt>
                      <dd className="text-white font-medium">{v}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            </motion.div>
          )}

        </AnimatePresence>
      </div>
    </div>
  );
}
