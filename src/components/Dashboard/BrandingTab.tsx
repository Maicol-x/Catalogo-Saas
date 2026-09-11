import React, { useState } from 'react';
import {
  Palette,
  Type,
  Phone,
  Globe,
  Save,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Store } from '../../types.ts';
import { useAuth } from '../../context/AuthContext.tsx';
import { COUNTRY_CODES, isValidPhoneNumber } from '../../lib/countryCodes.ts';

interface Props {
  store: Store;
  onStoreUpdated: (updated: Store) => void;
}

const FONT_OPTIONS = [
  { id: 'Plus Jakarta Sans', label: 'Plus Jakarta Sans (Moderno & Tecnológico)', sample: 'Aa Bb Cc 123' },
  { id: 'Outfit', label: 'Outfit (Urbano & Minimalista)', sample: 'Aa Bb Cc 123' },
  { id: 'DM Sans', label: 'DM Sans (Cálido & Artesanal)', sample: 'Aa Bb Cc 123' },
  { id: 'Playfair Display', label: 'Playfair Display (Elegante & Premium)', sample: 'Aa Bb Cc 123' },
];

const COLOR_PRESETS = [
  {
    name: 'Minimal Slate',
    primary: '#09090b',
    secondary: '#f4f4f5',
    background: '#ffffff',
  },
  {
    name: 'Café & Artesanía',
    primary: '#78350f',
    secondary: '#fef3c7',
    background: '#fafaf9',
  },
  {
    name: 'Bosque Esmeralda',
    primary: '#064e3b',
    secondary: '#d1fae5',
    background: '#f8fafc',
  },
  {
    name: 'Índigo Studio',
    primary: '#312e81',
    secondary: '#e0e7ff',
    background: '#ffffff',
  },
  {
    name: 'Terracota Cálido',
    primary: '#9a3412',
    secondary: '#ffedd5',
    background: '#fffbf5',
  },
];

