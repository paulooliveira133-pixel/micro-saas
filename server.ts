import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// ─── Middleware: resolve tenant by slug ───
app.use("/api", async (req: any, res, next) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId || req.path.startsWith("/saas") || req.path.startsWith("/auth") || req.path.startsWith("/pagamento")) {
    return next();
  }
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  req.tenant = tenant;
  next();
});

// ─── AUTH ───
app.post("/api/auth/tenant", async (req: any, res) => {
  const { username, password } = req.body;
  const tenantId = req.headers["x-tenant-id"] as string;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  const passwordMatch = await bcrypt.compare(password, tenant.adminPassword).catch(() => password === tenant.adminPassword);
  if (tenant.adminUsername === username && passwordMatch) {
    return res.json({ success: true, tenant: { id: tenant.id, name: tenant.name } });
  }
  return res.status(401).json({ error: "Credenciais inválidas" });
});

app.post("/api/auth/saas", async (req, res) => {
  const { username, password } = req.body;
  if (username === "admin" && password === "admin123") {
    return res.json({ success: true });
  }
  return res.status(401).json({ error: "Credenciais inválidas" });
});

// ─── ESTABLISHMENT ───
app.get("/api/establishment", async (req: any, res) => {
  const tenant = req.tenant;
  res.json({
    id: tenant.id,
    name: tenant.name,
    phone: tenant.phone,
    openTime: tenant.openTime,
    closeTime: tenant.closeTime,
    address: tenant.address,
    whatsappApiKey: tenant.whatsappApiKey,
    webhookUrl: tenant.webhookUrl,
    logoUrl: tenant.logoUrl,
    theme: tenant.theme,
    customDomain: tenant.customDomain,
    adminUsername: tenant.adminUsername,
  });
});

app.post("/api/establishment", async (req: any, res) => {
  const tenant = req.tenant;
  const updated = await prisma.tenant.update({
    where: { id: tenant.id },
    data: {
      name: req.body.name || tenant.name,
      phone: req.body.phone || tenant.phone,
      openTime: req.body.openTime || tenant.openTime,
      closeTime: req.body.closeTime || tenant.closeTime,
      address: req.body.address || tenant.address,
      whatsappApiKey: req.body.whatsappApiKey ?? tenant.whatsappApiKey,
      webhookUrl: req.body.webhookUrl ?? tenant.webhookUrl,
      logoUrl: req.body.logoUrl ?? tenant.logoUrl,
      theme: req.body.theme || tenant.theme,
      customDomain: req.body.customDomain ?? tenant.customDomain,
      adminUsername: req.body.adminUsername || tenant.adminUsername,
      adminPassword: req.body.adminPassword ? await bcrypt.hash(req.body.adminPassword, 10) : tenant.adminPassword, 
    },
  });
  res.json({ success: true, tenant: updated });
});

// ─── SERVICES ───
app.get("/api/services", async (req: any, res) => {
  const services = await prisma.service.findMany({
    where: { tenantId: req.tenant.id },
    orderBy: { createdAt: "asc" },
  });
  res.json(services);
});

app.post("/api/services", async (req: any, res) => {
  const service = await prisma.service.create({
    data: {
      name: req.body.name,
      durationMin: req.body.durationMin || 30,
      price: req.body.price || 50,
      tenantId: req.tenant.id,
    },
  });
  res.json(service);
});

app.put("/api/services/:id", async (req: any, res) => {
  const service = await prisma.service.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name,
      durationMin: req.body.durationMin,
      price: req.body.price,
    },
  });
  res.json(service);
});

