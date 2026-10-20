import {chromium} from '../web/node_modules/playwright/index.mjs';
import {mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const out=process.env.MYCREATE_TEMPLATES||'I:/Projects/my-create-templates';
await mkdir(out+'/packs',{recursive:true});await mkdir(out+'/previews',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});const templates=[];
try{const page=await browser.newPage();await page.goto('http://127.0.0.1:29118/');for(const kind of ['social','invitation','flyer']){
 const result=await page.evaluate(async kind=>{const {starter,preview,packScene,unpackScene,eachObject}=await import('/src/scene.ts');const scene=starter(kind);scene.pages[0].id=kind+'-page-1';let i=0;eachObject(scene.pages[0].canvas.objects,o=>o.id=kind+'-object-'+(++i));scene.pages[0].preview=await preview(scene.pages[0]);const bytes=new Uint8Array(await(await packScene(scene)).arrayBuffer());const check=await unpackScene(bytes);if(JSON.stringify(check)!==JSON.stringify(scene))throw Error('Starter pack failed round trip');return{bytes:[...bytes],preview:scene.pages[0].preview,title:scene.title,license:scene.license,elements:i}},kind);
 const bytes=Buffer.from(result.bytes),sha=createHash('sha256').update(bytes).digest('hex');await writeFile(out+'/packs/'+kind+'-1.0.0.mycreate',bytes);await writeFile(out+'/previews/'+kind+'.png',Buffer.from(result.preview.split(',')[1],'base64'));templates.push({id:kind,version:'1.0.0',sceneSchema:1,title:result.title,path:'packs/'+kind+'-1.0.0.mycreate',preview:'previews/'+kind+'.png',sha256:sha,size:bytes.length,elements:result.elements,...result.license});
}await writeFile(out+'/catalog.json',JSON.stringify({schema:1,version:'1.0.0',templates},null,2));console.log('Three attributed editable packs exported and round-trip verified');}finally{await browser.close()}
