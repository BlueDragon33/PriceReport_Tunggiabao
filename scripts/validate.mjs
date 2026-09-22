import fs from 'node:fs';
const required=['index.html','assets/styles.css','assets/icon.svg','src/app.js','manifest.webmanifest','sw.js'];
for(const path of required){if(!fs.existsSync(path)) throw new Error('Missing required file: '+path)}
const html=fs.readFileSync('index.html','utf8');
const css=fs.readFileSync('assets/styles.css','utf8');
const js=fs.readFileSync('src/app.js','utf8');
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(x=>x[1]);
const dup=ids.filter((id,i)=>ids.indexOf(id)!==i);
if(dup.length) throw new Error('Duplicate ids: '+[...new Set(dup)].join(', '));
const refs=[...js.matchAll(/\$\('([^']+)'\)/g)].map(x=>x[1]);
const missing=[...new Set(refs.filter(id=>!ids.includes(id)))];
if(missing.length) throw new Error('App references missing DOM ids: '+missing.join(', '));
if(!css.includes('@media print')||!css.includes('@page')) throw new Error('A4 print rules missing');
if(!html.includes('manifest.webmanifest')) throw new Error('Manifest link missing');
JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
console.log('Static validation PASS:', {ids:ids.length, domRefs:new Set(refs).size});
