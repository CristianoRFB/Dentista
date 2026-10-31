/**
 * Focused accessibility regression audit on visible, real rendered UI.
 * This is NOT a WCAG certification and does not replace assistive-tech QA.
 * Never records form values, URLs with bearer tokens or personal data.
 */
export async function auditRenderedAccessibility(page){
  return page.evaluate(()=>{
    const issues=[];
    const visible=(el)=>{
      if(el.closest('[aria-hidden="true"],[hidden],[inert]'))return false;
      const style=getComputedStyle(el);
      return style.display!=='none' && style.visibility!=='hidden' && el.getClientRects().length>0;
    };
    const describe=(el)=>{
      const tag=el.tagName.toLowerCase();
      const id=el.id?'#'+el.id:'';
      const name=el.getAttribute('name')??'';
      return tag+id+(name?'[name="'+name.replace(/[^a-zA-Z0-9_-]/g,'')+'"]':'');
    };
    const resolveIds=(value)=>value?.trim().split(/\s+/).filter(Boolean)??[];
    const missingRefs=(el,attr)=>{
      for(const target of resolveIds(el.getAttribute(attr))){
        if(!document.getElementById(target))issues.push({rule:'broken-'+attr,control:describe(el)});
      }
    };
    const domIds=new Set();
    for(const el of document.querySelectorAll('[id]')){
      if(domIds.has(el.id))issues.push({rule:'duplicate-id',control:describe(el)});
      domIds.add(el.id);
    }
    const controls=document.querySelectorAll('button,a[href],input,select,textarea');
    let checked=0;
    for(const el of controls){
      if(!visible(el))continue;
      if(el instanceof HTMLInputElement && el.type==='hidden')continue;
      checked++;
      missingRefs(el,'aria-labelledby');
      missingRefs(el,'aria-describedby');
      missingRefs(el,'aria-controls');
      const aria=el.getAttribute('aria-label')?.trim();
      const labelled=resolveIds(el.getAttribute('aria-labelledby')).map(id=>document.getElementById(id)?.textContent?.trim()??'').join(' ').trim();
      const labels=('labels' in el && el.labels)?Array.from(el.labels).map(label=>label.textContent?.trim()??'').join(' ').trim():'';
      const title=el.getAttribute('title')?.trim();
      const iconAlt=el.querySelector('img[alt]')?.getAttribute('alt')?.trim();
      const text=el.textContent?.trim();
      const inputValue=el instanceof HTMLInputElement && ['submit','button','reset'].includes(el.type)?el.value.trim():'';
      if(!(aria||labelled||labels||title||iconAlt||inputValue||((el.matches('button,a[href]'))&&text)))
        issues.push({rule:'control-without-accessible-name',control:describe(el)});
      if(el instanceof HTMLImageElement && !el.hasAttribute('alt'))
        issues.push({rule:'image-without-alt',control:describe(el)});
    }
    for(const img of document.querySelectorAll('img')){
      if(visible(img) && !img.hasAttribute('alt'))
        issues.push({rule:'image-without-alt',control:describe(img)});
    }
    return {checkedControls:checked,issues};
  });
}
