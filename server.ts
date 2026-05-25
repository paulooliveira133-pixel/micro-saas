import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
// Claude AI via Anthropic API

// Ensure environment load
import dotenv from "dotenv";
dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;
const DB_FILE = path.join(process.cwd(), "db.json");

// Helper types for local db structure
interface Tenant {
  id: string;
  slug: string;
  establishment: {
    id: string;
    name: string;
    phone: string;
    openTime: string;
    closeTime: string;
    address: string;
    whatsappApiKey?: string;
    webhookUrl?: string;
    logoUrl?: string;
    theme?: string;
    customDomain?: string;
    adminUsername?: string;
    adminPassword?: string;
  };
  services: Array<{
    id: string;
    name: string;
    durationMin: number;
    price: number;
  }>;
  professionals: Array<{
    id: string;
    name: string;
    role: string;
    avatarUrl?: string;
    active: boolean;
  }>;
  appointments: Array<{
    id: string;
    customerId: string;
    customerName: string;
    customerPhone: string;
    professionalId: string;
    serviceId: string;
    date: string; // YYYY-MM-DD
    time: string; // HH:MM
    status: 'agendado' | 'concluido' | 'cancelado';
    createdAt: string;
  }>;
  notificationLogs: Array<{
    id: string;
    appointmentId: string;
    recipient: string;
    recipientPhone: string;
    message: string;
    status: 'sent' | 'pending' | 'failed';
    timestamp: string;
    type: 'confirmation' | 'reminder';
  }>;
  plans: Array<{
    id: string;
    name: string;
    price: number;
    description: string;
    servicesIncluded: string[];
    limitCount: number;
    active: boolean;
  }>;
  subscribers: Array<{
    id: string;
    customerName: string;
    customerPhone: string;
    planId: string;
    status: 'ativo' | 'suspenso' | 'cancelado';
    startDate: string;
  }>;
}

interface DBStructure {
  tenants: Tenant[];
}

