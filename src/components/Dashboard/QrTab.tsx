import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  QrCode,
  Download,
  Printer,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { Store } from '../../types.ts';
import { getStorePublicUrl } from '../../lib/countryCodes.ts';

interface Props {
  store: Store;
}

export const QrTab: React.FC<Props> = ({ store }) => {
  const [qrPngUrl, setQrPngUrl] = useState<string>('');
  const [qrSvgString, setQrSvgString] = useState<string>('');
  const [copied, setCopied] = useState(false);

  const { workingUrl, customDomainUrl } = getStorePublicUrl(store.subdomain);

  useEffect(() => {
    // Generate high-resolution PNG pointing to the working live catalog URL
    QRCode.toDataURL(workingUrl, {
      width: 800,
      margin: 2,
      color: {
        dark: store.primaryColor || '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrPngUrl)
      .catch(console.error);

    // Generate Vector SVG
    QRCode.toString(workingUrl, {
      type: 'svg',
      margin: 2,
      color: {
        dark: store.primaryColor || '#000000',
        light: '#ffffff',
      },
    })
      .then(setQrSvgString)
      .catch(console.error);
  }, [workingUrl, store.primaryColor]);

  const handleDownloadPng = () => {
    if (!qrPngUrl) return;
    const link = document.createElement('a');
    link.href = qrPngUrl;
    link.download = `qr-${store.subdomain}-catalogo.png`;
    link.click();
  };

  const handleDownloadSvg = () => {
    if (!qrSvgString) return;
    const blob = new Blob([qrSvgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `qr-${store.subdomain}-catalogo.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(workingUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrintPoster = () => {
    window.print();
  };

  return (
    <div id="qr-management-tab" className="space-y-6">
      {/* Top Header */}
      <div>
        <h2 className="text-xl font-bold tracking-tight text-neutral-900">
          Código QR & Material de Difusión
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Generado automáticamente para tu catálogo.{' '}
          <span className="font-mono text-neutral-800 font-semibold">{customDomainUrl}</span>
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left: Download & Action Cards (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Main QR Card */}
          <div className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-xs text-center">
            <div className="mx-auto w-64 h-64 rounded-2xl bg-white p-4 border border-neutral-100 shadow-sm flex items-center justify-center">
              {qrPngUrl ? (
                <img
                  src={qrPngUrl}
                  alt={`QR ${store.name}`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-900 border-t-transparent" />
              )}
            </div>

            <div className="mt-4 flex flex-col items-center gap-1.5">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-semibold text-neutral-800 truncate max-w-[240px]">
                  {customDomainUrl}
                </span>
                <button
                  onClick={handleCopyLink}
                  className="rounded-lg p-1 text-neutral-500 hover:bg-neutral-100 transition"
                  title="Copiar enlace real"
                >
                  {copied ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                </button>
              </div>
              <span className="text-[10px] text-emerald-600 font-medium flex items-center gap-1">
                <Smartphone className="h-3 w-3" />
                Listo para escanear con la cámara de cualquier celular
              </span>
            </div>

            {/* Downloads */}
            <div className="mt-6 grid grid-cols-2 gap-2.5">
              <button
                id="btn-download-qr-png"
                onClick={handleDownloadPng}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 shadow-xs transition"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar PNG
              </button>
              <button
                id="btn-download-qr-svg"
                onClick={handleDownloadSvg}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-neutral-300 px-3 py-2.5 text-xs font-semibold text-neutral-800 hover:bg-neutral-50 shadow-xs transition"
              >
                <Download className="h-3.5 w-3.5" />
                Descargar SVG
              </button>
            </div>

            <button
              id="btn-print-poster"
              onClick={handlePrintPoster}
              className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-neutral-900 px-4 py-2.5 text-xs font-semibold text-white shadow-xs hover:bg-neutral-800 transition"
            >
              <Printer className="h-3.5 w-3.5" />
              Imprimir Afiche de Mostrador
            </button>
          </div>

          {/* Usage tips */}
          <div className="rounded-2xl border border-neutral-200 bg-neutral-50 p-4 text-xs text-neutral-600 space-y-2">
            <p className="font-bold text-neutral-900 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5 text-amber-600" />
              ¿Dónde usar tu código QR?
            </p>
            <ul className="list-disc list-inside space-y-1 text-[11px] text-neutral-600">
              <li>Colócalo en tu mostrador o mesas para que tus clientes escaneen desde su móvil.</li>
              <li>Imprímelo en stickers para el empaque o bolsas de tus pedidos.</li>
              <li>Compártelo en las historias de Instagram, Facebook o estados de WhatsApp.</li>
            </ul>
          </div>
        </div>

        {/* Right: Printable Poster Template Preview (7 cols) */}
        <div className="lg:col-span-7 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-500">
              Plantilla Lista para Imprimir
            </span>
            <span className="text-[11px] text-neutral-400">
              Formato de Exhibición en Tienda / Mostrador
            </span>
          </div>

          {/* Printable Poster Canvas */}
          <div
            id="printable-poster"
            className="rounded-3xl border-2 border-neutral-300 bg-white p-8 sm:p-12 shadow-xl text-center max-w-md mx-auto"
          >
            {/* Header Badge */}
            <div className="inline-flex items-center gap-1.5 rounded-full bg-neutral-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-neutral-700 mb-4">
              <QrCode className="h-3.5 w-3.5" />
              Catálogo Digital Interactivo
            </div>

            {/* Store Name */}
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-neutral-900 leading-tight">
              {store.name}
            </h1>
            <p className="mt-2 text-xs sm:text-sm text-neutral-600 max-w-xs mx-auto">
              {store.welcomeMessage || 'Escanea con la cámara de tu celular para ver nuestro catálogo completo y comprar al instante.'}
            </p>

            {/* Large Centered QR Code */}
            <div className="my-6 mx-auto w-56 h-56 rounded-2xl bg-white p-3 border-2 border-neutral-900 shadow-md flex items-center justify-center">
              {qrPngUrl && (
                <img
                  src={qrPngUrl}
                  alt={store.name}
                  className="w-full h-full object-contain"
                />
              )}
            </div>

            {/* Call to action */}
            <div className="space-y-1">
              <p className="text-sm font-bold tracking-tight text-neutral-900 uppercase">
                Apunta con la cámara de tu celular
              </p>
              <p className="font-mono text-xs text-neutral-500 font-semibold">
                {customDomainUrl}
              </p>
            </div>

            {/* Footer with WhatsApp Indicator */}
            <div className="mt-8 pt-4 border-t border-neutral-200 flex items-center justify-center gap-2 text-xs font-medium text-neutral-600">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Pedidos directos y rápidos por WhatsApp</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