app.delete("/api/services/:id", async (req: any, res) => {
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── PROFESSIONALS ───
app.get("/api/professionals", async (req: any, res) => {
  const professionals = await prisma.professional.findMany({
    where: { tenantId: req.tenant.id },
  });
  res.json(professionals);
});

app.post("/api/professionals", async (req: any, res) => {
  const professional = await prisma.professional.create({
    data: {
      name: req.body.name,
      role: req.body.role,
      active: req.body.active ?? true,
      tenantId: req.tenant.id,
    },
  });
  res.json(professional);
});

app.put("/api/professionals/:id", async (req: any, res) => {
  const professional = await prisma.professional.update({
    where: { id: req.params.id },
    data: {
      name: req.body.name,
      role: req.body.role,
      active: req.body.active,
    },
  });
  res.json(professional);
});

// ─── APPOINTMENTS ───
app.get("/api/appointments", async (req: any, res) => {
  const appointments = await prisma.appointment.findMany({
    where: { tenantId: req.tenant.id },
    include: { service: true, professional: true },
    orderBy: { createdAt: "desc" },
  });
  res.json(appointments);
});

app.post("/api/appointments", async (req: any, res) => {
  const appointment = await prisma.appointment.create({
    data: {
      customerName: req.body.customerName,
      customerPhone: req.body.customerPhone,
      date: req.body.date,
      time: req.body.time,
      serviceId: req.body.serviceId,
      professionalId: req.body.professionalId,
      tenantId: req.tenant.id,
      status: "agendado",
    },
  });

  // Notificação WhatsApp
  const tenant = req.tenant;
  if (tenant.webhookUrl && tenant.whatsappApiKey) {
    try {
      await fetch(tenant.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tenant.whatsappApiKey}` },
        body: JSON.stringify({
          phone: req.body.customerPhone,
          message: `Olá ${req.body.customerName}! Seu agendamento está confirmado para ${req.body.date} às ${req.body.time}. Esperamos você!`,
        }),
      });
    } catch (e) {}
  }

  res.json(appointment);
});

app.post("/api/appointments/:id/status", async (req: any, res) => {
  const appointment = await prisma.appointment.update({
    where: { id: req.params.id },
    data: { status: req.body.status },
  });
  res.json(appointment);
});

// ─── NOTIFICATIONS ───
app.get("/api/notifications", async (req: any, res) => {
  const notifications = await prisma.notification.findMany({
    where: { tenantId: req.tenant.id },
    orderBy: { createdAt: "desc" },
  });
  res.json(notifications.map(n => ({
    id: n.id,
    appointmentId: n.appointmentId,
    recipient: n.recipient,
    recipientPhone: n.recipientPhone,
    message: n.message,
    status: n.status,
    timestamp: n.createdAt,
    type: n.type,
  })));
});

app.post("/api/notifications/simulate", async (req: any, res) => {
  const notification = await prisma.notification.create({
    data: {
      type: req.body.type || "reminder",
      recipient: "Cliente",
      recipientPhone: "+55 (11) 99999-0000",
      message: "Lembrete de agendamento simulado.",
      status: "enviado",
      appointmentId: req.body.appointmentId || "apt-sim",
      tenantId: req.tenant.id,
    },
  });
  res.json({ success: true, notification });
});

// ─── PLANS ───
app.get("/api/plans", async (req: any, res) => {
  const plans = await prisma.plan.findMany({
    where: { tenantId: req.tenant.id },
    include: { services: true },
  });
  res.json(plans.map(p => ({
    ...p,
    servicesIncluded: p.services.map(s => s.id),
  })));
});

app.post("/api/plans", async (req: any, res) => {
  const plan = await prisma.plan.create({
    data: {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      limitCount: req.body.limitCount || 4,
      tenantId: req.tenant.id,
      services: {
        connect: (req.body.servicesIncluded || []).map((id: string) => ({ id })),
      },
    },
  });
  res.json(plan);
});

app.delete("/api/plans/:id", async (req: any, res) => {
  await prisma.plan.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── SUBSCRIBERS ───
app.get("/api/subscribers", async (req: any, res) => {
  const subscribers = await prisma.subscriber.findMany({
    where: { tenantId: req.tenant.id },
  });
  res.json(subscribers);
});

app.delete("/api/subscribers/:id", async (req: any, res) => {
  await prisma.subscriber.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── SAAS TENANTS ───
app.get("/api/saas/tenants", async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: {
      professionals: true,
      services: true,
      appointments: true,
      subscribers: true,
    },
  });
  res.json(tenants.map(t => ({
    id: t.slug,
    slug: t.slug,
    establishment: { name: t.name, phone: t.phone },
    professionals: t.professionals,
    services: t.services,
    appointments: t.appointments,
    subscribers: t.subscribers,
  })));
});

app.post("/api/saas/tenants", async (req, res) => {
  const { name, slug, phone, address, openTime, closeTime, adminUsername, adminPassword } = req.body;
  const tenant = await prisma.tenant.create({
    data: {
      name,
      slug,
      phone: phone || "",
      address: address || "",
      openTime: openTime || "09:00",
      closeTime: closeTime || "20:00",
      adminUsername: adminUsername || "gerente",
      adminPassword: adminPassword || "gerente123",
    },
  });
  res.json({ success: true, tenant });
});

// ─── MERCADO PAGO ───
app.post("/api/pagamento/criar", async (req: any, res) => {
  try {
    const { planName, planPrice, customerEmail, salonId } = req.body;
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        items: [{ title: planName || "Plano", quantity: 1, currency_id: "BRL", unit_price: Number(planPrice) }],
        payer: { email: customerEmail || "cliente@email.com" },
        back_urls: {
          success: `${process.env.APP_URL || "https://micro-saas-production-549a.up.railway.app"}/?payment=success`,
          failure: `${process.env.APP_URL || "https://micro-saas-production-549a.up.railway.app"}/?payment=failure`,
          pending: `${process.env.APP_URL || "https://micro-saas-production-549a.up.railway.app"}/?payment=pending`,
        },
      }),
    });
    const d = await r.json();
    if (d.id) return res.json({ success: true, checkoutUrl: d.init_point });
    console.error("[MP ERROR]", d);
    return res.status(400).json({ success: false, error: d });
  } catch (e) {
    return res.status(500).json({ success: false });
  }
});

// ─── AI ANALYSIS ───
app.post("/api/ai/analyze", async (req: any, res) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantId },
    include: { services: true, appointments: true },
  });

  const claudeKey = process.env.ANTHROPIC_API_KEY;
  const summaryStr = JSON.stringify({
    salonName: tenant?.name,
    services: tenant?.services.map(s => ({ name: s.name, price: s.price })),
    appointments: tenant?.appointments.map(a => ({ customer: a.customerName, date: a.date, status: a.status })),
  });

  const prompt = `Analise os dados desta barbearia/salão para prever o risco de Churn. Retorne APENAS o objeto JSON puro, sem markdown. Schema: {"churnReport":{"atRiskCount":0,"atRiskCustomers":[{"name":"","phone":"","lastVisit":"","reason":"","retentionAction":""}],"generalStatus":""},"slotOptimization":{"recommendedFillerDeals":[],"suggestedQuietHoursPromo":"","forecastedBusyDays":[]}} Dados: ${summaryStr}`;

  if (claudeKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": claudeKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1500, messages: [{ role: "user", content: prompt }] }),
      });
      const responseData = await response.json();
      const rawText = responseData.content?.[0]?.text || "{}";
      const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      const parsedData = JSON.parse(clean);
      return res.json({ provider: "Claude Sonnet 4 (Anthropic)", data: parsedData });
    } catch (err) {
      console.error("Claude error:", err);
    }
  }

  return res.json({
    provider: "Smart Local Engine (Chave API não configurada)",
    data: {
      churnReport: {
        atRiskCount: 1,
        atRiskCustomers: [{
          name: "Thiago Lima",
          phone: "+55 (11) 93333-4444",
          lastVisit: "2026-05-20",
          reason: "Teve agendamento CANCELADO ontem e não realizou nenhuma nova reserva.",
          retentionAction: "Enviar cupom de 15% de desconto via WhatsApp.",
        }],
        generalStatus: "Taxa de retenção saudável. Sugerimos contatar clientes que cancelaram recentemente.",
      },
      slotOptimization: {
        recommendedFillerDeals: ["Desconto de 15% nas terças e quartas pela manhã.", "Combos promocionais para horários ociosos."],
        suggestedQuietHoursPromo: "Ofereça café cortesia para agendamentos nas terças-feiras pela manhã.",
        forecastedBusyDays: ["Sexta-feira", "Sábado"],
      },
    },
  });
});



// ─── SERVER BOOTSTRAP ───
async function bootstrapServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    const express2 = await import("express");
    app.use(express2.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SUCCESS] Server running on http://localhost:${PORT}`);
  });
}

// ─── REGISTRO PÚBLICO DE NOVO TENANT ───
app.post("/api/saas/register", async (req, res) => {
  const { businessName, slug, phone, adminUsername, adminPassword } = req.body;

  if (!businessName || !slug || !adminUsername || !adminPassword) {
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  }

  // Slug só letras minúsculas, números e hífen
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");

  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) {
    return res.status(409).json({ error: "Este nome de usuário já está em uso. Tente outro." });
  }

  const hashedPassword = await bcrypt.hash(adminPassword, 10);

  const tenant = await prisma.tenant.create({
    data: {
      name: businessName,
      slug: cleanSlug,
      phone: phone || "",
      adminUsername,
      adminPassword: hashedPassword,
    },
  });

  return res.json({ success: true, slug: tenant.slug });
});

// ─── VERIFICAÇÃO DE TRIAL ───
// Adicione esta rota no server.ts, junto com as outras rotas /api/auth/
app.get("/api/auth/trial-status", async (req: any, res) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId) return res.status(400).json({ error: "Tenant não informado" });

  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const now = new Date();
  const trialEndsAt = new Date(tenant.trialEndsAt);
  const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

  // Se planStatus já é "active", libera sempre
  if (tenant.planStatus === "active") {
    return res.json({ status: "active", daysLeft: null, expired: false });
  }

  // Trial ainda válido
  if (now <= trialEndsAt) {
    return res.json({ status: "trial", daysLeft: Math.max(0, daysLeft), expired: false });
  }

  // Trial expirado — atualiza planStatus no banco
  await prisma.tenant.update({
    where: { slug: tenantId },
    data: { planStatus: "expired" },
  });

  return res.json({ status: "expired", daysLeft: 0, expired: true });
});

