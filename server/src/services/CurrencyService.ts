import Decimal from "decimal.js";
import type { CurrencyCode } from "../lib/types.js";

export interface ExchangeRateInput {
  fromCurrency: CurrencyCode;
  toCurrency: CurrencyCode;
  rate: string;
  asOfDate: string;
}

/**
 * Conversión de monedas basada en una tabla configurable por el usuario
 * (Configuración > Tipos de cambio). No depende de APIs externas.
 * Cada costo conserva su moneda original; la conversión solo se aplica
 * cuando es necesario comparar/sumar en la moneda del cálculo.
 */
export function convertCurrency(
  amount: Decimal,
  from: CurrencyCode,
  to: CurrencyCode,
  rates: ExchangeRateInput[]
): { ok: true; value: Decimal; rateUsed: ExchangeRateInput | null } | { ok: false; error: string } {
  if (from === to) return { ok: true, value: amount, rateUsed: null };

  const direct = rates.find((r) => r.fromCurrency === from && r.toCurrency === to);
  if (direct) {
    return { ok: true, value: amount.mul(new Decimal(direct.rate)), rateUsed: direct };
  }

  const inverse = rates.find((r) => r.fromCurrency === to && r.toCurrency === from);
  if (inverse) {
    return { ok: true, value: amount.div(new Decimal(inverse.rate)), rateUsed: inverse };
  }

  return {
    ok: false,
    error: `No hay tipo de cambio configurado para convertir ${from} → ${to}. Configúrelo en Configuración > Tipos de cambio.`,
  };
}
