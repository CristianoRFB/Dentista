import {describe,expect,it} from 'vitest';
import {createPersonalInviteUrl, readInviteToken, sanitizedInviteLocation, INVITE_TOKEN_PATTERN} from '../src/lib/personalInviteUrl';

const secret='A'.repeat(43);
describe('D4 — personal invite URLs without bearer-token disclosure',()=>{
  it('creates clinic-scoped links in hash fragments, never HTTP query parameters',()=>{
    for(const kind of ['agendar','cadastro'] as const){
      const created=createPersonalInviteUrl('https://clinica.example','clinica-a',kind,secret);
      const parsed=new URL(created);
      expect(parsed.pathname).toBe('/clinica-a/'+kind);
      expect(parsed.search).toBe('');
      expect(parsed.hash).toBe('#token='+secret);
      expect(readInviteToken(parsed)).toBe(secret);
      expect(INVITE_TOKEN_PATTERN.test(secret)).toBe(true);
    }
  });
  it('supports previously issued query-string links and strips secrets while preserving innocuous params',()=>{
    const legacy=new URL('https://clinica.example/clinica-a/cadastro?lang=pt&token='+secret+'&view=simple');
    expect(readInviteToken(legacy)).toBe(secret);
    expect(sanitizedInviteLocation(legacy)).toBe('/clinica-a/cadastro?lang=pt&view=simple');
    const newLink=new URL('https://clinica.example/clinica-a/agendar?lang=pt#token='+secret);
    expect(sanitizedInviteLocation(newLink)).toBe('/clinica-a/agendar?lang=pt');
  });
  it('rejects malformed tokens, tenant path tricks and arbitrary fragments',()=>{
    expect(readInviteToken(new URL('https://clinica.example/clinic/agendar#token=bad'))).toBe('');
    expect(readInviteToken(new URL('https://clinica.example/clinic/agendar#section-one'))).toBe('');
    expect(()=>createPersonalInviteUrl('https://clinica.example','../other','agendar',secret)).toThrow();
    expect(()=>createPersonalInviteUrl('https://clinica.example','clinica-a','cadastro','short')).toThrow();
    expect(sanitizedInviteLocation(new URL('https://clinica.example/clinic/agendar?x=1#section-one')))
      .toBe('/clinic/agendar?x=1#section-one');
  });
});