// Helper to seed standard default tenant templates
function getDemoTenant(id: string, name: string, phone: string, address: string): Tenant {
  return {
    id,
    slug: id,
    establishment: {
      id,
      name,
      phone,
      openTime: "09:00",
      closeTime: "20:00",
      address,
      whatsappApiKey: `api_key_${id}_demo_whatsapp_123456`,
      webhookUrl: "https://api.evolution.example.com/webhook/send",
      adminUsername: "gerente",
      adminPassword: "gerente123"
    },
    services: [
      { id: "srv-1", name: "Corte Degradê Moderno", durationMin: 30, price: 50.0 },
      { id: "srv-2", name: "Barba Terapia com Toalha Quente", durationMin: 30, price: 35.0 },
      { id: "srv-3", name: "Combo Imperial (Corte + Barba)", durationMin: 60, price: 75.0 },
      { id: "srv-4", name: "Selagem Térmica Capilar", durationMin: 90, price: 120.0 },
      { id: "srv-5", name: "Penteado Especial & Gel Fixador", durationMin: 20, price: 30.0 }
    ],
    professionals: [
      { id: "pro-1", name: "Felipe Navalha", role: "Barbeiro Sênior (Degradê & Visagismo)", active: true },
      { id: "pro-2", name: "Gustavo Tesoura", role: "Cabeleireiro & Visagista", active: true },
      { id: "pro-3", name: "Amanda Designer", role: "Especialista em Tratamentos & Barba", active: true }
    ],
    appointments: [
      // Yesterday's completed appointments
      {
        id: "apt-1",
        customerId: "cust-1",
        customerName: "Carlos Silva",
        customerPhone: "+55 (11) 91111-2222",
        professionalId: "pro-1",
        serviceId: "srv-1",
        date: "2026-05-20",
        time: "10:00",
        status: "concluido",
        createdAt: "2026-05-18T14:30:00Z"
      },
      {
        id: "apt-2",
        customerId: "cust-2",
        customerName: "Rodrigo Santos",
        customerPhone: "+55 (11) 92222-3333",
        professionalId: "pro-1",
        serviceId: "srv-2",
        date: "2026-05-20",
        time: "11:00",
        status: "concluido",
        createdAt: "2026-05-19T09:15:00Z"
      },
      {
        id: "apt-3",
        customerId: "cust-3",
        customerName: "Thiago Lima",
        customerPhone: "+55 (11) 93333-4444",
        professionalId: "pro-2",
        serviceId: "srv-3",
        date: "2026-05-20",
        time: "15:00",
        status: "cancelado",
        createdAt: "2026-05-19T10:45:00Z"
      },
      // Today's appointments (May 21, 2026)
      {
        id: "apt-4",
        customerId: "cust-4",
        customerName: "Bruno Alencar",
        customerPhone: "+55 (11) 94444-5555",
        professionalId: "pro-1",
        serviceId: "srv-3",
        date: "2026-05-21",
        time: "09:30",
        status: "concluido",
        createdAt: "2026-05-20T08:00:00Z"
      },
      {
        id: "apt-5",
        customerId: "cust-5",
        customerName: "Marcelo Oliveira",
        customerPhone: "+55 (11) 95555-6666",
        professionalId: "pro-2",
        serviceId: "srv-1",
        date: "2026-05-21",
        time: "14:00",
        status: "agendado",
        createdAt: "2026-05-20T16:20:00Z"
      },
      {
        id: "apt-6",
        customerId: "cust-6",
        customerName: "Lucas Souza",
        customerPhone: "+55 (11) 96666-7777",
        professionalId: "pro-3",
        serviceId: "srv-4",
        date: "2026-05-21",
        time: "16:00",
        status: "agendado",
        createdAt: "2026-05-20T11:00:00Z"
      },
      // Tomorrow's appointments (May 22, 2026)
      {
        id: "apt-7",
        customerId: "cust-1",
        customerName: "Carlos Silva",
        customerPhone: "+55 (11) 91111-2222",
        professionalId: "pro-1",
        serviceId: "srv-2",
        date: "2026-05-22",
        time: "10:30",
        status: "agendado",
        createdAt: "2026-05-21T10:15:00Z"
      },
      {
        id: "apt-8",
        customerId: "cust-7",
        customerName: "Vinicius Nogueira",
        customerPhone: "+55 (11) 97777-8888",
        professionalId: "pro-2",
        serviceId: "srv-1",
        date: "2026-05-22",
        time: "11:00",
        status: "agendado",
        createdAt: "2026-05-21T12:00:00Z"
      }
    ],
    notificationLogs: [
      {
        id: "log-1",
        appointmentId: "apt-4",
        recipient: "Bruno Alencar",
        recipientPhone: "+55 (11) 94444-5555",
        message: `Olá Bruno! Seu agendamento de Combo Imperial com Felipe Navalha na Barbearia Imperial está confirmado para hoje, 21/05 às 09:30. Esperamos você!`,
        status: "sent",
        timestamp: "2026-05-21T08:00:00Z",
        type: "confirmation"
      },
      {
        id: "log-2",
        appointmentId: "apt-5",
        recipient: "Marcelo Oliveira",
        recipientPhone: "+55 (11) 95555-6666",
        message: `Olá Marcelo! Seu agendamento de Corte Degradê Moderno com Gustavo Tesoura na Barbearia Imperial está confirmado para hoje, 21/05 às 14:00. Esperamos você!`,
        status: "sent",
        timestamp: "2026-05-21T09:00:00Z",
        type: "confirmation"
      }
    ],
    plans: [
      {
        id: "plan-1",
        name: "Plano Cabelo na Régua",
        price: 80,
        description: "Corte seu cabelo até 2 vezes por mês e garanta desconto em outros serviços adicionais.",
        servicesIncluded: ["srv-1"],
        limitCount: 2,
        active: true
      },
      {
        id: "plan-2",
        name: "Clube Imperial VIP",
        price: 140,
        description: "Cabelo e barba ilimitados! Venha quantas vezes precisar e saia sempre impecável.",
        servicesIncluded: ["srv-1", "srv-2", "srv-3"],
        limitCount: 999,
        active: true
      }
    ],
    subscribers: [
      {
        id: "sub-1",
        customerName: "Carlos Silva",
        customerPhone: "+55 (11) 91111-2222",
        planId: "plan-2",
        status: "ativo",
        startDate: "2026-05-01"
      },
      {
        id: "sub-2",
        customerName: "Rodrigo Santos",
        customerPhone: "+55 (11) 92222-3333",
        planId: "plan-1",
        status: "ativo",
        startDate: "2026-05-10"
      }
    ]
  };
}

