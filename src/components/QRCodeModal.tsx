import { useState, useEffect } from "react";
import { QrCode, Copy, Check, ExternalLink, X, Laptop } from "lucide-react";

interface QRCodeModalProps {
  isOpen: boolean;
  onClose: () => void;
  salonName: string;
  salonId: string;
  onOpenClientView: () => void;
}

export default function QRCodeModal({ isOpen, onClose, salonName, salonId, onOpenClientView }: QRCodeModalProps) {
  const [copied, setCopied] = useState(false);
  const [bookingUrl, setBookingUrl] = useState("");

  useEffect(() => {
    // Generate simulated customer booking link with white-label compatibility
    const base = window.location.origin;
    const hostname = window.location.hostname.toLowerCase();
    
    if (hostname.includes("autodireto.online")) {
      // In production, use the real tenant subdomain
      setBookingUrl(`https://${salonId}.autodireto.online`);
    } else {
      setBookingUrl(`${base}?tenant=${salonId}&view=client`);
    }
  }, [salonId]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(bookingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4">
      <div 
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-800 bg-[#14161B] p-6 shadow-2xl transition-all"
        id="qr-code-modal-card"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="h-5 w-5 text-amber-500" />
            <h3 className="font-semibold text-slate-100">QR Code de Agendamento</h3>
          </div>
          <button 
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-slate-200 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Info */}
        <p className="text-sm text-slate-300 mb-6">
          Imprima e cole este QR Code no espelho ou balcão do seu estabelecimento. Os clientes só precisam escanear com a câmera do celular para abrir a página de agendamentos.
        </p>

        {/* QR Code Container styled elegantly */}
        <div className="flex flex-col items-center justify-center bg-[#0A0B0D] p-6 rounded-xl border border-slate-800 mb-6 relative group">
          <div className="bg-white p-4 rounded-lg shadow-md mb-4 flex items-center justify-center">
            {/* Generate QR Core using qrserver API based on current bookingUrl */}
            <img 
              src={`https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(bookingUrl)}`} 
              alt="QR Code de Agendamento"
              className="w-[180px] h-[180px]"
              referrerPolicy="no-referrer"
            />
          </div>
          <span className="text-xs font-mono text-amber-500 font-semibold tracking-wider uppercase mb-1">
            Status: Ativo
          </span>
          <span className="text-[11px] text-slate-500 text-center font-mono">
            {salonName.toUpperCase()} • ID: {salonId}
          </span>
        </div>

        {/* Link Input and Copy */}
        <div className="space-y-3">
          <label className="text-xs font-medium text-slate-400 font-mono block">LINK EXCLUSIVO DO CLIENTE</label>
          <div className="flex gap-2">
            <input 
              type="text" 
              readOnly 
              value={bookingUrl}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-xs font-mono text-slate-350 outline-none"
            />
            <button
              onClick={handleCopy}
              className="flex items-center justify-center rounded-lg border border-slate-700 bg-slate-850 hover:bg-slate-800 px-3 text-slate-200 hover:text-slate-100 transition-colors"
              title="Copiar Link"
            >
              {copied ? <Check className="h-4 w-4 text-amber-500" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              onClick={() => {
                onClose();
                onOpenClientView();
              }}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 py-2.5 px-4 text-xs font-bold text-black hover:shadow-lg hover:shadow-amber-500/10 transition-all font-mono uppercase cursor-pointer"
            >
              <Laptop className="h-4 w-4" />
              ABRIR AGENDADOR DO CLIENTE (SIMULADOR PWA)
            </button>
            <a
              href={bookingUrl}
              target="_blank"
              rel="noreferrer"
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-850 hover:bg-slate-800 py-2 px-4 text-xs font-bold text-slate-200 hover:text-white transition-all font-mono uppercase cursor-pointer"
            >
              <ExternalLink className="h-4 w-4 text-amber-500" />
              ABRIR SITE DO CLIENTE EM OUTRA ABA
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
