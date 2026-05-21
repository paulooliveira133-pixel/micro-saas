import { useState, useEffect } from "react";
import AdminPanel from "./components/AdminPanel";
import ClientPage from "./components/ClientPage";
import SaaSPlatformDashboard from "./components/SaaSPlatformDashboard";
import QRCodeModal from "./components/QRCodeModal";
import LoginScreen from "./components/LoginScreen";
import { Laptop, LayoutDashboard, QrCode, Sparkles, ShieldAlert, Cpu, LogOut } from "lucide-react";

export default function App() {
  // Query parameter parsing for white-label routing with custom domain resolution
  const getInitialState = () => {
    try {
      const params = new URLSearchParams(window.location.search);
      const urlTenant = params.get("tenant");
      const urlView = params.get("view");
      
      const hostname = window.location.hostname.toLowerCase();
      let resolvedTenant = urlTenant || "imperial";
      let resolvedView: 'admin' | 'client' | 'saas' = (urlView === 'admin' || urlView === 'client' || urlView === 'saas' ? urlView : 'saas') as 'admin' | 'client' | 'saas';

      // Advanced subdomain routing for SaaS deployment on autodireto.online
      if (hostname.includes("autodireto.online")) {
        const parts = hostname.split(".");
        // If there is a subdomain e.g. "bellavista.autodireto.online"
        if (parts.length >= 3 && parts[0] !== "www") {
          resolvedTenant = parts[0];
          // Default to the customer client page if accessing through direct subdomain
          resolvedView = (urlView === 'admin' ? 'admin' : 'client');
        } else {
          // Main domain (autodireto.online) defaults to SaaS platform dashboard
          resolvedView = (urlView as any) || 'saas';
        }
      } else if (hostname !== "localhost" && hostname !== "127.0.0.1" && !hostname.includes("run.app") && !hostname.includes("ai.studio")) {
        // Any other external custom domain (e.g. customized physical brand domains)
        // If it's a dedicated custom domain, the entire domain corresponds to the salon client view
        resolvedView = (urlView === 'admin' ? 'admin' : 'client');
      }
      
      return {
        tenant: resolvedTenant,
        view: resolvedView
      };
    } catch (e) {
      return { tenant: "imperial", view: "saas" as const };
    }
  };

  const initialState = getInitialState();

  // Selected Active Tenant Slug/ID scoped to UI and API requests
  const [activeTenantId, setActiveTenantId] = useState<string>(initialState.tenant);

  // Active View State: 'saas' (Global platform panel), 'admin' (Unit management desk), 'client' (PWA customer scheduler)
  const [currentView, setCurrentView] = useState<'admin' | 'client' | 'saas'>(initialState.view);
  
  // QRCode Modal state
  const [isQRCodeOpen, setIsQRCodeOpen] = useState(false);

  // Persistent authentication states loaded from localStorage
  const [saasLoggedIn, setSaasLoggedIn] = useState<boolean>(() => {
    return localStorage.getItem("autodireto_saas_auth") === "true";
  });

  const [tenantLoggedIn, setTenantLoggedIn] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem("autodireto_tenant_auths") || "{}");
    } catch (e) {
      return {};
    }
  });

  // Login handler overrides
  const handleSaasLoginSuccess = () => {
    setSaasLoggedIn(true);
    localStorage.setItem("autodireto_saas_auth", "true");
  };

  const handleTenantLoginSuccess = () => {
    const nextAuths = { ...tenantLoggedIn, [activeTenantId]: true };
    setTenantLoggedIn(nextAuths);
    localStorage.setItem("autodireto_tenant_auths", JSON.stringify(nextAuths));
  };

  // Logout methods
  const handleSaasLogout = () => {
    setSaasLoggedIn(false);
    localStorage.removeItem("autodireto_saas_auth");
  };

  const handleTenantLogout = () => {
    const nextAuths = { ...tenantLoggedIn, [activeTenantId]: false };
    setTenantLoggedIn(nextAuths);
    localStorage.setItem("autodireto_tenant_auths", JSON.stringify(nextAuths));
  };

  // Sync active tenant on the window object for custom API request routing
  useEffect(() => {
    (window as any).__tenantId = activeTenantId;
  }, [activeTenantId]);

  // Dynamic custom domain resolution mapping: Routes unknown custom domains to SaaS view instead of client view
  useEffect(() => {
    async function verifyDomainGroup() {
      try {
        const hostname = window.location.hostname.toLowerCase();
        // Skip checks on development, standard sandboxes and official platform multi-tenant domains
        if (
          hostname === "localhost" || 
          hostname === "127.0.0.1" || 
          hostname.includes("run.app") || 
          hostname.includes("ai.studio") ||
          hostname.includes("autodireto.online")
        ) {
          return;
        }

        // Fetch registered tenants from the platform database
        const res = await fetch("/api/saas/tenants");
        if (res.ok) {
          const tenants = await res.json();
          // Check if current hostname is registered as any tenant's custom domain or slug subdomain
          const matchingTenant = tenants.find((t: any) => {
            const domainMatch = t.customDomain && t.customDomain.toLowerCase() === hostname;
            const subdomainMatch = hostname.startsWith(`${t.slug}.`);
            return domainMatch || subdomainMatch;
          });

          if (matchingTenant) {
            // Yes, this is a dedicated tenant custom domain! Frame only the scheduler / administration flow
            setActiveTenantId(matchingTenant.id || matchingTenant.slug);
            const params = new URLSearchParams(window.location.search);
            const urlView = params.get("view");
            if (!urlView) {
              setCurrentView('client');
            }
          } else {
            // No matching tenant custom domain found! This must be the MAIN SaaS general domain pointing here!
            // Direct the view to the primary SaaS General Platform Dashboard (SaaS view)
            const params = new URLSearchParams(window.location.search);
            const urlView = params.get("view");
            if (!urlView) {
              setCurrentView('saas');
            }
          }
        }
      } catch (err) {
        console.error("Erro ao verificar domínio personalizado:", err);
      }
    }

    verifyDomainGroup();
  }, []);

  return (
    <div className="min-h-screen bg-[#0A0B0D] flex flex-col font-sans select-none antialiased">
      
      {/* Top Header Navigation Panel */}
      <div className="bg-[#14161B] border-b border-slate-800 py-3 px-4 sticky top-0 z-50 shadow-md">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-slate-200">
          
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 animate-pulse" style={{ color: '#f59e0b' }} />
            <span className="text-xs font-semibold uppercase tracking-wider font-mono text-slate-300">
              SaaS White-Label: Multi-Salão
            </span>
          </div>

          {/* Quick-Switches between Global SaaS Admin, Salon Admin, and Client Reservation Views */}
          <div className="flex flex-wrap items-center bg-[#0A0B0D] rounded-xl p-1 border border-slate-800 font-mono">
            <button
              onClick={() => setCurrentView('saas')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
                currentView === 'saas'
                  ? "bg-amber-500 text-black shadow-sm font-black"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Cpu className="h-3 w-3" />
              SaaS Plataforma (Geral)
              {saasLoggedIn && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('admin')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
                currentView === 'admin'
                  ? "bg-slate-800 text-amber-500 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <LayoutDashboard className="h-3 w-3" />
              Painel Administrativo ({activeTenantId.toUpperCase()})
              {tenantLoggedIn[activeTenantId] && (
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse ml-1" />
              )}
            </button>
            <button
              onClick={() => setCurrentView('client')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[10px] font-bold tracking-wide uppercase transition-all whitespace-nowrap cursor-pointer ${
                currentView === 'client'
                  ? "bg-slate-800 text-amber-500 shadow-sm"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Laptop className="h-3 w-3" />
              Agendador Cliente ({activeTenantId.toUpperCase()})
            </button>
          </div>

          <div className="flex items-center gap-3.5 flex-wrap">
            <button
              onClick={() => setIsQRCodeOpen(true)}
              className="flex items-center gap-1 text-[11px] text-amber-500 font-mono hover:text-amber-400 transition-colors uppercase cursor-pointer"
              title="Mostrar Link QR de agendamento específico deste parceiro"
            >
              <QrCode className="h-3.5 w-3.5" />
              <span>Link QR de {activeTenantId.toUpperCase()}</span>
            </button>

            {/* Quick Logout buttons for secure context */}
            {currentView === 'saas' && saasLoggedIn && (
              <button
                onClick={handleSaasLogout}
                className="flex items-center gap-1 text-[11px] text-red-400 font-mono hover:text-red-350 transition-colors uppercase border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-lg cursor-pointer"
                title="Encerrar sessão de segurança da plataforma SaaS"
              >
                <LogOut className="h-3 w-3" />
                <span>Sair (SaaS)</span>
              </button>
            )}

            {currentView === 'admin' && tenantLoggedIn[activeTenantId] && (
              <button
                onClick={handleTenantLogout}
                className="flex items-center gap-1 text-[11px] text-red-400 font-mono hover:text-red-350 transition-colors uppercase border border-red-500/20 bg-red-500/5 px-2.5 py-1 rounded-lg cursor-pointer"
                title={`Encerrar sessão de segurança da unidade ${activeTenantId.toUpperCase()}`}
              >
                <LogOut className="h-3 w-3" />
                <span>Sair ({activeTenantId.toUpperCase()})</span>
              </button>
            )}
          </div>

        </div>
      </div>

      {/* Conditionally render Global SaaS Monitor, Unit Admin or Client Booking Layout */}
      <div className="flex-1">
        {currentView === 'saas' && (
          !saasLoggedIn ? (
            <LoginScreen type="saas" onLoginSuccess={handleSaasLoginSuccess} />
          ) : (
            <SaaSPlatformDashboard 
              activeTenantId={activeTenantId}
              onSelectTenant={(id) => {
                setActiveTenantId(id);
              }}
              onNavigateToView={(view) => {
                setCurrentView(view);
              }}
            />
          )
        )}

        {currentView === 'admin' && (
          !tenantLoggedIn[activeTenantId] ? (
            <LoginScreen type="tenant" tenantId={activeTenantId} onLoginSuccess={handleTenantLoginSuccess} />
          ) : (
            <AdminPanel 
              key={activeTenantId} // Reset internal state whenever tenant shifts
              onOpenQRCode={() => setIsQRCodeOpen(true)} 
              salonId={activeTenantId} 
            />
          )
        )}

        {currentView === 'client' && (
          <ClientPage 
            key={activeTenantId} // Reset schedules when tenant sweeps
            salonId={activeTenantId} 
            onNavigateToAdmin={() => setCurrentView('admin')} 
          />
        )}
      </div>

      {/* Integrated dynamic QR Modal */}
      <QRCodeModal 
        isOpen={isQRCodeOpen}
        onClose={() => setIsQRCodeOpen(false)}
        salonName={activeTenantId === "imperial" ? "Barbearia Imperial" : activeTenantId.toUpperCase()}
        salonId={activeTenantId}
        onOpenClientView={() => setCurrentView('client')}
      />

    </div>
  );
}