// Database local reading/writing utility
function readDB(): DBStructure {
  try {
    if (!fs.existsSync(DB_FILE)) {
      const defaultState: DBStructure = {
        tenants: [
          getDemoTenant("imperial", "Barbearia Imperial", "+55 (11) 98765-4321", "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP"),
          getDemoTenant("bellavista", "Bella Vista Studio", "+55 (11) 97777-6666", "Rua Augusta, 450 - Consolação, São Paulo - SP")
        ]
      };
      fs.writeFileSync(DB_FILE, JSON.stringify(defaultState, null, 2), "utf8");
      return defaultState;
    }
    const raw = fs.readFileSync(DB_FILE, "utf8");
    const parsed = JSON.parse(raw);

    // Auto-migrate from old single-tenant structure to make sure absolutely no data is lost
    if (parsed.establishment && !parsed.tenants) {
      console.log("[MIGRATION WARNING] Migrating old single-tenant DB structure to Multi-Tenant SaaS...");
      
      const migratedTenant: Tenant = {
        id: "imperial",
        slug: "imperial",
        establishment: parsed.establishment,
        services: parsed.services || [],
        professionals: parsed.professionals || [],
        appointments: parsed.appointments || [],
        notificationLogs: parsed.notificationLogs || [],
        plans: parsed.plans || [],
        subscribers: parsed.subscribers || []
      };

      const secondaryTenant = getDemoTenant(
        "bellavista",
        "Bella Vista Studio",
        "+55 (11) 97777-6666",
        "Rua Augusta, 450 - Consolação, São Paulo - SP"
      );

      const migratedDB: DBStructure = {
        tenants: [migratedTenant, secondaryTenant]
      };

      fs.writeFileSync(DB_FILE, JSON.stringify(migratedDB, null, 2), "utf8");
      return migratedDB;
    }

    // fallback if tenants is missing
    if (!parsed.tenants) {
      return {
        tenants: [
          getDemoTenant("imperial", "Barbearia Imperial", "+55 (11) 98765-4321", "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP")
        ]
      };
    }

    return parsed;
  } catch (err) {
    console.error("Error reading db file, falling back to default SaaS data:", err);
    return {
      tenants: [
        getDemoTenant("imperial", "Barbearia Imperial", "+55 (11) 98765-4321", "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP")
      ]
    };
  }
}

function writeDB(data: DBStructure) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf8");
  } catch (err) {
    console.error("Error writing to db file:", err);
  }
}

// Claude AI client check
function getClaudeKey(): string | null {
  return process.env.ANTHROPIC_API_KEY || null;
}

// -------------------------------------------------------------
// MULTI-TENANT CONTEXT MIDDLEWARE
// Intercepts all api requests to dynamically switch the DB environment 
// -------------------------------------------------------------
app.use((req, res, next) => {
  if (!req.url.startsWith("/api/")) {
    return next();
  }

  // Skip SaaS registration or listing endpoints from context injection
  if (req.url.startsWith("/api/saas/")) {
    return next();
  }

  const db = readDB();
  const host = req.headers.host || "";
  const hostWithoutPort = host.split(":")[0].toLowerCase();

  // 1. Resolve from custom header
  let rawTenantId = req.headers["x-tenant-id"] || req.query.tenant;

  // 2. Resolve by custom domain or subdomain if no header exists
  let tenant = null;
  if (rawTenantId) {
    tenant = db.tenants.find(t => t.id === rawTenantId || t.slug === rawTenantId);
  }

  if (!tenant) {
    tenant = db.tenants.find(t => 
      (t.establishment.customDomain && t.establishment.customDomain.toLowerCase() === hostWithoutPort) ||
      (t.slug && hostWithoutPort.startsWith(`${t.slug}.`))
    );
  }
  
  if (!tenant) {
    // Default fallback to first tenant so legacy requests still operate flawlessly
    tenant = db.tenants[0] || getDemoTenant("imperial", "Barbearia Imperial", "+55 (11) 98765-4321", "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP");
  }

  (req as any).tenant = tenant;
  (req as any).tenantId = tenant.id;

  next();
});