// ─── ATIVAR PLANO APÓS PAGAMENTO (webhook Mercado Pago ou manual) ───
app.post("/api/saas/activate-plan", async (req, res) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: "Slug não informado" });

  await prisma.tenant.update({
    where: { slug },
    data: { planStatus: "active" },
  });

  return res.json({ success: true });
});

// ─── REGISTRO: já inclui trialEndsAt automático via schema ───
// (Substitua o app.post("/api/saas/register") existente por este)
app.post("/api/saas/register", async (req, res) => {
  const { businessName, slug, phone, adminUsername, adminPassword } = req.body;
  if (!businessName || !slug || !adminUsername || !adminPassword)
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });

  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return res.status(409).json({ error: "Este identificador já está em uso. Tente outro." });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.create({
    data: {
      name: businessName,
      slug: cleanSlug,
      phone: phone || "",
      adminUsername,
      adminPassword: hashedPassword,
      trialEndsAt,
      planStatus: "trial",
    },
  });

  return res.json({ success: true, slug: tenant.slug });
});

// ─────────────────────────────────────────────────────
// INSTRUÇÕES: Adicione estas alterações no AdminPanel.tsx
// ─────────────────────────────────────────────────────

// 1. Adicione este import no topo (junto com os outros imports):
import TrialExpiredScreen from "./TrialExpiredScreen";

