/**
 * Browser-local datetime input -> canonical UTC booking timestamp.
 * Server remains the source of truth for availability, permissions and time bounds.
 * Keep limits in sync with workers/media-api/src/publicBooking.ts.
 */
const MIN_LEAD_MS = 5 * 60 * 1000;
const MAX_AHEAD_MS = 60 * 24 * 60 * 60 * 1000;
const LOCAL_DATETIME = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

function formatLocal(date: Date): string {
  const pad = (value: number) => String(value).padStart(2, '0');
  return [date.getFullYear(), pad(date.getMonth() + 1), pad(date.getDate())].join('-')
    + 'T' + pad(date.getHours()) + ':' + pad(date.getMinutes());
}

/** Date inputs use local wall time, never UTC strings without a timezone marker. */
export function bookingLocalBounds(now = Date.now()) {
  const firstMinute = Math.ceil((now + MIN_LEAD_MS) / 60_000) * 60_000;
  const lastMinute = Math.floor((now + MAX_AHEAD_MS) / 60_000) * 60_000;
  return { min: formatLocal(new Date(firstMinute)), max: formatLocal(new Date(lastMinute)) };
}

export function parseBookingLocalInput(value: string, now = Date.now()): string {
  const match = LOCAL_DATETIME.exec(value);
  if (!match) throw new Error('Selecione uma data e um horário válidos.');
  const [, year, month, day, hours, minutes] = match;
  const local = new Date(Number(year), Number(month) - 1, Number(day), Number(hours), Number(minutes));
  // Date normalizes impossible dates and DST gaps: reject the normalization explicitly.
  if (!Number.isFinite(local.getTime()) || formatLocal(local) !== value)
    throw new Error('Este horário não existe no fuso do seu dispositivo. Escolha outro.');
  const timestamp = local.getTime();
  if (timestamp < now + MIN_LEAD_MS)
    throw new Error('Escolha um horário pelo menos cinco minutos no futuro.');
  if (timestamp > now + MAX_AHEAD_MS)
    throw new Error('Escolha um horário dentro dos próximos 60 dias.');
  return local.toISOString();
}
