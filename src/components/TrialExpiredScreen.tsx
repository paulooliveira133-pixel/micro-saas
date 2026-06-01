import { useState } from "react";

interface Props {
  tenantName: string;
  onPaymentSuccess?: () => void;
}

export default function TrialExpiredScreen({ tenantName, onPaymentSuccess }: Props) {
  const [loading, setLoading] = useState(false);

  async function handleSubscribe() {
    setLoading(true);
    try {
      const res = await fetch("/api/pagamento/criar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          planName: "AgendaFácil Pro — Assinatura Mensal",
          planPrice: 99,
          customerEmail: "cliente@email.com",
        }),
      });
      const data = await res.json();
      if (data.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch {
      alert("Erro ao iniciar pagamento. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={s.overlay}>
      <div style={s.card}>
        <div style={s.icon}>⏳</div>
        <div style={s.tag}>PERÍODO GRATUITO ENCERRADO</div>
        <h1 style={s.title}>Seu trial de 14 dias acabou</h1>
        <p style={s.sub}>
          O período gratuito de <strong style={{ color: "#C9A84C" }}>{tenantName}</strong> expirou.
          Assine agora para continuar usando o AgendaFácil sem interrupções.
        </p>

        {/* Benefícios */}
        <div style={s.benefits}>
          {[
            "Agendamentos ilimitados",
            "Dashboard com gráficos",
            "IA anti-churn inclusa",
            "Mercado Pago integrado",
            "Suporte prioritário",
          ].map((b) => (
            <div key={b} style={s.benefit}>
              <span style={s.check}>✦</span>
              <span>{b}</span>
            </div>
          ))}
        </div>

        {/* Preço */}
        <div style={s.priceBox}>
          <span style={s.priceLabel}>Plano Pro</span>
          <div style={s.price}>
            R$ 99<span style={s.pricePeriod}>/mês</span>
          </div>
          <span style={s.priceSub}>Cancele quando quiser · Sem fidelidade</span>
        </div>

        <button
          onClick={handleSubscribe}
          disabled={loading}
          style={{ ...s.btn, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
        >
          {loading ? "Redirecionando..." : "Assinar agora →"}
        </button>

        <p style={s.footer}>
          Dúvidas? Entre em contato:{" "}
          <a href="mailto:suporte@autodireto.online" style={{ color: "#C9A84C" }}>
            suporte@autodireto.online
          </a>
        </p>
      </div>
    </div>
  );
}

const s: Record<string, React.CSSProperties> = {
  overlay: {
    minHeight: "100vh",
    background: "#0A0A0A",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "2rem 1rem",
    fontFamily: "'DM Sans', system-ui, sans-serif",
  },
  card: {
    background: "#111111",
    border: "0.5px solid rgba(201,168,76,0.25)",
    borderRadius: "4px",
    padding: "3rem 2.5rem",
    width: "100%",
    maxWidth: "480px",
    textAlign: "center",
  },
  icon: {
    fontSize: "3rem",
    marginBottom: "1rem",
  },
  tag: {
    display: "inline-block",
    border: "0.5px solid rgba(201,168,76,0.35)",
    color: "#C9A84C",
    fontSize: "0.7rem",
    letterSpacing: "0.15em",
    padding: "0.3rem 1rem",
    borderRadius: "2px",
    marginBottom: "1.25rem",
  },
  title: {
    fontFamily: "Georgia, serif",
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#FAFAF8",
    lineHeight: 1.1,
    marginBottom: "0.75rem",
    letterSpacing: "-0.02em",
  },
  sub: {
    fontSize: "0.95rem",
    color: "rgba(200,196,187,0.65)",
    lineHeight: 1.6,
    marginBottom: "2rem",
  },
  benefits: {
    display: "flex",
    flexDirection: "column",
    gap: "0.6rem",
    marginBottom: "2rem",
    textAlign: "left",
  },
  benefit: {
    display: "flex",
    alignItems: "center",
    gap: "0.75rem",
    fontSize: "0.9rem",
    color: "rgba(200,196,187,0.8)",
  },
  check: {
    color: "#C9A84C",
    fontSize: "0.6rem",
    flexShrink: 0,
  },
  priceBox: {
    background: "#0A0A0A",
    border: "0.5px solid rgba(201,168,76,0.2)",
    borderRadius: "2px",
    padding: "1.25rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column",
    gap: "0.25rem",
  },
  priceLabel: {
    fontSize: "0.75rem",
    letterSpacing: "0.1em",
    textTransform: "uppercase",
    color: "#C9A84C",
  },
  price: {
    fontFamily: "Georgia, serif",
    fontSize: "2.5rem",
    fontWeight: 700,
    color: "#FAFAF8",
    lineHeight: 1,
  },
  pricePeriod: {
    fontSize: "1rem",
    fontWeight: 400,
    color: "rgba(200,196,187,0.5)",
  },
  priceSub: {
    fontSize: "0.8rem",
    color: "rgba(200,196,187,0.4)",
  },
  btn: {
    width: "100%",
    background: "#C9A84C",
    color: "#0A0A0A",
    border: "none",
    borderRadius: "2px",
    padding: "0.95rem",
    fontSize: "1rem",
    fontWeight: 500,
    letterSpacing: "0.02em",
    marginBottom: "1.5rem",
  },
  footer: {
    fontSize: "0.8rem",
    color: "rgba(200,196,187,0.35)",
  },
};
