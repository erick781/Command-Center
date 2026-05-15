export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0f",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'Instrument Sans', system-ui, sans-serif",
      }}
    >
      <div style={{ textAlign: "center", color: "white" }}>
        <div
          style={{
            fontSize: "96px",
            fontWeight: 800,
            letterSpacing: "-0.05em",
            lineHeight: 1,
            background: "linear-gradient(135deg, #E8912D 0%, #ffd980 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
          }}
        >
          404
        </div>
        <p
          style={{
            marginTop: "16px",
            color: "rgba(255,255,255,0.45)",
            fontSize: "16px",
            lineHeight: 1.6,
          }}
        >
          Page introuvable
        </p>
        <a
          href="/"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "8px",
            marginTop: "32px",
            color: "white",
            border: "1px solid rgba(255,255,255,0.10)",
            padding: "12px 24px",
            borderRadius: "999px",
            textDecoration: "none",
            fontSize: "14px",
            fontWeight: 500,
            background: "rgba(255,255,255,0.03)",
          }}
        >
          ← Retour au dashboard
        </a>
      </div>
    </div>
  );
}
