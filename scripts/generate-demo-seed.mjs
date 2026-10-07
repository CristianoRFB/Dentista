import { writeFileSync } from 'node:fs';
const seed={tenant:{id:'tenant_demo',name:'Clínica Demo',slug:'demo-clinica',status:'active'},membership:{role:'tenant_owner',status:'active'},note:'Não contém dados reais de pacientes.'};
writeFileSync('demo-seed.json',JSON.stringify(seed,null,2));
console.log('demo-seed.json criado');