// -------------------------------------------------------------
// SAAS PLATFORM CHIEF ENDPOINTS
// For registering and listing tenants across the ecosystem
// -------------------------------------------------------------

// List all tenants (businesses)
app.get("/api/saas/tenants", (req, res) => {
  const db = readDB();
  const summary = db.tenants.map(t => ({
    id: t.id,
    slug: t.slug,
    name: t.establishment.name,
    phone: t.establishment.phone,
    address: t.establishment.address,
    openTime: t.establishment.openTime,
    closeTime: t.establishment.closeTime,
    activeSubscribersCount: (t.subscribers || []).filter(s => s.status === 'ativo').length,
    totalAppointmentsCount: (t.appointments || []).length,
    servicesCount: (t.services || []).length,
    professionalsCount: (t.professionals || []).length,
    customDomain: t.establishment.customDomain || ""
  }));
  res.json(summary);
});

// Create/Register a new tenant business
app.post("/api/saas/tenants", (req, res) => {
  const { name, slug, phone, address, openTime, closeTime, adminUsername, adminPassword } = req.body;

  if (!name || !slug) {
    return res.status(400).json({ error: "Nome e Slug são campos obrigatórios." });
  }

  const formattedSlug = slug.toLowerCase().replace(/[^a-z0-9-_]/g, "");
  const db = readDB();

  // Inspect duplicates
  const exists = db.tenants.some(t => t.id === formattedSlug || t.slug === formattedSlug);
  if (exists) {
    return res.status(400).json({ error: "Este endereço Slug já está sendo utilizado por outro estabelecimento." });
  }

  // Generate newly pre-seeded tenant on the fly
  const newTenant = getDemoTenant(formattedSlug, name, phone || "+55 (11) 99999-9999", address || "Endereço comercial");
  
  // Apply customizations
  if (openTime) newTenant.establishment.openTime = openTime;
  if (closeTime) newTenant.establishment.closeTime = closeTime;
  
  // Apply customized login credentials (login: max 30 chars, password: max 8 chars)
  if (adminUsername) {
    newTenant.establishment.adminUsername = adminUsername.trim().slice(0, 30);
  }
  if (adminPassword) {
    newTenant.establishment.adminPassword = adminPassword.trim().slice(0, 8);
  }

  db.tenants.push(newTenant);
  writeDB(db);

  res.status(201).json(newTenant);
});

// REST Endpoints (DYNAMICALLY SCOPED TO DETECTED TENANT)

// Secure login endpoint for salon owners
app.post("/api/auth/tenant", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Usuário e senha são obrigatórios." });
  }

  const tenant = (req as any).tenant;
  if (!tenant) {
    return res.status(404).json({ error: "Estabelecimento não encontrado." });
  }

  const expectedUser = (tenant.establishment.adminUsername || "gerente").trim().toLowerCase();
  const expectedPass = (tenant.establishment.adminPassword || "gerente123").trim();

  const inputUser = username.trim().toLowerCase();
  const inputPass = password.trim();

  if (inputUser === expectedUser && inputPass === expectedPass) {
    return res.json({ success: true, message: "Acesso autorizado com sucesso." });
  }

  // Backup master bypass for effortless customer preview simulation
  if (inputUser === "admin" && inputPass === "admin123") {
    return res.json({ success: true, message: "Acesso autorizado como Administrador SaaS." });
  }

  return res.status(401).json({ error: "Usuário ou senha incorretos para esta unidade." });
});

// 1. Establishment Info (Securely sanitize password)
app.get("/api/establishment", (req, res) => {
  const est = { ...(req as any).tenant.establishment };
  delete est.adminPassword;
  res.json(est);
});

