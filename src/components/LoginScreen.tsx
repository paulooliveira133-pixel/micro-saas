import React, { useState } from "react";
import { motion } from "motion/react";
import { Lock, Unlock, User, Key, Eye, EyeOff, ShieldCheck, AlertCircle } from "lucide-react";

interface LoginScreenProps {
  type: "saas" | "tenant";
  tenantId?: string;
  onLoginSuccess: () => void;
}

export default function LoginScreen({ type, tenantId, onLoginSuccess }: LoginScreenProps) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Setup expected credentials based on panel partition
  const defaultUser = type === "saas" ? "admin" : "gerente";
  const defaultPass = type === "saas" ? "admin123" : "gerente123";

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    const sanitizedUser = username.trim();
    const sanitizedPass = password.trim();

    if (type === "saas") {
      // Local authentication for the super administrator
      setTimeout(() => {
        if (sanitizedUser.toLowerCase() === "admin" && sanitizedPass === "admin123") {
          onLoginSuccess();
        } else {
          setError("Usuário ou senha incorretos para a plataforma SaaS.");
        }
        setIsLoading(false);
      }, 350);
    } else {
      // Real API request containing the active white-label tenant scope
      try {
        const res = await fetch("/api/auth/tenant", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Tenant-ID": tenantId || ""
          },
          body: JSON.stringify({
            username: sanitizedUser,
            password: sanitizedPass
          })
        });

        const data = await res.json();
        if (res.ok && data.success) {
          onLoginSuccess();
        } else {
          setError(data.error || "Usuário ou senha incorretos para esta área.");
        }
      } catch (err) {
        setError("Erro de rede. Não foi possível autenticar as credenciais com o servidor.");
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleAutoFill = () => {
    setUsername(defaultUser);
    setPassword(defaultPass);
    setError(null);
  };

  return (
    <div className="flex flex-col items-center justify-center p-6 min-h-[80vh]">
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full max-w-md bg-[#14161B] border border-slate-800 rounded-3xl p-8 relative overflow-hidden shadow-2xl"
      >
        {/* Subtle decorative gold light flare */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />
        
        <div className="flex justify-center mb-6">
          <div className="p-3.5 bg-[#0A0B0D] rounded-2xl border border-slate-800/80 text-amber-500">
            <Lock className="h-7 w-7 animate-pulse" />
          </div>
        </div>

        <div className="text-center mb-8 space-y-2">
          <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20 text-[9px] uppercase font-mono tracking-widest font-bold">
            Área de Segurança
          </span>
          <h2 className="text-xl font-sans font-bold text-slate-100 tracking-tight">
            {type === "saas" ? "Plataforma SaaS Principal" : `Painel Administrativo`}
          </h2>
          <p className="text-xs text-slate-400 font-sans max-w-xs mx-auto">
            {type === "saas" 
              ? "Autenticação requerida para gerenciar faturamentos, planos VIP e novos salões."
              : `Acesso seguro para gerenciar horários, profissionais e serviços da unidade ${tenantId?.toUpperCase()}.`
            }
          </p>
        </div>

        {error && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mb-5 p-3.5 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-start gap-2.5 font-sans leading-relaxed"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              Nome de Usuário (Máx 30)
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input 
                type="text"
                required
                maxLength={30}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={`Ex: ${defaultUser}`}
                className="w-full bg-[#0A0B0D] border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-xs font-mono text-slate-200 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] text-slate-400 font-mono font-bold uppercase tracking-wider block">
              Senha Correta (Máx 8)
            </label>
            <div className="relative">
              <Key className="absolute left-3.5 top-3 h-4 w-4 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"}
                required
                maxLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Digite sua senha"
                className="w-full bg-[#0A0B0D] border border-slate-800 rounded-xl py-2.5 pl-10 pr-10 text-xs font-mono text-slate-200 focus:border-amber-500 outline-none transition-all placeholder:text-slate-600"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-350 cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-450 text-black font-black font-mono text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isLoading ? (
              <span className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Unlock className="h-3.5 w-3.5" />
                Acessar Painel
              </>
            )}
          </button>
        </form>

        {/* Demo Assistant Helper box */}
        <div className="mt-6 pt-5 border-t border-slate-800/60 text-center space-y-3">
          <p className="text-[10px] font-sans text-slate-500 leading-relaxed">
            Estamos em modo de demonstração. Você pode testar digitando as credenciais padrão ou com o atalho abaixo:
          </p>
          <button
            type="button"
            onClick={handleAutoFill}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500 hover:bg-amber-500/20 transition-all font-mono text-[9px] font-bold uppercase tracking-wider cursor-pointer mx-auto"
          >
            <ShieldCheck className="h-3.5 w-3.5 animate-bounce" />
            Auto-preencher credenciais de teste
          </button>
        </div>
      </motion.div>
    </div>
  );
}
