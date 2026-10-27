/** Metadata-only clinical media workflow. R2 objects are never deleted by a reviewer. */
export const PHOTO_ACTIONS = ['verify', 'reject', 'archive', 'restore'] as const;
export type PhotoAction = typeof PHOTO_ACTIONS[number];
export type PhotoVerification = 'unverified' | 'verified' | 'rejected';
export type PhotoLifecycle = 'active' | 'archived';
export const PHOTO_TAGS = ['frontal', 'lateral-right', 'lateral-left', 'occlusal-upper',
  'occlusal-lower', 'smile', 'intraoral'] as const;
export function validatePhotoReview(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new Error('invalid_photo_review');
  const fields = input as Record<string, unknown>;
  if (Object.keys(fields).some(key => !['tenantId', 'patientId', 'action', 'reason', 'tags'].includes(key))) throw new Error('invalid_photo_review');
  const { tenantId, patientId, action, reason, tags } = fields;
  if (typeof tenantId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(tenantId)
    || typeof patientId !== 'string' || !/^[A-Za-z0-9_-]{1,128}$/.test(patientId)
    || !PHOTO_ACTIONS.includes(action as PhotoAction)
    || typeof reason !== 'string' || reason.trim().length < 12 || reason.trim().length > 500
    || !Array.isArray(tags) || tags.length > 7 || new Set(tags).size !== tags.length
    || tags.some(tag => typeof tag !== 'string' || !PHOTO_TAGS.includes(tag as typeof PHOTO_TAGS[number]))) {
    throw new Error('invalid_photo_review');
  }
  return { tenantId, patientId, action: action as PhotoAction, reason: reason.trim(), tags: tags as string[] };
}
export function photoTransition(photo: {status?: string; lifecycleStatus?: string}, action: PhotoAction) {
  const currentLifecycle = photo.lifecycleStatus ?? 'active';
  if (!['active','archived'].includes(currentLifecycle) || !['unverified','verified','rejected'].includes(photo.status ?? 'unverified')) {
    throw new Error('invalid_current_photo_state');
  }
  if (action === 'restore') {
    if (currentLifecycle !== 'archived') throw new Error('photo_not_archived');
    return { status: photo.status ?? 'unverified', lifecycleStatus: 'active' };
  }
  if (action === 'archive') {
    if (currentLifecycle !== 'active') throw new Error('photo_already_archived');
    return { status: photo.status ?? 'unverified', lifecycleStatus: 'archived' };
  }
  if (currentLifecycle === 'archived') throw new Error('restore_photo_before_review');
  if ((photo.status ?? 'unverified') === (action === 'verify' ? 'verified' : 'rejected')) throw new Error('photo_already_reviewed');
  return { status: action === 'verify' ? 'verified' : 'rejected', lifecycleStatus: 'active' };
}
