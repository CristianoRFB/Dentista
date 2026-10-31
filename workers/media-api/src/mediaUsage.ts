/** Read-only, tenant-prefixed clinical media byte counts; no quotas, deletion or billing. */
export const MEDIA_USAGE_PAGE_SIZE = 500;
export interface MediaUsageObject { key: string; size: number; }

export function summarizeMediaUsagePage(objects: readonly MediaUsageObject[], tenantId: string) {
  if(!/^[A-Za-z0-9_-]{1,128}$/.test(tenantId)
    || !Array.isArray(objects) || objects.length > MEDIA_USAGE_PAGE_SIZE)
    throw new Error('invalid_media_usage_page');
  const prefix = 'tenants/' + tenantId + '/patients/';
  let bytes = 0;
  for(const object of objects) {
    if(!object || typeof object.key !== 'string' || !object.key.startsWith(prefix)
      || !Number.isSafeInteger(object.size) || object.size < 0)
      throw new Error('media_usage_scope_or_size_mismatch');
    bytes += object.size;
    if(!Number.isSafeInteger(bytes))throw new Error('media_usage_overflow');
  }
  return { objectCount: objects.length, bytes };
}