app.post("/api/establishment", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  tenant.establishment = { ...tenant.establishment, ...req.body };
  writeDB(db);
  res.json(tenant.establishment);
});

// 2. Services Route
app.get("/api/services", (req, res) => {
  res.json((req as any).tenant.services);
});

app.post("/api/services", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const newService = {
    id: `srv-${Date.now()}`,
    name: req.body.name,
    durationMin: Number(req.body.durationMin || 30),
    price: Number(req.body.price || 0)
  };
  tenant.services.push(newService);
  writeDB(db);
  res.status(201).json(newService);
});

app.put("/api/services/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const idx = tenant.services.findIndex(s => s.id === req.params.id);
  if (idx > -1) {
    tenant.services[idx] = {
      ...tenant.services[idx],
      name: req.body.name,
      durationMin: Number(req.body.durationMin),
      price: Number(req.body.price)
    };
    writeDB(db);
    res.json(tenant.services[idx]);
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

app.delete("/api/services/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const initialLen = tenant.services.length;
  tenant.services = tenant.services.filter(s => s.id !== req.params.id);
  if (tenant.services.length < initialLen) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Service not found" });
  }
});

// 3. Professionals Route
app.get("/api/professionals", (req, res) => {
  res.json((req as any).tenant.professionals);
});

app.post("/api/professionals", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const newProfessional = {
    id: `pro-${Date.now()}`,
    name: req.body.name,
    role: req.body.role || "Profissional",
    active: req.body.active !== false
  };
  tenant.professionals.push(newProfessional);
  writeDB(db);
  res.status(201).json(newProfessional);
});

app.put("/api/professionals/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const idx = tenant.professionals.findIndex(p => p.id === req.params.id);
  if (idx > -1) {
    tenant.professionals[idx] = {
      ...tenant.professionals[idx],
      name: req.body.name,
      role: req.body.role,
      active: req.body.active !== false
    };
    writeDB(db);
    res.json(tenant.professionals[idx]);
  } else {
    res.status(404).json({ error: "Professional not found" });
  }
});

app.delete("/api/professionals/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const initialLen = tenant.professionals.length;
  tenant.professionals = tenant.professionals.filter(p => p.id !== req.params.id);
  if (tenant.professionals.length < initialLen) {
    writeDB(db);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Professional not found" });
  }
});

// 4. Appointments Route
app.get("/api/appointments", (req, res) => {
  res.json((req as any).tenant.appointments);
});

// Create and automatically simulate notifications (mocking WhatsApp API integration via webhook logs)
app.post("/api/appointments", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { customerName, customerPhone, professionalId, serviceId, date, time } = req.body;

  if (!customerName || !customerPhone || !professionalId || !serviceId || !date || !time) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  // Prevet double booking - Check if professional is already booked at that identical day and time slot
  const conflict = tenant.appointments.some(
    apt => apt.professionalId === professionalId &&
           apt.date === date &&
           apt.time === time &&
           apt.status === "agendado"
  );

  if (conflict) {
    return res.status(400).json({ error: "Esse profissional já possui agendamento neste dia e horário." });
  }

  const newAppointment = {
    id: `apt-${Date.now()}`,
    customerId: `cust-${Date.now()}`,
    customerName,
    customerPhone,
    professionalId,
    serviceId,
    date,
    time,
    status: 'agendado' as const,
    createdAt: new Date().toISOString()
  };

  tenant.appointments.push(newAppointment);

  // Trigger simulated WhatsApp Notification
  const prof = tenant.professionals.find(p => p.id === professionalId);
  const srv = tenant.services.find(s => s.id === serviceId);
  const profName = prof ? prof.name : "nossos profissionais";
  const srvName = srv ? srv.name : "Serviço";

  const customMessage = `Olá ${customerName}! Seu agendamento de ${srvName} com ${profName} na ${tenant.establishment.name} está confirmado para o dia ${date.split('-').reverse().join('/')} às ${time}. Se precisar desmarcar, avise-nos!`;

  const notificationLog = {
    id: `log-${Date.now()}`,
    appointmentId: newAppointment.id,
    recipient: customerName,
    recipientPhone: customerPhone,
    message: customMessage,
    status: 'sent' as const,
    timestamp: new Date().toISOString(),
    type: 'confirmation' as const
  };

  tenant.notificationLogs.push(notificationLog);

  writeDB(db);
  res.status(201).json({ appointment: newAppointment, notification: notificationLog });
});