// 2. Adicione estes states dentro do componente AdminPanel (junto com os outros useState):
const [trialStatus, setTrialStatus] = useState<"trial" | "active" | "expired" | null>(null);
const [trialDaysLeft, setTrialDaysLeft] = useState<number | null>(null);

// 3. Adicione esta função dentro do componente (antes do return):
const checkTrialStatus = async () => {
  try {
    const res = await fetch("/api/auth/trial-status");
    const data = await res.json();
    setTrialStatus(data.status);
    setTrialDaysLeft(data.daysLeft);
  } catch {
    // Se falhar, não bloqueia o usuário
    setTrialStatus("active");
  }
};

// 4. Adicione o checkTrialStatus no useEffect que já existe (ou crie um novo):
// Dentro do useEffect que chama loadDBState(), adicione:
//   checkTrialStatus();

// 5. No início do return(), ANTES do JSX principal, adicione:
if (trialStatus === "expired") {
  return <TrialExpiredScreen tenantName={establishment?.name || salonId} />;
}

// 6. Adicione o banner de aviso de trial (quando ainda em trial).
// Cole isso logo após a abertura do return(), antes do primeiro <div> do painel:
{trialStatus === "trial" && trialDaysLeft !== null && trialDaysLeft <= 7 && (
  <div style={{
    background: trialDaysLeft <= 3 ? "rgba(226,75,74,0.12)" : "rgba(201,168,76,0.08)",
    border: `0.5px solid ${trialDaysLeft <= 3 ? "rgba(226,75,74,0.3)" : "rgba(201,168,76,0.25)"}`,
    borderRadius: "2px",
    padding: "0.75rem 1.25rem",
    margin: "1rem",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "1rem",
    flexWrap: "wrap" as const,
    fontFamily: "system-ui, sans-serif",
  }}>
    <span style={{ fontSize: "0.85rem", color: trialDaysLeft <= 3 ? "#F09595" : "#C9A84C" }}>
      ⏳ {trialDaysLeft === 0
        ? "Seu trial expira hoje!"
        : `Seu período gratuito expira em ${trialDaysLeft} dia${trialDaysLeft > 1 ? "s" : ""}.`}
    </span>
    <a
      href="/api/pagamento/criar"
      onClick={async (e) => {
        e.preventDefault();
        const res = await fetch("/api/pagamento/criar", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planName: "AgendaFácil Pro", planPrice: 99, customerEmail: "cliente@email.com" }),
        });
        const data = await res.json();
        if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      }}
      style={{
        background: "#C9A84C",
        color: "#0A0A0A",
        padding: "0.4rem 1rem",
        borderRadius: "2px",
        fontSize: "0.8rem",
        fontWeight: 500,
        textDecoration: "none",
        whiteSpace: "nowrap" as const,
      }}
    >
      Assinar agora →
    </a>
  </div>
)}

bootstrapServer();