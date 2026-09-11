import React, { useState } from 'react';
import { AlertCircle, Check, Phone, ArrowRight, X } from 'lucide-react';
import { COUNTRY_CODES, cleanPhoneForWhatsApp } from '../lib/countryCodes.ts';
import { useAuth } from '../context/AuthContext.tsx';

interface Props {
  onGoToSettings?: () => void;
}

export const PhoneOnboardingModal: React.FC<Props> = ({ onGoToSettings }) => {
  const { dbUser, updateUserPhone } = useAuth();
  const [selectedCountry, setSelectedCountry] = useState(dbUser?.countryCode || '+52');
  const [phone, setPhone] = useState(dbUser?.phoneNumber || '');
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // If user already dismissed it or has a valid phone number, do not render
  if (isDismissed) {
    return null;
  }

  if (dbUser?.phoneNumber && dbUser.phoneNumber.trim().length >= 8) {
    return null;
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone.trim()) return;
    setSaving(true);
    try {
      await updateUserPhone(phone.trim(), selectedCountry);
      setSavedSuccess(true);
      // Auto-close after 1.5 seconds so user sees the confirmation
      setTimeout(() => {
        setIsDismissed(true);
      }, 1500);
    } catch (err) {
      console.error('Failed to save phone:', err);
    } finally {
      setSaving(false);
    }
  };

  const handleGoToSettings = () => {
    setIsDismissed(true);
    if (onGoToSettings) {
      onGoToSettings();
    }
  };

  const handleClose = () => {
    setIsDismissed(true);
  };

  const previewPhone = cleanPhoneForWhatsApp(selectedCountry, phone);

  return (
    <div
      id="phone-onboarding-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4"
    >
      <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-200">
        {/* Close button in top right */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          title="Cerrar ventana"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex items-start gap-4 pr-6">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-amber-800">
            <Phone className="h-6 w-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-800 mb-1 border border-amber-200">
              <AlertCircle className="h-3.5 w-3.5" />
              Paso sugerido para recibir pedidos
            </div>
            <h2 className="text-xl font-bold tracking-tight text-neutral-900">
              Configura tu número de WhatsApp
            </h2>
            <p className="mt-1 text-sm text-neutral-600 leading-relaxed">
              Tus clientes harán clic en los botones de <strong>&quot;Comprar por WhatsApp&quot;</strong> de tu catálogo y te enviarán los pedidos directamente a esta línea.
            </p>
          </div>
        </div>

        {savedSuccess ? (
          <div className="mt-6 rounded-xl bg-emerald-50 p-5 text-center border border-emerald-200 animate-in fade-in">
            <div className="flex items-center justify-center text-emerald-600 mb-2">
              <Check className="h-7 w-7" />
            </div>
            <p className="font-semibold text-base text-emerald-900">¡Número configurado con éxito!</p>
            <p className="text-xs text-emerald-700 mt-1">Tus catálogos ahora están listos para recibir pedidos directos.</p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-4 inline-flex items-center justify-center rounded-xl bg-emerald-700 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-800 transition shadow-xs"
            >
              Continuar al catálogo
            </button>
          </div>
        ) : (
          <form onSubmit={handleSave} className="mt-6 space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1.5">
                Código de país y número de celular
              </label>
              <div className="flex rounded-xl border border-neutral-300 shadow-sm focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900 overflow-hidden bg-white">
                <select
                  id="country-code-select"
                  value={selectedCountry}
                  onChange={(e) => setSelectedCountry(e.target.value)}
                  className="bg-neutral-50 px-3 py-2.5 text-sm font-medium text-neutral-800 border-r border-neutral-300 outline-none hover:bg-neutral-100 cursor-pointer"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.country} value={c.code}>
                      {c.flag} {c.code} ({c.country})
                    </option>
                  ))}
                </select>
                <input
                  id="phone-number-input"
                  type="tel"
                  required
                  placeholder="Ej: 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm text-neutral-900 outline-none placeholder:text-neutral-400"
                />
              </div>
              {phone && (
                <p className="mt-1.5 text-xs text-neutral-500">
                  Formato WhatsApp internacional: <span className="font-mono font-medium text-neutral-800">+{previewPhone}</span>
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                id="btn-save-phone"
                type="submit"
                disabled={saving || !phone.trim()}
                className="flex-1 rounded-xl bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-50 transition cursor-pointer"
              >
                {saving ? 'Guardando...' : 'Guardar número de WhatsApp'}
              </button>
              {onGoToSettings && (
                <button
                  id="btn-goto-settings"
                  type="button"
                  onClick={handleGoToSettings}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 px-4 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-50 transition cursor-pointer"
                >
                  Ir a Ajustes completos
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
