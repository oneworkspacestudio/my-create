import {loadSVGFromString,Group,util} from 'fabric';
import {blank,stamp,serial,rasterPreview,uid,type Scene} from './scene';

export function sanitizeSVG(text:string){
 if(/<!DOCTYPE|<!ENTITY/i.test(text))throw Error('SVG entity and DTD declarations are not allowed');
 const doc=new DOMParser().parseFromString(text,'image/svg+xml');if(doc.querySelector('parsererror')||doc.documentElement.localName!=='svg')throw Error('Malformed SVG');
 const warnings=new Set<string>();const allowed=new Set('svg g defs title desc text tspan path rect circle ellipse line polygon polyline image linearGradient radialGradient stop clipPath mask pattern symbol style'.split(' '));
 let n=0;const visit=(el:Element,depth:number)=>{if(++n>30000||depth>64)throw Error('SVG nesting/object limit exceeded');if(!allowed.has(el.localName)){warnings.add('Removed unsupported or unsafe SVG <'+el.localName+'>');el.remove();return}for(const a of [...el.attributes]){const v=a.value.trim();if(/^on/i.test(a.localName)||['base'].includes(a.localName)||/javascript:|vbscript:|expression\s*\(|@import/i.test(v)){el.removeAttributeNode(a);warnings.add('Removed active SVG content');continue}if(a.localName==='href'){if(!v.startsWith('#')&&!(el.localName==='image'&&/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(v))){el.removeAttributeNode(a);warnings.add('External SVG resources were removed; embed images before importing')}}if(/url\s*\(/i.test(v)&&!/^([^u]|u(?!rl\s*\())*$/i.test(v)){const urls=[...v.matchAll(/url\s*\(\s*['"]?([^)'"\s]+)['"]?\s*\)/gi)];if(!urls.length||urls.some(x=>!x[1].startsWith('#'))){el.removeAttributeNode(a);warnings.add('External SVG styles were removed')}}}
  if(el.localName==='image'&&![...el.attributes].some(a=>a.localName==='href'&&a.value.startsWith('data:image/'))){el.remove();warnings.add('Removed image without a safe embedded raster source');return}
  if(el.localName==='style'&&/@|url\s*\(|expression|javascript:/i.test(el.textContent||'')){el.remove();warnings.add('Complex stylesheet removed; use inline SVG styles');return}
  if(['mask','pattern'].includes(el.localName)||el.hasAttribute('filter'))warnings.add('SVG masks, patterns and filters may differ in the editable result; compare with the source');
  [...el.children].forEach(c=>visit(c,depth+1))};visit(doc.documentElement,0);
 const root=doc.documentElement,view=(root.getAttribute('viewBox')||'').trim().split(/[ ,]+/).map(Number);const dimension=(s:string|null,fallback:number)=>{if(!s||s.includes('%'))return fallback;const n=parseFloat(s);return n*(s.endsWith('in')?96:s.endsWith('cm')?96/2.54:s.endsWith('mm')?96/25.4:s.endsWith('pt')?96/72:1)};
 const width=dimension(root.getAttribute('width'),view[2]||1080),height=dimension(root.getAttribute('height'),view[3]||1080);if(!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||width>16000||height>16000||width*height>40e6)throw Error('SVG dimensions exceed limits');
 root.setAttribute('width',String(width));root.setAttribute('height',String(height));root.setAttribute('xmlns','http://www.w3.org/2000/svg');return{text:new XMLSerializer().serializeToString(doc),width,height,warnings:[...warnings]}
}
export async function importSVG(text:string,title:string,signal:AbortSignal):Promise<Scene>{
 const clean=sanitizeSVG(text),s=blank(title,clean.width,clean.height);s.report.format='svg';s.report.warnings.push(...clean.warnings);
 const parsed=await loadSVGFromString(clean.text,undefined,{signal});const objects:any[]=[];
 for(let i=0;i<parsed.objects.length;i++){const o:any=parsed.objects[i];if(!o)continue;const element=parsed.elements[i];stamp(o,element?.getAttribute('id')||o.type,{kind:'native',format:'svg',source:'element '+(i+1)});
  if(o.text&&element?.localName==='text'&&element.querySelector('tspan')){let offset=0;const styles:any={0:{}};for(const span of element.querySelectorAll('tspan')){const value=span.textContent||'',at=o.text.indexOf(value,offset);if(at<0)continue;const st:any={};for(const [attr,key]of [['font-weight','fontWeight'],['font-style','fontStyle'],['font-family','fontFamily'],['fill','fill'],['font-size','fontSize']]){const v=span.getAttribute(attr)||(span as any).style?.getPropertyValue(attr);if(v)st[key]=key==='fontSize'?parseFloat(v):v}for(let j=at;j<at+value.length;j++)styles[0][j]=st;offset=at+value.length;if(span.hasAttribute('dy')||span.hasAttribute('x'))s.report.warnings.push('Positioned SVG text runs may wrap differently; inspect text baselines.')}o.set({styles});o.initDimensions?.();}
  objects.push(o);if(o.fontFamily)s.report.fonts.push(o.fontFamily)}
 // Fabric resolves inherited transformations/paint into world-space objects.
 // Rebuild SVG groups without changing the resolved visual coordinates.
 const byElement=new Map<Element,any>();parsed.objects.forEach((o,i)=>{if(o)byElement.set(parsed.elements[i],o)});
 const groupFor=(element:Element):any[]=>{const own=byElement.get(element);if(own)return[own];const kids=[...element.children].flatMap(groupFor);if(element.localName==='g'&&kids.length>1)return[stamp(new Group(kids),element.getAttribute('id')||'SVG group',{kind:'native',format:'svg'})];return kids};
 let grouped=objects;const common=parsed.elements[0]?.ownerDocument.documentElement;if(common){const found=groupFor(common);if(found.length)grouped=found}
 s.pages[0].canvas=serial(grouped,'rgba(0,0,0,0)');s.pages[0].previewKind='sanitized source';
 const url=URL.createObjectURL(new Blob([clean.text],{type:'image/svg+xml'}));try{s.pages[0].preview=await rasterPreview(url,Math.round(clean.width),Math.round(clean.height))}finally{URL.revokeObjectURL(url)}
 if(!objects.some(o=>/text/i.test(o.type)))s.report.warnings.push('No editable text was found. Outlined lettering remains vector paths; OCR can only infer replacement text.');
 s.report.fonts=[...new Set(s.report.fonts)];return s
}