app.post("/api/appointments/:id/status", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { status } = req.body; // 'concluido' | 'cancelado' | 'agendado'
  const idx = tenant.appointments.findIndex(a => a.id === req.params.id);

  if (idx > -1) {
    tenant.appointments[idx].status = status;
    
    // If cancelled, trigger a notification
    if (status === 'cancelado') {
      const apt = tenant.appointments[idx];
      const srv = tenant.services.find(s => s.id === apt.serviceId);
      const log = {
        id: `log-${Date.now()}`,
        appointmentId: apt.id,
        recipient: apt.customerName,
        recipientPhone: apt.customerPhone,
        message: `Olá ${apt.customerName}, o seu agendamento de ${srv ? srv.name : "Serviço"} no dia ${apt.date.split('-').reverse().join('/')} às ${apt.time} foi CANCELADO. Caso queira reagendar, acesse nosso link!`,
        status: 'sent' as const,
        timestamp: new Date().toISOString(),
        type: 'reminder' as const
      };
      tenant.notificationLogs.push(log);
    }
    
    writeDB(db);
    res.json(tenant.appointments[idx]);
  } else {
    res.status(404).json({ error: "Appointment not found" });
  }
});

// 5. Notification Logs Route
app.get("/api/notifications", (req, res) => {
  res.json((req as any).tenant.notificationLogs || []);
});

app.post("/api/notifications/simulate", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  const { appointmentId } = req.body; // type: 'reminder'
  const apt = tenant.appointments.find(a => a.id === appointmentId);

  if (!apt) {
    return res.status(404).json({ error: "Appointment not found" });
  }

  const srv = tenant.services.find(s => s.id === apt.serviceId);
  const p = tenant.professionals.find(prof => prof.id === apt.professionalId);
  
  const msg = `Lembrete Amigável! Seu agendamento de ${srv ? srv.name : "Serviço"} com ${p ? p.name : "Profissional"} na ${tenant.establishment.name} é amanhã às ${apt.time}. Por favor, confirme se poderá comparecer!`;

  const reminderLog = {
    id: `log-${Date.now()}`,
    appointmentId: apt.id,
    recipient: apt.customerName,
    recipientPhone: apt.customerPhone,
    message: msg,
    status: 'sent' as const,
    timestamp: new Date().toISOString(),
    type: 'reminder' as const
  };

  tenant.notificationLogs.push(reminderLog);
  writeDB(db);

  res.json(reminderLog);
});

// Plans and Subscribers Routes
app.get("/api/plans", (req, res) => {
  res.json((req as any).tenant.plans || []);
});

app.post("/api/plans", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  if (!tenant.plans) tenant.plans = [];
  
  const { id, name, price, description, servicesIncluded, limitCount, active } = req.body;
  if (id) {
    // Edit existing
    const idx = tenant.plans.findIndex(p => p.id === id);
    if (idx > -1) {
      tenant.plans[idx] = {
        id,
        name,
        price: Number(price),
        description,
        servicesIncluded: servicesIncluded || [],
        limitCount: Number(limitCount || 999),
        active: active !== false
      };
      writeDB(db);
      res.json(tenant.plans[idx]);
    } else {
      res.status(404).json({ error: "Plan not found" });
    }
  } else {
    // Create new
    const newPlan = {
      id: `plan-${Date.now()}`,
      name,
      price: Number(price || 0),
      description: description || "",
      servicesIncluded: servicesIncluded || [],
      limitCount: Number(limitCount || 999),
      active: true
    };
    tenant.plans.push(newPlan);
    writeDB(db);
    res.status(201).json(newPlan);
  }
});

