export function mdToHtml(md: string, mode: "dark" | "light" = "dark"): string {
  const isDark = mode === "dark";
  const O = "#E8912D"; // orange accent
  const h1Color = isDark ? "#fff" : "#111";
  const h3Color = isDark ? "#fff" : "#222";
  const bodyColor = isDark ? "#d1d5db" : "#333";
  const boldColor = isDark ? "#fff" : "#111";
  const arrowColor = isDark ? "#888" : "#999";
  const subColor = isDark ? "#9ca3af" : "#666";

  const lines = md.split("\n");
  const result: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const line = raw.trimEnd();

    const processInline = (text: string) => text
      .replace(/\*\*\*(.+?)\*\*\*/g, `<strong style="color:${boldColor};font-weight:700;font-style:italic;">$1</strong>`)
      .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${boldColor};font-weight:700;">$1</strong>`)
      .replace(/\*(.+?)\*/g, `<em style="color:${subColor};">$1</em>`);

    if (inList && !line.match(/^[\s]*[-*]/) && !line.match(/^[\s]*\d+\./)) {
      result.push("</div>");
      inList = false;
    }

    if (line.startsWith("#### ")) {
      result.push(`<div style="font-size:13px;font-weight:700;color:${O};margin:10px 0 4px 0;font-family:Arial,sans-serif;">${processInline(line.slice(5))}</div>`);
    } else if (line.startsWith("### ")) {
      result.push(`<div style="font-size:15px;font-weight:700;color:${h3Color};margin:16px 0 6px 0;font-family:Arial,sans-serif;">${processInline(line.slice(4))}</div>`);
    } else if (line.startsWith("## ")) {
      result.push(`<div style="font-size:14px;font-weight:700;color:${O};text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px 0;font-family:Arial,sans-serif;">${processInline(line.slice(3))}</div>`);
    } else if (line.startsWith("# ")) {
      result.push(`<div style="font-size:20px;font-weight:700;color:${h1Color};border-bottom:3px solid ${O};padding-bottom:8px;margin:28px 0 12px 0;font-family:Arial,sans-serif;">${processInline(line.slice(2))}</div>`);
    } else if (line.match(/^---+$/)) {
      result.push(`<div style="border-top:2px solid ${O};margin:20px 0;opacity:0.25;"></div>`);
    } else if (line.match(/^\u2192\s/) || line.match(/^->\s/)) {
      const text = line.replace(/^(\u2192|->)\s*/, "");
      result.push(`<div style="margin:4px 0 4px 16px;padding-left:20px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${arrowColor};">\u2192</span>${processInline(text)}</div>`);
    } else if (line.match(/^\s{2,}[-*]\s/)) {
      const text = line.replace(/^\s+[-*]\s*/, "");
      result.push(`<div style="margin:3px 0 3px 36px;padding-left:16px;position:relative;font-size:13px;color:${subColor};line-height:1.5;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-size:10px;">\u25E6</span>${processInline(text)}</div>`);
    } else if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s*/, "");
      result.push(`<div style="margin:4px 0 4px 8px;padding-left:20px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-size:12px;">\u25CF</span>${processInline(text)}</div>`);
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1] || "1";
      const text = line.replace(/^\d+\.\s*/, "");
      result.push(`<div style="margin:4px 0 4px 8px;padding-left:24px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-weight:700;">${num}.</span>${processInline(text)}</div>`);
    } else if (line.trim() === "") {
      result.push("<div style=\"height:8px;\"></div>");
    } else {
      result.push(`<p style="margin:5px 0;font-size:14px;color:${bodyColor};line-height:1.7;font-family:Arial,sans-serif;">${processInline(line)}</p>`);
    }
  }
  return result.join("\n");
}

// ── InnovaSoins Template Helpers ──

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

interface DocSection {
  title: string;
  content: string;
}

function parseMarkdownSections(md: string): DocSection[] {
  const lines = md.split('\n');
  const sections: DocSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h1 || h2) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle || 'Introduction', content: currentLines.join('\n') });
      }
      const raw = h1 ? h1[1] : h2![1];
      currentTitle = raw.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle || 'Contenu', content: currentLines.join('\n') });
  }
  return sections.length > 0 ? sections : [{ title: 'Contenu', content: md }];
}

