import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as dotenv from "dotenv";
dotenv.config();

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Criar tenant Imperial
  const imperial = await prisma.tenant.upsert({
    where: { slug: "imperial" },
    update: {},
    create: {
      id: "imperial",
      slug: "imperial",
      name: "Barbearia Imperial",
      phone: "+55 (11) 98765-4321",
      openTime: "09:00",
      closeTime: "20:00",
      address: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
      whatsappApiKey: "api_key_demo_whatsapp_123456",
      webhookUrl: "https://api.evolution.example.com/webhook/send",
      adminUsername: "gerente",
      adminPassword: "gerente123",
      theme: "dark",
    },
  });

  // Criar tenant Bella Vista
  const bellavista = await prisma.tenant.upsert({
    where: { slug: "bellavista" },
    update: {},
    create: {
      id: "bellavista",
      slug: "bellavista",
      name: "Bella Vista Studio",
      phone: "+55 (11) 97777-6666",
      openTime: "09:00",
      closeTime: "20:00",
      address: "Rua Augusta, 450 - Consolação, São Paulo - SP",
      whatsappApiKey: "api_key_bellavista_demo_whatsapp_123456",
      webhookUrl: "https://api.evolution.example.com/webhook/send",
      adminUsername: "gerente",
      adminPassword: "gerente123",
      theme: "dark",
    },
  });

  // Serviços Imperial
  const services = [
    { id: "srv-imp-1", name: "Corte Degradê Moderno", durationMin: 30, price: 50 },
    { id: "srv-imp-2", name: "Barba Terapia com Toalha Quente", durationMin: 30, price: 35 },
    { id: "srv-imp-3", name: "Combo Imperial (Corte + Barba)", durationMin: 60, price: 75 },
    { id: "srv-imp-4", name: "Selagem Térmica Capilar", durationMin: 90, price: 120 },
    { id: "srv-imp-5", name: "Penteado Especial & Gel Fixador", durationMin: 20, price: 30 },
  ];

  for (const srv of services) {
    await prisma.service.upsert({
      where: { id: srv.id },
      update: {},
      create: { ...srv, tenantId: imperial.id },
    });
  }

  // Profissionais Imperial
  const professionals = [
    { id: "pro-imp-1", name: "Felipe Navalha", role: "Barbeiro Sênior (Degradê & Visagismo)", active: true },
    { id: "pro-imp-2", name: "Gustavo Tesoura", role: "Cabeleireiro & Visagista", active: true },
    { id: "pro-imp-3", name: "Amanda Designer", role: "Especialista em Tratamentos & Barba", active: true },
  ];

  for (const pro of professionals) {
    await prisma.professional.upsert({
      where: { id: pro.id },
      update: {},
      create: { ...pro, tenantId: imperial.id },
    });
  }

  // Agendamentos Imperial
  const appointments = [
    { id: "apt-imp-1", customerName: "Bruno Alencar", customerPhone: "+55 (11) 94444-5555", professionalId: "pro-imp-1", serviceId: "srv-imp-3", date: "2026-05-21", time: "09:30", status: "concluido" },
    { id: "apt-imp-2", customerName: "Marcelo Oliveira", customerPhone: "+55 (11) 95555-6666", professionalId: "pro-imp-2", serviceId: "srv-imp-1", date: "2026-05-21", time: "14:00", status: "agendado" },
    { id: "apt-imp-3", customerName: "Lucas Souza", customerPhone: "+55 (11) 96666-7777", professionalId: "pro-imp-3", serviceId: "srv-imp-4", date: "2026-05-21", time: "16:00", status: "agendado" },
  ];

  for (const apt of appointments) {
    await prisma.appointment.upsert({
      where: { id: apt.id },
      update: {},
      create: { ...apt, tenantId: imperial.id },
    });
  }

  // Planos Imperial
  const plan1 = await prisma.plan.upsert({
    where: { id: "plan-imp-1" },
    update: {},
    create: {
      id: "plan-imp-1",
      name: "Plano Cabelo na Régua",
      price: 80,
      description: "Corte seu cabelo até 2 vezes por mês e garanta desconto em outros serviços adicionais.",
      limitCount: 2,
      tenantId: imperial.id,
    },
  });

  const plan2 = await prisma.plan.upsert({
    where: { id: "plan-imp-2" },
    update: {},
    create: {
      id: "plan-imp-2",
      name: "Clube Imperial VIP",
      price: 140,
      description: "Cabelo e barba ilimitados! Venha quantas vezes precisar e saia sempre impecável.",
      limitCount: 999,
      tenantId: imperial.id,
    },
  });

  // Assinantes Imperial
  await prisma.subscriber.upsert({
    where: { id: "sub-imp-1" },
    update: {},
    create: {
      id: "sub-imp-1",
      customerName: "Carlos Silva",
      customerPhone: "+55 (11) 91111-2222",
      planId: plan2.id,
      status: "ativo",
      startDate: "2026-05-01",
      tenantId: imperial.id,
    },
  });

  await prisma.subscriber.upsert({
    where: { id: "sub-imp-2" },
    update: {},
    create: {
      id: "sub-imp-2",
      customerName: "Rodrigo Santos",
      customerPhone: "+55 (11) 92222-3333",
      planId: plan1.id,
      status: "ativo",
      startDate: "2026-05-10",
      tenantId: imperial.id,
    },
  });

  console.log("✅ Seed concluído com sucesso!");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
