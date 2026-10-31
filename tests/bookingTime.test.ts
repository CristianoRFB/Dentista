import { describe, expect, it } from 'vitest';
import { bookingLocalBounds, parseBookingLocalInput } from '../src/lib/bookingTime';

const minute = 60_000;
const day = 24 * 60 * minute;
const now = new Date(2026, 9, 31, 12, 0, 15).getTime();
const formatLocal = (date: Date) => {
  const p = (v:number) => String(v).padStart(2,'0');
  return date.getFullYear() + '-' + p(date.getMonth()+1) + '-' + p(date.getDate()) + 'T'
    + p(date.getHours()) + ':' + p(date.getMinutes());
};

describe('D4 — local booking date/time validation', () => {
  it('exposes a selectable minute range aligned to five minutes and 60 days', () => {
    const bounds = bookingLocalBounds(now);
    const firstMinute = Math.ceil((now + 5*minute)/minute)*minute;
    const lastMinute = Math.floor((now + 60*day)/minute)*minute;
    expect(bounds).toEqual({
      min: formatLocal(new Date(firstMinute)),
      max: formatLocal(new Date(lastMinute)),
    });
    expect(parseBookingLocalInput(bounds.min, now)).toBe(new Date(firstMinute).toISOString());
    expect(parseBookingLocalInput(bounds.max, now)).toBe(new Date(lastMinute).toISOString());
  });

  it('converts valid local wall time to the exact UTC instant, without manual zone offsets', () => {
    const local = new Date(now + day);
    local.setSeconds(0,0);
    expect(parseBookingLocalInput(formatLocal(local), now)).toBe(local.toISOString());
  });

  it('rejects empty, malformed, overflow and impossible calendar inputs', () => {
    for (const input of ['', '2026-10-31', '2026-13-01T12:30', '2026-02-30T14:00',
      '2026-10-31T25:00', '2026-10-31T12:99', '2026-10-31T12:30Z']) {
      expect(()=>parseBookingLocalInput(input, now)).toThrow();
    }
  });

  it('rejects past dates, insufficient lead time and more than 60 days ahead', () => {
    expect(()=>parseBookingLocalInput(formatLocal(new Date(now - minute)), now)).toThrow(/futuro/);
    expect(()=>parseBookingLocalInput(formatLocal(new Date(now + 4*minute)), now)).toThrow(/cinco minutos/);
    expect(()=>parseBookingLocalInput(formatLocal(new Date(now + 61*day)), now)).toThrow(/60 dias/);
  });

  it('validates against a fresh clock on submission, even if the page stays open', () => {
    const candidate = bookingLocalBounds(now).min;
    expect(()=>parseBookingLocalInput(candidate, now+10*minute)).toThrow(/futuro/);
  });
});