function sectionContentToHtml(text: string): string {
  const lines = text.split('\n');
  const out: string[] = [];
  let inList = false;

  for (const raw of lines) {
    const stripped = raw.trim();
    if (!stripped) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="spacer"></div>');
      continue;
    }
    if (stripped.startsWith('# ')) continue;
    if (stripped.startsWith('## ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const t = stripped.slice(3).replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim();
      out.push('<h3 class="sub-header">' + escapeHtml(t) + '</h3>');
      continue;
    }
    if (stripped.startsWith('### ')) {
      if (inList) { out.push('</ul>'); inList = false; }
      const t = stripped.slice(4).replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim();
      out.push('<h4 class="sub-sub-header">' + escapeHtml(t) + '</h4>');
      continue;
    }
    if (stripped.startsWith('- ') || stripped.startsWith('* ')) {
      if (!inList) { out.push('<ul class="styled-list">'); inList = true; }
      let content = stripped.slice(2);
      content = content.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
      const hasKpiMarker = ['$', '%', 'x', 'X', 'ROAS', 'CPP', 'AOV', 'CTR', 'CPA', 'LTV'].some(k => content.includes(k));
      const hasNumber = /\d+[\.,]?\d*[%xX$k€K+]*/.test(content);
      if (hasKpiMarker && hasNumber) {
        out.push('<li class="kpi-item">' + content + '</li>');
      } else {
        out.push('<li>' + content + '</li>');
      }
      continue;
    }
    const boldMatch = stripped.match(/^\*\*(.+?)\*\*$/);
    if (boldMatch) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<p class="bold-line">' + escapeHtml(boldMatch[1]) + '</p>');
      continue;
    }
    let formatted = stripped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (inList) { out.push('</ul>'); inList = false; }
    out.push('<p>' + formatted + '</p>');
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function getCoverTitle(type?: string): { pre: string; main: string; accent: string } {
  switch (type) {
    case 'strategie_360': return { pre: 'STRATÉGIE DE', main: 'CROISSANCE', accent: 'STRATÉGIQUE' };
    case 'rapport_performance':
    case 'rapport_mensuel':
    case 'rapport_trimestriel':
      return { pre: 'RAPPORT', main: 'PERFORMANCE', accent: 'STRATÉGIQUE' };
    case 'diagnostic': return { pre: 'DIAGNOSTIC', main: 'PERFORMANCE', accent: 'MARKETING' };
    case 'brief_creatif': return { pre: 'BRIEF', main: 'CRÉATIF', accent: 'STRATÉGIQUE' };
    case 'resume_client': return { pre: 'RÉSUMÉ', main: 'EXÉCUTIF', accent: 'CLIENT' };
    default: return { pre: 'STRATÉGIE DE', main: 'CROISSANCE', accent: 'STRATÉGIQUE' };
  }
}

export function buildPrintableHtml(content: string, title: string, client: string, date: string, type?: string): string {
  const sections = parseMarkdownSections(content);
  const cover = getCoverTitle(type);
  const BG_DARK = '#1A1A1F';
  const BG_CARD = '#232329';
  const ORANGE = '#E8743B';
  const ORANGE_L = '#F09559';
  const WHITE = '#FFFFFF';
  const GRAY_T = '#B0B0B8';
  const GRAY_D = '#6B6B75';
  const BORDER = '#333340';

  const tocItems = sections.map((s, i) =>
    `<a href="#phase-${i+1}" class="toc-item">
      <span class="toc-num">${String(i+1).padStart(2, '0')}</span>
      <span class="toc-title">${escapeHtml(s.title)}</span>
      <span class="toc-dots"></span>
      <span class="toc-page">${i+2}</span>
    </a>`
  ).join('\n');

  const phaseSections = sections.map((s, i) => {
    const parsed = sectionContentToHtml(s.content);
    return `
    <section class="phase-section" id="phase-${i+1}">
      <div class="phase-header">
        <div class="phase-badge">${i+1}</div>
        <div class="phase-title-group">
          <span class="phase-label">PHASE ${i+1}</span>
          <h2 class="phase-title">${escapeHtml(s.title)}</h2>
        </div>
      </div>
      <div class="phase-content">
        ${parsed}
      </div>
      <div class="section-footer">
        <span>Confidentiel — Partenaire.io — ${escapeHtml(date)}</span>
        <span>Page ${i+2}</span>
      </div>
    </section>`;
  }).join('\n');

  const CSS = `
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
html { scroll-behavior: smooth; }
body {
  font-family: 'Segoe UI', Arial, Helvetica, sans-serif;
  background: ${BG_DARK};
  color: ${WHITE};
  line-height: 1.7;
  -webkit-font-smoothing: antialiased;
}
a { color: ${ORANGE}; text-decoration: none; }
a:hover { color: ${ORANGE_L}; }

.cover {
  min-height: 100vh;
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  text-align: center; padding: 60px 40px;
  background: linear-gradient(170deg, ${BG_DARK} 0%, #12121A 50%, ${BG_DARK} 100%);
  position: relative; overflow: hidden;
}
.cover::before {
  content: ''; position: absolute; top: -200px; right: -200px;
  width: 600px; height: 600px;
  background: radial-gradient(circle, rgba(232,116,59,0.08) 0%, transparent 70%);
  border-radius: 50%;
}
.cover::after {
  content: ''; position: absolute; bottom: -150px; left: -150px;
  width: 400px; height: 400px;
  background: radial-gradient(circle, rgba(232,116,59,0.05) 0%, transparent 70%);
  border-radius: 50%;
}
.cover-brand { font-size: 14px; letter-spacing: 6px; text-transform: uppercase; color: ${ORANGE}; font-weight: 700; margin-bottom: 60px; }
.cover-pre { font-size: 18px; color: ${GRAY_T}; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 8px; }
.cover-title { font-size: 52px; font-weight: 800; color: ${WHITE}; line-height: 1.15; margin-bottom: 4px; }
.cover-title-accent { color: ${ORANGE}; }
.cover-divider { width: 60px; height: 3px; background: ${ORANGE}; margin: 30px auto; }
.cover-client { font-size: 24px; color: ${WHITE}; font-weight: 600; margin-bottom: 12px; letter-spacing: 1px; }
.cover-meta { font-size: 14px; color: ${GRAY_D}; letter-spacing: 1px; }
.cover-meta span { margin: 0 8px; }

.toc {
  max-width: 700px; margin: 0 auto; padding: 80px 40px;
  min-height: 100vh; display: flex; flex-direction: column; justify-content: center;
}
.toc-header { font-size: 12px; letter-spacing: 5px; text-transform: uppercase; color: ${ORANGE}; font-weight: 700; margin-bottom: 50px; }
.toc-item {
  display: flex; align-items: baseline; padding: 14px 0;
  border-bottom: 1px solid ${BORDER}; color: ${WHITE}; transition: all 0.2s ease;
}
.toc-item:hover { padding-left: 10px; border-bottom-color: ${ORANGE}; }
.toc-num { font-size: 13px; color: ${ORANGE}; font-weight: 700; min-width: 35px; font-variant-numeric: tabular-nums; }
.toc-title { font-size: 17px; font-weight: 500; flex-shrink: 0; }
.toc-dots { flex: 1; border-bottom: 1px dotted ${GRAY_D}; margin: 0 12px; min-width: 40px; position: relative; top: -4px; }
.toc-page { font-size: 13px; color: ${GRAY_D}; font-variant-numeric: tabular-nums; min-width: 20px; text-align: right; }

.phase-section { max-width: 900px; margin: 0 auto; padding: 70px 50px 40px; page-break-before: always; }
.phase-header {
  display: flex; align-items: center; gap: 20px;
  margin-bottom: 40px; padding-bottom: 24px; border-bottom: 3px solid ${ORANGE};
}
.phase-badge {
  width: 52px; height: 52px; background: ${ORANGE}; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; font-weight: 800; color: ${WHITE}; flex-shrink: 0;
}
.phase-label { font-size: 11px; letter-spacing: 4px; text-transform: uppercase; color: ${ORANGE}; font-weight: 700; display: block; margin-bottom: 2px; }
.phase-title { font-size: 28px; font-weight: 700; color: ${WHITE}; line-height: 1.2; }
.phase-content { padding: 0 0 0 72px; }
.phase-content .spacer { height: 12px; }
.phase-content .sub-header {
  font-size: 16px; font-weight: 700; color: ${ORANGE}; text-transform: uppercase;
  letter-spacing: 2px; margin: 28px 0 14px; padding-bottom: 8px; border-bottom: 1px solid ${BORDER};
}
.phase-content .sub-sub-header { font-size: 15px; font-weight: 600; color: ${ORANGE_L}; margin: 20px 0 10px; }
.phase-content p { font-size: 15px; color: ${GRAY_T}; margin-bottom: 8px; line-height: 1.7; }
.phase-content p strong { color: ${WHITE}; }
.phase-content .bold-line { font-size: 15px; font-weight: 700; color: ${WHITE}; margin: 16px 0 8px; }

.styled-list { list-style: none; margin: 8px 0 16px; padding: 0; }
.styled-list li {
  position: relative; padding: 6px 0 6px 20px;
  font-size: 15px; color: ${GRAY_T}; line-height: 1.6;
}
.styled-list li::before {
  content: ''; position: absolute; left: 0; top: 14px;
  width: 6px; height: 6px; background: ${ORANGE}; border-radius: 50%;
}
.styled-list li strong { color: ${WHITE}; }
.styled-list li.kpi-item {
  background: ${BG_CARD}; border-left: 3px solid ${ORANGE};
  padding: 10px 16px 10px 20px; margin: 6px 0; border-radius: 0 6px 6px 0;
}
.styled-list li.kpi-item::before { display: none; }

.section-footer {
  display: flex; justify-content: space-between; padding: 20px 0;
  margin-top: 40px; border-top: 1px solid ${BORDER}; font-size: 11px; color: ${GRAY_D}; letter-spacing: 1px;
}

.closing { max-width: 900px; margin: 0 auto; padding: 80px 50px; text-align: center; page-break-before: always; }
.closing-title { font-size: 28px; font-weight: 700; color: ${WHITE}; margin-bottom: 40px; }
.closing-title span { color: ${ORANGE}; }
.stats-row { display: flex; justify-content: center; gap: 40px; margin-bottom: 50px; flex-wrap: wrap; }
.stat-card { text-align: center; padding: 24px 20px; min-width: 180px; }
.stat-num { font-size: 36px; font-weight: 800; color: ${ORANGE}; display: block; line-height: 1.1; }
.stat-label { font-size: 12px; color: ${GRAY_T}; letter-spacing: 1px; margin-top: 6px; display: block; }
.diff-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 40px 0; text-align: left; }
.diff-card { background: ${BG_CARD}; border: 1px solid ${BORDER}; border-radius: 10px; padding: 24px; }
.diff-card h4 { color: ${ORANGE}; font-size: 14px; font-weight: 700; margin-bottom: 8px; }
.diff-card p { color: ${GRAY_T}; font-size: 13px; line-height: 1.6; }
.closing-contact { margin-top: 50px; font-size: 14px; color: ${GRAY_D}; }
.closing-contact a { color: ${ORANGE}; font-weight: 600; }
.closing-footer { margin-top: 60px; padding-top: 20px; border-top: 1px solid ${BORDER}; font-size: 11px; color: ${GRAY_D}; letter-spacing: 1px; }

@media print {
  body { background: white; color: #1a1a1a; }
  .cover { min-height: auto; padding: 40px; background: white; }
  .cover-title, .cover-client { color: #1a1a1a; }
  .phase-section { padding: 40px 30px; }
  .phase-content p, .styled-list li { color: #333; }
  .styled-list li.kpi-item { background: #f5f5f5; }
  .section-footer, .closing-footer { color: #999; }
}
`;

  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(title)} \u2014 ${escapeHtml(client)} | Partenaire.io</title>
<style>${CSS}</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-brand">PARTENAIRE.IO</div>
  <div class="cover-pre">${escapeHtml(cover.pre)}</div>
  <div class="cover-title">${escapeHtml(cover.main)}<br><span class="cover-title-accent">${escapeHtml(cover.accent)}</span></div>
  <div class="cover-divider"></div>
  <div class="cover-client">${escapeHtml(client)}</div>
  <div class="cover-meta">
    <span>${escapeHtml(date)}</span>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <div class="toc-header">TABLE DES MATIÈRES</div>
  ${tocItems}
</div>

<!-- PHASE SECTIONS -->
${phaseSections}

<!-- CLOSING PAGE -->
<div class="closing">
  <div class="closing-title">Pourquoi <span>Partenaire.io</span> ?</div>
  <div class="stats-row">
    <div class="stat-card">
      <span class="stat-num">69+</span>
      <span class="stat-label">Clients actifs</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">$130K+</span>
      <span class="stat-label">Ad spend mensuel géré</span>
    </div>
    <div class="stat-card">
      <span class="stat-num">22x+</span>
      <span class="stat-label">ROAS moyen</span>
    </div>
  </div>

  <div class="diff-grid">
    <div class="diff-card">
      <h4>Approche Data-Driven</h4>
      <p>Chaque décision est basée sur les données réelles de votre compte. Pas de guesswork — des stratégies prouvées et mesurables.</p>
    </div>
    <div class="diff-card">
      <h4>Spécialistes E-commerce Québec</h4>
      <p>Expertise spécifique au marché québécois francophone. On connaît vos clients, leur langue et leurs habitudes d'achat.</p>
    </div>
    <div class="diff-card">
      <h4>Stratégie Full-Funnel</h4>
      <p>De l'acquisition à la rétention — on optimise chaque étape du parcours client pour maximiser le lifetime value.</p>
    </div>
    <div class="diff-card">
      <h4>Résultats Rapides</h4>
      <p>Premiers résultats mesurables en 2 semaines. Optimisation continue basée sur la performance réelle.</p>
    </div>
  </div>

  <div class="closing-contact">
    <p><strong style="color: #fff;">Prêt à scaler?</strong></p>
    <p style="margin-top: 8px;">
      <a href="https://partenaire.io">partenaire.io</a>
      <span style="margin: 0 10px; color: #333340;">|</span>
      erick@growthpartner.ca
    </p>
  </div>
  <div class="closing-footer">Confidentiel — Partenaire.io — ${escapeHtml(date)}</div>
</div>

</body></html>`;
}
