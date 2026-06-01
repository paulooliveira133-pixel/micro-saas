import { useState } from "react";

interface Props {
  onSuccess?: (slug: string) => void;
}

export default function RegisterPage({ onSuccess }: Props) {
  const [form, setForm] = useState({
    businessName: "",
    slug: "",
    phone: "",
    adminUsername: "",
    adminPassword: "",
    confirmPassword: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [createdSlug, setCreatedSlug] = useState("");

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setForm((prev) => {
      const updated = { ...prev, [name]: value };
      if (name === "businessName") {
        updated.slug = value
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9\s-]/g, "")
          .trim()
          .replace(/\s+/g, "-");
      }
      return updated;
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (form.adminPassword !== form.confirmPassword) {
      return setError("As senhas não coincidem.");
    }
    if (form.adminPassword.length < 6) {
      return setError("A senha deve ter pelo menos 6 caracteres.");
    }
    if (!form.slug) {
      return setError("Nome de usuário inválido.");
    }

    setLoading(true);
    try {
      const res = await fetch("/api/saas/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: form.businessName,
          slug: form.slug,
          phone: form.phone,
          adminUsername: form.adminUsername,
          adminPassword: form.adminPassword,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        return setError(data.error || "Erro ao criar conta. Tente novamente.");
      }

      setCreatedSlug(data.slug);
      setSuccess(true);
    } catch {
      setError("Erro de conexão. Tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div style={styles.page}>
        <div style={styles.card}>
          <div style={styles.successIcon}>✦</div>
          <h2 style={styles.successTitle}>Conta criada com sucesso!</h2>
          <p style={styles.successSub}>
            Seu negócio <strong style={{ color: "#C9A84C" }}>{form.businessName}</strong> está pronto.
          </p>
          <div style={styles.slugBox}>
            <span style={styles.slugLabel}>Seu link de acesso:</span>
            <code style={styles.slugCode}>
              {window.location.origin}/?tenant={createdSlug}&view=admin
            </code>
          </div>
          <button
            onClick={() => onSuccess?.(createdSlug)}
            style={{ ...styles.btnPrimary, cursor: "pointer", border: "none" }}
          >
            Entrar no meu painel →
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        <div style={styles.logo}>AgendaFácil</div>
        <h1 style={styles.title}>Crie sua conta grátis</h1>
        <p style={styles.sub}>14 dias grátis · Sem cartão de crédito</p>

        <form onSubmit={handleSubmit} style={styles.form}>
          <div style={styles.field}>
            <label style={styles.label}>Nome do seu negócio *</label>
            <input
              name="businessName"
              value={form.businessName}
              onChange={handleChange}
              placeholder="Ex: Barbearia do João"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.field}>
            <label style={styles.label}>
              Identificador único{" "}
              <span style={styles.labelHint}>(gerado automaticamente)</span>
            </label>
            <div style={styles.slugPreview}>
              <span style={styles.slugPrefix}>autodireto.online/?tenant=</span>
              <input
                name="slug"
                value={form.slug}
                onChange={handleChange}
                placeholder="meu-salao"
                required
                style={{ ...styles.input, ...styles.slugInput }}
              />
            </div>
          </div>

          <div style={styles.field}>
            <label style={styles.label}>Telefone / WhatsApp</label>
            <input
              name="phone"
              value={form.phone}
              onChange={handleChange}
              placeholder="(11) 99999-0000"
              style={styles.input}
            />
          </div>

          <div style={styles.divider} />

          <div style={styles.field}>
            <label style={styles.label}>Usuário de acesso *</label>
            <input
              name="adminUsername"
              value={form.adminUsername}
              onChange={handleChange}
              placeholder="Ex: joao"
              required
              style={styles.input}
            />
          </div>

          <div style={styles.row}>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Senha *</label>
              <input
                name="adminPassword"
                type="password"
                value={form.adminPassword}
                onChange={handleChange}
                placeholder="Mínimo 6 caracteres"
                required
                style={styles.input}
              />
            </div>
            <div style={{ ...styles.field, flex: 1 }}>
              <label style={styles.label}>Confirmar senha *</label>
              <input
                name="confirmPassword"
                type="password"
                value={form.confirmPassword}
                onChange={handleChange}
                placeholder="Repita a senha"
                required
                style={styles.input}
              />
            </div>
          </div>

          {error && <div style={styles.errorBox}>{error}</div>}

          <button type="submit" disabled={loading} style={{ ...styles.btnSubmit, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.7 : 1 }}>
            {loading ? "Criando sua conta..." : "Criar conta grátis →"}
          </button>
        </form>

        <p style={styles.loginLink}>
          Já tem uma conta?{" "}
          <a href="/" style={styles.loginAnchor}>
            Fazer login
          </a>
        </p>
      </div>
    </div>
  );
}

const gold = "#C9A84C";

const styles: Record<string, React.CSSProperties> = {
  page: {
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
    border: "0.5px solid rgba(201,168,76,0.2)",
    borderRadius: "4px",
    padding: "2.5rem",
    width: "100%",
    maxWidth: "520px",
  },
  logo: {
    fontFamily: "Georgia, serif",
    fontSize: "1.4rem",
    fontWeight: 700,
    color: gold,
    marginBottom: "1.5rem",
    letterSpacing: "-0.02em",
  },
  title: {
    fontSize: "1.75rem",
    fontWeight: 700,
    color: "#FAFAF8",
    lineHeight: 1.1,
    marginBottom: "0.4rem",
    letterSpacing: "-0.02em",
  },
  sub: {
    fontSize: "0.85rem",
    color: "rgba(200,196,187,0.6)",
    marginBottom: "2rem",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "1.25rem",
  },
  field: {
    display: "flex",
    flexDirection: "column",
    gap: "0.4rem",
  },
  row: {
    display: "flex",
    gap: "1rem",
    flexWrap: "wrap" as const,
  },
  label: {
    fontSize: "0.8rem",
    color: "rgba(200,196,187,0.7)",
    letterSpacing: "0.04em",
    textTransform: "uppercase" as const,
  },
  labelHint: {
    fontSize: "0.75rem",
    color: "rgba(200,196,187,0.4)",
    textTransform: "none" as const,
    letterSpacing: 0,
  },
  input: {
    background: "#0A0A0A",
    border: "0.5px solid rgba(255,255,255,0.1)",
    borderRadius: "2px",
    color: "#FAFAF8",
    padding: "0.7rem 0.85rem",
    fontSize: "0.9rem",
    outline: "none",
    width: "100%",
    boxSizing: "border-box" as const,
  },
  slugPreview: {
    display: "flex",
    alignItems: "center",
    background: "#0A0A0A",
    border: "0.5px solid rgba(255,255,255,0.1)",
    borderRadius: "2px",
    overflow: "hidden",
  },
  slugPrefix: {
    fontSize: "0.75rem",
    color: "rgba(200,196,187,0.4)",
    padding: "0.7rem 0.4rem 0.7rem 0.85rem",
    whiteSpace: "nowrap" as const,
    flexShrink: 0,
  },
  slugInput: {
    border: "none",
    background: "transparent",
    flex: 1,
    paddingLeft: "0.25rem",
    minWidth: 0,
  },
  divider: {
    height: "0.5px",
    background: "rgba(255,255,255,0.06)",
    margin: "0.25rem 0",
  },
  errorBox: {
    background: "rgba(226,75,74,0.1)",
    border: "0.5px solid rgba(226,75,74,0.3)",
    borderRadius: "2px",
    padding: "0.75rem 1rem",
    fontSize: "0.85rem",
    color: "#F09595",
  },
  btnSubmit: {
    background: gold,
    color: "#0A0A0A",
    border: "none",
    borderRadius: "2px",
    padding: "0.9rem",
    fontSize: "0.95rem",
    fontWeight: 500,
    letterSpacing: "0.02em",
    marginTop: "0.25rem",
    width: "100%",
  },
  loginLink: {
    marginTop: "1.5rem",
    fontSize: "0.85rem",
    color: "rgba(200,196,187,0.5)",
    textAlign: "center" as const,
  },
  loginAnchor: {
    color: gold,
    textDecoration: "none",
  },
  successIcon: {
    fontSize: "2.5rem",
    color: gold,
    marginBottom: "1rem",
    textAlign: "center" as const,
  },
  successTitle: {
    fontSize: "1.5rem",
    fontWeight: 700,
    color: "#FAFAF8",
    textAlign: "center" as const,
    marginBottom: "0.5rem",
  },
  successSub: {
    fontSize: "0.95rem",
    color: "rgba(200,196,187,0.7)",
    textAlign: "center" as const,
    marginBottom: "1.5rem",
  },
  slugBox: {
    background: "#0A0A0A",
    border: "0.5px solid rgba(201,168,76,0.2)",
    borderRadius: "2px",
    padding: "1rem",
    marginBottom: "1.5rem",
    display: "flex",
    flexDirection: "column" as const,
    gap: "0.4rem",
  },
  slugLabel: {
    fontSize: "0.75rem",
    color: "rgba(200,196,187,0.5)",
    textTransform: "uppercase" as const,
    letterSpacing: "0.05em",
  },
  slugCode: {
    fontSize: "0.85rem",
    color: gold,
    wordBreak: "break-all" as const,
  },
  btnPrimary: {
    display: "block",
    textAlign: "center" as const,
    background: gold,
    color: "#0A0A0A",
    padding: "0.9rem",
    borderRadius: "2px",
    textDecoration: "none",
    fontSize: "0.95rem",
    fontWeight: 500,
    width: "100%",
  },
};
