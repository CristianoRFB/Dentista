/** FDI tooth notation. Clinical observations below are entered by authorized professionals, never inferred. */
export const ADULT_TOOTH_ROWS = [
  ['18','17','16','15','14','13','12','11','21','22','23','24','25','26','27','28'],
  ['48','47','46','45','44','43','42','41','31','32','33','34','35','36','37','38'],
] as const;
export const PRIMARY_TOOTH_ROWS = [
  ['55','54','53','52','51','61','62','63','64','65'],
  ['85','84','83','82','81','71','72','73','74','75'],
] as const;
export const TOOTH_IDS = [...ADULT_TOOTH_ROWS.flat(), ...PRIMARY_TOOTH_ROWS.flat()];
export const SURFACES = ['whole','mesial','distal','occlusal','incisal','buccal','lingual','palatal'] as const;
export const FINDINGS = ['observed','caries','restoration','missing','endodontic','prosthetic','other'] as const;
export type ToothSurface = typeof SURFACES[number];
export type ToothFinding = typeof FINDINGS[number];

export function validateOdontogramInput(input: { toothId: string; surface: string; finding: string; note: string }) {
  if (!TOOTH_IDS.includes(input.toothId as typeof TOOTH_IDS[number])) throw new Error('Dente fora do padrão FDI.');
  if (!SURFACES.includes(input.surface as ToothSurface)) throw new Error('Superfície inválida.');
  if (!FINDINGS.includes(input.finding as ToothFinding)) throw new Error('Condição inválida.');
  const note = input.note.trim();
  if (note.length > 4000) throw new Error('Observação excede o limite permitido.');
  return { toothId: input.toothId, surface: input.surface as ToothSurface, finding: input.finding as ToothFinding, note };
}

export function latestToothEvent<T extends { toothId: string; surface: string; createdAt: string }>(events: readonly T[], toothId: string) {
  return events.filter(event => event.toothId === toothId).sort((a,b) => b.createdAt.localeCompare(a.createdAt))[0] ?? null;
}
