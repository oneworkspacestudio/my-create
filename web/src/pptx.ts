import {Rect,Ellipse,Triangle,Line,Polygon,Path,Textbox,Group,Point,util} from 'fabric';
import {strFromU8} from 'fflate';
import {blank,stamp,serial,imageFrom,preview,safeArchive,uid,type Scene} from './scene';

const EMU=9525;
const child=(e:Element|undefined,name:string)=>e?[...e.children].find(x=>x.localName===name):undefined;
const all=(e:Element|Document|undefined,name:string):Element[]=>e?Array.from(e.getElementsByTagNameNS('*',name)):[];
const first=(e:Element|Document|undefined,name:string)=>all(e,name)[0];
const a=(e:Element|undefined,k:string,d='')=>e?.getAttribute(k)??d;
const num=(e:Element|undefined,k:string,d=0)=>Number(a(e,k,String(d)));
export function xml(s:string){if(/<!DOCTYPE|<!ENTITY/i.test(s)||s.length>8*1024*1024)throw Error('Unsafe or oversized XML');const d=new DOMParser().parseFromString(s,'application/xml');if(d.querySelector('parsererror'))throw Error('Malformed presentation XML');if(d.getElementsByTagName('*').length>100000)throw Error('XML object limit');return d}
function target(base:string,relative:string){if(/^[a-z]+:|^\/|\\|\u0000/i.test(relative))throw Error('External or unsafe presentation resource');const parts=base.split('/').slice(0,-1);for(const p of relative.split('/')){if(p==='..'){if(!parts.length)throw Error('Resource escapes archive');parts.pop()}else if(p!=='.'&&p)parts.push(p)}return parts.join('/')}
function dataURL(bytes:Uint8Array,name:string){const type=/\.jpe?g$/i.test(name)?'jpeg':/\.png$/i.test(name)?'png':/\.webp$/i.test(name)?'webp':'';if(!type)throw Error('Unsupported embedded media: '+name.split('.').pop());let s='';for(let i=0;i<bytes.length;i+=32768)s+=String.fromCharCode(...bytes.subarray(i,i+32768));return'data:image/'+type+';base64,'+btoa(s)}