export const BrandingTab: React.FC<Props> = ({ store, onStoreUpdated }) => {
  const { idToken } = useAuth();

  // Form states initialized from current store
  const [name, setName] = useState(store.name);
  const [subdomain, setSubdomain] = useState(store.subdomain);
  const [welcomeMessage, setWelcomeMessage] = useState(store.welcomeMessage || '');
  const [phone, setPhone] = useState(store.phoneNumber || '');
  const [countryCode, setCountryCode] = useState(store.countryCode || '+52');
  const [logoUrl, setLogoUrl] = useState(store.logoUrl || '');
  const [coverUrl, setCoverUrl] = useState(store.coverUrl || '');
  const [primaryColor, setPrimaryColor] = useState(store.primaryColor || '#09090b');
  const [secondaryColor, setSecondaryColor] = useState(store.secondaryColor || '#f4f4f5');
  const [backgroundColor, setBackgroundColor] = useState(store.backgroundColor || '#ffffff');
  const [font, setFont] = useState(store.font || 'Plus Jakarta Sans');
  const [currency, setCurrency] = useState(store.currency || 'USD');

  // Subdomain validation
  const [checkingSubdomain, setCheckingSubdomain] = useState(false);
  const [subdomainAvailable, setSubdomainAvailable] = useState<boolean | null>(true);
  const [subdomainError, setSubdomainError] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState(false);

  const handleSubdomainChange = async (val: string) => {
    const slug = val.toLowerCase().replace(/[^a-z0-9-]/g, '');
    setSubdomain(slug);

    if (slug === store.subdomain) {
      setSubdomainAvailable(true);
      setSubdomainError(null);
      return;
    }

    if (slug.length < 3) {
      setSubdomainAvailable(false);
      setSubdomainError('Mínimo 3 caracteres');
      return;
    }

    setCheckingSubdomain(true);
    try {
      const res = await fetch(`/api/stores/check-subdomain?subdomain=${slug}&excludeStoreId=${store.id}`);
      const data = await res.json();
      setSubdomainAvailable(data.available);
      setSubdomainError(data.available ? null : 'Subdominio ya ocupado');
    } catch {
      setSubdomainAvailable(null);
    } finally {
      setCheckingSubdomain(false);
    }
  };

  const handleApplyPreset = (p: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(p.primary);
    setSecondaryColor(p.secondary);
    setBackgroundColor(p.background);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subdomainAvailable === false) return;

    if (phone.trim() && !isValidPhoneNumber(phone)) {
      alert('El número de WhatsApp ingresado no es válido. Debe contener al menos 7 dígitos.');
      return;
    }

    setSaving(true);
    setSuccessNotice(false);

    const payload = {
      name: name.trim(),
      subdomain: subdomain.trim(),
      welcomeMessage: welcomeMessage.trim(),
      phoneNumber: phone.trim(),
      countryCode,
      logoUrl: logoUrl.trim() || null,
      coverUrl: coverUrl.trim() || null,
      primaryColor,
      secondaryColor,
      backgroundColor,
      font,
      currency,
    };

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(idToken ? { Authorization: `Bearer ${idToken}` } : {}),
      };

      const res = await fetch(`/api/stores/${store.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const updated = await res.json();
        onStoreUpdated(updated);
        setSuccessNotice(true);
        setTimeout(() => setSuccessNotice(false), 3500);
      } else {
        const err = await res.json().catch(() => ({}));
        alert(err.error || 'Error al actualizar la configuración');
      }
    } catch (e: any) {
      console.error('Save branding error:', e);
      alert('Error de conexión al guardar cambios: ' + (e.message || ''));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div id="branding-settings-tab" className="space-y-6">
      {/* Header with Save Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-neutral-900">Personalización y Marca</h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Ajusta la apariencia visual, subdominio, tipografía y datos de contacto de tu catálogo en tiempo real.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {successNotice && (
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-200 animate-in fade-in">
              <CheckCircle2 className="h-4 w-4" />
              ¡Cambios guardados!
            </span>
          )}
          <button
            id="btn-save-branding"
            onClick={handleSave}
            disabled={saving || subdomainAvailable === false}
            className="inline-flex items-center gap-1.5 rounded-xl bg-neutral-900 px-5 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 disabled:opacity-50 transition"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Guardando...' : 'Guardar Cambios'}
          </button>
        </div>
      </div>

      {/* Split Screen: Settings on Left, Live Mockup on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Form: 7 cols */}
        <form onSubmit={handleSave} className="lg:col-span-7 space-y-6">
          {/* Subdomain & Identity */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
              <Globe className="h-4 w-4" /> Subdominio & Dirección Web
            </h3>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Subdominio público exclusivo
              </label>
              <div className="flex rounded-xl border border-neutral-300 overflow-hidden shadow-xs focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
                <span className="bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-400 select-none border-r border-neutral-200">
                  https://
                </span>
                <input
                  type="text"
                  required
                  value={subdomain}
                  onChange={(e) => handleSubdomainChange(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono text-neutral-900 outline-none"
                />
                <span className="bg-neutral-50 px-3 py-2 text-xs font-semibold text-neutral-600 select-none border-l border-neutral-200">
                  .catalogo.app
                </span>
              </div>
              <div className="mt-1.5 flex items-center gap-1.5 text-xs">
                {checkingSubdomain && <span className="text-neutral-500">Comprobando disponibilidad...</span>}
                {!checkingSubdomain && subdomainAvailable === true && (
                  <span className="text-emerald-600 font-medium inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Subdominio disponible y válido
                  </span>
                )}
                {!checkingSubdomain && subdomainError && (
                  <span className="text-rose-600 font-medium inline-flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> {subdomainError}
                  </span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Nombre del Negocio
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  Moneda de Precios
                </label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 bg-white"
                >
                  <option value="USD">USD ($)</option>
                  <option value="MXN">MXN ($)</option>
                  <option value="COP">COP ($)</option>
                  <option value="ARS">ARS ($)</option>
                  <option value="CLP">CLP ($)</option>
                  <option value="PEN">PEN (S/)</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Mensaje de Bienvenida o Eslogan
              </label>
              <textarea
                rows={2}
                value={welcomeMessage}
                onChange={(e) => setWelcomeMessage(e.target.value)}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900"
              />
            </div>
          </div>

          {/* WhatsApp Integration */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
              <Phone className="h-4 w-4 text-emerald-600" /> WhatsApp para Recepción de Pedidos
            </h3>
            <div>
              <label className="block text-xs font-medium text-neutral-700 mb-1">
                Línea directa para el botón de compra
              </label>
              <div className="flex rounded-xl border border-neutral-300 overflow-hidden shadow-xs focus-within:border-neutral-900 focus-within:ring-1 focus-within:ring-neutral-900">
                <select
                  value={countryCode}
                  onChange={(e) => setCountryCode(e.target.value)}
                  className="bg-neutral-50 px-3 py-2 text-xs font-medium text-neutral-800 border-r border-neutral-300 outline-none"
                >
                  {COUNTRY_CODES.map((c) => (
                    <option key={c.code + c.country} value={c.code}>
                      {c.flag} {c.code} ({c.country})
                    </option>
                  ))}
                </select>
                <input
                  type="tel"
                  placeholder="Ej: 55 1234 5678"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 text-xs text-neutral-900 outline-none"
                />
              </div>
              <p className="text-[11px] text-neutral-400 mt-1">
                Cuando un cliente haga clic en &quot;Comprar por WhatsApp&quot;, se abrirá una conversación en este número con el producto y precio prellenados.
              </p>
            </div>
          </div>

          {/* Visual Palette & Fonts */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900 flex items-center gap-2">
              <Palette className="h-4 w-4" /> Colores & Tipografía
            </h3>

            {/* Presets */}
            <div>
              <label className="block text-[11px] font-medium text-neutral-500 mb-1.5 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-500" /> Paletas predefinidas armónicas:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => handleApplyPreset(p)}
                    className="flex flex-col items-center p-2 rounded-xl border border-neutral-200 hover:border-neutral-900 transition text-left group cursor-pointer"
                  >
                    <div className="flex gap-1 mb-1.5">
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: p.primary }} />
                      <span className="h-4 w-4 rounded-full border border-black/10" style={{ backgroundColor: p.secondary }} />
                    </div>
                    <span className="text-[10px] font-medium text-neutral-700 text-center truncate w-full">
                      {p.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Pickers */}
            <div className="grid grid-cols-3 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  Color Primario
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 p-1.5">
                  <input
                    type="color"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="h-7 w-7 rounded-lg border-0 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="w-full text-xs font-mono outline-none text-neutral-800 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  Color Secundario
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 p-1.5">
                  <input
                    type="color"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="h-7 w-7 rounded-lg border-0 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="w-full text-xs font-mono outline-none text-neutral-800 uppercase"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-neutral-700 mb-1">
                  Fondo Catálogo
                </label>
                <div className="flex items-center gap-2 rounded-xl border border-neutral-300 p-1.5">
                  <input
                    type="color"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="h-7 w-7 rounded-lg border-0 cursor-pointer p-0"
                  />
                  <input
                    type="text"
                    value={backgroundColor}
                    onChange={(e) => setBackgroundColor(e.target.value)}
                    className="w-full text-xs font-mono outline-none text-neutral-800 uppercase"
                  />
                </div>
              </div>
            </div>

            {/* Typography Selection */}
            <div className="pt-2">
              <label className="block text-xs font-medium text-neutral-700 mb-1.5 flex items-center gap-1.5">
                <Type className="h-4 w-4" /> Tipografía del Catálogo
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {FONT_OPTIONS.map((fOpt) => (
                  <button
                    key={fOpt.id}
                    type="button"
                    onClick={() => setFont(fOpt.id)}
                    className={`p-3 rounded-xl border text-left transition cursor-pointer ${
                      font === fOpt.id
                        ? 'border-neutral-900 bg-neutral-50 shadow-xs'
                        : 'border-neutral-200 hover:border-neutral-300 bg-white'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-neutral-900">{fOpt.id}</span>
                      {font === fOpt.id && <CheckCircle2 className="h-3.5 w-3.5 text-neutral-900" />}
                    </div>
                    <p className="text-xs text-neutral-500 mt-1" style={{ fontFamily: fOpt.id }}>
                      {fOpt.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Media URLs */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-xs space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-900">
              Logo y Foto de Portada
            </h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  URL del Logo (avatar de tienda)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 mb-1">
                  URL de Imagen de Portada (banner superior)
                </label>
                <input
                  type="url"
                  placeholder="https://images.unsplash.com/..."
                  value={coverUrl}
                  onChange={(e) => setCoverUrl(e.target.value)}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 text-xs text-neutral-900 outline-none focus:border-neutral-900"
                />
              </div>
            </div>
          </div>
        </form>

        {/* Right: Live Mockup Preview: 5 cols */}
        <div className="lg:col-span-5 sticky top-24 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Vista Previa en Tiempo Real
            </span>
            <span className="text-[11px] text-neutral-400 font-mono">
              {subdomain || 'demo'}.catalogo.app
            </span>
          </div>

          {/* Browser Window Mockup */}
          <div className="rounded-2xl border border-neutral-200 shadow-xl overflow-hidden bg-white">
            {/* Window header */}
            <div className="bg-neutral-100 px-3 py-2 border-b border-neutral-200 flex items-center gap-2">
              <div className="flex gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
              </div>
              <div className="flex-1 rounded-md bg-white px-2 py-0.5 text-[10px] font-mono text-neutral-500 truncate text-center border border-neutral-200">
                https://{subdomain || 'tienda'}.catalogo.app
              </div>
            </div>

            {/* Mockup Canvas */}
            <div
              className="p-5 min-h-[380px] transition-all duration-200"
              style={{
                backgroundColor: backgroundColor || '#ffffff',
                fontFamily: font || 'inherit',
              }}
            >
              {/* Cover */}
              {coverUrl && (
                <div className="h-24 w-full rounded-xl overflow-hidden mb-3 border border-black/5">
                  <img src={coverUrl} alt="Cover" className="h-full w-full object-cover" />
                </div>
              )}

              {/* Logo & Name */}
              <div className="flex items-center gap-3">
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt="Logo"
                    className="h-12 w-12 rounded-xl object-cover border border-neutral-200 shadow-xs"
                  />
                ) : (
                  <div
                    className="h-12 w-12 rounded-xl flex items-center justify-center font-bold text-lg text-white shadow-xs"
                    style={{ backgroundColor: primaryColor }}
                  >
                    {(name || 'T')[0]}
                  </div>
                )}
                <div>
                  <h4 className="font-bold text-sm text-neutral-900 leading-tight">
                    {name || 'Mi Negocio'}
                  </h4>
                  <p className="text-[10px] text-neutral-500 font-mono mt-0.5">
                    {subdomain || 'mi-tienda'}.catalogo.app
                  </p>
                </div>
              </div>

              {welcomeMessage && (
                <p className="mt-3 text-xs text-neutral-600 leading-relaxed border-l-2 pl-2.5" style={{ borderColor: primaryColor }}>
                  {welcomeMessage}
                </p>
              )}

              {/* Sample Product Card */}
              <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-3 shadow-xs">
                <div className="flex gap-3">
                  <div className="h-16 w-16 rounded-lg bg-neutral-100 overflow-hidden shrink-0">
                    <img
                      src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80"
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-xs text-neutral-900 truncate">Producto Destacado</p>
                    <p className="text-[10px] text-neutral-500">Ejemplo de vista en catálogo</p>
                    <p className="text-xs font-bold text-neutral-900 mt-1">{currency} $24.00</p>
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-2.5 w-full rounded-lg py-1.5 text-xs font-semibold text-white shadow-xs flex items-center justify-center gap-1"
                  style={{ backgroundColor: primaryColor }}
                >
                  <Phone className="h-3 w-3" />
                  Comprar por WhatsApp
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
