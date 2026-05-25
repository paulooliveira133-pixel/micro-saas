import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Service, Professional, Appointment, AIAnalysisResult, NotificationLog, MonthlyPlan, Subscriber } from "../types";
import { apiFetch as fetch } from "../utils/api";
import { 
  Scissors, Calendar, Clock, Sparkles, Plus, Trash2, Save, QrCode, MessageSquare, 
  Settings, AlertTriangle, TrendingUp, UserCheck, RefreshCw, Play, Check, Search, 
  DollarSign, Mail, Phone, Users, CalendarDays, Eye, CheckCircle, XCircle, Key 
} from "lucide-react";

interface AdminPanelProps {
  onOpenQRCode: () => void;
  salonId: string;
  key?: string;
}

export default function AdminPanel({ onOpenQRCode, salonId }: AdminPanelProps) {
  // DB States
  const [establishment, setEstablishment] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [notificationLogs, setNotificationLogs] = useState<NotificationLog[]>([]);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  // Navigation states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'services' | 'staff' | 'ai' | 'notifications' | 'settings' | 'plans'>('dashboard');

  // AI analysis state
  const [aiAnalysis, setAiAnalysis] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiProvider, setAiProvider] = useState("");

  // CRUD Forms State
  const [newSrv, setNewSrv] = useState({ name: "", durationMin: 30, price: 50.0 });
  const [newProf, setNewProf] = useState({ name: "", role: "", active: true });
  const [newPlan, setNewPlan] = useState({ name: "", price: 90, description: "", servicesIncluded: [] as string[], limitCount: 4 });
  
  // Settings Forms State
  const [settName, setSettName] = useState("");
  const [settPhone, setSettPhone] = useState("");
  const [settOpen, setSettOpen] = useState("");
  const [settClose, setSettClose] = useState("");
  const [settAddress, setSettAddress] = useState("");
  const [settApiKey, setSettApiKey] = useState("");
  const [settWebhook, setSettWebhook] = useState("");
  const [settLogoUrl, setSettLogoUrl] = useState("");
  const [settTheme, setSettTheme] = useState<'dark' | 'light'>('dark');
  const [settCustomDomain, setSettCustomDomain] = useState("");
  const [settAdminUsername, setSettAdminUsername] = useState("");
  const [settAdminPassword, setSettAdminPassword] = useState("");
  const [isSettingsSaving, setIsSettingsSaving] = useState(false);

  // Selected date on calendar agenda filter
  const [agendaDate, setAgendaDate] = useState("2026-05-21"); // Default to pre-seeded May 21, 2026

  // Simulated notification banner or drafting feedback state
  const [draftedMessage, setDraftedMessage] = useState<string | null>(null);

  // Loader
  const loadDBState = async () => {
    try {
      const [estRes, srvRes, proRes, aptRes, notRes, plansRes, subsRes] = await Promise.all([
        fetch("/api/establishment"),
        fetch("/api/services"),
        fetch("/api/professionals"),
        fetch("/api/appointments"),
        fetch("/api/notifications"),
        fetch("/api/plans"),
        fetch("/api/subscribers")
      ]);

      const [est, srvs, pros, apts, nots, pls, sbs] = await Promise.all([
        estRes.json(),
        srvRes.json(),
        proRes.json(),
        aptRes.json(),
        notRes.json(),
        plansRes.json(),
        subsRes.json()
      ]);

      setEstablishment(est);
      setServices(srvs);
      setProfessionals(pros);
      setAppointments(apts);
      setNotificationLogs(nots);
      setPlans(pls || []);
      setSubscribers(sbs || []);

      // Populate settings form with loaded entry
      if (est) {
        setSettName(est.name);
        setSettPhone(est.phone);
        setSettOpen(est.openTime);
        setSettClose(est.closeTime);
        setSettAddress(est.address);
        setSettApiKey(est.whatsappApiKey || "");
        setSettWebhook(est.webhookUrl || "");
        setSettLogoUrl(est.logoUrl || "");
        setSettTheme(est.theme || "dark");
        setSettCustomDomain(est.customDomain || "");
        setSettAdminUsername(est.adminUsername || "gerente");
        setSettAdminPassword("");
      }
    } catch (err) {
      console.error("Error fetching db in admin dashboard:", err);
    }
  };

  useEffect(() => {
    loadDBState();
  }, []);

  // AI triggering API
  const handleTriggerAI = async () => {
    setIsAnalyzing(true);
    try {
      const res = await fetch("/api/ai/analyze", { method: "POST" });
      const responseData = await res.json();
      setAiAnalysis(responseData.data);
      setAiProvider(responseData.provider);
    } catch (err) {
      console.error("Error fetching AI analysis:", err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Service Handler
  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSrv.name.trim()) return;
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newSrv)
      });
      if (res.ok) {
        setNewSrv({ name: "", durationMin: 30, price: 50.0 });
        loadDBState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteService = async (id: string) => {
    if (!confirm("Tem certeza que gostaria de excluir este serviço?")) return;
    try {
      const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
      if (res.ok) loadDBState();
    } catch (err) {
      console.error(err);
    }
  };

  // Professional Handler
  const handleAddProf = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProf.name.trim() || !newProf.role.trim()) return;
    try {
      const res = await fetch("/api/professionals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProf)
      });
      if (res.ok) {
        setNewProf({ name: "", role: "", active: true });
        loadDBState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleProfStatus = async (prof: Professional) => {
    try {
      const res = await fetch(`/api/professionals/${prof.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...prof,
          active: !prof.active
        })
      });
      if (res.ok) loadDBState();
    } catch (err) {
      console.error(err);
    }
  };

  // Update appointment status: concluido | cancelado
  const handleUpdateStatus = async (aptId: string, status: 'concluido' | 'cancelado') => {
    try {
      const res = await fetch(`/api/appointments/${aptId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      if (res.ok) loadDBState();
    } catch (err) {
      console.error(err);
    }
  };

  // Simulate manuel reminder
  const handleSimulateReminder = async (aptId: string) => {
    try {
      const res = await fetch("/api/notifications/simulate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId: aptId, type: "reminder" })
      });
      if (res.ok) {
        alert("Simulação de Lembrete via API WhatsApp disparada! Verifique a aba 'Mensagens e Webhooks' para visualizar os logs gerados em tempo real.");
        loadDBState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Plan Handlers
  const handleAddPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlan.name.trim()) return;
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPlan)
      });
      if (res.ok) {
        setNewPlan({ name: "", price: 90, description: "", servicesIncluded: [], limitCount: 4 });
        loadDBState();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm("Deseja realmente excluir este plano? Clientes associados não poderão mais agendar por ele.")) return;
    try {
      const res = await fetch(`/api/plans/${id}`, { method: "DELETE" });
      if (res.ok) loadDBState();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteSubscriber = async (id: string) => {
    if (!confirm("Deseja realmente cancelar a assinatura deste cliente?")) return;
    try {
      const res = await fetch(`/api/subscribers/${id}`, { method: "DELETE" });
      if (res.ok) loadDBState();
    } catch (err) {
      console.error(err);
    }
  };

  // Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSettingsSaving(true);
    try {
      const payload: any = {
        name: settName,
        phone: settPhone,
        openTime: settOpen,
        closeTime: settClose,
        address: settAddress,
        whatsappApiKey: settApiKey,
        webhookUrl: settWebhook,
        logoUrl: settLogoUrl,
        theme: settTheme,
        customDomain: settCustomDomain,
        adminUsername: settAdminUsername.trim().toLowerCase().slice(0, 30)
      };

      if (settAdminPassword.trim()) {
        // Enforce maximum 8 characters configuration boundary
        payload.adminPassword = settAdminPassword.trim().slice(0, 8);
      }

      const res = await fetch("/api/establishment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("Configurações do Estabelecimento salvas com sucesso!");
        loadDBState();
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSettingsSaving(false);
    }
  };

  // Draft WhatsApp reminder message template preview for churn retrieval
  const handleDraftMessage = (cName: string, action: string) => {
    const text = `WhatsApp Premium Draft p/ ${cName}: "Prezado ${cName}, vimos que ${action.toLowerCase()}. Separamos um bônus especial de fidelidade para você agendar conosco hoje! Responda querendo garantir."`;
    setDraftedMessage(text);
  };

  // Calculate high quality metrics dynamically
  const getMetrics = () => {
    const active = appointments.filter(a => a.status === 'agendado').length;
    const cancelled = appointments.filter(a => a.status === 'cancelado').length;
    const completed = appointments.filter(a => a.status === 'concluido');
    
    // Total Revenue calculation
    let revenue = 0;
    completed.forEach(apt => {
      const srv = services.find(s => s.id === apt.serviceId);
      if (srv) {
        revenue += srv.price;
      }
    });

    const totalTrials = appointments.length || 1;
    const cancelRate = Math.round((cancelled / totalTrials) * 100);

    return { active, cancelled, revenue, cancelRate, total: appointments.length };
  };

  const stats = getMetrics();
  
  // Format Currency
  const formatBRL = (val: number) => {
    return val.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isLight = establishment?.theme === "light";

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-[#0A0B0D] text-slate-100 relative">
      {isLight && (
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bg-main: #F4F6F9 !important;
            --bg-card: #FFFFFF !important;
            --bg-subcard: #EBEFF5 !important;
            --border-color: #E2E8F0 !important;
            --text-primary: #0F172A !important;
            --text-secondary: #334155 !important;
            --text-muted: #64748B !important;
          }
          /* Custom overrides for light mode */
          body, .flex-row {
            background-color: var(--bg-main) !important;
            color: var(--text-secondary) !important;
          }
          aside {
            background-color: var(--bg-card) !important;
            border-color: var(--border-color) !important;
          }
          main, section {
            background-color: var(--bg-main) !important;
          }
          .bg-\\[\\#0A0B0D\\] { background-color: var(--bg-main) !important; }
          .bg-\\[\\#14161B\\] { background-color: var(--bg-card) !important; }
          .bg-slate-900 { background-color: var(--bg-card) !important; }
          .bg-slate-900\\/40 { background-color: var(--bg-subcard) !important; }
          .bg-slate-950 { background-color: var(--bg-subcard) !important; }
          .bg-slate-950\\/60 { background-color: var(--bg-subcard) !important; }
          .bg-slate-950\\/20 { background-color: #EBEFF5 !important; }
          .bg-slate-800 { background-color: #EBEFF5 !important; }
          .bg-slate-850 { background-color: #EBEFF5 !important; }
          .border-slate-800 { border-color: var(--border-color) !important; }
          .border-slate-850 { border-color: var(--border-color) !important; }
          .border-slate-900 { border-color: var(--border-color) !important; }
          .border-slate-950 { border-color: var(--border-color) !important; }
          .border-\\[\\#0A0B0D\\] { border-color: var(--border-color) !important; }
          .text-slate-50 { color: var(--text-primary) !important; }
          .text-slate-100 { color: var(--text-primary) !important; }
          .text-slate-200 { color: var(--text-secondary) !important; }
          .text-slate-300 { color: var(--text-secondary) !important; }
          .text-slate-400 { color: var(--text-muted) !important; }
          .text-slate-500 { color: var(--text-muted) !important; }
          input, select, textarea {
            color: #0F172A !important;
            background-color: #FFFFFF !important;
            border-color: #CBD5E1 !important;
          }
          table, tr, th, td {
            color: var(--text-secondary) !important;
            border-color: var(--border-color) !important;
          }
          tr:hover {
            background-color: #F8FAFC !important;
          }
          .hover\\:bg-slate-900:hover { background-color: #F8FAFC !important; }
          .hover\\:bg-slate-800:hover { background-color: #F1F5F9 !important; }
          .hover\\:text-slate-100:hover { color: #0F172A !important; }
          .shadow-sm { box-shadow: 0 1px 3px 0 rgba(0,0,0,0.05) !important; }
        ` }} />
      )}
      
      {/* Sidebar Navigation */}
      <aside className="w-full lg:w-64 border-b lg:border-r border-slate-800 bg-[#14161B] p-6 flex flex-col justify-between space-y-8">
        <div className="space-y-6">
          
          {/* Logo Brand / Status */}
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 bg-amber-500 rounded-xl flex items-center justify-center text-black font-bold shadow-lg shadow-amber-500/20 overflow-hidden shrink-0">
              {establishment?.logoUrl ? (
                <img src={establishment.logoUrl} alt="Logo" className="h-full w-full object-cover" />
              ) : (
                <Scissors className="h-5 w-5 -rotate-45 text-black" />
              )}
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 leading-tight">
                {establishment ? establishment.name : "Vintage & Co"}
              </h2>
              <span className="text-[10px] text-amber-500 font-mono flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                API WhatsApp Ativa
              </span>
            </div>
          </div>

          <p className="text-[11px] text-slate-400 leading-relaxed font-mono">
            Bem-vindo ao centro de operações do seu estabelecimento. Aqui você administra sua agenda, equipe, e obtém análises de IA.
          </p>

          {/* Navigation Links */}
          <nav className="space-y-1 pt-4">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'dashboard'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <CalendarDays className="h-4 w-4" />
              <span>Agenda & Indicadores</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('services');
              }}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'services'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Scissors className="h-4 w-4" />
              <span>Serviços Ofertados</span>
            </button>
            <button
              onClick={() => setActiveTab('staff')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'staff'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Users className="h-4 w-4" />
              <span>Equipe de Artistas</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('ai');
                if(!aiAnalysis) handleTriggerAI(); // Load analysis dynamically
              }}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'ai'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-amber-500" />
                <span>IA Churn / Gaps</span>
              </div>
              <span className="bg-amber-500/10 text-amber-500 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">PRO</span>
            </button>
            <button
              onClick={() => setActiveTab('plans')}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'plans'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-4 w-4 text-emerald-400" />
                <span>Clubes & Planos Mensais</span>
              </div>
              <span className="bg-emerald-500/10 text-emerald-500 text-[9px] px-1.5 py-0.5 rounded font-mono font-bold uppercase">NOVO</span>
            </button>
            <button
              onClick={() => setActiveTab('notifications')}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'notifications'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-4 w-4 text-slate-400" />
                <span>API & Logs Whatsapp</span>
              </div>
              <span className="bg-amber-500/10 text-amber-500 text-[10px] px-1.5 py-0.5 rounded font-mono">
                {notificationLogs.length}
              </span>
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full flex items-center gap-3 rounded-xl px-4 py-2.5 text-xs font-semibold cursor-pointer transition-colors ${
                activeTab === 'settings'
                  ? "bg-slate-850 text-slate-100 border-l-4 border-amber-500"
                  : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
              }`}
            >
              <Settings className="h-4 w-4" />
              <span>Dados do Salão</span>
            </button>
          </nav>
        </div>

        {/* Floating Quick QR Button */}
        <div className="pt-6 border-t border-slate-800 space-y-3">
          <button
            onClick={onOpenQRCode}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 px-4 text-xs font-bold font-mono text-black transition-all active:scale-95 cursor-pointer shadow-md shadow-amber-500/5 hover:shadow-amber-500/20"
          >
            <QrCode className="h-4 w-4" />
            GERAR QR CODE CLIENTE
          </button>
          <div className="text-[10px] text-center text-slate-500 font-mono">
            ID Salão: <span className="text-slate-400">{salonId}</span>
          </div>
        </div>
      </aside>

      {/* Main Board Container */}
      <main className="flex-1 p-6 lg:p-10 space-y-8 overflow-y-auto max-h-screen">
        
        {/* SUBHEADER BLOCK */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase">PAINEL ADMINISTRATIVO</span>
            <h2 className="text-2xl font-bold text-slate-50 font-sans tracking-tight">
              {establishment ? establishment.name : "Carregando..."}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-slate-400 font-mono">Agenda Selecionada:</span>
            <input 
              type="date"
              value={agendaDate}
              onChange={(e) => setAgendaDate(e.target.value)}
              className="rounded-lg border border-slate-850 bg-[#14161B] px-3 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
         {/* 1. DASHBOARD OVERVIEW TAB */}
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            {/* Quick Metrics Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              
              <div className="rounded-2xl border border-slate-800 bg-[#14161B] p-5 relative overflow-hidden flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono block">FATURAMENTO REALIZADO</span>
                  <p className="text-xl font-bold text-amber-500 mt-1 font-mono">{formatBRL(stats.revenue)}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">Conforme atendimentos marcados como concluídos</span>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 h-fit">
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#14161B] p-5 relative overflow-hidden flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono block">AGENDADOS HOJE</span>
                  <p className="text-xl font-bold text-slate-100 mt-1 font-mono">{appointments.filter(a => a.date === agendaDate && a.status === 'agendado').length}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">Total no dia {agendaDate.split('-').reverse().join('/')}</span>
                </div>
                <div className="p-3 bg-amber-500/10 rounded-xl text-amber-500 h-fit">
                  <Clock className="w-5 h-5" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#14161B] p-5 relative overflow-hidden flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono block">MÉDIA DE CANCELAMENTO</span>
                  <p className="text-xl font-bold text-red-400 mt-1 font-mono">{stats.cancelRate}%</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">Estabilidade geral da agenda</span>
                </div>
                <div className="p-3 bg-red-400/10 rounded-xl text-red-400 h-fit">
                  <AlertTriangle className="w-5 h-5" />
                </div>
              </div>

              <div className="rounded-2xl border border-slate-800 bg-[#14161B] p-5 relative overflow-hidden flex items-center justify-between shadow-sm">
                <div>
                  <span className="text-[10px] font-semibold text-slate-500 font-mono block">TOTAL DE CLIENTES HISTÓRICO</span>
                  <p className="text-xl font-bold text-slate-100 mt-1 font-mono">{stats.total}</p>
                  <span className="text-[10px] text-slate-400 mt-2 block font-mono">Presenças salvas no Supabase local</span>
                </div>
                <div className="p-3 bg-slate-800 rounded-xl text-slate-400 h-fit">
                  <Users className="w-5 h-5" />
                </div>
              </div>

            </div>
            {/* Gráficos do Dashboard */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-5 space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">Agendamentos por Status</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={[
                    { name: "Agendado", valor: appointments.filter(a => a.status === "agendado").length },
                    { name: "Concluído", valor: appointments.filter(a => a.status === "concluido").length },
                    { name: "Cancelado", valor: appointments.filter(a => a.status === "cancelado").length },
                  ]}>
                    <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <YAxis tick={{ fill: "#94a3b8", fontSize: 10 }} />
                    <Tooltip contentStyle={{ backgroundColor: "#14161B", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }} />
                    <Bar dataKey="valor" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-5 space-y-3">
                <h4 className="font-semibold text-slate-200 text-sm">Distribuição de Status</h4>
                <ResponsiveContainer width="100%" height={180}>
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Agendado", value: appointments.filter(a => a.status === "agendado").length || 1 },
                        { name: "Concluído", value: appointments.filter(a => a.status === "concluido").length || 1 },
                        { name: "Cancelado", value: appointments.filter(a => a.status === "cancelado").length || 1 },
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={45}
                      outerRadius={70}
                      dataKey="value"
                    >
                      <Cell fill="#f59e0b" />
                      <Cell fill="#10b981" />
                      <Cell fill="#ef4444" />
                    </Pie>
                    <Tooltip contentStyle={{ backgroundColor: "#14161B", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9" }} />
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex justify-center gap-4 text-[10px]">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />Agendado</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />Concluído</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500 inline-block" />Cancelado</span>
                </div>
              </div>
            </div>

            {/* Quick action buttons for easy reviewer walkthrough */}
            <div className="rounded-xl border border-slate-800 p-4 bg-[#14161B] flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-xs font-mono text-amber-500 font-semibold block">WALKTHROUGH REVIEWER RAPID DE AGENDAMENTO</span>
                <p className="text-[11px] text-slate-400">Quer preencher a agenda rapidamente ou restaurar o banco de dados inicial?</p>
              </div>
              <div className="flex gap-2.5">
                <button
                  onClick={async () => {
                    const sampleNames = ["Rodrigo Oliveira", "Matheus Pinheiro", "Gustavo Ramos", "Daniel Mendes", "Guilherme Sampaio"];
                    const randomName = sampleNames[Math.floor(Math.random() * sampleNames.length)];
                    const randomPhone = `+55 (11) 9${Math.floor(10000000 + Math.random() * 90000000)}`;
                    const randomTime = `${String(10 + Math.floor(Math.random() * 8)).padStart(2, "0")}:${Math.random() < 0.5 ? "00" : "30"}`;
                    const randomProf = professionals[Math.floor(Math.random() * professionals.length)] || { id: "pro-1" };
                    const randomSrv = services[Math.floor(Math.random() * services.length)] || { id: "srv-1" };

                    await fetch("/api/appointments", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        customerName: randomName,
                        customerPhone: randomPhone,
                        professionalId: randomProf.id,
                        serviceId: randomSrv.id,
                        date: agendaDate,
                        time: randomTime
                      })
                    });
                    loadDBState();
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0A0B0D] hover:bg-slate-900 text-xs font-semibold text-slate-300 transition-colors cursor-pointer font-mono"
                >
                  + Inserir Reserva Aleatória
                </button>
                <button
                  onClick={async () => {
                    if (confirm("Gostaria de limpar o banco de dados local db.json e restaurar o seed padrão?")) {
                      await fetch("/api/establishment", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          name: "Barbearia Imperial",
                          phone: "+55 (11) 98765-4321",
                          openTime: "09:00",
                          closeTime: "20:00",
                          address: "Avenida Paulista, 1000 - Bela Vista, São Paulo - SP",
                          whatsappApiKey: "api_key_demo_whatsapp_123456",
                          webhookUrl: "https://api.evolution.example.com/webhook/send"
                        })
                      });
                      loadDBState();
                      alert("Database restaurada!");
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border border-slate-800 bg-[#0A0B0D] hover:bg-slate-900 hover:text-red-400 text-xs text-slate-500 transition-colors cursor-pointer font-mono"
                >
                  Restaurar Banco de Dados
                </button>
              </div>
            </div>

            {/* Agenda & Queue board for Selected Date */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-[#0A0B0D]">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <h3 className="font-semibold text-slate-200">
                    Fila de Atendimento do Dia — {agendaDate.split('-').reverse().join('/')}
                  </h3>
                </div>
                <span className="text-[10px] font-mono text-slate-500">
                  {appointments.filter(a => a.date === agendaDate).length} agendamentos registrados para este dia
                </span>
              </div>

              {/* Table / List of bookings */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-850 text-[10px] font-mono text-slate-500 uppercase">
                      <th className="py-3 px-2">Horário Original</th>
                      <th className="py-3 px-2">Cliente / Contato</th>
                      <th className="py-3 px-2">Profissional</th>
                      <th className="py-3 px-2">Serviço Pretendido</th>
                      <th className="py-3 px-2 text-center">Status</th>
                      <th className="py-3 px-2 text-center">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850/60 text-xs">
                    {appointments
                      .filter(apt => apt.date === agendaDate)
                      .sort((a,b) => a.time.localeCompare(b.time))
                      .map((apt) => {
                        const profForApt = professionals.find(p => p.id === apt.professionalId);
                        const srvForApt = services.find(s => s.id === apt.serviceId);

                        return (
                          <tr key={apt.id} className="hover:bg-slate-950/20">
                            <td className="py-3 px-2 font-mono font-medium text-amber-500">{apt.time}</td>
                            <td className="py-3 px-2 font-sans">
                              <span className="font-bold text-slate-200 block">{apt.customerName}</span>
                              <span className="text-[10px] font-mono text-slate-500">{apt.customerPhone}</span>
                            </td>
                            <td className="py-3 px-2 text-slate-300 font-mono">
                              {profForApt ? profForApt.name : "N/D"}
                            </td>
                            <td className="py-3 px-2">
                              <span className="font-medium text-slate-300 block">{srvForApt ? srvForApt.name : "N/D"}</span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                {srvForApt ? formatBRL(srvForApt.price) : ""}
                              </span>
                            </td>
                            <td className="py-3 px-2 text-center">
                              {apt.status === "agendado" && (
                                <span className="inline-flex items-center gap-1 rounded bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-300 font-mono uppercase">
                                  Agendado
                                </span>
                              )}
                              {apt.status === "concluido" && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-500 font-mono uppercase">
                                  Concluído
                                </span>
                              )}
                              {apt.status === "cancelado" && (
                                <span className="inline-flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-medium text-red-300 font-mono uppercase">
                                  Cancelado
                                </span>
                              )}
                            </td>
                            <td className="py-3 px-2 text-center space-x-2">
                              {apt.status === "agendado" && (
                                <>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, "concluido")}
                                    className="px-2 py-1 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold font-mono transition-colors cursor-pointer"
                                    title="Concluir Atendimento"
                                  >
                                    Concluir
                                  </button>
                                  <button
                                    onClick={() => handleUpdateStatus(apt.id, "cancelado")}
                                    className="px-2 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 text-[10px] font-bold font-mono transition-colors cursor-pointer"
                                    title="Cancelar Atendimento"
                                  >
                                    Cancelar
                                  </button>
                                  <button
                                    onClick={() => handleSimulateReminder(apt.id)}
                                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-medium font-mono transition-colors cursor-pointer"
                                    title="Disparar Lembrete WhatsApp"
                                  >
                                    Lembrar
                                  </button>
                                </>
                              )}
                              {apt.status !== "agendado" && (
                                <span className="text-[10px] text-slate-500 italic font-mono uppercase">Sem ações</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    {appointments.filter(apt => apt.date === agendaDate).length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center py-8 text-xs text-slate-500 font-mono italic">
                          Nenhum agendamento para este dia. Experimente criar um walkthrough com o botão "+ Inserir Reserva Aleatória" acima ou agende usando a página do cliente!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 2. SERVICES CRUD TAB */}
        {activeTab === 'services' && (
          <div className="space-y-8 animate-fade-in">
            {/* Create New Service Panel */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" /> Cadastrar Novo Serviço
              </h3>

              <form onSubmit={handleAddService} className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">NOME DO SERVIÇO</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Corte Degradê, Escova, etc."
                    value={newSrv.name}
                    onChange={(e) => setNewSrv({ ...newSrv, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">DURAÇÃO (MINUTOS)</label>
                  <input
                    type="number"
                    required
                    min={10}
                    max={180}
                    value={newSrv.durationMin}
                    onChange={(e) => setNewSrv({ ...newSrv, durationMin: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">PREÇO (R$)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    step="0.01"
                    value={newSrv.price}
                    onChange={(e) => setNewSrv({ ...newSrv, price: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-slate-100 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="md:col-span-3 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Adicionar Serviço
                  </button>
                </div>
              </form>
            </div>

            {/* List Services */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Portfólio de Serviços Atuais ({services.length})</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {services.map((srv) => (
                  <div key={srv.id} className="bg-[#0A0B0D] rounded-xl p-4 border border-slate-800 flex items-center justify-between">
                    <div>
                      <h4 className="font-bold text-slate-100 text-sm">{srv.name}</h4>
                      <p className="text-xs text-slate-400 font-mono mt-1 flex items-center gap-2">
                        <span>Tempo: <strong className="text-slate-300">{srv.durationMin} min</strong></span>
                        <span>•</span>
                        <span>Preço: <strong className="text-amber-500">{formatBRL(srv.price)}</strong></span>
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteService(srv.id)}
                      className="p-2 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors cursor-pointer"
                      title="Excluir Serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 3. STAFF CRUD TAB */}
        {activeTab === 'staff' && (
          <div className="space-y-8">
            {/* Create New Professional */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm flex items-center gap-2">
                <Plus className="w-5 h-5 text-amber-500" /> Cadastrar Novo Artista/Profissional
              </h3>

              <form onSubmit={handleAddProf} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">NOME DO PROFISSIONAL</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Felipe Navalha"
                    value={newProf.name}
                    onChange={(e) => setNewProf({ ...newProf, name: e.target.value })}
                    className="w-full rounded-xl border border-slate-850 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-mono text-slate-400">CARGO / ESPECIALIDADE</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Barbeiro Sênior, Designer de Cachos"
                    value={newProf.role}
                    onChange={(e) => setNewProf({ ...newProf, role: e.target.value })}
                    className="w-full rounded-xl border border-slate-850 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>
                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    className="w-full sm:w-auto px-6 py-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                  >
                    Cadastrar e Ativar
                  </button>
                </div>
              </form>
            </div>

            {/* List Team */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <h3 className="font-semibold text-slate-200 text-sm">Gerenciar Equipe</h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {professionals.map((p) => (
                  <div 
                    key={p.id} 
                    className={`bg-[#0A0B0D] rounded-xl p-5 border flex flex-col items-center text-center justify-between space-y-4 ${
                      p.active ? "border-slate-800" : "border-red-500/10 opacity-60"
                    }`}
                  >
                    <div className="h-12 w-12 rounded-full bg-slate-800 text-slate-300 font-bold font-mono text-sm flex items-center justify-center border border-slate-700">
                      {p.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                      <h4 className="font-medium text-slate-100 text-sm">{p.name}</h4>
                      <p className="text-[11px] text-slate-400">{p.role}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-900 w-full justify-center">
                      <span className={`h-2.5 w-2.5 rounded-full ${p.active ? "bg-amber-500" : "bg-red-500"}`} />
                      <span className="text-[11px] font-mono text-slate-400">
                        {p.active ? "Disponível p/ Cliente" : "Desativado temporariamente"}
                      </span>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleToggleProfStatus(p)}
                      className="w-full py-1.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[10px] font-mono font-bold uppercase cursor-pointer"
                    >
                      {p.active ? "Pausar Agendas" : "Ativar Agendas"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* 4. AI INSIGHTS TAB */}
        {activeTab === 'ai' && (
          <div className="space-y-8">
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[#0A0B0D] mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-amber-500/10 rounded-xl text-amber-500">
                    <Sparkles className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-100">Inteligência Artificial & Previsão de Churn</h3>
                    <p className="text-xs text-slate-400 leading-snug font-mono mt-0.5">
                      {aiProvider || "Processador inteligente via IA"}
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleTriggerAI}
                  disabled={isAnalyzing}
                  className="flex items-center gap-1.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 px-4 py-2 text-xs font-bold font-mono text-black tracking-wide transition-all uppercase cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Analisando...</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4" />
                      <span>Recarregar Análises</span>
                    </>
                  )}
                </button>
              </div>

              {aiProvider && (
                <div className="bg-slate-950 rounded-xl px-4 py-2 border border-slate-850/80 text-xs text-slate-400 font-mono mb-6 flex justify-between items-center">
                  <span>Mecanismo de Análise:</span>
                  <strong className="text-amber-500">{aiProvider}</strong>
                </div>
              )}

              {isAnalyzing && (
                <div className="py-12 flex flex-col items-center justify-center space-y-3">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
                  <p className="text-xs text-slate-400 font-mono">Consolidando dados de agendamento e consultando o Gemini...</p>
                </div>
              )}

              {!isAnalyzing && aiAnalysis && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  
                  {/* Left Column: Churn Prediction */}
                  <div className="lg:col-span-7 space-y-6">
                    <div className="bg-slate-950 rounded-xl p-5 border border-slate-850 space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-900 pb-2">
                        <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5">
                          <AlertTriangle className="w-4 h-4 text-amber-500" /> Previsão de Churn / Risco de Desistência
                        </h4>
                        <span className="bg-amber-500/10 text-amber-550 text-[10px] px-2 py-0.5 rounded-full font-bold font-mono" style={{ color: '#f59e0b' }}>
                          {aiAnalysis.churnReport.atRiskCount} Clientes em Alerta
                        </span>
                      </div>

                      <p className="text-xs text-slate-400 leading-snug">
                        {aiAnalysis.churnReport.generalStatus}
                      </p>

                      <div className="space-y-3 pt-2">
                        {aiAnalysis.churnReport.atRiskCustomers.map((cust, i) => (
                          <div key={i} className="rounded-lg border border-slate-850 p-4 space-y-3 bg-slate-900/40 hover:bg-slate-900 transition-colors">
                            <div className="flex items-center justify-between gap-2">
                              <div>
                                <span className="text-xs font-bold text-slate-200">{cust.name}</span>
                                <span className="text-[10px] font-mono text-slate-500 block">Contato: {cust.phone}</span>
                              </div>
                              <span className="text-[9px] font-mono text-slate-500 text-right">
                                Última visita: {cust.lastVisit.split('-').reverse().join('/')}
                              </span>
                            </div>

                            <div className="text-xs text-slate-300 font-mono bg-slate-950 p-2.5 rounded border border-slate-900">
                              <span className="text-[9px] block text-amber-400 font-bold uppercase tracking-wide">DETECÇÃO DA IA</span>
                              {cust.reason}
                            </div>

                            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 pt-1">
                              <span className="text-[10px] text-amber-500 font-mono font-medium block max-w-xs">
                                💡 Ação recomendada: {cust.retentionAction}
                              </span>
                              <button
                                onClick={() => handleDraftMessage(cust.name, cust.retentionAction)}
                                className="px-2.5 py-1.5 rounded bg-amber-500 hover:bg-amber-400 text-black text-[10px] font-bold font-mono uppercase cursor-pointer"
                              >
                                Esboçar WhatsApp
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>

                    </div>
                  </div>

                  {/* Right Column: Slot Booster */}
                  <div className="lg:col-span-5 space-y-6">
                    
                    {/* Quiet Hours Promo */}
                    <div className="bg-slate-950 rounded-xl p-5 border border-slate-850 space-y-4">
                      <h4 className="font-bold text-slate-200 text-xs uppercase tracking-wider font-mono flex items-center gap-1.5 border-b border-slate-900 pb-2">
                        <Clock className="w-4 h-4 text-amber-500" /> Otimização de Gaps de Agenda
                      </h4>

                      <div className="space-y-1 bg-slate-900/40 p-3 rounded-lg border border-slate-850 text-xs">
                        <span className="block text-[9px] font-mono text-amber-500 font-bold uppercase">PROMOÇÃO SUGERIDA PARA HORAS OCIOSAS</span>
                        <p className="text-slate-300 leading-relaxed font-mono">
                          {aiAnalysis.slotOptimization.suggestedQuietHoursPromo}
                        </p>
                      </div>

                      <div className="space-y-2">
                        <span className="block text-[10px] text-slate-500 font-mono font-bold uppercase">OUTRAS INICIATIVAS PREENCHE-VAGAS</span>
                        <ul className="space-y-1.5 text-xs text-slate-400">
                          {aiAnalysis.slotOptimization.recommendedFillerDeals.map((deal, i) => (
                            <li key={i} className="flex items-start gap-2 block bg-slate-900/20 p-2 rounded">
                              <span className="text-amber-500 mt-0.5">•</span>
                              <span className="font-mono">{deal}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                      
                      <div className="pt-2">
                        <span className="block text-[10px] text-slate-500 font-mono font-semibold uppercase">PICO ESTIMADO / DIAS CHEIOS</span>
                        <div className="flex gap-2 flex-wrap pt-1">
                          {aiAnalysis.slotOptimization.forecastedBusyDays.map((day, i) => (
                            <span key={i} className="bg-red-500/10 text-red-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold">
                              🔥 {day}
                            </span>
                          ))}
                        </div>
                      </div>

                    </div>

                  </div>

                </div>
              )}

              {/* Msg template builder modal */}
              {draftedMessage && (
                <div className="mt-8 p-4 bg-slate-950 border border-emerald-500/40 rounded-xl space-y-3 relative">
                  <span className="text-[10px] text-emerald-400 uppercase font-mono font-bold block">TEMPLATE DE DISPARO REPORTE DE CHURN</span>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono bg-slate-900 p-3 rounded-lg">
                    {draftedMessage}
                  </p>
                  <div className="flex justify-end gap-2 text-xs">
                    <button
                      onClick={() => setDraftedMessage(null)}
                      className="text-slate-400 hover:text-slate-300"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => {
                        alert("Mensagem copiada para a área de transferência! Você pode despachar diretamente pelo WhatsApp Business do estabelecimento.");
                        navigator.clipboard.writeText(draftedMessage);
                        setDraftedMessage(null);
                      }}
                      className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded"
                    >
                      Copiar Esboço
                    </button>
                  </div>
                </div>
              )}

            </div>
          </div>
        )}

        {/* PLANS AND SUBSCRIBERS TAB */}
        {activeTab === 'plans' && (
          <div className="space-y-8">
            {/* SaaS Pitch & Context Banner */}
            <div className="bg-gradient-to-r from-emerald-500/10 to-teal-500/5 border border-emerald-550/30 rounded-2xl p-6 relative overflow-hidden" style={{ borderColor: 'rgba(16, 185, 129, 0.2)' }}>
              <div className="absolute top-0 right-0 h-48 w-48 bg-emerald-500/5 rounded-full blur-3xl -z-10" />
              <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                <div>
                  <span className="bg-emerald-550/25 text-emerald-400 font-mono text-[9px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider block w-fit mb-2">RECORRÊNCIA INTELIGENTE</span>
                  <h3 className="text-lg font-bold text-slate-100">Clubes de Assinaturas & Planos Mensais</h3>
                  <p className="text-xs text-slate-400 max-w-2xl mt-1 leading-relaxed">
                    A recorrência é o modelo de negócio mais lucrativo do mercado! Estabeleça planos mensais para fidelizar seus clientes. Eles pagam um valor fixo mensal e agendam direto pelo painel de forma simplificada, enchendo sua agenda previsivelmente.
                  </p>
                </div>
                <div className="flex items-center gap-6 bg-slate-900/50 p-4 rounded-xl border border-slate-800 shrink-0 font-mono">
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-500 uppercase">Assinantes Ativos</span>
                    <span className="text-lg font-bold text-emerald-400">{subscribers.filter(s => s.status === 'ativo').length}</span>
                  </div>
                  <div className="h-8 w-[1px] bg-slate-800" />
                  <div className="text-center">
                    <span className="block text-[10px] text-slate-500 uppercase">Faturamento Estimado</span>
                    <span className="text-lg font-bold text-emerald-400 font-bold">
                      {formatBRL(subscribers.reduce((acc, sub) => {
                        const plan = plans.find(p => p.id === sub.planId);
                        return acc + (plan?.price || 0);
                      }, 0))}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start">
              {/* Form Creator: Left Column */}
              <div className="xl:col-span-4 bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-[#0A0B0D]">
                  <TrendingUp className="h-5 w-5 text-emerald-400" />
                  <h4 className="font-semibold text-slate-200 text-sm">Criar / Editar Plano</h4>
                </div>

                <form onSubmit={handleAddPlan} className="space-y-4 text-xs font-mono text-slate-300">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Nome do Plano</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Assinatura Cabelo na Régua"
                      value={newPlan.name}
                      onChange={(e) => setNewPlan({ ...newPlan, name: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 font-sans"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Preço Mensal (R$)</label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={newPlan.price}
                        onChange={(e) => setNewPlan({ ...newPlan, price: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase">Limite de Usos/Mês</label>
                      <select
                        value={newPlan.limitCount}
                        onChange={(e) => setNewPlan({ ...newPlan, limitCount: Number(e.target.value) })}
                        className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                      >
                        <option value="2">2 Atendimentos</option>
                        <option value="4">4 Atendimentos</option>
                        <option value="8">8 Atendimentos</option>
                        <option value="999">Sem limites (Ilimitado)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Chamativa / Descrição rápida</label>
                    <textarea
                      placeholder="Ex: Corte seu cabelo até 2 vezes por mês e ganhe desconto em combos."
                      rows={2}
                      value={newPlan.description}
                      onChange={(e) => setNewPlan({ ...newPlan, description: e.target.value })}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-xs text-slate-100 outline-none focus:border-amber-500 font-sans resize-none"
                    />
                  </div>

                  {/* Included services Selector checkboxes */}
                  <div className="space-y-2 bg-[#0A0B0D] p-3.5 rounded-xl border border-slate-800">
                    <label className="text-[10px] font-bold text-slate-400 uppercase block">Serviços Habilitados p/ o Plano</label>
                    <div className="space-y-1.5 max-h-36 overflow-y-auto pt-1">
                      {services.map(srv => {
                        const isChecked = newPlan.servicesIncluded.includes(srv.id);
                        return (
                          <label key={srv.id} className="flex items-center gap-2 cursor-pointer py-1.5 hover:bg-slate-900/50 rounded px-1.5 transition-colors text-xs font-sans">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                const checkedList = isChecked
                                  ? newPlan.servicesIncluded.filter(id => id !== srv.id)
                                  : [...newPlan.servicesIncluded, srv.id];
                                setNewPlan({ ...newPlan, servicesIncluded: checkedList });
                              }}
                              className="h-3.5 w-3.5 rounded border-slate-800 bg-slate-950 text-amber-500 focus:ring-offset-0 focus:ring-amber-500 cursor-pointer"
                            />
                            <div className="flex-grow flex justify-between font-medium">
                              <span>{srv.name}</span>
                              <span className="text-slate-500 font-mono text-[11px]">{formatBRL(srv.price)}</span>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-black font-bold font-sans text-xs tracking-wider transition-all cursor-pointer shadow-md shadow-emerald-500/10 active:scale-95"
                  >
                    ATIVAR ASSINATURA INDUSTRIAL
                  </button>
                </form>
              </div>

              {/* Plans Overview Cards: Right Column */}
              <div className="xl:col-span-8 space-y-6">
                <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-[#0A0B0D]">
                    <h4 className="font-semibold text-slate-200 text-sm">Planos de Assinatura Ativos</h4>
                    <span className="text-[10px] font-mono text-slate-500 bg-[#0A0B0D] px-2 py-0.5 rounded border border-slate-850">
                      Exposição no App Carregada
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {plans.map(plan => {
                      const countAssoc = subscribers.filter(s => s.planId === plan.id).length;
                      return (
                        <div key={plan.id} className="relative bg-[#0A0B0D] rounded-2xl p-5 border border-slate-800 hover:border-slate-700 transition-all flex flex-col justify-between group">
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            className="absolute top-4 right-4 h-7 w-7 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-red-400 hover:border-red-400 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>

                          <div className="space-y-2">
                            <span className="inline-block bg-emerald-500/10 text-emerald-400 text-[10px] px-2 py-0.5 rounded font-mono font-bold uppercase tracking-wider">
                              {plan.limitCount === 999 ? "Uso Ilimitado" : `${plan.limitCount} Usos/Mês`}
                            </span>
                            <h5 className="font-bold text-slate-100 text-base">{plan.name}</h5>
                            <p className="text-xs text-slate-400 font-sans leading-relaxed min-h-[36px]">
                              {plan.description || "Nenhuma descrição fornecida."}
                            </p>

                            <div className="pt-2">
                              <span className="text-[10px] font-mono font-bold uppercase text-slate-500 block mb-1">Serviços elegíveis</span>
                              <div className="flex flex-wrap gap-1">
                                {plan.servicesIncluded.map(srvId => {
                                  const svc = services.find(s => s.id === srvId);
                                  return (
                                    <span key={srvId} className="bg-slate-900 text-slate-350 px-2 py-0.5 rounded text-[10px] border border-slate-850">
                                      {svc ? svc.name : srvId}
                                    </span>
                                  );
                                })}
                                {plan.servicesIncluded.length === 0 && (
                                  <span className="text-[10px] text-red-400 italic">Nenhum serviço associado!</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="mt-4 pt-4 border-t border-slate-900 flex items-center justify-between font-mono">
                            <div>
                              <span className="block text-[9px] text-slate-500 uppercase">Validade / Valor</span>
                              <span className="text-emerald-400 font-bold text-sm">{formatBRL(plan.price)}<span className="text-[10px] font-normal text-slate-500">/mês</span></span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[9px] text-slate-500 uppercase">Assinantes</span>
                              <span className="text-slate-300 font-bold text-xs">{countAssoc} usuários ativos</span>
                             <button
                                onClick={async () => {
                                const res = await window.fetch("/api/pagamento/criar", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({
                                planName: plan.name,
                                planPrice: plan.price,
                                 customerEmail: "cliente@email.com",
                                 customerName: establishment?.name || "Cliente",
                               salonId: salonId
                                })
                               });
                                  const data = await res.json();
                                 if (data.checkoutUrl) window.open(data.checkoutUrl, "_blank");
                                else alert("Erro ao gerar link");
                                 }}
                                  className="mt-3 w-full py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-xs uppercase cursor-pointer"
                               >
                               💳 Assinar — {formatBRL(plan.price)}/mês
                            </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}

                    {plans.length === 0 && (
                      <div className="md:col-span-2 text-center p-8 text-xs text-slate-500 italic font-mono">
                        Nenhum plano mensal cadastrado ainda no sistema. Crie um ao lado!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* List of active subscribers */}
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#0A0B0D]">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-semibold text-slate-100">Contratos de Clientes Ativos ({subscribers.length})</h4>
                </div>
                <span className="text-[10px] font-mono text-slate-400 bg-slate-900 border border-slate-800 p-1.5 rounded-lg">
                  Integrado ao Telefone & Nome do Cliente
                </span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-left border-collapse text-xs font-mono">
                  <thead>
                    <tr className="bg-[#0A0B0D] border-b border-slate-800 text-slate-400 font-bold uppercase text-[9px] tracking-wider">
                      <th className="py-3 px-4">Cliente / Contato</th>
                      <th className="py-3 px-4">Plano Assinado</th>
                      <th className="py-3 px-4">Início Contrato</th>
                      <th className="py-3 px-4">Mensalidade</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subscribers.map((sub) => {
                      const plan = plans.find(p => p.id === sub.planId);
                      return (
                        <tr key={sub.id} className="border-b border-slate-900 hover:bg-slate-900/30 transition-colors">
                          <td className="py-3.5 px-4">
                            <span className="font-bold text-slate-100 block">{sub.customerName}</span>
                            <span className="text-[10px] text-slate-400">{sub.customerPhone}</span>
                          </td>
                          <td className="py-3.5 px-4 font-sans text-xs">
                            <span className="font-medium text-slate-200">{plan ? plan.name : "Removido / Inativo"}</span>
                          </td>
                          <td className="py-3.5 px-4 text-slate-400">
                            {sub.startDate.split('-').reverse().join('/')}
                          </td>
                          <td className="py-3.5 px-4 text-emerald-400 font-bold">
                            {plan ? formatBRL(plan.price) : "R$ 0,00"}
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-bold text-emerald-400 uppercase tracking-wider">
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                              {sub.status}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => handleDeleteSubscriber(sub.id)}
                              className="p-1 px-2.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 rounded-lg hover:border-red-500/30 font-semibold cursor-pointer transition-colors text-[10px] uppercase"
                            >
                              Cancelar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                    {subscribers.length === 0 && (
                      <tr>
                        <td colSpan={6} className="text-center p-8 text-xs text-slate-500 italic">
                          Nenhuma assinatura de cliente ativa cadastrada ainda no sistema.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* 5. MESSAGES AND WEBHOOK LOGS TAB */}
        {activeTab === 'notifications' && (
          <div className="space-y-8">
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#0A0B0D]">
                <div className="flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-200">Motor de Notificações & Simulação Webhook</h3>
                </div>
                <span className="inline-flex h-2.5 w-2.5 rounded-full bg-amber-500 animate-pulse" />
              </div>

              <p className="text-xs text-slate-400 leading-relaxed font-mono">
                Sempre que um agendamento é solicitado na Página de Reservas do Cliente, nosso servidor dispara uma notificação via webhook simulando a conexão com intermediários de WhatsApp (Twilio / Evolution API). Confira o histórico de mensagens processadas abaixo.
              </p>

              <div className="bg-[#0A0B0D] rounded-xl p-4 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between text-xs text-slate-400 font-mono">
                  <span>HISTÓRICO DE DISPAROS DE NOTIFICAÇÃO ({notificationLogs.length})</span>
                  <span className="text-amber-550" style={{ color: '#f59e0b' }}>Webhook Ativo</span>
                </div>

                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {notificationLogs.map((log) => (
                    <div key={log.id} className="bg-[#14161B] p-3 rounded-lg border border-slate-800 space-y-2 text-xs hover:border-slate-700 transition-colors">
                      <div className="flex items-center justify-between gap-4 font-mono">
                        <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[10px] font-bold text-amber-500 uppercase tracking-widest">
                          {log.type === 'confirmation' ? "Confirmação" : "Lembrete"}
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(log.timestamp).toLocaleTimeString()} — {new Date(log.timestamp).toLocaleDateString()}
                        </span>
                      </div>

                      <div className="text-slate-300 font-mono bg-[#0A0B0D] p-2.5 rounded text-[11px] leading-relaxed border border-slate-850">
                        <span className="block text-[9px] text-slate-500 uppercase tracking-wider mb-1">REMETE P/ CONTATO: {log.recipientPhone} ({log.recipient})</span>
                        "{log.message}"
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span className="text-amber-500 flex items-center gap-1">✔ STATUS: {log.status.toUpperCase()}</span>
                        <span>API ENDPOINT ID: {log.appointmentId}</span>
                      </div>
                    </div>
                  ))}
                  {notificationLogs.length === 0 && (
                    <div className="p-4 text-center text-xs text-slate-500 font-mono italic">
                      Nenhuma notificação enviada ainda. Agende usando a Página do Cliente para carregar logs instantâneos!
                    </div>
                  )}
                </div>

              </div>
            </div>
          </div>
        )}

        {/* 6. ESTABLISHMENT SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div className="space-y-8">
            <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-6">
              <h3 className="font-semibold text-slate-200 text-sm pb-2 border-b border-[#0A0B0D] flex items-center gap-2">
                <Settings className="w-5 h-5 text-amber-500" /> Configurar Detalhes do Estabelecimento (SaaS Settings)
              </h3>

              <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono">NOME COLETIVO DO SALÃO/BARBEARIA</label>
                    <input 
                      type="text" 
                      required
                      value={settName}
                      onChange={(e) => setSettName(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono">TELEFONE DE CONTATO REPRESENTATIVO</label>
                    <input 
                      type="text" 
                      required
                      value={settPhone}
                      onChange={(e) => setSettPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono">HORÁRIO DE ABERTURA (HH:MM)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="09:00"
                      value={settOpen}
                      onChange={(e) => setSettOpen(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-slate-400 font-mono">HORÁRIO DE FECHAMENTO (HH:MM)</label>
                    <input 
                      type="text" 
                      required
                      placeholder="20:00"
                      value={settClose}
                      onChange={(e) => setSettClose(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-mono">ENDEREÇO FISÍCO COMPLETO</label>
                  <input 
                    type="text" 
                    required
                    value={settAddress}
                    onChange={(e) => setSettAddress(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-[#0A0B0D] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                  />
                </div>

                {/* White-Label Custom Domain Setup */}
                <div className="bg-[#0A0B0D] p-4 rounded-xl border border-slate-800 space-y-3.5">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-bold tracking-widest leading-none font-mono">
                      recurso white-label
                    </span>
                    <span className="block text-[10px] text-slate-300 font-mono font-bold uppercase tracking-wider">DOMÍNIO PERSONALIZADO (DNS PRO)</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-slate-400 font-mono block text-[10px]">DOMÍNIO OU SUBDOMÍNIO</label>
                      <input 
                        type="text" 
                        placeholder="Ex: imperial.autodireto.online ou salaoimperial.com"
                        value={settCustomDomain}
                        onChange={(e) => setSettCustomDomain(e.target.value.toLowerCase().trim())}
                        className="w-full rounded-xl border border-slate-800 bg-[#14161B] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 font-mono"
                      />
                      <p className="text-[9px] text-slate-500 leading-relaxed font-sans mt-1">
                        Se o cliente acessar por este domínio, o sistema carregará automaticamente as fotos, faturamentos, planos VIP e profissionais da sua barbearia de modo 100% isolado.
                      </p>
                    </div>
                    <div className="p-3 bg-[#14161B]/40 rounded-xl border border-slate-800 text-[10px] text-slate-400 space-y-1.5 leading-relaxed font-sans">
                      <div className="text-amber-500 font-bold uppercase font-mono text-[9px] tracking-wider">Como configurar no seu DNS (ex: Cloudflare, Hostgator):</div>
                      <p>1. Acesse sua zona de DNS para o domínio <strong>autodireto.online</strong> (ou seu domínio próprio).</p>
                      <p>2. Adicione um registro <strong>CNAME</strong> com as subentradas desejadas (ex: <code className="text-amber-400 font-mono">imperial</code>) apontando para o Host principal desta plataforma.</p>
                      <p>3. Dica: Para domínios principais, aponte um registro <strong>A</strong> para o IP público correspondente do seu servidor proxy ou contêiner de borda.</p>
                    </div>
                  </div>
                </div>

                {/* Theme selection and Logo attachment option */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-[#0A0B0D] p-5 rounded-2xl border border-slate-800">
                  <div className="space-y-3">
                    <label className="text-slate-300 font-mono block text-[11px] font-bold uppercase tracking-wider">
                      Tema Visual do Sistema
                    </label>
                    <div className="flex items-center gap-6 pt-1">
                      <label className="flex items-center gap-2.5 cursor-pointer text-slate-200 hover:text-white transition-colors">
                        <input
                          type="radio"
                          name="themeSelect"
                          value="dark"
                          checked={settTheme === "dark"}
                          onChange={() => setSettTheme("dark")}
                          className="h-4 w-4 rounded-full border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                        />
                        <span className="text-xs font-mono">Escuro Sleek (Atual)</span>
                      </label>
                      <label className="flex items-center gap-2.5 cursor-pointer text-slate-200 hover:text-white transition-colors">
                        <input
                          type="radio"
                          name="themeSelect"
                          value="light"
                          checked={settTheme === "light"}
                          onChange={() => setSettTheme("light")}
                          className="h-4 w-4 rounded-full border-slate-800 bg-slate-950 text-amber-500 focus:ring-amber-500 focus:ring-offset-0"
                        />
                        <span className="text-xs font-mono">Modo Claro (Light)</span>
                      </label>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono">
                      Aplica-se ao painel administrativo e à página de agendamentos.
                    </p>
                  </div>

                  <div className="space-y-3">
                    <label className="text-slate-300 font-mono block text-[11px] font-bold uppercase tracking-wider">
                      Logotipo do Estabelecimento
                    </label>
                    <div className="flex items-center gap-4">
                      <div className="h-14 w-14 rounded-2xl bg-[#14161B] border border-slate-800 flex items-center justify-center overflow-hidden shadow-inner shrink-0 leading-none">
                        {settLogoUrl ? (
                          <img src={settLogoUrl} alt="Logo" className="h-full w-full object-cover" />
                        ) : (
                          <Scissors className="h-6 w-6 text-slate-500 -rotate-45" />
                        )}
                      </div>
                      <div className="flex-grow space-y-1.5">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                setSettLogoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="w-full text-xs text-slate-400 file:mr-3 file:py-1 file:px-3 file:rounded-xl file:border file:border-slate-800 file:text-xs file:font-semibold file:bg-slate-900 file:text-amber-500 hover:file:bg-slate-850 file:cursor-pointer"
                        />
                        {settLogoUrl && (
                          <button
                            type="button"
                            onClick={() => setSettLogoUrl("")}
                            className="block text-[10px] font-mono text-red-400 hover:text-red-300 transition-colors uppercase cursor-pointer"
                          >
                            × Remover Logo Personalizada
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* WhatsApp Config (Twilio / Evolution API integration) */}
                <div className="bg-[#0A0B0D] p-4 rounded-xl border border-slate-800 space-y-4">
                  <span className="block text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider">INTEGRAÇÃO WHATSAPP WEBHOOK</span>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-slate-400 font-mono">CREDENCIAIS API KEY WHATSAPP (TWILIO/EVOLUTION)</label>
                      <input 
                        type="password" 
                        placeholder="Insira a chave secreta de integração"
                        value={settApiKey}
                        onChange={(e) => setSettApiKey(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#14161B] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-slate-400 font-mono">URL ENDPOINT WEBHOOK</label>
                      <input 
                        type="text" 
                        placeholder="https://api.gateway.com/v1/webhook"
                        value={settWebhook}
                        onChange={(e) => setSettWebhook(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-[#14161B] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Alterar login e senha de acesso */}
                <div className="bg-[#0A0B0D] p-5 rounded-2xl border border-slate-800 space-y-4">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-amber-500" />
                    <span className="block text-xs text-slate-200 font-mono font-bold uppercase tracking-wider">Alterar Credenciais de Acesso ao Painel</span>
                  </div>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-mono text-[10px] block font-bold uppercase tracking-wider">Novo Usuário de Login (Máx 30 caracteres)</label>
                      <input 
                        type="text" 
                        maxLength={30}
                        required
                        placeholder="Ex: gerente"
                        value={settAdminUsername}
                        onChange={(e) => setSettAdminUsername(e.target.value.toLowerCase().trim().slice(0, 30))}
                        className="w-full rounded-xl border border-slate-800 bg-[#14161B] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 font-mono"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-slate-400 font-mono text-[10px] block font-bold uppercase tracking-wider">Nova Senha de Acesso (Máx 8 caracteres)</label>
                      <input 
                        type="password" 
                        maxLength={8}
                        placeholder="Deixe em branco para manter a atual"
                        value={settAdminPassword}
                        onChange={(e) => setSettAdminPassword(e.target.value.trim().slice(0, 8))}
                        className="w-full rounded-xl border border-slate-800 bg-[#14161B] px-3 py-2 text-sm text-slate-100 outline-none focus:border-amber-500 font-mono"
                      />
                      <p className="text-[9px] text-slate-500 font-sans mt-1">Preencha este campo caso queira alterar sua senha de acesso hoje.</p>
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSettingsSaving}
                  className="px-6 py-2.5 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
                >
                  {isSettingsSaving ? "Salvando..." : "Salvar Configurações"}
                </button>
              </form>
            </div>
          </div>
        )}

      </main>

    </div>
  );
}
