import React, { useState } from 'react';
import { X, Store as StoreIcon, CheckCircle2, AlertCircle, Sparkles, Phone } from 'lucide-react';
import { useAuth } from '../context/AuthContext.tsx';
import { COUNTRY_CODES, isValidPhoneNumber } from '../lib/countryCodes.ts';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onStoreCreated: (newStore: any) => void;
}

export const CreateStoreModal: React.FC<Props> = ({ isOpen, onClose, onStoreCreated }) => {
  const { idToken, dbUser } = useAuth();
  const [name, setName] = useState('');
  const [subdomain, setSubdomain] = useState('');
  const [phone, setPhone] = useState(dbUser?.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(dbUser?.countryCode || '+52');
  const [welcomeMessage, setWelcomeMessage] = useState('¡Hola! Explora nuestro catálogo y haz tus pedidos directamente por WhatsApp.');
  
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(null);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (!isOpen) return null;

  const handleNameChange = (val: string) => {
    setName(val);
    const slug = val
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSubdomain(slug);
    checkSubdomain(slug);
  };

  const handleSubdomainChange = (val: string) => {
    const sanitized = val
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '');
    setSubdomain(sanitized);
    checkSubdomain(sanitized);
  };

  const checkSubdomain = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSubdomainAvailable(null);
      setSubdomainError('El subdominio debe tener al menos 3 caracteres');
      return;
    }
    setCheckingSubdomain(true);
    setSubdomainError(null);
    try {
      const res = await fetch(`/api/stores/check-subdomain?subdomain=${encodeURIComponent(slug)}`);
      const data = await res.json();
      setSubdomainAvailable(data.available);
      if (!data.available) {
        setSubdomainError('Este subdominio ya está ocupado. Prueba otro nombre.');
      }
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    if (!name.trim() || !subdomain.trim() || subdomainAvailable === false) return;

    if (!isValidPhoneNumber(phone)) {
      setPhoneError('Ingresa un número de celular válido (mínimo 7 dígitos) para recibir los pedidos por WhatsApp.');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/stores', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
        },
        body: JSON.stringify({
          name: name.trim(),
          subdomain: subdomain.trim(),
          welcomeMessage: welcomeMessage.trim(),
          phoneNumber: phone.trim(),
          countryCode,
          primaryColor: '#18181b',
          secondaryColor: '#f4f4f5',
          backgroundColor: '#fafafa',
          font: 'Plus Jakarta Sans',
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Error al crear la tienda');
      }

      const created = await res.json();
      onStoreCreated(created);
      onClose();
    } catch (err: any) {
      alert(err.message || 'Error al crear la tienda');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div id="create-store-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-neutral-200 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white">
              <StoreIcon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-neutral-900">Crear nuevo catálogo</h3>
              <p className="text-xs text-neutral-500">Configura tu nuevo negocio con subdominio dedicado y WhatsApp</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-neutral-400 hover:bg-neutral-100 hover:text-neutral-700 transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Nombre del Negocio *
            </label>
            <input
              id="store-name-input"
              type="text"
              required
              placeholder="Ej: Joyería Artesanal Sol"
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3.5 py-2.5 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Subdominio Único del Catálogo *
            </label>
            <div className="flex rounded-xl border border-neutral-300 overflow-hidden shadow-sm focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
              <span className="bg-neutral-100 px-3 py-2.5 text-xs font-medium text-neutral-500 border-r border-neutral-200 select-none">
                https://
              </span>
              <input
                id="store-subdomain-input"
                type="text"
                required
                placeholder="joyeria-sol"
                value={subdomain}
                onChange={(e) => handleSubdomainChange(e.target.value)}
                className="w-full px-3 py-2.5 text-sm font-mono text-neutral-900 outline-none"
              />
              <span className="bg-neutral-100 px-3 py-2.5 text-xs font-semibold text-neutral-600 border-l border-neutral-200 select-none">
                .catalogo.app
              </span>
            </div>

            <div className="mt-1.5 flex items-center gap-1 text-xs">
              {checkingSubdomain && <span className="text-neutral-500">Verificando disponibilidad...</span>}
              {!checkingSubdomain && subdomainAvailable === true && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Subdominio disponible
                </span>
              )}
              {!checkingSubdomain && subdomainError && (
                <span className="inline-flex items-center gap-1 text-rose-600 font-medium">
                  <AlertCircle className="h-3.5 w-3.5" /> {subdomainError}
                </span>
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700">
                WhatsApp para Pedidos * (Obligatorio)
              </label>
              <span className="text-[11px] text-emerald-600 font-medium flex items-center gap-1">
                <Phone className="h-3 w-3" /> Clientes te comprarán aquí
              </span>
            </div>
            <div className="flex rounded-xl border border-neutral-300 overflow-hidden shadow-sm focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
              <select
                value={countryCode}
                onChange={(e) => setCountryCode(e.target.value)}
                className="bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 border-r border-neutral-300 outline-none"
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code + c.country} value={c.code}>
                    {c.flag} {c.code}
                  </option>
                ))}
              </select>
              <input
                id="store-phone-input"
                type="tel"
                required
                placeholder="Ej: 5512345678 (móvil sin guiones)"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  setPhoneError(null);
                }}
                className="w-full px-3 py-2 text-sm text-neutral-900 outline-none"
              />
            </div>
            {phoneError && (
              <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" /> {phoneError}
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-1">
              Mensaje de bienvenida
            </label>
            <textarea
              rows={2}
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-neutral-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-neutral-300 px-4 py-2 text-sm font-medium text-neutral-700 hover:bg-neutral-50"
            >
              Cancelar
            </button>
            <button
              id="btn-confirm-create-store"
              type="submit"
              disabled={creating || !name.trim() || !subdomain.trim() || subdomainAvailable === false || !phone.trim()}
              className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2 text-sm font-semibold text-white shadow hover:bg-neutral-800 disabled:opacity-50 transition"
            >
              <Sparkles className="h-4 w-4" />
              {creating ? 'Creando catálogo...' : 'Crear Catálogo'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
