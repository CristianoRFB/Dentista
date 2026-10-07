export const PRODUCT_STANDARDS = {
  coreSource: 'SAAS_PROJECT_CORE(2).md',
  coreVersion: 'v01',
  global: 'GLOBAL-v01',
  vertical: 'APPOINTMENT-v01',
  product: 'DENTIST-v01',
} as const;

export type ProductStandards = typeof PRODUCT_STANDARDS;
