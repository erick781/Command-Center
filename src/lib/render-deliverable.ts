import type { CommandCenterLanguage } from "@/lib/language";
import { decodeEscapedText } from "@/lib/text-normalize";

function renderInlineHtml(
  text: string,
  colors: { boldColor: string; subColor: string },
): string {
  return escapeHtml(text)
    .replace(
      /\*\*\*(.+?)\*\*\*/g,
      `<strong style="color:${colors.boldColor};font-weight:700;font-style:italic;">$1</strong>`,
    )
    .replace(/\*\*(.+?)\*\*/g, `<strong style="color:${colors.boldColor};font-weight:700;">$1</strong>`)
    .replace(/\*(.+?)\*/g, `<em style="color:${colors.subColor};">$1</em>`);
}

function isMarkdownTableLine(line: string) {
  const trimmed = line.trim();
  return trimmed.startsWith("|") && trimmed.endsWith("|");
}

function isMarkdownTableDivider(line: string) {
  return /^[\|\s:-]+$/.test(line.trim());
}

function splitMarkdownTableRow(line: string) {
  return line
    .trim()
    .replace(/^\|/, "")
    .replace(/\|$/, "")
    .split("|")
    .map((cell) => cell.trim());
}

function normalizeHeadingKey(text: string) {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-zA-Z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function isKeySubsectionTitle(text: string) {
  return new Set([
    "CONSTAT",
    "ACTIONS",
    "CIBLES",
    "RYTHME",
    "DIAGNOSTIC",
    "DONNEES A VALIDER",
    "DATA TO VALIDATE",
    "PERFORMANCE SCORECARD",
    "SCORECARD PERFORMANCE",
    "ACTIONS PRIORITAIRES",
  ]).has(normalizeHeadingKey(text));
}

function renderMarkdownTableHtml(
  rows: string[],
  mode: "dark" | "light",
  colors: { bodyColor: string; boldColor: string; subColor: string; tableBorder: string; tableHeaderBg: string; tableRowAltBg: string },
) {
  const dataRows = rows.filter((row) => !isMarkdownTableDivider(row));
  if (dataRows.length === 0) return "";

  const [headerRow, ...bodyRows] = dataRows.map(splitMarkdownTableRow);
  if (headerRow.length === 0) return "";

  const headerHtml = headerRow
    .map(
      (cell) =>
        `<th style="padding:12px 14px;border:1px solid ${colors.tableBorder};background:${colors.tableHeaderBg};text-align:left;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:${colors.boldColor};font-weight:700;">${renderInlineHtml(
          cell,
          { boldColor: colors.boldColor, subColor: colors.subColor },
        )}</th>`,
    )
    .join("");

  const bodyHtml = bodyRows
    .map((row, index) => {
      const bg = index % 2 === 0 ? (mode === "dark" ? "rgba(255,255,255,0.02)" : colors.tableRowAltBg) : "transparent";
      const cells = row
        .map((cell) => {
          const normalizedCell = cell.trim().toUpperCase();
          const priorityBg =
            normalizedCell === "P1"
              ? "#FCE7D6"
              : normalizedCell === "P2"
                ? "#FBF1D7"
                : normalizedCell === "P3"
                  ? "#F3EEE5"
                  : bg;
          const priorityColor = normalizedCell.startsWith("P") ? "#111111" : colors.bodyColor;

          return `<td style="padding:12px 14px;border:1px solid ${colors.tableBorder};vertical-align:top;font-size:14px;line-height:1.6;color:${priorityColor};background:${priorityBg};font-weight:${normalizedCell.startsWith("P") ? "700" : "400"};">${renderInlineHtml(
            cell,
            { boldColor: colors.boldColor, subColor: colors.subColor },
          )}</td>`;
        })
        .join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<div style="margin:16px 0 22px 0;overflow-x:auto;"><table style="width:100%;border-collapse:collapse;border-spacing:0;border-radius:16px;overflow:hidden;">${`<thead><tr>${headerHtml}</tr></thead>`}<tbody>${bodyHtml}</tbody></table></div>`;
}

export function mdToHtml(md: string, mode: "dark" | "light" = "dark"): string {
  const normalizedMd = decodeEscapedText(md);
  const isDark = mode === "dark";
  const O = "#E8912D"; // orange accent
  const h1Color = isDark ? "#fff" : "#111";
  const h3Color = isDark ? "#fff" : "#222";
  const bodyColor = isDark ? "#d1d5db" : "#333";
  const boldColor = isDark ? "#fff" : "#111";
  const arrowColor = isDark ? "#888" : "#999";
  const subColor = isDark ? "#9ca3af" : "#666";
  const tableBorder = isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb";
  const tableHeaderBg = isDark ? "rgba(255,255,255,0.06)" : "#f6f3ec";
  const tableRowAltBg = isDark ? "rgba(255,255,255,0.03)" : "#fbfaf7";

  const lines = normalizedMd.split("\n");
  const result: string[] = [];
  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const line = raw.trimEnd();

    if (isMarkdownTableLine(line)) {
      const tableLines: string[] = [];
      let cursor = index;
      while (cursor < lines.length && isMarkdownTableLine(lines[cursor])) {
        tableLines.push(lines[cursor]);
        cursor += 1;
      }
      result.push(
        renderMarkdownTableHtml(tableLines, mode, {
          bodyColor,
          boldColor,
          subColor,
          tableBorder,
          tableHeaderBg,
          tableRowAltBg,
        }),
      );
      index = cursor - 1;
      continue;
    }

    if (line.startsWith("#### ")) {
      result.push(`<div style="font-size:13px;font-weight:700;color:${O};margin:10px 0 4px 0;font-family:Arial,sans-serif;">${renderInlineHtml(line.slice(5), { boldColor, subColor })}</div>`);
    } else if (line.startsWith("### ")) {
      const title = line.slice(4);
      if (isKeySubsectionTitle(title)) {
        result.push(`<div style="font-size:12px;font-weight:700;color:${O};margin:18px 0 8px 0;padding-left:12px;border-left:4px solid ${O};text-transform:uppercase;letter-spacing:0.16em;font-family:Arial,sans-serif;">${renderInlineHtml(title, { boldColor, subColor })}</div>`);
      } else {
        result.push(`<div style="font-size:15px;font-weight:700;color:${h3Color};margin:16px 0 6px 0;font-family:Arial,sans-serif;">${renderInlineHtml(title, { boldColor, subColor })}</div>`);
      }
    } else if (line.startsWith("## ")) {
      result.push(`<div style="font-size:14px;font-weight:700;color:${O};text-transform:uppercase;letter-spacing:1px;margin:24px 0 8px 0;font-family:Arial,sans-serif;">${renderInlineHtml(line.slice(3), { boldColor, subColor })}</div>`);
    } else if (line.startsWith("# ")) {
      result.push(`<div style="font-size:20px;font-weight:700;color:${h1Color};border-bottom:3px solid ${O};padding-bottom:8px;margin:28px 0 12px 0;font-family:Arial,sans-serif;">${renderInlineHtml(line.slice(2), { boldColor, subColor })}</div>`);
    } else if (line.match(/^---+$/)) {
      result.push(`<div style="border-top:2px solid ${O};margin:20px 0;opacity:0.25;"></div>`);
    } else if (line.match(/^\u2192\s/) || line.match(/^->\s/)) {
      const text = line.replace(/^(\u2192|->)\s*/, "");
      result.push(`<div style="margin:4px 0 4px 16px;padding-left:20px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${arrowColor};">\u2192</span>${renderInlineHtml(text, { boldColor, subColor })}</div>`);
    } else if (line.match(/^\s{2,}[-*]\s/)) {
      const text = line.replace(/^\s+[-*]\s*/, "");
      result.push(`<div style="margin:3px 0 3px 36px;padding-left:16px;position:relative;font-size:13px;color:${subColor};line-height:1.5;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-size:10px;">\u25E6</span>${renderInlineHtml(text, { boldColor, subColor })}</div>`);
    } else if (line.match(/^[-*]\s/)) {
      const text = line.replace(/^[-*]\s*/, "");
      result.push(`<div style="margin:4px 0 4px 8px;padding-left:20px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-size:12px;">\u25CF</span>${renderInlineHtml(text, { boldColor, subColor })}</div>`);
    } else if (line.match(/^\d+\.\s/)) {
      const num = line.match(/^(\d+)\./)?.[1] || "1";
      const text = line.replace(/^\d+\.\s*/, "");
      result.push(`<div style="margin:4px 0 4px 8px;padding-left:24px;position:relative;font-size:14px;color:${bodyColor};line-height:1.6;font-family:Arial,sans-serif;"><span style="position:absolute;left:0;color:${O};font-weight:700;">${num}.</span>${renderInlineHtml(text, { boldColor, subColor })}</div>`);
    } else if (line.trim() === "") {
      result.push("<div style=\"height:8px;\"></div>");
    } else {
      result.push(`<p style="margin:5px 0;font-size:14px;color:${bodyColor};line-height:1.7;font-family:Arial,sans-serif;">${renderInlineHtml(line, { boldColor, subColor })}</p>`);
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

const printableCopy = {
  en: {
    activeClients: "Active clients",
    adSpend: "Monthly ad spend managed",
    closingTitlePrefix: "Why",
    confidential: "Confidential",
    content: "Content",
    ecommerceBody:
      "Specific expertise for Quebec and North American e-commerce brands. We understand your customers, their language, and how they buy.",
    ecommerceTitle: "E-commerce Specialists",
    fullFunnelBody:
      "From acquisition to retention, we optimize each stage of the customer journey to maximize lifetime value.",
    fullFunnelTitle: "Full-Funnel Strategy",
    intro: "Introduction",
    page: "Page",
    phase: "Phase",
    rapidBody:
      "Fast feedback loops and continuous optimization based on real-world performance, not assumptions.",
    rapidTitle: "Fast Iteration",
    readyToScale: "Ready to scale?",
    roas: "Average ROAS",
    tableOfContents: "Table of contents",
    whyPartenaire: "Partenaire.io",
    dataBody:
      "Every decision is grounded in real account data. No guesswork, just measurable strategy and execution.",
    dataTitle: "Data-Driven Approach",
  },
  fr: {
    activeClients: "Clients actifs",
    adSpend: "Ad spend mensuel géré",
    closingTitlePrefix: "Pourquoi",
    confidential: "Confidentiel",
    content: "Contenu",
    ecommerceBody:
      "Expertise spécifique au marché québécois francophone. On connaît vos clients, leur langue et leurs habitudes d'achat.",
    ecommerceTitle: "Spécialistes E-commerce Québec",
    fullFunnelBody:
      "De l'acquisition à la rétention — on optimise chaque étape du parcours client pour maximiser le lifetime value.",
    fullFunnelTitle: "Stratégie Full-Funnel",
    intro: "Introduction",
    page: "Page",
    phase: "PHASE",
    rapidBody:
      "Premiers résultats mesurables en 2 semaines. Optimisation continue basée sur la performance réelle.",
    rapidTitle: "Résultats Rapides",
    readyToScale: "Prêt à scaler?",
    roas: "ROAS moyen",
    tableOfContents: "Table des matières",
    whyPartenaire: "Partenaire.io",
    dataBody:
      "Chaque décision est basée sur les données réelles de votre compte. Pas de guesswork — des stratégies prouvées et mesurables.",
    dataTitle: "Approche Data-Driven",
  },
} as const;

function parseMarkdownSections(md: string, language: CommandCenterLanguage): DocSection[] {
  const normalizedMd = decodeEscapedText(md);
  const copy = printableCopy[language];
  const lines = normalizedMd.split('\n');
  const sections: DocSection[] = [];
  let currentTitle = '';
  let currentLines: string[] = [];

  for (const line of lines) {
    const h1 = line.match(/^# (.+)/);
    const h2 = line.match(/^## (.+)/);
    if (h1 || h2) {
      if (currentTitle || currentLines.length > 0) {
        sections.push({ title: currentTitle || copy.intro, content: currentLines.join('\n') });
      }
      const raw = h1 ? h1[1] : h2![1];
      currentTitle = raw.replace(/^[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]\s*/u, '').trim();
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentTitle || currentLines.length > 0) {
    sections.push({ title: currentTitle || copy.content, content: currentLines.join('\n') });
  }
  return sections.length > 0 ? sections : [{ title: copy.content, content: normalizedMd }];
}

function sectionContentToHtml(text: string): string {
  const normalizedText = decodeEscapedText(text);
  const lines = normalizedText.split('\n');
  const out: string[] = [];
  let inList = false;

  for (let index = 0; index < lines.length; index += 1) {
    const raw = lines[index];
    const stripped = raw.trim();
    if (!stripped) {
      if (inList) { out.push('</ul>'); inList = false; }
      out.push('<div class="spacer"></div>');
      continue;
    }
    if (isMarkdownTableLine(stripped)) {
      if (inList) { out.push('</ul>'); inList = false; }
      const tableLines = [];
      let cursor = index;
      while (cursor < lines.length && isMarkdownTableLine(lines[cursor])) {
        tableLines.push(lines[cursor]);
        cursor += 1;
      }
      out.push(renderMarkdownTableHtml(tableLines, "light", {
        bodyColor: "#4b5563",
        boldColor: "#111111",
        subColor: "#6b7280",
        tableBorder: "#e5ddd0",
        tableHeaderBg: "#f1e7d6",
        tableRowAltBg: "#fbf7ef",
      }));
      index = cursor - 1;
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
      if (isKeySubsectionTitle(t)) {
        out.push('<h4 class="subsection-key">' + escapeHtml(t) + '</h4>');
      } else {
        out.push('<h4 class="sub-sub-header">' + escapeHtml(t) + '</h4>');
      }
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
      if (isKeySubsectionTitle(boldMatch[1])) {
        out.push('<p class="subsection-key">' + escapeHtml(boldMatch[1]) + '</p>');
      } else {
        out.push('<p class="bold-line">' + escapeHtml(boldMatch[1]) + '</p>');
      }
      continue;
    }
    const formatted = stripped.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    if (inList) { out.push('</ul>'); inList = false; }
    out.push('<p>' + formatted + '</p>');
  }
  if (inList) out.push('</ul>');
  return out.join('\n');
}

function getCoverTitle(
  type: string | undefined,
  language: CommandCenterLanguage,
): { pre: string; main: string; accent: string } {
  if (language === "en") {
    switch (type) {
      case "strategie_360":
      case "strategy_360":
        return { pre: "GROWTH", main: "STRATEGY", accent: "PLAN" };
      case "rapport_performance":
      case "rapport_mensuel":
      case "rapport_trimestriel":
      case "performance_report":
        return { pre: "PERFORMANCE", main: "REPORT", accent: "DELIVERABLE" };
      case "diagnostic":
        return { pre: "PERFORMANCE", main: "DIAGNOSTIC", accent: "MARKETING" };
      case "brief_creatif":
      case "creative_brief":
        return { pre: "CREATIVE", main: "BRIEF", accent: "DELIVERABLE" };
      case "resume_client":
      case "client_summary":
        return { pre: "CLIENT", main: "SUMMARY", accent: "EXECUTIVE" };
      default:
        return { pre: "GROWTH", main: "DELIVERABLE", accent: "PLAN" };
    }
  }

  switch (type) {
    case 'strategie_360':
    case 'strategy_360':
      return { pre: 'STRATÉGIE DE', main: 'CROISSANCE', accent: 'STRATÉGIQUE' };
    case 'rapport_performance':
    case 'rapport_mensuel':
    case 'rapport_trimestriel':
    case 'performance_report':
      return { pre: 'RAPPORT', main: 'PERFORMANCE', accent: 'STRATÉGIQUE' };
    case 'diagnostic':
      return { pre: 'DIAGNOSTIC', main: 'PERFORMANCE', accent: 'MARKETING' };
    case 'brief_creatif':
    case 'creative_brief':
      return { pre: 'BRIEF', main: 'CRÉATIF', accent: 'STRATÉGIQUE' };
    case 'resume_client':
    case 'client_summary':
      return { pre: 'RÉSUMÉ', main: 'EXÉCUTIF', accent: 'CLIENT' };
    default:
      return { pre: 'STRATÉGIE DE', main: 'CROISSANCE', accent: 'STRATÉGIQUE' };
  }
}

export function buildPrintableHtml(
  content: string,
  title: string,
  client: string,
  date: string,
  type?: string,
  language: CommandCenterLanguage = "fr",
): string {
  const normalizedContent = decodeEscapedText(content);
  const normalizedTitle = decodeEscapedText(title);
  const normalizedClient = decodeEscapedText(client);
  const normalizedDate = decodeEscapedText(date);
  const copy = printableCopy[language];
  const sections = parseMarkdownSections(normalizedContent, language);
  const cover = getCoverTitle(type, language);
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
          <span class="phase-label">${copy.phase} ${i+1}</span>
          <h2 class="phase-title">${escapeHtml(s.title)}</h2>
        </div>
      </div>
      <div class="phase-content">
        ${parsed}
      </div>
      <div class="section-footer">
        <span>${copy.confidential} — Partenaire.io — ${escapeHtml(normalizedDate)}</span>
        <span>${copy.page} ${i+2}</span>
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
.phase-content .subsection-key {
  font-size: 11px;
  font-weight: 700;
  color: ${ORANGE};
  margin: 22px 0 10px;
  padding-left: 12px;
  border-left: 4px solid ${ORANGE};
  text-transform: uppercase;
  letter-spacing: 0.16em;
}
.phase-content p { font-size: 15px; color: ${GRAY_T}; margin-bottom: 8px; line-height: 1.7; }
.phase-content p strong { color: ${WHITE}; }
.phase-content .bold-line { font-size: 15px; font-weight: 700; color: ${WHITE}; margin: 16px 0 8px; }
.phase-content table { width: 100%; border-collapse: collapse; margin: 8px 0 18px; border-radius: 14px; overflow: hidden; }
.phase-content th, .phase-content td { border: 1px solid ${BORDER}; padding: 12px 14px; text-align: left; vertical-align: top; }
.phase-content th { background: rgba(255,255,255,0.05); color: ${WHITE}; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; }
.phase-content td { color: ${GRAY_T}; font-size: 14px; line-height: 1.6; }
.phase-content tbody tr:nth-child(odd) td { background: rgba(255,255,255,0.02); }

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
<html lang="${language}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escapeHtml(normalizedTitle)} \u2014 ${escapeHtml(normalizedClient)} | Partenaire.io</title>
<style>${CSS}</style>
</head>
<body>

<!-- COVER PAGE -->
<div class="cover">
  <div class="cover-brand">PARTENAIRE.IO</div>
  <div class="cover-pre">${escapeHtml(cover.pre)}</div>
  <div class="cover-title">${escapeHtml(cover.main)}<br><span class="cover-title-accent">${escapeHtml(cover.accent)}</span></div>
  <div class="cover-divider"></div>
  <div class="cover-client">${escapeHtml(normalizedClient)}</div>
  <div class="cover-meta">
    <span>${escapeHtml(normalizedDate)}</span>
  </div>
</div>

<!-- TABLE OF CONTENTS -->
<div class="toc">
  <div class="toc-header">${copy.tableOfContents}</div>
  ${tocItems}
</div>

<!-- PHASE SECTIONS -->
${phaseSections}

</body></html>`;
}