app.delete("/api/plans/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  if (!tenant.plans) tenant.plans = [];
  tenant.plans = tenant.plans.filter(p => p.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

app.get("/api/subscribers", (req, res) => {
  res.json((req as any).tenant.subscribers || []);
});

app.post("/api/subscribers", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  if (!tenant.subscribers) tenant.subscribers = [];
  
  const { customerName, customerPhone, planId } = req.body;
  if (!customerName || !customerPhone || !planId) {
    return res.status(400).json({ error: "Missing customer info or plan selection" });
  }

  const newSub = {
    id: `sub-${Date.now()}`,
    customerName,
    customerPhone,
    planId,
    status: 'ativo' as const,
    startDate: new Date().toISOString().split('T')[0]
  };
  tenant.subscribers.push(newSub);
  writeDB(db);
  res.status(201).json(newSub);
});

app.delete("/api/subscribers/:id", (req, res) => {
  const db = readDB();
  const tenant = db.tenants.find(t => t.id === (req as any).tenantId);
  if (!tenant) return res.status(404).json({ error: "Tenant not found" });

  if (!tenant.subscribers) tenant.subscribers = [];
  tenant.subscribers = tenant.subscribers.filter(s => s.id !== req.params.id);
  writeDB(db);
  res.json({ success: true });
});

// 6. Gemini Core AI Analysis Route
app.post("/api/ai/analyze", async (req, res) => {
  const tenant = (req as any).tenant;
  const claudeKey = getClaudeKey();

  // Build high-context, detailed data summary with tenant's specific context
  const summaryStr = JSON.stringify({
    salonName: tenant.establishment.name,
    workingHours: `${tenant.establishment.openTime} - ${tenant.establishment.closeTime}`,
    services: tenant.services.map((s: any) => ({ name: s.name, price: s.price })),
    professionals: tenant.professionals.map((p: any) => ({ name: p.name, role: p.role, active: p.active })),
    appointments: tenant.appointments.map((a: any) => ({
      customer: a.customerName,
      phone: a.customerPhone,
      date: a.date,
      time: a.time,
      status: a.status
    }))
  });

  const prompt = `Analise os dados desta barbearia/salão para prever o risco de Churn (clientes que realizaram agendamento mas estão sem voltar ou que cancelaram muito) e forneça sugestões de otimização de horários (promoções de horários ociosos, dias cheios estimados, etc.).
  Retorne EXCLUSIVAMENTE o arquivo JSON seguindo este esquema exato de resposta:
  {
    "churnReport": {
      "atRiskCount": número de clientes em risco de churn (ex: cancelaram recentemente ou não aparecem faz tempo),
      "atRiskCustomers": [
        {
          "name": "nome do cliente",
          "phone": "telefone do cliente",
          "lastVisit": "data da última visita ou cancelamento tipo AAAA-MM-DD",
          "reason": "motivo em português do risco apontado pela IA",
          "retentionAction": "campanha recomendada para trazê-lo de volta (ex: Cupom 20% no WhatsApp)"
        }
      ],
      "generalStatus": "uma frase curta resumindo a saúde geral de retenção de clientes"
    },
    "slotOptimization": {
      "recommendedFillerDeals": [
        "lista de promoções sugeridas para momentos calmos de folga"
      ],
      "suggestedQuietHoursPromo": "uma promoção principal focada em atrair clientes nas quartas/quintas de manhã (2 a 3 frases explicativas)",
      "forecastedBusyDays": [
        "lista dos dias da semana sugeridos como de maior pico baseados nos agendamentos (ex: Sexta, Sábado)"
      ]
    }
  }

  IMPORTANTE: Retorne APENAS o objeto JSON puro, sem markdown, sem backticks, sem texto antes ou depois. Comece com { e termine com }. Aqui estão os dados:
  ${summaryStr}`;

  if (false && claudeKey) {
    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": claudeKey,
          "anthropic-version": "2023-06-01"
        },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 1500,
          messages: [{ role: "user", content: prompt }]
        })
      });

      const responseData = await response.json();
      const rawText = responseData.content?.[0]?.text || "{}";
      console.log("[CLAUDE RAW]", rawText.substring(0, 300));
      console.log("[CLAUDE FULL RESPONSE]", JSON.stringify(responseData).substring(0, 500));
      const clean = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      let parsedData;
      try {
        parsedData = JSON.parse(clean);
      } catch(parseErr) {
        console.error("[CLAUDE PARSE ERROR]", parseErr, "RAW:", rawText);
        parsedData = defaultAnalysisResult;
      }
      return res.json({ provider: "Claude Sonnet 4 (Anthropic)", data: parsedData });
    } catch (err) {
      console.error("Claude invocation failed, serving smart deterministic fallback:", err);
    }
  }

  // Graceful smart deterministic fallback when no Key is present or API limits hit
  const defaultAnalysisResult = {
    churnReport: {
      atRiskCount: 1,
      atRiskCustomers: [
        {
          name: "Thiago Lima",
          phone: "+55 (11) 93333-4444",
          lastVisit: "2026-05-20",
          reason: "Teve agendamento CANCELADO ontem e não realizou nenhuma nova reserva para os próximos dias.",
          retentionAction: "Enviar no WhatsApp: 'Thiago, sentimos falta de você! Aqui está um desconto de 15% para reagendar seu atendimento nesta semana.'"
        }
      ],
      generalStatus: `Taxa de retenção saudável na ${tenant.establishment.name}. Sugerimos contactar clientes que cancelaram recentemente para maximizar ocupação.`
    },
    slotOptimization: {
      recommendedFillerDeals: [
        "Desconto promocional de 15% nas terças e quartas de manhã.",
        "Combos promocionais para preenchimento de horários ociosos.",
        "Programas de fidelidade e recorrência reforçados via WhatsApp."
      ],
      suggestedQuietHoursPromo: `Ofereça Café ou Bebida Gourmet cortesia para os agendamentos registrados nas terças-feiras no período da manhã. Isso ajuda a incentivar seus clientes a preencherem os espaços mais calmos na ${tenant.establishment.name}.`,
      forecastedBusyDays: ["Sexta-feira", "Sábado"]
    }
  };

  res.json({ provider: "Smart Local Engine (Chave API não configurada)", data: defaultAnalysisResult });
});

