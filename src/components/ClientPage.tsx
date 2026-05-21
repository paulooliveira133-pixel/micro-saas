import React, { useState, useEffect } from "react";
import { Service, Professional, Appointment, MonthlyPlan, Subscriber } from "../types";
import { apiFetch as fetch } from "../utils/api";
import { Calendar, Clock, Smile, Sparkles, CheckCircle2, AlertCircle, Scissors, PhoneCall, ChevronRight, CornerDownRight, MessageSquareCode, TrendingUp, Sparkle } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ClientPageProps {
  salonId: string;
  onNavigateToAdmin: () => void;
  key?: string;
}

export default function ClientPage({ salonId, onNavigateToAdmin }: ClientPageProps) {
  // Database states
  const [establishment, setEstablishment] = useState<any>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [plans, setPlans] = useState<MonthlyPlan[]>([]);
  const [subscribers, setSubscribers] = useState<Subscriber[]>([]);

  // Selection states
  const [activeMainView, setActiveMainView] = useState<'booking' | 'club'>('booking');
  const [selectedService, setSelectedService] = useState<Service | null>(null);
  const [selectedProfessional, setSelectedProfessional] = useState<Professional | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(""); 
  const [selectedTime, setSelectedTime] = useState<string>("");

  // Customer states
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  // Subscription active customer selector
  const [isClubSubscriber, setIsClubSubscriber] = useState(false);
  const [subscriberPhoneMatch, setSubscriberPhoneMatch] = useState("");
  const [matchedSubscriber, setMatchedSubscriber] = useState<Subscriber | null>(null);

  // UI flow states
  const [bookingSuccess, setBookingSuccess] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Join Club state
  const [joiningPlan, setJoiningPlan] = useState<MonthlyPlan | null>(null);
  const [joinName, setJoinName] = useState("");
  const [joinPhone, setJoinPhone] = useState("");
  const [subscriptionSuccess, setSubscriptionSuccess] = useState<Subscriber | null>(null);

  // Simulated live whatsapp confirmation toast
  const [notificationToast, setNotificationToast] = useState<{
    recipient: string;
    message: string;
    phone: string;
  } | null>(null);

  // Load backend states
  const loadData = async () => {
    try {
      const [estRes, srvRes, proRes, aptRes, plansRes, subsRes] = await Promise.all([
        fetch("/api/establishment"),
        fetch("/api/services"),
        fetch("/api/professionals"),
        fetch("/api/appointments"),
        fetch("/api/plans"),
        fetch("/api/subscribers")
      ]);

      const [est, srvs, pros, apts, pls, sbs] = await Promise.all([
        estRes.json(),
        srvRes.json(),
        proRes.json(),
        aptRes.json(),
        plansRes.json(),
        subsRes.json()
      ]);

      setEstablishment(est);
      setServices(srvs);
      setProfessionals(pros.filter((p: Professional) => p.active));
      setAppointments(apts);
      setPlans(pls || []);
      setSubscribers(sbs || []);
    } catch (err) {
      console.error("Error loading frontend data:", err);
    }
  };

  useEffect(() => {
    loadData();
  }, [salonId]);

  // Generate lists of next 7 selectable days
  const [availableDays, setAvailableDays] = useState<Array<{ dateStr: string; label: string; weekday: string }>>([]);
  useEffect(() => {
    const days = [];
    const weekdays = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
    const months = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    // Seed point: Let's use current local simulated time or standard date
    // Current date is May 21, 2026.
    const start = new Date(2026, 4, 21); // Month is 0-indexed, so 4 is May
    
    for (let i = 0; i < 7; i++) {
      const temp = new Date(start);
      temp.setDate(start.getDate() + i);
      
      const yyyy = temp.getFullYear();
      const mm = String(temp.getMonth() + 1).padStart(2, "0");
      const dd = String(temp.getDate()).padStart(2, "0");
      const dateStr = `${yyyy}-${mm}-${dd}`;
      
      days.push({
        dateStr,
        label: `${temp.getDate()} de ${months[temp.getMonth()]}`,
        weekday: weekdays[temp.getDay()]
      });
    }
    
    setAvailableDays(days);
    if (days.length > 0) {
      setSelectedDate(days[0].dateStr); // Default to today
    }
  }, []);

  // Generate selectable time slots based on opening hours
  const [timeSlots, setTimeSlots] = useState<string[]>([]);
  useEffect(() => {
    if (!establishment) return;
    const [startHour, startMin] = establishment.openTime.split(":").map(Number);
    const [endHour, endMin] = establishment.closeTime.split(":").map(Number);

    const generateSlots = [];
    let currentHour = startHour;
    let currentMin = startMin;

    while (currentHour < endHour || (currentHour === endHour && currentMin <= endMin)) {
      const hStr = String(currentHour).padStart(2, "0");
      const mStr = String(currentMin).padStart(2, "0");
      generateSlots.push(`${hStr}:${mStr}`);

      currentMin += 30; // 30-minute intervals
      if (currentMin >= 60) {
        currentMin = 0;
        currentHour += 1;
      }
    }
    setTimeSlots(generateSlots);
  }, [establishment]);

  // Handle appointment submission
  const handleConfirmBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedService || !selectedProfessional || !selectedDate || !selectedTime || !customerName.trim() || !customerPhone.trim()) {
      setErrorMessage("Por favor, preencha todos os campos do agendamento.");
      return;
    }
    setErrorMessage("");
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName,
          customerPhone,
          professionalId: selectedProfessional.id,
          serviceId: selectedService.id,
          date: selectedDate,
          time: selectedTime
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Ocorreu um erro ao salvar o agendamento.");
      }

      // Success
      setBookingSuccess(data.appointment);
      
      // Simulate receiving immediate WhatsApp notification toast
      if (data.notification) {
        setNotificationToast({
          recipient: data.notification.recipient,
          phone: data.notification.recipientPhone,
          message: data.notification.message
        });

        // Auto fade toast after 10 seconds
        setTimeout(() => {
          setNotificationToast(null);
        }, 10000);
      }

      // Refresh appointments to avoid overlapping booking in local state
      loadData();
    } catch (err: any) {
      setErrorMessage(err.message || "Erro de conexão com o servidor.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Check if a specific time slot is collision booked
  const isSlotBooked = (timeStr: string) => {
    if (!selectedProfessional) return false;
    return appointments.some(
      apt => apt.professionalId === selectedProfessional.id &&
             apt.date === selectedDate &&
             apt.time === timeStr &&
             apt.status === "agendado"
    );
  };

  const handleResetForm = () => {
    setSelectedService(null);
    setSelectedProfessional(null);
    setSelectedTime("");
    setCustomerName("");
    setCustomerPhone("");
    setBookingSuccess(null);
    setIsClubSubscriber(false);
    setMatchedSubscriber(null);
    setSubscriberPhoneMatch("");
  };

  // Check if phone matches any active monthly club subscription
  const handleCheckClubSubscription = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "");
    if (!cleanPhone) {
      setMatchedSubscriber(null);
      return;
    }
    const match = subscribers.find(s => {
      const dbPhone = s.customerPhone.replace(/\D/g, "");
      // Support flexible matching: check if they correspond (e.g. 11911112222 matches 5511911112222)
      return (dbPhone === cleanPhone || dbPhone.endsWith(cleanPhone) || cleanPhone.endsWith(dbPhone)) && s.status === 'ativo';
    });
    if (match) {
      setMatchedSubscriber(match);
      // Auto populate user data
      setCustomerName(match.customerName);
      setCustomerPhone(match.customerPhone);
    } else {
      setMatchedSubscriber(null);
    }
  };

  // Join a subscription plan
  const handleJoinClub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joiningPlan || !joinName.trim() || !joinPhone.trim()) {
      alert("Por favor, preencha todos os campos para ingressar no clube.");
      return;
    }

    try {
      const response = await fetch("/api/subscribers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerName: joinName,
          customerPhone: joinPhone,
          planId: joiningPlan.id
        })
      });

      if (!response.ok) {
        throw new Error("Erro ao criar assinatura do clube.");
      }

      const subscriberData = await response.json();
      setSubscriptionSuccess(subscriberData);
      setJoinName("");
      setJoinPhone("");
      loadData();
    } catch (err: any) {
      alert(err.message || "Não foi possível assinar o plano no momento.");
    }
  };

  // Helper formatting for currency
  const formatPrice = (p: number) => {
    return p.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  };

  const isLight = establishment?.theme === "light";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-emerald-500/30 relative">
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
          /* Theme Claro Client Page overrides */
          body, .flex-col {
            background-color: var(--bg-main) !important;
            color: var(--text-secondary) !important;
          }
          header {
            background-color: var(--bg-card) !important;
            border-color: var(--border-color) !important;
          }
          .bg-slate-900 { background-color: var(--bg-card) !important; }
          .bg-slate-950 { background-color: var(--bg-main) !important; }
          .bg-slate-900\\/40 { background-color: var(--bg-subcard) !important; }
          .bg-gradient-to-br {
            background-image: none !important;
            background-color: var(--bg-card) !important;
          }
          .bg-slate-900\\/80 { background-color: var(--bg-card) !important; }
          .border-slate-800 { border-color: var(--border-color) !important; }
          .border-slate-800\\/80 { border-color: var(--border-color) !important; }
          .border-slate-900 { border-color: var(--border-color) !important; }
          .border-slate-950 { border-color: var(--border-color) !important; }
          .text-slate-50 { color: var(--text-primary) !important; }
          .text-slate-100 { color: var(--text-primary) !important; }
          .text-slate-200 { color: var(--text-secondary) !important; }
          .text-slate-300 { color: var(--text-secondary) !important; }
          .text-slate-400 { color: var(--text-muted) !important; }
          .text-slate-500 { color: var(--text-muted) !important; }
          .hover\\:bg-slate-800\\/40:hover { background-color: var(--bg-subcard) !important; }
          .hover\\:bg-slate-950:hover { background-color: var(--bg-main) !important; }
          .hover\\:bg-slate-900:hover { background-color: var(--bg-card) !important; }
          .hover\\:border-slate-700:hover { border-color: #CBD5E1 !important; }
          
          /* Step indicators */
          .bg-emerald-500\\/10 {
            background-color: #DEF7EC !important;
          }
          
          /* Inputs for clients */
          input, select, textarea {
            color: #0F172A !important;
            background-color: #FFFFFF !important;
            border-color: #CBD5E1 !important;
          }
          input::placeholder {
            color: #94A3B8 !important;
          }
          
          /* Success visual wrapper */
          .bg-emerald-500\\/20 {
            background-color: #DEF7EC !important;
          }
        ` }} />
      )}
      
      {/* Dynamic Simulated WhatsApp Alert Floating Toast */}
      <AnimatePresence>
        {notificationToast && (
          <motion.div 
            initial={{ opacity: 0, y: -40, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-4 left-4 right-4 md:left-auto md:right-4 z-50 max-w-md bg-slate-900 border-2 border-emerald-500 rounded-2xl shadow-2xl overflow-hidden shadow-emerald-950/20"
          >
            <div className="bg-gradient-to-r from-emerald-600 to-teal-700 px-4 py-2.5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="inline-flex h-2.5 w-2.5 animate-pulse rounded-full bg-slate-100" />
                <span className="text-xs font-mono font-bold text-slate-50 uppercase tracking-widest">
                  Notificação Integrada - WhatsApp API
                </span>
              </div>
              <button 
                onClick={() => setNotificationToast(null)}
                className="text-slate-200 hover:text-white text-xs font-semibold px-2 hover:bg-white/10 rounded transition-colors"
              >
                Fechar
              </button>
            </div>
            <div className="p-4 flex gap-3">
              <div className="rounded-full bg-emerald-500/10 p-2 h-fit text-emerald-400">
                <Scissors className="h-5 w-5" />
              </div>
              <div className="flex-1 space-y-1">
                <p className="text-xs font-bold text-slate-300">
                  Para: <span className="text-emerald-400 font-mono">{notificationToast.recipient}</span> ({notificationToast.phone})
                </p>
                <p className="text-xs text-slate-400 leading-relaxed font-mono bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                  "{notificationToast.message}"
                </p>
                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 pt-1 font-mono">
                  <span className="text-emerald-500">✔ Sent successfully</span>
                  <span>via Evolution API Webhook</span>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
 
       {/* Header */}
       <header className="border-b border-slate-900 bg-slate-900/40 backdrop-blur-md sticky top-0 z-40">
         <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
           <div className="flex items-center gap-2.5">
             <div className="h-9 w-9 bg-emerald-500 rounded-xl flex items-center justify-center text-slate-950 shadow-lg shadow-emerald-500/20 overflow-hidden shrink-0">
               {establishment?.logoUrl ? (
                 <img src={establishment.logoUrl} alt="Logo" className="h-full w-full object-cover" />
               ) : (
                 <Scissors className="h-5 w-5 -rotate-45" />
               )}
             </div>
             <div>
               <h1 className="font-bold text-base text-slate-100 leading-tight">
                 {establishment ? establishment.name : "Carregando Salão..."}
               </h1>
               <p className="text-[10px] text-emerald-400 font-mono uppercase tracking-wider">
                 Agendamento Online PWA
               </p>
             </div>
           </div>
          
          <button
            onClick={onNavigateToAdmin}
            className="flex items-center gap-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 px-3 py-1.5 text-xs font-medium text-slate-300 transition-colors cursor-pointer font-mono"
          >
            <span>Painel Administrativo</span>
            <ChevronRight className="h-3 w-3" />
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-grow max-w-4xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Navigation Tabs for Client View */}
        <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-xl w-full sm:max-w-md mx-auto">
          <button
            onClick={() => setActiveMainView('booking')}
            className={`flex-1 py-2 px-4 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 ${
              activeMainView === 'booking'
                ? "bg-gradient-to-r from-emerald-550 to-teal-600 text-slate-100 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            style={activeMainView === 'booking' ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#ffffff' } : {}}
          >
            <Calendar className="h-3.5 w-3.5" />
            Agendar Horário
          </button>
          <button
            onClick={() => {
              setActiveMainView('club');
              setSubscriptionSuccess(null);
              setJoiningPlan(null);
            }}
            className={`flex-1 py-1 px-4 rounded-lg text-xs font-bold transition-all uppercase tracking-wider cursor-pointer flex items-center justify-center gap-2 ${
              activeMainView === 'club'
                ? "bg-gradient-to-r from-emerald-550 to-teal-600 text-slate-100 shadow"
                : "text-slate-400 hover:text-slate-200"
            }`}
            style={activeMainView === 'club' ? { background: 'linear-gradient(135deg, #10b981, #0d9488)', color: '#ffffff' } : {}}
          >
            <TrendingUp className="h-3.5 w-3.5" />
            Planos de Assinatura
          </button>
        </div>

        {activeMainView === 'club' ? (
          /* CLUB AND MEMBERSHIPS PAGE VIEW */
          <div className="space-y-8 animate-fade-in">
            {/* Header / Intro Club banner */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6 text-center space-y-3">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-mono font-medium text-emerald-400">
                <Sparkles className="h-3.5 w-3.5" />
                Diga adeus ao pagamento avulso!
              </span>
              <h2 className="text-xl font-bold text-slate-50 tracking-tight">Clube de Assinaturas {establishment?.name || "Premium"}</h2>
              <p className="text-xs text-slate-400 max-w-xl mx-auto leading-relaxed">
                Escolha o plano mensal que melhor se adapta às suas necessidades e cuide do seu estilo com visitas recorrentes programadas. Pague uma vez por mês e agende sem atritos!
              </p>
            </div>

            {subscriptionSuccess ? (
              /* SUBSCRIPTION ACTIVATED PANEL */
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="max-w-md mx-auto bg-slate-900 border-2 border-emerald-500 rounded-2xl p-6 text-center space-y-5 shadow-xl"
              >
                <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
                  <CheckCircle2 className="h-8 w-8" />
                </div>
                <div className="space-y-2">
                  <span className="bg-emerald-550/20 text-emerald-400 text-[9px] px-2.5 py-0.5 rounded-full font-mono font-bold uppercase tracking-wider">Membro Ativo do Clube</span>
                  <h3 className="text-lg font-bold text-slate-100">Assinatura Ativada com Sucesso!</h3>
                  <p className="text-xs text-slate-400 leading-relaxed font-sans">
                    Parabéns, <strong className="text-slate-200">{subscriptionSuccess.customerName}</strong>! Sua assinatura do Plano mensal <strong className="text-slate-250">"{plans.find(p => p.id === subscriptionSuccess.planId)?.name}"</strong> está ativa!
                  </p>
                </div>

                <div className="bg-slate-950 p-4 rounded-xl border border-slate-855 space-y-3 font-mono text-xs text-left" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                  <h4 className="text-[10px] font-bold text-slate-500 uppercase pb-1.5 border-b border-slate-900">Como Agendar Agora:</h4>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    1. Troque para a aba <strong className="text-emerald-400">"Agendar Horário"</strong> no topo.<br/>
                    2. No Passo 4 de dados, clique em <strong className="text-emerald-400">"Tenho Plano Mensal (Clube)"</strong>.<br/>
                    3. Insira seu WhatsApp cadastrado <strong className="text-slate-200">({subscriptionSuccess.customerPhone})</strong> e agende sem limites de cobrança avulsa!
                  </p>
                </div>

                <button
                  onClick={() => {
                    setSubscriptionSuccess(null);
                    setJoiningPlan(null);
                    setActiveMainView('booking');
                    setIsClubSubscriber(true);
                    setSubscriberPhoneMatch(subscriptionSuccess.customerPhone);
                    handleCheckClubSubscription(subscriptionSuccess.customerPhone);
                  }}
                  className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black font-bold rounded-xl text-xs uppercase font-mono tracking-wider transition-all cursor-pointer"
                >
                  Agendar Meu Primeiro Horário do Clube →
                </button>
              </motion.div>
            ) : joiningPlan ? (
              /* JOIN PLAN FORM FORM */
              <div className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
                <div className="bg-slate-855 p-4 border-b border-slate-800 flex items-center justify-between" style={{ backgroundColor: '#1e293b' }}>
                  <div className="flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-emerald-400" />
                    <span className="text-xs font-bold font-mono tracking-wider text-slate-200 font-bold">Assinar {joiningPlan.name}</span>
                  </div>
                  <button
                    onClick={() => setJoiningPlan(null)}
                    className="text-xs text-slate-400 hover:text-slate-200 font-mono"
                  >
                    Voltar
                  </button>
                </div>

                <form onSubmit={handleJoinClub} className="p-6 space-y-4 text-xs font-mono">
                  <div className="bg-slate-950 p-4 rounded-xl border border-slate-855 space-y-2" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                    <span className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{joiningPlan.limitCount === 999 ? "Uso Permanente Ilimitado" : `${joiningPlan.limitCount} cortes mensais incluídos`}</span>
                    <h4 className="text-slate-200 font-bold text-sm leading-tight">{joiningPlan.name}</h4>
                    <p className="text-[11px] text-slate-500 leading-normal">{joiningPlan.description}</p>
                    <div className="text-slate-100 font-bold text-base pt-1 font-mono">{formatPrice(joiningPlan.price)} <span className="text-xs font-normal text-slate-500 font-sans">por mês</span></div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] font-bold block uppercase">Seu Nome Completo</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Carlos Oliveira"
                      value={joinName}
                      onChange={(e) => setJoinName(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-100 p-2 text-sm text-slate-900 outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-slate-400 text-[10px] font-bold block uppercase">Seu WhatsApp (p/ validação e lembretes)</label>
                    <input
                      type="tel"
                      required
                      placeholder="Ex: 11999998888"
                      value={joinPhone}
                      onChange={(e) => setJoinPhone(e.target.value)}
                      className="w-full rounded-xl border border-slate-800 bg-slate-100 p-2 text-sm text-slate-900 outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full py-2.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-emerald-500 font-bold text-black rounded-xl text-xs uppercase tracking-wider transition-all focus:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    Confirmar Assinatura & Gerar Simulação Cobrança
                  </button>

                  <p className="text-[10px] text-slate-500 font-sans text-center">
                    *Cobrança recorrente simulada. O aplicativo cria sua conta de clube e habilita seu agendamento no mesmo instante!
                  </p>
                </form>
              </div>
            ) : (
              /* LIST PLANS AVAILABLE BOX */
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {plans.map(plan => (
                  <div key={plan.id} className="bg-slate-900/60 rounded-2xl border border-slate-800 p-6 flex flex-col justify-between hover:border-slate-700 transition-all shadow-lg hover:shadow-emerald-900/5 group">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="bg-emerald-500/10 text-emerald-400 text-[10px] px-2.5 py-1 rounded font-mono font-bold uppercase tracking-wider">
                          {plan.limitCount === 999 ? "Uso Sem Limites" : `${plan.limitCount} Atendimentos/Mês`}
                        </span>
                        <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
                      </div>
                      
                      <h3 className="font-bold text-slate-100 text-lg">{plan.name}</h3>
                      <p className="text-xs text-slate-400 font-sans leading-relaxed min-h-[38px]">
                        {plan.description || "Tenha um especialista cuidando do seu visual com preço fixo mensal."}
                      </p>

                      <div className="space-y-1.5 pt-2">
                        <span className="text-[10px] font-mono text-slate-500 font-semibold uppercase tracking-wide block">Serviços Elegíveis:</span>
                        <div className="flex flex-wrap gap-1.5 pt-0.5">
                          {plan.servicesIncluded.map(srvId => {
                            const svc = services.find(s => s.id === srvId);
                            return (
                              <span key={srvId} className="bg-slate-950 text-slate-300 font-sans px-2.5 py-0.5 rounded text-[11px] border border-slate-850">
                                {svc ? svc.name : srvId}
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    </div>

                    <div className="mt-6 pt-5 border-t border-slate-900 flex items-center justify-between">
                      <div>
                        <span className="block text-[9px] text-slate-500 font-mono uppercase">Preço Mensal</span>
                        <span className="text-emerald-400 font-mono font-bold text-lg">{formatPrice(plan.price)}<span className="text-[10px] text-slate-500 font-normal">/mês</span></span>
                      </div>
                      
                      <button
                        onClick={() => {
                          setJoiningPlan(plan);
                          setJoinName("");
                          setJoinPhone("");
                        }}
                        className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-black text-xs font-bold rounded-xl transition-all font-mono uppercase tracking-wide shrink-0 cursor-pointer hover:shadow-md hover:shadow-emerald-500/10"
                      >
                        Aderir ao Clube
                      </button>
                    </div>
                  </div>
                ))}

                {plans.length === 0 && (
                  <div className="col-span-2 text-center p-12 bg-slate-900 rounded-2xl border border-slate-800 text-slate-500 italic font-mono text-xs font-semibold">
                    Nenhum plano mensal cadastrado pelo salão no momento.
                  </div>
                )}
              </div>
            )}
          </div>
        ) : (
          /* STANDARD BOOKING GRID STEP SELECTION */
          !bookingSuccess ? (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
              
              {/* Step Selection Areas */}
              <div className="lg:col-span-8 space-y-6">
                
                {/* Introduction Card */}
                <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-2xl border border-slate-800 p-6">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-1 text-[11px] font-mono font-medium text-emerald-400 mb-3">
                  <Sparkles className="h-3 w-3" />
                  Agendamento Rápido em 4 Passos
                </span>
                <h2 className="text-xl font-bold text-slate-50 tracking-tight">Sinta-se no seu melhor estilo!</h2>
                <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                  Escolha os serviços desejados, o profissional de sua preferência e agende instantaneamente. Seu lembrete de confirmação será disparado diretamente para o seu WhatsApp cadastrado.
                </p>
                {establishment && (
                  <div className="mt-4 pt-4 border-t border-slate-900 grid grid-cols-2 gap-4 text-xs font-mono text-slate-500">
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400">ENDEREÇO</span>
                      <span className="text-slate-300">{establishment.address}</span>
                    </div>
                    <div>
                      <span className="block text-[10px] font-semibold text-slate-400">FUNCIONAMENTO</span>
                      <span className="text-slate-300">{establishment.openTime} até {establishment.closeTime}</span>
                    </div>
                  </div>
                )}
              </div>

              {/* STEP 1: SELECT SERVICE */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-950">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400 font-mono">1</span>
                  <h3 className="font-semibold text-slate-200">Selecione o Serviço</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {services.map((srv) => (
                    <div
                      key={srv.id}
                      onClick={() => {
                        setSelectedService(srv);
                        setSelectedTime(""); // Reset timing when service changes
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all relative overflow-hidden flex flex-col justify-between ${
                        selectedService?.id === srv.id
                          ? "ring-2 ring-emerald-500 bg-slate-950/50 border-emerald-500/60 shadow-lg shadow-emerald-550/5"
                          : "bg-slate-950/20 border-slate-800/60 hover:bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="space-y-1">
                        <p className="text-xs font-mono text-emerald-400 font-medium">SERVIÇO</p>
                        <h4 className="font-semibold text-slate-200 text-sm leading-snug">{srv.name}</h4>
                      </div>
                      <div className="mt-4 flex items-center justify-between pt-2 border-t border-slate-900/60 text-xs text-slate-400">
                        <span className="flex items-center gap-1 font-mono">
                          <Clock className="h-3 w-3 text-emerald-500" /> {srv.durationMin} min
                        </span>
                        <span className="font-bold text-slate-100 font-mono">
                          {formatPrice(srv.price)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {services.length === 0 && (
                    <div className="col-span-2 text-center py-6 text-xs text-slate-500">
                      Nenhum serviço cadastrado no momento.
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 2: SELECT PROFESSIONAL */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-6 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-950">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400 font-mono">2</span>
                  <h3 className="font-semibold text-slate-200">Escolha o Profissional</h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {professionals.map((prof) => (
                    <div
                      key={prof.id}
                      onClick={() => {
                        setSelectedProfessional(prof);
                        setSelectedTime(""); // Reset timing when professional changes
                      }}
                      className={`cursor-pointer rounded-xl border p-4 transition-all flex flex-col items-center text-center justify-center space-y-3 ${
                        selectedProfessional?.id === prof.id
                          ? "ring-2 ring-emerald-500 bg-slate-950/50 border-emerald-500/60 shadow-lg"
                          : "bg-slate-950/20 border-slate-800/60 hover:bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="h-10 w-10 rounded-full bg-slate-800/80 border border-slate-700/60 flex items-center justify-center text-emerald-400 font-bold font-mono">
                        {prof.name.split(" ").map(n => n[0]).join("").substring(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1">
                        <h4 className="font-medium text-xs text-slate-100">{prof.name}</h4>
                        <p className="text-[10px] text-slate-400 leading-snug">{prof.role}</p>
                      </div>
                    </div>
                  ))}
                  {professionals.length === 0 && (
                    <div className="col-span-3 text-center py-6 text-xs text-slate-500">
                      Nenhum profissional disponível.
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 3: DATE & TIME */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-6 space-y-5">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-950">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400 font-mono">3</span>
                  <h3 className="font-semibold text-slate-200">Escolha o Dia e Horário</h3>
                </div>

                {/* Day selector carousel */}
                <div className="space-y-2">
                  <label className="text-xs font-medium text-slate-400 font-mono block">DIAS DISPONÍVEIS</label>
                  <div className="flex gap-2.5 overflow-x-auto pb-2 scrollbar-none">
                    {availableDays.map((day) => (
                      <button
                        key={day.dateStr}
                        onClick={() => {
                          setSelectedDate(day.dateStr);
                          setSelectedTime(""); // reset time
                        }}
                        className={`flex-shrink-0 flex flex-col items-center justify-center rounded-xl px-4 py-2.5 border transition-all text-center min-w-[76px] cursor-pointer ${
                          selectedDate === day.dateStr
                            ? "border-emerald-500 bg-emerald-500 text-slate-950 font-bold active:scale-95"
                            : "bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700"
                        }`}
                      >
                        <span className="text-[10px] uppercase font-semibold font-mono">{day.weekday}</span>
                        <span className="text-xs font-mono mt-0.5">{day.label.split(" ")[0]}</span>
                        <span className="text-[9px] opacity-75">{day.label.split(" ").slice(1).join(" ")}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Grid of Hours */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-medium text-slate-400 font-mono block">HORÁRIOS DA AGENDA</label>
                    <span className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <Clock className="w-2.5 h-2.5" /> Intervalos de 30 minutos
                    </span>
                  </div>

                  {!selectedProfessional ? (
                    <div className="rounded-xl bg-slate-950 p-4 border border-slate-850/60 text-center text-xs text-slate-400">
                      Por favor, escolha o profissional no Passo 2 para carregar os horários.
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 sm:grid-cols-6 gap-2">
                      {timeSlots.map((time) => {
                        const booked = isSlotBooked(time);

                        return (
                          <button
                            key={time}
                            disabled={booked}
                            onClick={() => {
                              setSelectedTime(time);
                            }}
                            className={`rounded-lg py-2 text-center text-xs font-mono transition-all border ${
                              booked 
                                ? "bg-slate-950 text-slate-600 border-slate-950 line-through cursor-not-allowed"
                                : selectedTime === time
                                  ? "bg-slate-100 border-slate-100 text-slate-950 font-bold"
                                  : "bg-slate-950/50 border-slate-800/80 text-slate-200 hover:border-slate-700 hover:text-white"
                            }`}
                          >
                            {time}
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              {/* STEP 4: CUSTOMER FORM */}
              <div className="bg-slate-900 rounded-2xl border border-slate-800/80 p-6 space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-950">
                  <div className="flex items-center gap-2">
                    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400 font-mono">4</span>
                    <h3 className="font-semibold text-slate-200">Preencha seus Dados / Clube</h3>
                  </div>
                  
                  {/* Subscriber Toggle Link */}
                  <button
                    type="button"
                    onClick={() => {
                      const mode = !isClubSubscriber;
                      setIsClubSubscriber(mode);
                      if (!mode) {
                        setMatchedSubscriber(null);
                        setCustomerName("");
                        setCustomerPhone("");
                      }
                    }}
                    className={`text-[10px] uppercase font-mono font-bold tracking-wider px-2 py-1 rounded border cursor-pointer transition-all ${
                      isClubSubscriber 
                        ? "bg-emerald-505/10 text-emerald-400 border-emerald-500/30" 
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:text-slate-250"
                    }`}
                  >
                    {isClubSubscriber ? "✕ Usar Reserva Comum" : "⚡ Tenho Plano Mensal (Clube)"}
                  </button>
                </div>

                {isClubSubscriber ? (
                  <div className="space-y-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800">
                    <p className="text-xs text-slate-400 font-mono">
                      Digite o seu WhastApp cadastrado do clube para validar os seus dados e o limite de usos:
                    </p>
                    <div className="flex gap-2">
                      <input
                        type="tel"
                        placeholder="Ex: 11911112222"
                        value={subscriberPhoneMatch}
                        onChange={(e) => {
                          setSubscriberPhoneMatch(e.target.value);
                          handleCheckClubSubscription(e.target.value);
                        }}
                        className="flex-grow rounded-xl border border-slate-800 bg-slate-950 px-4 py-2.5 text-xs text-slate-100 outline-none focus:border-emerald-500/60"
                      />
                      <button
                        type="button"
                        onClick={() => handleCheckClubSubscription(subscriberPhoneMatch)}
                        className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-xs font-bold rounded-xl text-slate-200 transition-colors cursor-pointer uppercase"
                      >
                        Validar
                      </button>
                    </div>

                    {matchedSubscriber ? (
                      <div className="bg-emerald-500/10 p-3 rounded-lg border border-emerald-500/20 text-xs text-emerald-400 flex items-center gap-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-400" />
                        <div>
                          <span className="font-bold block uppercase tracking-wider text-[10px]">ASSINATURA ATIVA DETECTADA!</span>
                          <span className="text-slate-350">
                            Olá <strong className="text-slate-100">{matchedSubscriber.customerName}</strong>! Plano: <strong className="text-slate-100">
                              {plans.find(p => p.id === matchedSubscriber.planId)?.name || "Clube"}
                            </strong>. Agendamento debitado do saldo mensal do seu clube.
                          </span>
                        </div>
                      </div>
                    ) : subscriberPhoneMatch.length > 5 ? (
                      <p className="text-[10px] text-red-400 font-mono">
                        Nenhum assinante do clube VIP correspondente encontrado para este número. Digite outro ou use o modo comum!
                      </p>
                    ) : null}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-400">NOME COMPLETO</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: João Silva"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60 transition-colors"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-xs font-mono text-slate-400">WHATSAPP (COM DDD)</label>
                      <input
                        type="tel"
                        required
                        placeholder="Ex: 11999999999"
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        className="w-full rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm text-slate-100 outline-none focus:border-emerald-500/60 transition-colors"
                      />
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Sticky Order Review Sidebar */}
            <div className="lg:col-span-4 lg:sticky lg:top-24 space-y-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden shadow-lg shadow-slate-950/80">
                <div className="bg-slate-850 p-4 border-b border-slate-900">
                  <h3 className="font-semibold text-slate-200 text-xs tracking-wider uppercase font-mono flex items-center gap-1.5">
                    <Smile className="h-4 w-4 text-emerald-400" /> Resumo do Agendamento
                  </h3>
                </div>

                <div className="p-5 space-y-4">
                  {/* Service Detail */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-500 font-mono">SERVIÇO ESCOLHIDO</span>
                    {selectedService ? (
                      <div className="flex justify-between items-center bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <p className="text-xs font-medium text-slate-200">{selectedService.name}</p>
                          <p className="text-[10px] text-slate-400">{selectedService.durationMin} min</p>
                        </div>
                        <span className="text-xs font-bold text-slate-200">{formatPrice(selectedService.price)}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Nenhum selecionado ainda...</span>
                    )}
                  </div>

                  {/* Specialist Detail */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-500 font-mono">ESPECIALISTA</span>
                    {selectedProfessional ? (
                      <div className="flex items-center gap-2 bg-slate-950 p-2.5 rounded-lg border border-slate-800">
                        <div className="h-6 w-6 rounded-full bg-slate-800 text-[10px] text-emerald-400 font-bold flex items-center justify-center">
                          {selectedProfessional.name[0]}
                        </div>
                        <span className="text-xs text-slate-200">{selectedProfessional.name}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Nenhum selecionado ainda...</span>
                    )}
                  </div>

                  {/* Scheduled Slot */}
                  <div className="space-y-1">
                    <span className="block text-[10px] font-semibold text-slate-500 font-mono">DATA & INÍCIO</span>
                    {selectedDate && selectedTime ? (
                      <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 text-xs text-slate-200 flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-emerald-400" />
                        <span>
                          {selectedDate.split("-").reverse().join("/")} às <strong>{selectedTime}</strong>
                        </span>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-500 italic">Aguardando dia e horário...</span>
                    )}
                  </div>

                  {/* Total Bar */}
                  {selectedService && (
                    <div className="pt-3 border-t border-slate-850/60 flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-400 uppercase">Total Estimado</span>
                      <span className="text-base font-bold text-emerald-400 font-mono">{formatPrice(selectedService.price)}</span>
                    </div>
                  )}

                  {/* Error Box */}
                  {errorMessage && (
                    <div className="rounded-xl bg-red-500/10 border border-red-500/20 p-3 flex items-start gap-2 text-xs text-red-300">
                      <AlertCircle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                      <span>{errorMessage}</span>
                    </div>
                  )}

                  {/* Submit Trigger */}
                  <button
                    onClick={handleConfirmBooking}
                    disabled={isSubmitting || !selectedService || !selectedProfessional || !selectedDate || !selectedTime || !customerName.trim() || !customerPhone.trim()}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs font-mono uppercase tracking-wider transition-all hover:scale-[1.01] active:scale-[0.99] disabled:opacity-50 disabled:pointer-events-none disabled:scale-100 cursor-pointer"
                  >
                    {isSubmitting ? (
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950 border-t-transparent" />
                    ) : (
                      <span>Confirmar Agendamento</span>
                    )}
                  </button>

                  <p className="text-[10px] text-slate-400 text-center leading-normal">
                    Ao confirmar, enviaremos automaticamente um alerta de confirmação no WhatsApp cadastrado.
                  </p>
                </div>
              </div>

              {/* Back to admin promo box */}
               <div className="rounded-xl border border-slate-850 bg-slate-900/40 p-4 text-center space-y-2">
                  <p className="text-[11px] text-slate-400 font-mono">Quer configurar ou ver a agenda do salão?</p>
                  <button 
                    onClick={onNavigateToAdmin}
                    className="text-xs font-bold text-emerald-400 hover:text-emerald-300 underline font-mono cursor-pointer"
                  >
                    Voltar ao Painel Administrativo →
                  </button>
               </div>
            </div>

          </div>
        ) : (
          /* SUCCESS SCREEN STATE */
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="max-w-md mx-auto bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 text-center"
          >
            <div className="mx-auto h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400">
              <CheckCircle2 className="h-8 w-8" />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-bold text-slate-50">Agendamento Solicitado!</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Parabéns, {customerName}! Sua reserva foi salva com sucesso na agenda da <span className="text-slate-300 font-medium">{establishment?.name}</span>.
              </p>
            </div>

            {/* Booked detail voucher card */}
            <div className="bg-slate-950 rounded-xl p-4 border border-slate-850 space-y-3 text-left">
              <div className="flex justify-between items-center text-xs text-slate-400 font-mono pb-2 border-b border-slate-900">
                <span>VOUCHER DIGITAL</span>
                <span className="font-semibold text-emerald-400">#{bookingSuccess.id.substring(4, 9).toUpperCase()}</span>
              </div>
              
              <div className="space-y-2.5 text-xs text-slate-300">
                <div>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">PROFISSIONAL</span>
                  <span>{selectedProfessional?.name}</span>
                </div>
                <div>
                  <span className="block text-[9px] font-mono text-slate-500 uppercase">SERVIÇO</span>
                  <span>{selectedService?.name} — {selectedService && formatPrice(selectedService.price)}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <span className="block text-[9px] font-mono text-slate-500 uppercase">DATA</span>
                    <span>{selectedDate.split('-').reverse().join('/')}</span>
                  </div>
                  <div>
                    <span className="block text-[9px] font-mono text-slate-500 uppercase">HORÁRIO</span>
                    <span>{selectedTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Instant notification simulation report */}
            <div className="bg-slate-950/40 rounded-xl p-3.5 border border-slate-850/60 text-xs text-slate-400 flex gap-2 text-left">
              <MessageSquareCode className="h-[18px] w-[18px] text-emerald-400 flex-shrink-0 mt-0.5" />
              <p className="leading-snug">
                <strong>Simulação Ativa:</strong> Verifique o topo da página para ver o alerta do WhatsApp disparado instantaneamente pelo nosso servidor via webhook!
              </p>
            </div>

            <div className="pt-2 flex flex-col gap-2">
              <button
                onClick={handleResetForm}
                className="w-full py-2.5 rounded-lg border border-slate-700 hover:bg-slate-800 text-xs font-semibold text-slate-200 transition-all font-mono"
              >
                Fazer Outro Agendamento
              </button>
              <button
                onClick={onNavigateToAdmin}
                className="w-full py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold font-mono"
              >
                Ir para o Painel Administrativo
              </button>
            </div>
          </motion.div>
        ))}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900/60 bg-slate-950 py-6 text-center text-[10px] text-slate-500 font-mono">
        <div className="max-w-4xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <span>© 2026 {establishment ? establishment.name : "Barbearia Imperial"} • Todos os direitos reservados.</span>
          <div className="flex gap-4">
            <span className="text-emerald-400 animate-pulse">● Whatsapp API Online</span>
            <span>Estilo & Tradição</span>
          </div>
        </div>
      </footer>

    </div>
  );
}
