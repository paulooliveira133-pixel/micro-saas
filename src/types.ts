export interface Service {
  id: string;
  name: string;
  durationMin: number;
  price: number;
}

export interface Professional {
  id: string;
  name: string;
  role: string;
  avatarUrl?: string;
  active: boolean;
}

export interface Appointment {
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
}

export interface MonthlyPlan {
  id: string;
  name: string;
  price: number;
  description: string;
  servicesIncluded: string[]; // service IDs
  limitCount: number; // limit per month, e.g. 2, 4, or 999 for unlimited
  active: boolean;
}

export interface Subscriber {
  id: string;
  customerName: string;
  customerPhone: string;
  planId: string;
  status: 'ativo' | 'suspenso' | 'cancelado';
  startDate: string;
}

export interface Establishment {
  id: string;
  name: string;
  phone: string;
  openTime: string; // HH:MM
  closeTime: string; // HH:MM
  address: string;
  whatsappApiKey?: string;
  webhookUrl?: string;
  logoUrl?: string;
  theme?: 'dark' | 'light';
  customDomain?: string;
}

export interface NotificationLog {
  id: string;
  appointmentId: string;
  recipient: string;
  recipientPhone: string;
  message: string;
  status: 'sent' | 'pending' | 'failed';
  timestamp: string;
  type: 'confirmation' | 'reminder';
}

export interface AIAnalysisResult {
  lastUpdated: string;
  churnReport: {
    atRiskCount: number;
    atRiskCustomers: Array<{
      name: string;
      phone: string;
      lastVisit: string;
      reason: string;
      retentionAction: string;
    }>;
    generalStatus: string;
  };
  slotOptimization: {
    recommendedFillerDeals: string[];
    suggestedQuietHoursPromo: string;
    forecastedBusyDays: string[];
  };
}