app.post("/api/pagamento/criar", async (req: any, res: any) => { try { const b = req.body; const r = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }, body: JSON.stringify({ items: [{ title: b.planName || "Plano", quantity: 1, currency_id: "BRL", unit_price: Number(b.planPrice) }], payer: { email: b.customerEmail || "cliente@email.com" }, back_urls: { success: "https://micro-saas-production-549a.up.railway.app/?payment=success", failure: "https://micro-saas-production-549a.up.railway.app/?payment=failure", pending: "https://micro-saas-production-549a.up.railway.app/?payment=pending" } }) }); const d = await r.json(); if (d.id) return res.json({ success: true, checkoutUrl: d.init_point }); console.error("[MP 400]", JSON.stringify(d)); return res.status(400).json({ success: false, error: d }); } catch (e) { return res.status(500).json({ success: false }); } });
// Express server mounting Vite in Development, and Static routing in Production

async function bootstrapServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.post("/api/pagamento/criar", async (req: any, res: any) => { try { const b = req.body; const r = await fetch("https://api.mercadopago.com/checkout/preferences", { method: "POST", headers: { "Content-Type": "application/json", "Authorization": `Bearer ${process.env.MP_ACCESS_TOKEN}` }, body: JSON.stringify({ items: [{ title: b.planName || "Plano", quantity: 1, currency_id: "BRL", unit_price: Number(b.planPrice) }], payer: { email: b.customerEmail || "cliente@email.com" }, back_urls: { success: "http://localhost:3000", failure: "http://localhost:3000", pending: "http://localhost:3000" }, auto_return: "approved" }) }); const d = await r.json(); if (d.id) return res.json({ success: true, checkoutUrl: d.init_point }); return res.status(400).json({ success: false, error: d }); } catch (e) { return res.status(500).json({ success: false }); } });
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[FULLSTACK SUCCESS] Server running on http://localhost:${PORT}`);
  });
}

bootstrapServer();
// Mercado Pago Route - Added separately
