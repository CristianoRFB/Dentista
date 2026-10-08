export type AuthRouteDecision = 'loading' | 'login' | 'allow';
export type PlatformRouteDecision = 'loading' | 'login' | 'denied' | 'allow';

export function authRouteDecision(input: { loading: boolean; hasUser: boolean; demoMode: boolean }): AuthRouteDecision {
  if (input.loading) return 'loading';
  if (!input.hasUser && !input.demoMode) return 'login';
  return 'allow';
}

export function platformRouteDecision(input: {
  authLoading: boolean;
  checking: boolean;
  hasUser: boolean;
  isOwner: boolean;
}): PlatformRouteDecision {
  if (input.authLoading || input.checking) return 'loading';
  if (!input.hasUser) return 'login';
  if (!input.isOwner) return 'denied';
  return 'allow';
}
