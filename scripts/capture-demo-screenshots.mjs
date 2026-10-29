#!/usr/bin/env node
/**
 * Real Chromium screenshots from the RUNNING Vite demo. Not mockups or production evidence.
 * Run: npm ci && npm install --no-save --package-lock=false playwright@1.56.1
 *      npx playwright install chromium && node scripts/capture-demo-screenshots.mjs
 */
import {spawn} from 'node:child_process';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {chromium} from 'playwright';

const PORT=5174;
const ORIGIN='http://127.0.0.1:'+PORT;
const OUT=path.resolve('visual-smoke-artifacts');
const DEMO_ENV=Object.fromEntries(
  (await readFile('.env.example','utf8')).split(/\r?\n/).filter(x=>/^VITE_[A-Z0-9_]+=/.test(x))
    .map(x=>{const i=x.indexOf('=');return [x.slice(0,i),x.slice(i+1)];}),
);
const app=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port',String(PORT),'--strictPort'],{
  env:{...process.env,...DEMO_ENV,VITE_USE_DEMO_DATA:'true'},stdio:['ignore','pipe','pipe'],
});
let stderr='';
app.stderr.on('data',data=>{stderr+=String(data).slice(-3000);});
const routes=[
  {id:'pricing',url:'/precos',heading:/Planos pensados/i},
  {id:'clinic-public',url:'/demo-clinica',heading:/Odontologia clara, humana e organizada/i},
  {id:'dashboard',url:'/demo-clinica/app',heading:/Painel da clínica/i},
  {id:'agenda',url:'/demo-clinica/app/agenda',heading:/^Agenda$/i},
  {id:'patients',url:'/demo-clinica/app/pacientes',heading:/^Pacientes$/i},
  {id:'public-booking-demo',url:'/demo-clinica/agendar',heading:/Selecione um procedimento ilustrativo/i},
];
const viewports=[
  {name:'desktop',width:1365,height:850,isMobile:false},
  {name:'mobile',width:390,height:844,isMobile:true},
];
const results=[];
let browser;
try{
  await mkdir(OUT,{recursive:true});
  let ready=false;
  for(let attempt=0;attempt<100;attempt++){
    if(app.exitCode!==null)throw new Error('Vite stopped before screenshots: '+stderr);
    try{const response=await fetch(ORIGIN+'/precos');if(response.ok){ready=true;break;}}
    catch{ /* server starting */ }
    await new Promise(resolve=>setTimeout(resolve,250));
  }
  if(!ready)throw new Error('Vite demo was not reachable within 25s: '+stderr);
  browser=await chromium.launch({headless:true});
  for(const viewport of viewports){
    const context=await browser.newContext({viewport:{width:viewport.width,height:viewport.height},isMobile:viewport.isMobile,
      deviceScaleFactor:1,locale:'pt-BR',timezoneId:'America/Sao_Paulo',reducedMotion:'reduce'});
    for(const route of routes){
      const page=await context.newPage();
      try{
        await page.goto(ORIGIN+route.url,{waitUntil:'domcontentloaded',timeout:25000});
        await page.locator('h1').first().waitFor({state:'visible',timeout:25000});
        const heading=(await page.locator('h1').first().textContent())?.trim()??'';
        if(!route.heading.test(heading))throw new Error('Unexpected real heading on '+route.url+': '+heading);
        // Ensure demo runtime rendered; exclude auth/permission error pages as evidence.
        if(route.id==='dashboard'||route.id==='agenda'||route.id==='patients'){
          await page.locator('main.content .demo-banner').first().waitFor({state:'visible',timeout:15000});
        }
        await page.screenshot({path:path.join(OUT,route.id+'-'+viewport.name+'.png'),fullPage:true,animations:'disabled'});
        results.push({route:route.url,viewport:viewport.name,size:`${viewport.width}x${viewport.height}`,
          file:route.id+'-'+viewport.name+'.png',heading,classification:'SCREENSHOT_REAL_DEMO',containsOnlyFictitiousData:true});
        // Functional smoke checks run AFTER capturing the unmodified real page.
        if(viewport.name==='mobile' && route.id==='dashboard'){
          const trigger=page.locator('.app-menu-trigger');
          await trigger.click();
          await page.waitForFunction(()=>document.querySelector('.app-menu-trigger')?.getAttribute('aria-expanded')==='true');
          const links=await page.locator('.sidebar-open nav a').allTextContents();
          if(!links.some(text=>text.includes('Pacientes')))throw new Error('Mobile drawer hides permitted patient navigation');
          const modal=await page.locator('.sidebar-open').getAttribute('aria-modal');
          if(modal!=='true')throw new Error('Open mobile drawer must be a modal navigation region');
          const scrollLock=await page.evaluate(()=>document.body.style.overflow);
          if(scrollLock!=='hidden')throw new Error('Background scroll remains enabled while drawer is open');
          await page.keyboard.press('Shift+Tab');
          const trapped=await page.evaluate(()=>document.querySelector('.sidebar-open')?.contains(document.activeElement));
          if(!trapped)throw new Error('Keyboard focus escaped the open mobile drawer');
          await page.keyboard.press('Escape');
          await page.waitForFunction(()=>document.querySelector('.app-menu-trigger')?.getAttribute('aria-expanded')==='false');
          const restored=await page.evaluate(()=>document.activeElement?.classList.contains('app-menu-trigger'));
          if(!restored)throw new Error('Escape did not return focus to the menu trigger');
          if(await page.evaluate(()=>document.body.style.overflow==='hidden'))
            throw new Error('Mobile background scroll remained locked after closing the drawer');
        }
        if(route.id==='patients'){
          const search=page.locator('input[type="search"][aria-label="Buscar paciente pelo nome ou contato"]');
          await search.fill('marina');
          await page.waitForFunction(()=>document.querySelectorAll('.clinical-stack-table tbody tr').length===1);
          const names=(await page.locator('.clinical-stack-table tbody').textContent())??'';
          if(!names.includes('Marina')||names.includes('Carlos'))throw new Error('Patient filter did not limit visible rows');
          await search.fill('');
          await page.waitForFunction(()=>document.querySelectorAll('.clinical-stack-table tbody tr').length===3);
        }
      }finally{await page.close();}
    }
    await context.close();
  }
  await writeFile(path.join(OUT,'SCREENSHOTS_MANIFEST.json'),JSON.stringify({
    classification:'SCREENSHOT_REAL_DEMO',capturedAt:new Date().toISOString(),
    source:'running Vite development server with VITE_USE_DEMO_DATA=true',
    notProduction:true,notClientData:true,notConceptArt:true,images:results,
  },null,2)+'\n');
  process.stdout.write('Captured '+results.length+' real demo screenshots. No production login or data used.\n');
}catch(error){
  process.stderr.write(String(error)+'\n'+stderr.slice(-1500)+'\n');
  process.exitCode=1;
}finally{
  await browser?.close();
  app.kill('SIGTERM');
}
