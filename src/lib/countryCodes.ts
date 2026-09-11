export interface CountryCode {
  country: string;
  code: string;
  flag: string;
}

export const COUNTRY_CODES: CountryCode[] = [
  { country: 'México', code: '+52', flag: '🇲🇽' },
  { country: 'Colombia', code: '+57', flag: '🇨🇴' },
  { country: 'Argentina', code: '+54', flag: '🇦🇷' },
  { country: 'Chile', code: '+56', flag: '🇨🇱' },
  { country: 'Perú', code: '+51', flag: '🇵🇪' },
  { country: 'España', code: '+34', flag: '🇪🇸' },
  { country: 'Estados Unidos', code: '+1', flag: '🇺🇸' },
  { country: 'Ecuador', code: '+593', flag: '🇪🇨' },
  { country: 'Guatemala', code: '+502', flag: '🇬🇹' },
  { country: 'Costa Rica', code: '+506', flag: '🇨🇷' },
  { country: 'Panamá', code: '+507', flag: '🇵🇦' },
  { country: 'Uruguay', code: '+598', flag: '🇺🇾' },
  { country: 'República Dominicana', code: '+1809', flag: '🇩🇴' },
];

export function cleanPhoneForWhatsApp(countryCode: string, phoneNumber: string): string {
  const codeDigits = countryCode.replace(/\D/g, '');
  const phoneDigits = phoneNumber.replace(/\D/g, '');
  
  // Special Mexico mobile rule: +52 + 1 + 10 digits
  if (codeDigits === '52' && phoneDigits.length === 10 && !phoneDigits.startsWith('1')) {
    return `521${phoneDigits}`;
  }
  
  if (phoneDigits.startsWith(codeDigits)) {
    return phoneDigits;
  }
  return `${codeDigits}${phoneDigits}`;
}

export function generateWhatsAppLink(params: {
  countryCode?: string | null;
  phoneNumber?: string | null;
  storeName: string;
  productName: string;
  price: string;
  currency?: string;
  quantity?: number;
  optionsText?: string;
}): string {
  const code = params.countryCode || '+52';
  const phone = params.phoneNumber || '';
  const cleanPhone = cleanPhoneForWhatsApp(code, phone);
  const qty = params.quantity || 1;
  const curr = params.currency || 'USD';

  let message = `¡Hola *${params.storeName}*! 👋\n`;
  message += `Me interesa realizar un pedido desde su catálogo digital:\n\n`;
  message += `📦 *Producto:* ${params.productName}\n`;
  if (qty > 1) {
    message += `🔢 *Cantidad:* ${qty}\n`;
    const total = (parseFloat(params.price) * qty).toFixed(2);
    message += `💰 *Total estimado:* ${curr} $${total} (${params.price} c/u)\n`;
  } else {
    message += `💰 *Precio:* ${curr} $${params.price}\n`;
  }
  if (params.optionsText) {
    message += `✨ *Detalles seleccionados:* ${params.optionsText}\n`;
  }
  message += `\n¿Tienen disponibilidad y cuáles son los métodos de entrega/pago? ¡Gracias!`;

  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}
