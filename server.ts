import PDFDocument from "pdfkit";
import express from "express";
import cors from "cors";
import path from "path";
import { createServer as createViteServer } from "vite";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { Resend } from "resend";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { z } from "zod";
dotenv.config();

// ─────────────────────────────────────────────────────
// ALTERAÇÃO: Substitua o app.post("/api/appointments") por este (com validação Zod)
// ─────────────────────────────────────────────────────
app.post("/api/appointments", async (req: any, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const appointment = await prisma.appointment.create({
    data: {
      customerName: parsed.data.customerName,
      customerPhone: parsed.data.customerPhone,
      date: parsed.data.date,
      time: parsed.data.time,
      serviceId: parsed.data.serviceId,
      professionalId: parsed.data.professionalId,
      tenantId: req.tenant.id,
      status: "agendado",
    },
  });

  const tenant = req.tenant;
  if (tenant.webhookUrl && tenant.whatsappApiKey) {
    try {
      await fetch(tenant.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${tenant.whatsappApiKey}` },
        body: JSON.stringify({
          phone: parsed.data.customerPhone,
          message: `Olá ${parsed.data.customerName}! Seu agendamento está confirmado para ${parsed.data.date} às ${parsed.data.time}. Esperamos você!`,
        }),
      });
    } catch (e) {}
  }

  res.json(appointment);
});

// ─────────────────────────────────────────────────────
// ALTERAÇÃO: Substitua o app.post("/api/services") por este (com validação Zod)
// ─────────────────────────────────────────────────────
app.post("/api/services", async (req: any, res) => {
  const parsed = serviceSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }
  const service = await prisma.service.create({
    data: {
      name: parsed.data.name,
      durationMin: parsed.data.durationMin || 30,
      price: parsed.data.price || 50,
      tenantId: req.tenant.id,
    },
  });
  res.json(service);
});

// ─────────────────────────────────────────────────────
// ALTERAÇÃO: Substitua o app.post("/api/saas/register") por este (com validação Zod)
// ─────────────────────────────────────────────────────
app.post("/api/saas/register", async (req, res) => {
  const parsed = registerSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: parsed.error.errors[0].message });
  }

  const { businessName, slug, phone, email, adminUsername, adminPassword } = parsed.data;
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return res.status(409).json({ error: "Este identificador já está em uso. Tente outro." });

  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);

  const tenant = await prisma.tenant.create({
    data: { name: businessName, slug: cleanSlug, phone: phone || "", adminUsername, adminPassword: hashedPassword, trialEndsAt, planStatus: "trial" },
  });

  if (email) await sendWelcomeEmail(email, businessName, cleanSlug);
  return res.json({ success: true, slug: tenant.slug });
});


const resend = process.env.RESEND_API_KEY ? new Resend(process.env.RESEND_API_KEY) : null;
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

// ─── TRIAL STATUS ───
app.get("/api/auth/trial-status", async (req: any, res) => {
  const tenantId = req.headers["x-tenant-id"] as string;
  if (!tenantId) return res.status(400).json({ error: "Tenant não informado" });
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantId } });
  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });
  const now = new Date();
  const trialEndsAt = new Date(tenant.trialEndsAt);
  const daysLeft = Math.ceil((trialEndsAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (tenant.planStatus === "active") {
    return res.json({ status: "active", daysLeft: null, expired: false });
  }
  if (now <= trialEndsAt) {
    return res.json({ status: "trial", daysLeft: Math.max(0, daysLeft), expired: false });
  }
  await prisma.tenant.update({ where: { slug: tenantId }, data: { planStatus: "expired" } });
  return res.json({ status: "expired", daysLeft: 0, expired: true });
});

// ─── ESTABLISHMENT ───
app.use(helmet({
  contentSecurityPolicy: false, // Desabilitado pois o Vite precisa de inline scripts
  crossOriginEmbedderPolicy: false,
}));

// ─── RATE LIMITING ───
// Global: 100 requests por 15 minutos por IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: "Muitas requisições. Tente novamente em alguns minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api", globalLimiter);

// Auth: 10 tentativas por 15 minutos (anti-brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: "Muitas tentativas de login. Tente novamente em 15 minutos." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/auth", authLimiter);

// Registro: 5 cadastros por hora por IP
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: { error: "Limite de cadastros atingido. Tente novamente em 1 hora." },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/saas/register", registerLimiter);

// ─── SCHEMAS ZOD (validação de inputs) ───
const appointmentSchema = z.object({
  customerName: z.string().min(2, "Nome muito curto").max(100),
  customerPhone: z.string().min(8, "Telefone inválido").max(20),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data inválida (use YYYY-MM-DD)"),
  time: z.string().regex(/^\d{2}:\d{2}$/, "Hora inválida (use HH:MM)"),
  serviceId: z.string().min(1, "Serviço obrigatório"),
  professionalId: z.string().min(1, "Profissional obrigatório"),
});

const serviceSchema = z.object({
  name: z.string().min(2, "Nome muito curto").max(80),
  durationMin: z.number().int().min(5).max(480).optional(),
  price: z.number().min(0).max(99999).optional(),
});

const registerSchema = z.object({
  businessName: z.string().min(2, "Nome muito curto").max(100),
  slug: z.string().min(2, "Identificador muito curto").max(50).regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens"),
  phone: z.string().max(20).optional(),
  email: z.string().email("Email inválido").optional().or(z.literal("")),
  adminUsername: z.string().min(3, "Usuário muito curto").max(30),
  adminPassword: z.string().min(6, "Senha muito curta").max(100),
});

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
    data: { name: req.body.name, durationMin: req.body.durationMin, price: req.body.price },
  });
  res.json(service);
});

app.delete("/api/services/:id", async (req: any, res) => {
  await prisma.service.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── PROFESSIONALS ───
app.get("/api/professionals", async (req: any, res) => {
  const professionals = await prisma.professional.findMany({ where: { tenantId: req.tenant.id } });
  res.json(professionals);
});

app.post("/api/professionals", async (req: any, res) => {
  const professional = await prisma.professional.create({
    data: { name: req.body.name, role: req.body.role, active: req.body.active ?? true, tenantId: req.tenant.id },
  });
  res.json(professional);
});

app.put("/api/professionals/:id", async (req: any, res) => {
  const professional = await prisma.professional.update({
    where: { id: req.params.id },
    data: { name: req.body.name, role: req.body.role, active: req.body.active },
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
  res.json(plans.map(p => ({ ...p, servicesIncluded: p.services.map(s => s.id) })));
});

app.post("/api/plans", async (req: any, res) => {
  const plan = await prisma.plan.create({
    data: {
      name: req.body.name,
      price: req.body.price,
      description: req.body.description || "",
      limitCount: req.body.limitCount || 4,
      tenantId: req.tenant.id,
      services: { connect: (req.body.servicesIncluded || []).map((id: string) => ({ id })) },
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
  const subscribers = await prisma.subscriber.findMany({ where: { tenantId: req.tenant.id } });
  res.json(subscribers);
});

app.delete("/api/subscribers/:id", async (req: any, res) => {
  await prisma.subscriber.delete({ where: { id: req.params.id } });
  res.json({ success: true });
});

// ─── SAAS TENANTS ───
app.get("/api/saas/tenants", async (req, res) => {
  const tenants = await prisma.tenant.findMany({
    include: { professionals: true, services: true, appointments: true, subscribers: true },
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
      name, slug,
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

// ─── ATIVAR PLANO ───
app.post("/api/saas/activate-plan", async (req, res) => {
  const { slug } = req.body;
  if (!slug) return res.status(400).json({ error: "Slug não informado" });
  await prisma.tenant.update({ where: { slug }, data: { planStatus: "active" } });
  return res.json({ success: true });
});

// ─── MERCADO PAGO ───
app.post("/api/pagamento/criar", async (req: any, res) => {
  try {
    const { planName, planPrice, customerEmail } = req.body;
    const r = await fetch("https://api.mercadopago.com/checkout/preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` },
      body: JSON.stringify({
        items: [{ title: planName || "Plano", quantity: 1, currency_id: "BRL", unit_price: Number(planPrice) }],
        payer: { email: customerEmail || "cliente@email.com" },
        back_urls: {
          success: `${process.env.APP_URL || "https://autodireto.online"}/?payment=success`,
          failure: `${process.env.APP_URL || "https://autodireto.online"}/?payment=failure`,
          pending: `${process.env.APP_URL || "https://autodireto.online"}/?payment=pending`,
        },
      }),
    });
    const d = await r.json();
    if (d.id) return res.json({ success: true, checkoutUrl: d.init_point });
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
        atRiskCustomers: [{ name: "Thiago Lima", phone: "+55 (11) 93333-4444", lastVisit: "2026-05-20", reason: "Teve agendamento CANCELADO ontem e não realizou nenhuma nova reserva.", retentionAction: "Enviar cupom de 15% de desconto via WhatsApp." }],
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

// ─── EMAIL BOAS-VINDAS ───
async function sendWelcomeEmail(to: string, businessName: string, slug: string) {
  console.log("[EMAIL] Tentando enviar para:", to, "| Resend configurado:", !!resend);
  if (!resend) { console.error("[EMAIL] RESEND_API_KEY não configurada"); return; }
  try {
    await resend.emails.send({
      from: "AgendaFácil <onboarding@resend.dev>",
      to,
      subject: `Bem-vindo ao AgendaFácil, ${businessName}! 🎉`,
      html: `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"></head><body style="margin:0;padding:0;background:#0A0A0A;font-family:system-ui,sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:40px 0;"><tr><td align="center"><table width="560" cellpadding="0" cellspacing="0" style="background:#111111;border:1px solid rgba(201,168,76,0.2);border-radius:4px;overflow:hidden;"><tr><td style="background:#0A0A0A;padding:32px 40px;border-bottom:1px solid rgba(201,168,76,0.15);"><p style="margin:0;font-family:Georgia,serif;font-size:22px;font-weight:700;color:#C9A84C;">AgendaFácil</p></td></tr><tr><td style="padding:40px 40px 24px;"><p style="margin:0 0 8px;font-size:12px;letter-spacing:0.15em;text-transform:uppercase;color:#C9A84C;">✦ Conta criada com sucesso</p><h1 style="margin:0 0 16px;font-family:Georgia,serif;font-size:28px;font-weight:700;color:#FAFAF8;line-height:1.1;">Bem-vindo, ${businessName}!</h1><p style="margin:0;font-size:15px;color:rgba(200,196,187,0.7);line-height:1.6;">Sua conta foi criada. Você tem <strong style="color:#C9A84C;">14 dias gratuitos</strong> para explorar o AgendaFácil.</p></td></tr><tr><td style="padding:24px 40px;"><p style="margin:0 0 12px;font-size:12px;text-transform:uppercase;color:rgba(200,196,187,0.5);">Seu link de acesso</p><table width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border:1px solid rgba(201,168,76,0.15);border-radius:2px;"><tr><td style="padding:16px 20px;"><p style="margin:0;font-size:13px;color:#C9A84C;word-break:break-all;">https://autodireto.online/?tenant=${slug}&view=admin</p></td></tr></table></td></tr><tr><td style="padding:0 40px 40px;"><a href="https://autodireto.online/?tenant=${slug}&view=admin" style="display:block;text-align:center;background:#C9A84C;color:#0A0A0A;padding:14px;border-radius:2px;font-size:15px;font-weight:500;text-decoration:none;">Acessar meu painel →</a></td></tr><tr><td style="padding:20px 40px;border-top:1px solid rgba(255,255,255,0.06);"><p style="margin:0;font-size:12px;color:rgba(200,196,187,0.3);text-align:center;">© 2025 AgendaFácil · contato@autodireto.online</p></td></tr></table></td></tr></table></body></html>`,
    });
    console.log(`[EMAIL] Boas-vindas enviado para ${to}`);
  } catch (err) {
    console.error("[EMAIL] Erro ao enviar:", err);
  }
}

// ─── REGISTRO PÚBLICO ───
app.post("/api/saas/register", async (req, res) => {
  const { businessName, slug, phone, adminUsername, adminPassword, email } = req.body;
  if (!businessName || !slug || !adminUsername || !adminPassword)
    return res.status(400).json({ error: "Preencha todos os campos obrigatórios." });
  const cleanSlug = slug.toLowerCase().replace(/[^a-z0-9-]/g, "-");
  const existing = await prisma.tenant.findUnique({ where: { slug: cleanSlug } });
  if (existing) return res.status(409).json({ error: "Este identificador já está em uso. Tente outro." });
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const trialEndsAt = new Date();
  trialEndsAt.setDate(trialEndsAt.getDate() + 14);
  const tenant = await prisma.tenant.create({
    data: { name: businessName, slug: cleanSlug, phone: phone || "", adminUsername, adminPassword: hashedPassword, trialEndsAt, planStatus: "trial" },
  });
  if (email) await sendWelcomeEmail(email, businessName, cleanSlug);
  return res.json({ success: true, slug: tenant.slug });
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
      // Landing page na raiz
      if (req.path === "/" && !req.query.tenant && !req.query.register && !req.query.view) {
        return res.sendFile(path.join(process.cwd(), "public", "landing.html"));
      }
      res.sendFile(path.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SUCCESS] Server running on http://localhost:${PORT}`);
  });
}

app.get("/api/relatorio/pdf", async (req: any, res) => {
  const tenantId = req.headers["x-tenant-id"] as string || req.query.tenant as string;
  if (!tenantId) return res.status(400).json({ error: "Tenant não informado" });

  const tenant = await prisma.tenant.findUnique({
    where: { slug: tenantId },
    include: {
      appointments: { include: { service: true, professional: true }, orderBy: { createdAt: "desc" } },
      services: true,
      subscribers: { include: { plan: true } },
    },
  });

  if (!tenant) return res.status(404).json({ error: "Tenant não encontrado" });

  const PDFDocument = (await import("pdfkit")).default;
  const doc = new PDFDocument({ margin: 50, size: "A4" });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="relatorio-${tenantId}-${new Date().toISOString().slice(0,10)}.pdf"`);
  doc.pipe(res);

  const gold = "#C9A84C";
  const dark = "#1A1A1A";
  const gray = "#666666";
  const light = "#999999";

  // ─── HEADER ───
  doc.rect(0, 0, doc.page.width, 80).fill(dark);
  doc.fontSize(22).font("Helvetica-Bold").fillColor(gold).text("AgendaFácil", 50, 25);
  doc.fontSize(10).font("Helvetica").fillColor("#AAAAAA").text("Relatório Gerencial", 50, 52);
  doc.fontSize(9).fillColor("#777777").text(`Gerado em ${new Date().toLocaleDateString("pt-BR", { day:"2-digit", month:"long", year:"numeric" })}`, 50, 65);

  // Nome do salão (direita)
  doc.fontSize(12).font("Helvetica-Bold").fillColor(gold).text(tenant.name, 0, 30, { align: "right" });
  doc.fontSize(9).font("Helvetica").fillColor("#AAAAAA").text(tenant.phone || "", 0, 48, { align: "right" });

  doc.moveDown(3);

  // ─── RESUMO EXECUTIVO ───
  const apts = tenant.appointments;
  const concluded = apts.filter(a => a.status === "concluido" || a.status === "concluído");
  const canceled = apts.filter(a => a.status === "cancelado");
  const pending = apts.filter(a => a.status === "agendado");
  const totalRevenue = concluded.reduce((sum, a) => sum + (a.service?.price || 0), 0);
  const avgTicket = concluded.length > 0 ? totalRevenue / concluded.length : 0;

  doc.fontSize(13).font("Helvetica-Bold").fillColor(dark).text("Resumo Executivo", 50, doc.y);
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(gold).lineWidth(1).stroke();
  doc.moveDown(0.8);

  // Cards de resumo
  const cardY = doc.y;
  const cardW = (doc.page.width - 120) / 4;
  const cards = [
    { label: "Total Agendamentos", value: String(apts.length), color: gold },
    { label: "Concluídos", value: String(concluded.length), color: "#4CAF50" },
    { label: "Cancelados", value: String(canceled.length), color: "#E57373" },
    { label: "Faturamento", value: `R$ ${totalRevenue.toFixed(2).replace(".", ",")}`, color: gold },
  ];

  cards.forEach((card, i) => {
    const x = 50 + i * (cardW + 10);
    doc.rect(x, cardY, cardW, 60).fill("#F8F8F8").stroke("#EEEEEE");
    doc.fontSize(8).font("Helvetica").fillColor(gray).text(card.label, x + 8, cardY + 8, { width: cardW - 16 });
    doc.fontSize(16).font("Helvetica-Bold").fillColor(card.color).text(card.value, x + 8, cardY + 24, { width: cardW - 16 });
  });

  doc.moveDown(5.5);

  // Ticket médio e taxa de cancelamento
  doc.fontSize(9).font("Helvetica").fillColor(gray)
    .text(`Ticket médio: R$ ${avgTicket.toFixed(2).replace(".", ",")}`, 50, doc.y, { continued: true })
    .text(`   |   Taxa de cancelamento: ${apts.length > 0 ? ((canceled.length / apts.length) * 100).toFixed(1) : 0}%`, { continued: true })
    .text(`   |   Agendamentos pendentes: ${pending.length}`);

  doc.moveDown(1.5);

  // ─── SERVIÇOS MAIS PROCURADOS ───
  doc.fontSize(13).font("Helvetica-Bold").fillColor(dark).text("Serviços mais procurados");
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(gold).lineWidth(1).stroke();
  doc.moveDown(0.8);

  const serviceCount: Record<string, { count: number; revenue: number }> = {};
  apts.forEach(a => {
    if (a.service) {
      if (!serviceCount[a.service.name]) serviceCount[a.service.name] = { count: 0, revenue: 0 };
      serviceCount[a.service.name].count++;
      if (a.status === "concluido" || a.status === "concluído") {
        serviceCount[a.service.name].revenue += a.service.price;
      }
    }
  });

  const sortedServices = Object.entries(serviceCount).sort((a, b) => b[1].count - a[1].count);

  if (sortedServices.length === 0) {
    doc.fontSize(9).fillColor(light).text("Nenhum serviço registrado ainda.");
  } else {
    // Header tabela
    const colX = [50, 220, 330, 440];
    doc.fontSize(8).font("Helvetica-Bold").fillColor(gray);
    doc.text("Serviço", colX[0], doc.y);
    doc.text("Agendamentos", colX[1], doc.y - doc.currentLineHeight());
    doc.text("Receita", colX[2], doc.y - doc.currentLineHeight());
    doc.text("% do total", colX[3], doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#DDDDDD").lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    sortedServices.slice(0, 8).forEach((([name, data], idx) => {
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 18).fill("#FAFAFA");
      const pct = apts.length > 0 ? ((data.count / apts.length) * 100).toFixed(1) : "0";
      doc.fontSize(9).font("Helvetica").fillColor(dark).text(name, colX[0], rowY, { width: 160 });
      doc.text(String(data.count), colX[1], rowY);
      doc.text(`R$ ${data.revenue.toFixed(2).replace(".", ",")}`, colX[2], rowY);
      doc.text(`${pct}%`, colX[3], rowY);
      doc.moveDown(0.8);
    }));
  }

  doc.moveDown(1);

  // ─── AGENDAMENTOS RECENTES ───
  if (doc.y > 650) doc.addPage();

  doc.fontSize(13).font("Helvetica-Bold").fillColor(dark).text("Agendamentos Recentes");
  doc.moveDown(0.3);
  doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(gold).lineWidth(1).stroke();
  doc.moveDown(0.8);

  const recentApts = apts.slice(0, 15);

  if (recentApts.length === 0) {
    doc.fontSize(9).fillColor(light).text("Nenhum agendamento registrado ainda.");
  } else {
    const cols = [50, 130, 220, 330, 430];
    doc.fontSize(8).font("Helvetica-Bold").fillColor(gray);
    doc.text("Data", cols[0], doc.y);
    doc.text("Hora", cols[1], doc.y - doc.currentLineHeight());
    doc.text("Cliente", cols[2], doc.y - doc.currentLineHeight());
    doc.text("Serviço", cols[3], doc.y - doc.currentLineHeight());
    doc.text("Status", cols[4], doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#DDDDDD").lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    recentApts.forEach((apt, idx) => {
      if (doc.y > 720) doc.addPage();
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 18).fill("#FAFAFA");
      const statusColor = apt.status === "concluido" || apt.status === "concluído" ? "#4CAF50" : apt.status === "cancelado" ? "#E57373" : gold;
      doc.fontSize(8).font("Helvetica").fillColor(dark);
      doc.text(apt.date || "-", cols[0], rowY, { width: 75 });
      doc.text(apt.time || "-", cols[1], rowY, { width: 80 });
      doc.text(apt.customerName || "-", cols[2], rowY, { width: 105 });
      doc.text(apt.service?.name || "-", cols[3], rowY, { width: 95 });
      doc.fillColor(statusColor).text(apt.status || "-", cols[4], rowY, { width: 80 });
      doc.moveDown(0.8);
    });
  }

  doc.moveDown(1);

  // ─── CLIENTES / ASSINANTES ───
  if (tenant.subscribers.length > 0) {
    if (doc.y > 600) doc.addPage();
    doc.fontSize(13).font("Helvetica-Bold").fillColor(dark).text("Assinantes Ativos");
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor(gold).lineWidth(1).stroke();
    doc.moveDown(0.8);

    const subCols = [50, 220, 330, 430];
    doc.fontSize(8).font("Helvetica-Bold").fillColor(gray);
    doc.text("Cliente", subCols[0], doc.y);
    doc.text("Telefone", subCols[1], doc.y - doc.currentLineHeight());
    doc.text("Plano", subCols[2], doc.y - doc.currentLineHeight());
    doc.text("Status", subCols[3], doc.y - doc.currentLineHeight());
    doc.moveDown(0.3);
    doc.moveTo(50, doc.y).lineTo(doc.page.width - 50, doc.y).strokeColor("#DDDDDD").lineWidth(0.5).stroke();
    doc.moveDown(0.4);

    tenant.subscribers.slice(0, 20).forEach((sub, idx) => {
      if (doc.y > 720) doc.addPage();
      const rowY = doc.y;
      if (idx % 2 === 0) doc.rect(50, rowY - 3, doc.page.width - 100, 18).fill("#FAFAFA");
      doc.fontSize(8).font("Helvetica").fillColor(dark);
      doc.text(sub.customerName, subCols[0], rowY, { width: 165 });
      doc.text(sub.customerPhone, subCols[1], rowY, { width: 105 });
      doc.text(sub.plan?.name || "-", subCols[2], rowY, { width: 95 });
      doc.fillColor(sub.status === "ativo" ? "#4CAF50" : "#E57373").text(sub.status, subCols[3], rowY);
      doc.moveDown(0.8);
    });
  }

  // ─── FOOTER ───
  const pageCount = doc.bufferedPageRange().count;
  for (let i = 0; i < pageCount; i++) {
    doc.switchToPage(i);
    doc.fontSize(8).font("Helvetica").fillColor(light)
      .text(`AgendaFácil · ${tenant.name} · Página ${i + 1} de ${pageCount}`, 50, doc.page.height - 40, { align: "center", width: doc.page.width - 100 });
    doc.moveTo(50, doc.page.height - 50).lineTo(doc.page.width - 50, doc.page.height - 50).strokeColor("#EEEEEE").lineWidth(0.5).stroke();
  }

  doc.end();
});
bootstrapServer();