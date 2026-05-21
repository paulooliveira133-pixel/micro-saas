import React, { useState, useEffect } from "react";
import { 
  Building2, 
  Plus, 
  Clock, 
  Coins, 
  Users, 
  CheckCircle, 
  ArrowRight, 
  ShieldCheck, 
  HelpCircle, 
  ChevronRight, 
  Globe, 
  Activity, 
  UserPlus, 
  Flame, 
  Calendar,
  Sparkles,
  Smartphone,
  Phone,
  MapPin,
  XCircle,
  TrendingUp,
  Cpu,
  ExternalLink
} from "lucide-react";

interface TenantSummary {
  id: string;
  slug: string;
  name: string;
  phone: string;
  address: string;
  openTime: string;
  closeTime: string;
  activeSubscribersCount: number;
  totalAppointmentsCount: number;
  servicesCount: number;
  professionalsCount: number;
  customDomain?: string;
}

interface SaaSPlatformDashboardProps {
  onSelectTenant: (tenantId: string) => void;
  activeTenantId: string;
  onNavigateToView: (view: 'admin' | 'client' | 'saas') => void;
}

export default function SaaSPlatformDashboard({ onSelectTenant, activeTenantId, onNavigateToView }: SaaSPlatformDashboardProps) {
  const [tenants, setTenants] = useState<TenantSummary[]>([]);
  const [loading, setLoading] = useState(true);

  // Dynamic public and custom domain routing helper
  const getTenantUrl = (t: TenantSummary) => {
    const isProd = window.location.hostname.includes("autodireto.online");
    if (isProd) {
      if (t.customDomain) {
        return `https://${t.customDomain}`;
      }
      return `https://${t.slug}.autodireto.online`;
    }
    // Sandbox or localhost preview uses query parameters
    return `${window.location.origin}?tenant=${t.slug}&view=client`;
  };
  
  // Registration Form State
  const [newSalonName, setNewSalonName] = useState("");
  const [newSalonSlug, setNewSalonSlug] = useState("");
  const [newSalonPhone, setNewSalonPhone] = useState("");
  const [newSalonAddress, setNewSalonAddress] = useState("");
  const [newSalonOpen, setNewSalonOpen] = useState("09:00");
  const [newSalonClose, setNewSalonClose] = useState("20:00");
  const [newSalonAdminUsername, setNewSalonAdminUsername] = useState("gerente");
  const [newSalonAdminPassword, setNewSalonAdminPassword] = useState("gerente123");
  const [errorMess, setErrorMess] = useState<string | null>(null);
  const [successMess, setSuccessMess] = useState<string | null>(null);

  // Load SaaS ecosystem tenants from backend
  const fetchTenants = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/saas/tenants");
      if (res.ok) {
        const data = await res.json();
        setTenants(data);
      }
    } catch (err) {
      console.error("Erro ao carregar ecossistema SaaS:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTenants();
  }, []);

  // Sync suggestion of slug with salon name input
  const handleNameChange = (val: string) => {
    setNewSalonName(val);
    const suggested = val
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "") // remove accents
      .replace(/[^a-z0-9\s-]/g, "") // remove special characters
      .replace(/\s+/g, "-") // replace spaces with hyphens
      .replace(/-+/g, "-"); // merge multiple hyphens
    setNewSalonSlug(suggested);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMess(null);
    setSuccessMess(null);

    if (!newSalonName || !newSalonSlug) {
      setErrorMess("Nome do Estabelecimento e Endereço Slug são obrigatórios.");
      return;
    }

    try {
      const res = await fetch("/api/saas/tenants", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: newSalonName,
          slug: newSalonSlug,
          phone: newSalonPhone,
          address: newSalonAddress,
          openTime: newSalonOpen,
          closeTime: newSalonClose,
          adminUsername: newSalonAdminUsername,
          adminPassword: newSalonAdminPassword
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setErrorMess(data.error || "Ocorreu um erro no cadastro.");
      } else {
        setSuccessMess(`Sucesso! "${newSalonName}" foi cadastrado no ecossistema e preenchido com dados demo.`);
        
        // Clear inputs
        setNewSalonName("");
        setNewSalonSlug("");
        setNewSalonPhone("");
        setNewSalonAddress("");
        setNewSalonAdminUsername("gerente");
        setNewSalonAdminPassword("gerente123");
        
        // Refresh grid
        fetchTenants();
      }
    } catch (err) {
      setErrorMess("Não foi possível enviar requisição ao servidor backend.");
    }
  };

  // SaaS General Statistics Calculations
  const activeTenantCount = tenants.length;
  const globalAppointmentsCount = tenants.reduce((sum, t) => sum + t.totalAppointmentsCount, 0);
  const globalSubscribersCount = tenants.reduce((sum, t) => sum + t.activeSubscribersCount, 0);
  
  // Hypothetical calculation: each registered salon pays R$ 149,90/month. Each club subscriber pays R$ 140,00/month (with SaaS tax of 10%)
  const estimatedPlatformMRR = (activeTenantCount * 149.90) + (globalSubscribersCount * 140.00 * 0.10);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-slate-100 font-sans animate-fade-in">
      
      {/* Platform Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-[#181B22] to-slate-900 border border-slate-800 p-6 sm:p-8 shadow-2xl">
        <div className="absolute top-0 right-0 p-8 opacity-5">
          <Activity className="h-64 w-64 text-amber-500 animate-pulse" />
        </div>
        <div className="relative z-10 space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-full font-mono text-[10px] uppercase tracking-wider font-semibold">
            <Cpu className="h-3 w-3" />
            Super Painel SaaS • Administrador Geral
          </div>
          <div className="max-w-4xl space-y-2">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white">
              Gestão de Clientes & faturamento
            </h1>
            <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
              Bem-vindo ao centro de operações da sua própria plataforma SaaS. Veja quem está utilizando seus serviços de agendamentos online, controle faturamentos integrados, realize onboarding de novos salões parceiros em segundos e conecte seus domínios personalizados.
            </p>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 sm:gap-6">
        
        <div className="bg-[#14161B] rounded-2xl border border-slate-800/80 p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Estabelecimentos Ativos</span>
            <div className="text-3xl font-black text-white font-mono">{activeTenantCount}</div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> White-label ativo
            </span>
          </div>
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-slate-300">
            <Building2 className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#14161B] rounded-2xl border border-slate-800/80 p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Agendamentos Globais</span>
            <div className="text-3xl font-black text-amber-500 font-mono">{globalAppointmentsCount}</div>
            <span className="text-[10px] text-slate-400 font-mono">Simulados em tempo real</span>
          </div>
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-amber-550" style={{ color: '#f59e0b' }}>
            <Calendar className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-[#14161B] rounded-2xl border border-slate-800/80 p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">Assinaturas VIP Unidas</span>
            <div className="text-3xl font-black text-white font-mono">{globalSubscribersCount}</div>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1">
              <TrendingUp className="h-3 w-3" /> Membros recorrentes
            </span>
          </div>
          <div className="p-3.5 bg-slate-800/60 rounded-xl border border-slate-700/50 text-slate-300">
            <Users className="h-6 w-6" />
          </div>
        </div>

        <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 rounded-2xl border border-amber-550/20 p-5 flex items-center justify-between shadow-xl">
          <div className="space-y-1">
            <span className="text-[11px] uppercase tracking-wider text-amber-500 font-mono">Estimativa MRR Global</span>
            <div className="text-3xl font-black text-white font-mono">R$ {estimatedPlatformMRR.toFixed(2)}</div>
            <span className="text-[10px] text-amber-400 font-mono">Mensalidade + 10% Royalties</span>
          </div>
          <div className="p-3.5 bg-amber-500 rounded-xl border border-amber-400 text-black">
            <Coins className="h-6 w-6" />
          </div>
        </div>

      </div>

      {/* Main SaaS Content Layout: Left Grid (Tenants, Register), Right Sidebar (Business Answers) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left 2-Columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Active Tenant List */}
          <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-amber-500" />
                  Salões Registrados & Configurados
                </h2>
                <p className="text-xs text-slate-400">
                  Gerencie as contas individuais dos seus clientes e altere o escopo do simulador de unidade.
                </p>
              </div>
              
              <button 
                onClick={fetchTenants}
                className="px-3.5 py-1.5 rounded-lg border border-slate-700 hover:bg-slate-800 font-mono text-[11px] text-slate-300 cursor-pointer transition-colors"
              >
                Atualizar Lista
              </button>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-3 font-mono text-xs text-slate-500">
                <Clock className="h-8 w-8 text-amber-500 animate-spin" />
                <span>Carregando ecossistema SaaS de clientes...</span>
              </div>
            ) : tenants.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-800 p-12 text-center text-slate-500 font-mono text-xs">
                Nenhum salão registrado no banco de dados. Cadastre sua primeira unidade abaixo!
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800 bg-[#0A0B0D]">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-[#111217] text-[#94A3B8] font-semibold font-mono tracking-wider uppercase text-[10px]">
                      <th className="p-4">Estabelecimento / Slug</th>
                      <th className="p-4">Staff / Catálogo</th>
                      <th className="p-4 text-center">Assinantes VIP</th>
                      <th className="p-4 text-center">Agendamentos</th>
                      <th className="p-4 text-right">Ação</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {tenants.map((t) => {
                      const isActive = activeTenantId === t.id;
                      return (
                        <tr 
                          key={t.id} 
                          className={`hover:bg-slate-900/60 transition-colors ${
                            isActive ? "bg-amber-500/[0.02]" : ""
                          }`}
                        >
                          <td className="p-4 space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span className="font-sans font-bold text-slate-200 text-sm">
                                {t.name}
                              </span>
                              {isActive && (
                                <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[9px] uppercase font-bold tracking-widest leading-none">
                                  Ativa
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-1.5 text-slate-400 text-[10px] mt-1">
                              <Globe className="h-3 w-3 text-amber-500" />
                              <a 
                                href={getTenantUrl(t)} 
                                target="_blank" 
                                rel="noreferrer" 
                                className="text-amber-500 hover:text-amber-400 hover:underline transition-colors flex items-center gap-0.5 font-bold"
                                title="Abrir agendador do cliente em nova aba"
                              >
                                {t.customDomain ? t.customDomain : `${t.slug}.autodireto.online`}
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            </div>
                          </td>
                          
                          <td className="p-4 text-slate-300">
                            <div>{t.professionalsCount} Profissionais</div>
                            <div className="text-[10px] text-slate-500">{t.servicesCount} Serviços no catálogo</div>
                          </td>
                          
                          <td className="p-4 text-center">
                            <span className="px-2.5 py-1 rounded-full bg-slate-900 text-slate-300 border border-slate-800 font-bold">
                              {t.activeSubscribersCount}
                            </span>
                          </td>
                          
                          <td className="p-4 text-center text-slate-300 font-bold">
                            {t.totalAppointmentsCount}
                          </td>
                          
                          <td className="p-4 text-right">
                            <div className="flex flex-wrap items-center justify-end gap-1.5">
                              <button
                                onClick={() => {
                                  onSelectTenant(t.id);
                                  onNavigateToView('client');
                                }}
                                className="px-2 py-1 rounded-md bg-[#111217] border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 font-bold text-[10px] uppercase transition-all tracking-wide cursor-pointer"
                                title="Fazer uma simulação interna desta unidade na mesma aba"
                              >
                                Simular
                              </button>
                              <a
                                href={getTenantUrl(t)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/25 text-amber-500 hover:text-amber-400 hover:bg-amber-500/20 font-bold text-[10px] uppercase transition-all tracking-wide flex items-center gap-1 cursor-pointer"
                                title="Abrir página pública do salão em nova aba do navegador"
                              >
                                Abrir site
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                              <button
                                onClick={() => {
                                  onSelectTenant(t.id);
                                  onNavigateToView('admin');
                                }}
                                className="px-2.5 py-1.5 rounded-md bg-amber-500 text-black hover:bg-amber-400 font-black text-[10px] uppercase transition-all flex items-center gap-1 cursor-pointer shadow-sm shadow-amber-500/10"
                                title="Gerenciar serviços, profissionais e chat IA desta unidade"
                              >
                                Gerenciar
                                <ChevronRight className="h-3 w-3" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Create New Tenant (Onboarding Wizard) */}
          <div className="bg-[#14161B] rounded-2xl border border-slate-800 p-6 space-y-6 shadow-xl">
            <div className="space-y-1">
              <h2 className="text-xl font-bold text-slate-150 flex items-center gap-2">
                <UserPlus className="h-5 w-5 text-amber-500" />
                Cadastrar Novo Salão / Unidade (Onboarding)
              </h2>
              <p className="text-xs text-slate-400">
                Gere um novo ambiente (tenant) instantaneamente. O sistema criará as variáveis pre-seeded e fornecerá o link customizado para venda imediata.
              </p>
            </div>

            {errorMess && (
              <div className="p-3.5 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl text-xs font-mono flex items-center gap-2">
                <XCircle className="h-4 w-4 shrink-0" />
                <span>{errorMess}</span>
              </div>
            )}

            {successMess && (
              <div className="p-3.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-xs font-mono flex items-center gap-2">
                <CheckCircle className="h-4 w-4 shrink-0" />
                <span>{successMess}</span>
              </div>
            )}

            <form onSubmit={handleRegister} className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Nome do Estabelecimento *</label>
                <div className="relative">
                  <Building2 className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input 
                    type="text"
                    required
                    value={newSalonName}
                    onChange={(e) => handleNameChange(e.target.value)}
                    placeholder="Ex: Barber Black, Beauty Studio"
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Endereço de Acesso Slug (Subdomínio) *</label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3 text-slate-500 font-mono text-[11px]">/</span>
                  <input 
                    type="text"
                    required
                    value={newSalonSlug}
                    onChange={(e) => setNewSalonSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ""))}
                    placeholder="ex-slug-acesso"
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-8 pr-4 text-xs font-mono text-amber-500 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Telefone para Notificações</label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input 
                    type="text"
                    value={newSalonPhone}
                    onChange={(e) => setNewSalonPhone(e.target.value)}
                    placeholder="+55 (11) 99999-9999"
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Endereço Físico</label>
                <div className="relative">
                  <MapPin className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
                  <input 
                    type="text"
                    value={newSalonAddress}
                    onChange={(e) => setNewSalonAddress(e.target.value)}
                    placeholder="Rua, Número, Bairro, Cidade - UF"
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs text-white focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Horário de Abertura</label>
                  <input 
                    type="time"
                    value={newSalonOpen}
                    onChange={(e) => setNewSalonOpen(e.target.value)}
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono uppercase tracking-wider text-slate-400">Horário de Fechamento</label>
                  <input 
                    type="time"
                    value={newSalonClose}
                    onChange={(e) => setNewSalonClose(e.target.value)}
                    className="w-full bg-slate-950/80 hover:bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-white outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 md:col-span-2 bg-[#0A0B0D] p-4.5 rounded-2xl border border-slate-900/60 p-4">
                <div className="space-y-1.5 col-span-2 text-[10px] font-mono text-amber-500 uppercase tracking-widest font-bold">
                  🔑 Credenciais do Dono do Salão (Administrativo)
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">Usuário de Login *</label>
                  <input 
                    type="text"
                    required
                    maxLength={30}
                    value={newSalonAdminUsername}
                    onChange={(e) => setNewSalonAdminUsername(e.target.value.toLowerCase().trim().slice(0, 30))}
                    placeholder="Ex: gerente, luan.silva"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-slate-200 outline-none focus:border-amber-500/60"
                  />
                  <span className="text-[9px] text-slate-500 font-sans">No máximo 30 caracteres</span>
                </div>
                <div className="space-y-1.5">
                  <label className="text-[9px] font-mono uppercase tracking-wider text-slate-400 block">Senha Administrativa *</label>
                  <input 
                    type="text"
                    required
                    maxLength={8}
                    value={newSalonAdminPassword}
                    onChange={(e) => setNewSalonAdminPassword(e.target.value.trim().slice(0, 8))}
                    placeholder="Ex: 123456"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl p-2.5 text-xs text-amber-500 outline-none focus:border-amber-500/60"
                  />
                  <span className="text-[9px] text-slate-500 font-sans">No máximo 8 caracteres</span>
                </div>
              </div>

              <div className="md:col-span-2 pt-2">
                <button
                  type="submit"
                  className="w-full bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-3 rounded-xl font-mono text-xs font-black text-black hover:shadow-xl hover:shadow-amber-500/10 transition-all uppercase flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  Criar Estabelecimento Multi-Tenant Novo
                </button>
              </div>
            </form>
          </div>

        </div>

        {/* Right Sidebar Answers Panel */}
        <div className="space-y-6 lg:col-span-1">
          
          {/* FAQ answering absolute business concerns */}
          <div className="bg-gradient-to-b from-[#14161B] to-slate-950 border border-slate-800 rounded-2xl p-6 space-y-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800">
              <ShieldCheck className="h-5 w-5 text-amber-500" />
              Guia de Vendas & Respostas SaaS
            </h3>

            <div className="space-y-4">
              
              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                  <span>1. Como vender este projeto?</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Você pode vender este software como um <strong>serviço por assinatura (White-Label SaaS)</strong>. O salão ou barbearia assina um plano mensal (ex: R$ 149,90/mês) para ter o agendador deles online. No onboard, você cria o Slug comercial deles neste painel para isolar o banco de dados.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                  <span>2. Quem está usando meu projeto?</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Você sabe quem está usando monitorando a tabela de <strong>Salões no Super Painel</strong>. Cada negócio tem suas próprias estatísticas de equipe, faturamento e fluxo de agendamentos. Em produção, logs de acesso e sessões autenticadas identificam os clientes em atividade.
                </p>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                  <span>3. Como implantar no domínio autodireto.online?</span>
                </h4>
                <div className="text-[11px] text-slate-300 leading-relaxed font-sans space-y-1.5">
                  <p>
                    <strong>Totalmente pronto para produção!</strong> A arquitetura de multi-inquilinos (multi-tenant) já está programada para identificar o domínio principal e subdomínios automaticamente:
                  </p>
                  <p>
                    • <strong>Painel SaaS Principal</strong>: Ao acessar diretamente <code className="text-amber-400 font-mono">https://autodireto.online</code>, a plataforma reconhece o host raiz e serve este dashboard administrativo global automaticamente.
                  </p>
                  <p>
                    • <strong>Agendadores de Clientes</strong>: Ao criar subdomínios (ex: <code className="text-amber-400 font-mono">bellavista.autodireto.online</code> ou <code className="text-amber-400 font-mono">imperial.autodireto.online</code>), o backend intercepta o cabeçalho de Host, faz o isolamento da partição de dados e abre diretamente a tela de agendamentos daquela barbearia, ocultando os menus do SaaS para o cliente final.
                  </p>
                  <p>
                    • <strong>Aponte no seu DNS (Cloudflare/GoDaddy)</strong>: Adicione um registro <code className="text-amber-400 font-mono">A</code> apontando o domínio raiz para o IP do seu contêiner Cloud Run, e crie uma entrada <code className="text-amber-400 font-mono">CNAME</code> coringa (<code className="text-amber-400 font-mono">*</code>) apontando para o seu domínio principal para que qualquer novo salão cadastrado tenha seu link ativo de imediato!
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-xs font-mono font-bold text-amber-500 uppercase flex items-center gap-1">
                  <span>4. E o WhatsApp das notificações?</span>
                </h4>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  Os salões parceiros podem cadastrar suas próprias chaves de API externa de disparadores (Evolution API, Z-API) nas configurações de cada estabelecimento para disparar avisos reais automaticos pelo chip deles.
                </p>
              </div>

            </div>

            <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 font-mono text-[10px] space-y-1.5 text-slate-450 text-slate-400">
              <div className="text-slate-300 font-bold uppercase flex items-center gap-1 mb-1">
                <Cpu className="h-3 w-3 text-amber-500" /> Engenharia SaaS Pronta
              </div>
              <p>Mapeamento de banco em db.json com partições automáticas. O middleware dinâmico do servidor isola as consultas de modo seguro por cabeçalhos e cookies.</p>
            </div>
          </div>

          {/* Quick sandbox instruction sheet */}
          <div className="bg-[#14161B]/50 rounded-2xl border border-slate-800 p-5 space-y-3 font-mono text-[11px] text-slate-400 shadow-lg">
            <div className="text-amber-500 font-bold uppercase flex items-center gap-1.5">
              <Flame className="h-4 w-4 animate-bounce" />
              Instruções de Teste Multi
            </div>
            <p className="leading-relaxed">
              Deseja testar outro salão parceiro? Cadastre um com o slug <strong>"bellavista"</strong> ou mude para o Bella Vista Studio na tabela acima de forma dinâmica. Experimente preencher agendamentos, ver os gráficos mudarem no painel e disparar lembretes exclusivos.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
