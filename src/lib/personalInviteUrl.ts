/** Personal single-use invite URLs must not put bearer tokens in HTTP query strings. */
export type InviteKind='agendar'|'cadastro';
export const INVITE_TOKEN_PATTERN=/^[A-Za-z0-9_-]{43}$/;

export function createPersonalInviteUrl(origin:string,tenantSlug:string,kind:InviteKind,token:string):string {
  if(!INVITE_TOKEN_PATTERN.test(token))throw new Error('invalid_invitation_token');
  if(!/^[a-z0-9](?:[a-z0-9-]{0,60}[a-z0-9])?$/.test(tenantSlug))throw new Error('invalid_tenant_slug');
  const url=new URL('/'+encodeURIComponent(tenantSlug)+'/'+kind,origin);
  url.hash=new URLSearchParams({token}).toString();
  return url.href;
}

export function readInviteToken(location:Pick<Location,'search'|'hash'>):string {
  const fragment=location.hash.startsWith('#token=')
    ? new URLSearchParams(location.hash.slice(1)).get('token')??''
    : '';
  const query=new URLSearchParams(location.search).get('token')??'';
  const raw=fragment||query;
  return INVITE_TOKEN_PATTERN.test(raw)?raw:'';
}

/** Preserve unrelated search params while clearing both legacy and fragment tokens. */
export function sanitizedInviteLocation(location:Pick<Location,'pathname'|'search'|'hash'>):string {
  const params=new URLSearchParams(location.search);
  params.delete('token');
  const query=params.toString();
  const hash=location.hash.startsWith('#token=')?'':location.hash;
  return location.pathname+(query?'?'+query:'')+hash;
}

/** The secret remains only in the component's memory until the page is closed. */
export function consumeInviteTokenFromAddressBar():string {
  const token=readInviteToken(window.location);
  const cleaned=sanitizedInviteLocation(window.location);
  if(window.location.pathname+window.location.search+window.location.hash!==cleaned)
    window.history.replaceState(window.history.state,'',cleaned);
  return token;
}