export async function importPPTX(bytes:Uint8Array,title:string,signal:AbortSignal,onProgress:(t:string)=>void):Promise<Scene>{
 const files=safeArchive(bytes);const read=(p:string)=>files[p]?xml(strFromU8(files[p])):undefined;
 const rels=(p:string)=>{const rp=p.slice(0,p.lastIndexOf('/')+1)+'_rels/'+p.slice(p.lastIndexOf('/')+1)+'.rels';const map=new Map<string,{path:string;type:string;external:boolean}>();for(const r of all(read(rp),'Relationship')){const ext=a(r,'TargetMode')==='External';map.set(a(r,'Id'),{path:ext?'':target(p,a(r,'Target')),type:a(r,'Type'),external:ext})}return map};
 const pres=read('ppt/presentation.xml');if(!pres)throw Error('PowerPoint presentation missing');const size=first(pres,'sldSz'),width=num(size,'cx',9144000)/EMU,height=num(size,'cy',6858000)/EMU;
 const scene=blank(title,width,height);scene.pages=[];scene.report.format='pptx';const warnings=new Set<string>(['PPTX comparison is a reconstructed preview, not an independent PowerPoint rendering. Keep the original for fidelity review.']);
 const theme=read('ppt/theme/theme1.xml'),scheme=first(theme,'clrScheme');const colors:Record<string,string>={tx1:'#000000',bg1:'#ffffff',tx2:'#1f497d',bg2:'#eeeeee'};for(const c of scheme?.children||[]){const v=c.children[0];colors[c.localName]='#'+(v?.getAttribute('val')==='windowText'||v?.localName==='sysClr'?v?.getAttribute('lastClr')||'000000':v?.getAttribute('val')||'000000')};colors.tx1=colors.dk1||colors.tx1;colors.bg1=colors.lt1||colors.bg1;colors.tx2=colors.dk2||colors.tx2;colors.bg2=colors.lt2||colors.bg2;
 const color=(e:Element|undefined,fallback='#2563eb')=>{const rgb=first(e,'srgbClr'),sys=first(e,'sysClr'),sch=first(e,'schemeClr');let c=rgb?'#'+a(rgb,'val'):sys?'#'+a(sys,'lastClr','000000'):sch?colors[a(sch,'val')]||fallback:fallback;const mod=first(e,'lumMod'),off=first(e,'lumOff');if(/^#[a-f0-9]{6}$/i.test(c)&&(mod||off)){c='#'+[1,3,5].map(i=>Math.min(255,Math.max(0,Math.round(parseInt(c.slice(i,i+2),16)*num(mod,'val',100000)/100000+255*num(off,'val',0)/100000))).toString(16).padStart(2,'0')).join('')}return c};
 const fill=(e:Element|undefined,fallback='transparent')=>child(e,'noFill')?'transparent':child(e,'solidFill')?color(child(e,'solidFill'),fallback):fallback;
 const rmap=rels('ppt/presentation.xml');const slides=all(pres,'sldId');if(!slides.length||slides.length>60)throw Error('Presentation must contain 1–60 slides');let objectCount=0;
 for(let si=0;si<slides.length;si++){
  signal.throwIfAborted();onProgress('Reading slide '+(si+1)+' of '+slides.length);
  const rid=slides[si].getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id')||slides[si].getAttribute('r:id')||'';const spath=rmap.get(rid)?.path;if(!spath)throw Error('Slide relationship missing');const slide=read(spath),relationships=rels(spath);
  const layoutPath=[...relationships.values()].find(r=>r.type.endsWith('/slideLayout'))?.path;const layout=layoutPath?read(layoutPath):undefined;const lr=layoutPath?rels(layoutPath):new Map();const masterPath=[...lr.values()].find(r=>r.type.endsWith('/slideMaster'))?.path;const master=masterPath?read(masterPath):undefined;
  const placeholder=(e:Element,container:Document|undefined)=>{const ph=first(e,'ph');if(!ph)return undefined;return all(container,'sp').find(s=>{const p=first(s,'ph');return p&&a(p,'idx','0')===a(ph,'idx','0')&&a(p,'type','body')===a(ph,'type','body')})};
  async function parseShape(el:Element,part:string,relationships:ReturnType<typeof rels>,depth=0):Promise<any[]>{
   if(depth>32||++objectCount>12000)throw Error('Presentation object/group limit exceeded');signal.throwIfAborted();
   if(['nvGrpSpPr','grpSpPr','extLst'].includes(el.localName))return[];
   const inherited=placeholder(el,layout)||placeholder(el,master);const xp=first(el,'xfrm')||first(inherited,'xfrm');const off=child(xp,'off'),ext=child(xp,'ext');const x=num(off,'x')/EMU,y=num(off,'y')/EMU,w=num(ext,'cx',EMU*100)/EMU,h=num(ext,'cy',EMU*50)/EMU;const rotation=num(xp,'rot')/60000;
   const name=a(first(el,'cNvPr'),'name',el.localName);const evidence={kind:'native' as const,format:'pptx',source:part+'#'+a(first(el,'cNvPr'),'id')};
   const place=(o:any)=>{o.set({left:x+w/2,top:y+h/2,originX:'center',originY:'center',angle:rotation,flipX:a(xp,'flipH')==='1',flipY:a(xp,'flipV')==='1'});return stamp(o,name,evidence)};
   if(el.localName==='grpSp'){
    const kids=[] as any[];for(const c of el.children)kids.push(...await parseShape(c,part,relationships,depth+1));if(!kids.length)return[];
    const co=child(xp,'chOff'),ce=child(xp,'chExt'),sx=w/(num(ce,'cx',w*EMU)/EMU||1),sy=h/(num(ce,'cy',h*EMU)/EMU||1);
    const rad=rotation*Math.PI/180,rot=[Math.cos(rad),Math.sin(rad),-Math.sin(rad),Math.cos(rad),x+w/2,y+h/2];const scale=[sx,0,0,sy,-num(co,'x')/EMU*sx-w/2,-num(co,'y')/EMU*sy-h/2];const matrix=util.multiplyTransformMatrices(rot as any,scale as any);
    kids.forEach(o=>util.addTransformToObject(o,matrix));return[stamp(new Group(kids),name,evidence)]
   }
   if(el.localName==='pic'){
    const blip=first(el,'blip'),id=blip?.getAttribute('r:embed')||blip?.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','embed')||'',rel=relationships.get(id);
    if(!rel||rel.external||!files[rel.path]){warnings.add('Linked or missing pictures were omitted');return[]}
    try{const image=await imageFrom(dataURL(files[rel.path],rel.path),name,evidence);const crop=first(el,'srcRect');if(crop){const l=num(crop,'l')/1e5,t=num(crop,'t')/1e5,rr=num(crop,'r')/1e5,b=num(crop,'b')/1e5;const iw=image.width,ih=image.height;image.set({cropX:iw*l,cropY:ih*t,width:iw*(1-l-rr),height:ih*(1-t-b)})};image.set({scaleX:w/image.width,scaleY:h/image.height});return[place(image)]}catch(e:any){warnings.add(e.message);return[]}
   }
   if(el.localName==='graphicFrame'){
    const table=first(el,'tbl');if(!table){warnings.add('Charts, SmartArt and embedded media are not reconstructed; consult the original presentation');return[]}
    const columns=all(first(table,'tblGrid'),'gridCol').map(c=>num(c,'w')/EMU),objects:any[]=[];let top=y;
    for(const row of all(table,'tr')){let left=x;const rh=num(row,'h',EMU*40)/EMU;for(const [ci,cell] of all(row,'tc').entries()){const cw=columns[ci]||w/Math.max(1,columns.length);objects.push(stamp(new Rect({left,top,width:cw,height:rh,fill:fill(child(cell,'tcPr'),'#ffffff'),stroke:'#cbd5e1',strokeWidth:1}),name+' cell',evidence));const text=all(cell,'t').map(t=>t.textContent||'').join(' ');objects.push(stamp(new Textbox(text,{left:left+5,top:top+5,width:Math.max(1,cw-10),fontFamily:'Arial',fontSize:16,fill:'#18233b'}),name+' text',evidence));left+=cw};top+=rh};warnings.add('Table cells are editable text and shapes; merged cells and table styles are approximated');return[stamp(new Group(objects),name,evidence)]
   }
   if(el.localName!=='sp'&&el.localName!=='cxnSp'){warnings.add('Unsupported presentation element: '+el.localName);return[]}
   const pr=child(el,'spPr'),geom=first(pr,'prstGeom'),preset=a(geom,'prst','rect'),line=child(pr,'ln'),style=child(el,'style'),fillColor=fill(pr,first(style,'fillRef')?color(first(style,'fillRef'),'transparent'):'transparent');
   const options:any={width:w,height:h,fill:fillColor,stroke:line?fill(line,'transparent'):'transparent',strokeWidth:num(line,'w')/EMU};
   let shape:any;
   if(preset==='ellipse')shape=new Ellipse({...options,rx:w/2,ry:h/2});else if(preset==='triangle')shape=new Triangle(options);else if(preset==='line'||el.localName==='cxnSp')shape=new Line([-w/2,-h/2,w/2,h/2],{...options,stroke:options.stroke==='transparent'?'#18233b':options.stroke,strokeWidth:options.strokeWidth||1});else if(preset==='diamond')shape=new Polygon([{x:w/2,y:0},{x:w,y:h/2},{x:w/2,y:h},{x:0,y:h/2}],options);else {shape=new Rect({...options,rx:preset==='roundRect'?Math.min(w,h)*.12:0,ry:preset==='roundRect'?Math.min(w,h)*.12:0});if(!['rect','roundRect'].includes(preset)||first(pr,'custGeom'))warnings.add('Some custom shape geometry is approximated as rectangles')}
   if(first(pr,'gradFill')||first(pr,'effectLst')||first(pr,'blipFill'))warnings.add('Some PowerPoint gradients, effects or picture fills are approximated');
   const objects:any[]=[];if(fillColor!=='transparent'||options.stroke!=='transparent'||el.localName==='cxnSp')objects.push(place(shape));
   const tx=child(el,'txBody');if(tx){let text='',styles:Record<number,any>={},lineIndex=0;const body=first(tx,'bodyPr');let fontSize=24,fontFamily='Arial',alignment='left';
    const paragraphs=all(tx,'p');for(const [pi,p] of paragraphs.entries()){const pp=child(p,'pPr'),def=first(pp,'defRPr')||first(inherited,'defRPr');alignment=({ctr:'center',r:'right',just:'justify'} as any)[a(pp,'algn')]||'left';let index=0;styles[lineIndex]={};for(const run of p.children){if(run.localName==='br'){text+='\n';lineIndex++;index=0;styles[lineIndex]={};continue}if(!['r','fld'].includes(run.localName))continue;const value=first(run,'t')?.textContent||'',rp=child(run,'rPr')||def;const size=num(rp,'sz',num(def,'sz',1800))/100*96/72;const family=a(first(rp,'latin'),'typeface',a(first(def,'latin'),'typeface','Arial'));fontFamily=family.startsWith('+')?'Arial':family;fontSize=size;const st={fontSize:size,fontFamily,fontWeight:a(rp,'b')==='1'?'bold':'normal',fontStyle:a(rp,'i')==='1'?'italic':'normal',underline:a(rp,'u')==='sng',fill:color(first(rp,'solidFill'),'#18233b')};for(let j=0;j<value.length;j++)styles[lineIndex][index++]=st;text+=value;scene.report.fonts.push(fontFamily)}if(pi<paragraphs.length-1){text+='\n';lineIndex++}}
    if(text){const left=num(body,'lIns',91440)/EMU,right=num(body,'rIns',91440)/EMU,top=num(body,'tIns',45720)/EMU;const textbox=stamp(new Textbox(text,{left:x+left,top:y+top,width:Math.max(1,w-left-right),fontFamily,fontSize,styles,textAlign:alignment as any,fill:'#18233b',lineHeight:1.1,angle:rotation}),name+' text',evidence);if(rotation){const center=new Point(x+w/2,y+h/2);const point=new Point(x+left,y+top).rotate(rotation*Math.PI/180,center);textbox.set({left:point.x,top:point.y})}objects.push(textbox)}
   }
   return objects
  }
  let objects:any[]=[];
  // Non-placeholder master/layout artwork remains behind slide objects.
  for(const [doc,part] of [[master,masterPath],[layout,layoutPath]] as const){if(doc&&part){for(const el of first(doc,'spTree')?.children||[]){if(first(el,'ph'))continue;objects.push(...await parseShape(el,part,rels(part)))}}}
  for(const el of first(slide,'spTree')?.children||[])objects.push(...await parseShape(el,spath,relationships));
  const bg=first(slide,'bgPr')||first(layout,'bgPr')||first(master,'bgPr');const page={id:uid(),name:'Slide '+(si+1),width,height,canvas:serial(objects,fill(bg,'#ffffff')),preview:'',previewKind:'PPTX reconstruction (not independent source)'};page.preview=await preview(page);scene.pages.push(page);await new Promise(r=>setTimeout(r,0));
 }
 scene.report.warnings=[...warnings];scene.report.fonts=[...new Set(scene.report.fonts)];return scene
}
