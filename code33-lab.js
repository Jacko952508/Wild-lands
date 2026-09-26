import http from "node:http";
import fs from "node:fs";
import crypto from "node:crypto";
import dns from "node:dns/promises";
import net from "node:net";

const PORT=process.env.PORT||10000;
const P=Object.freeze({version:"7.2",seed:772033,fit:80,select:40,test:100,transfer:100,steps:22,forecastQs:[1,2,3,4,5,6],pass:"selection-only winner; frozen model; episode-level paired gain CI95 low > 0 on test and transfer"});
const N=["bias","width","height","area","mean","cx","cy","aspectSigned","aspectAbs","fill","cx*mean","cy*mean","width*mean","height*mean"];
const kinds=["null","constant","linear","quadratic"];
const expert=k=>({k,wx:Array(N.length).fill(0),wy:Array(N.length).fill(0),selectLoss:0,selectN:0});
let S={phase:"fit",episode:0,step:0,tickCount:0,lastTickAt:null,complete:false,experts:kinds.map((_,k)=>expert(k)),winner:null,fitSamples:0,selectionEpisodes:0,activeInvestigations:[],test:{n:0,m:0,b:0,ep:[]},transfer:{n:0,m:0,b:0,ep:[]},frozenAt:null,frozenHash:null,integrity:{pixelOnlyFit:true,separateSelection:true,activeProbeChosenByDisagreement:true,noPhaseRemap:true,predictionBeforeOutcome:true,frozenUnchanged:true}};
let obsByStep={},fieldF=null,episodeGains=[];

function rng(n){let x=(P.seed+n*2654435761)>>>0;x^=x<<13;x^=x>>>17;x^=x<<5;return(x>>>0)/4294967296}
function phase(e){return e<80?"fit":e<120?"select":e<220?"test":e<320?"transfer":"complete"}
function W(e,t){const z=rng(e+9000)>.5?1:-1,tr=e>=220,x0=18+rng(e+3000)*25,y0=55+rng(e+4000)*45,vx=4.8+rng(e+5000)*2,vy=-.35+rng(e+6000)*.7,fx=tr?90+rng(e+7000)*100:110+rng(e+7000)*45;let x=x0+vx*t,y=y0+vy*t;if(t>10){let q=t-10;x+=.34*z*q*q;y+=.13*z*q*q}return{x,y,z,fx}}
function render(g,e,t){const w=80,h=45,p=new Uint8Array(w*h);p.fill(Math.floor(rng(e*100+t+8000)*7));const tr=e>=220,cx=Math.max(9,Math.min(71,Math.round(g.fx/4))),cy=tr?6+Math.floor(rng(e+8100)*31):11+Math.floor(rng(e+8100)*18),L=tr?8:5,Q=tr?2:1,I=tr?120+Math.floor(rng(e+8200)*28):155+Math.floor(rng(e+8200)*30),hw=g.z>0?L:Q,hh=g.z>0?Q:L;for(let yy=-hh;yy<=hh;yy++)for(let xx=-hw;xx<=hw;xx++){let X=cx+xx,Y=cy+yy;if(X>=0&&X<w&&Y>=0&&Y<h)p[Y*w+X]=I}let ox=Math.max(1,Math.min(78,Math.round(g.x/4))),oy=Math.max(1,Math.min(43,Math.round(g.y/4)));for(let yy=-1;yy<=1;yy++)for(let xx=-1;xx<=1;xx++)p[(oy+yy)*w+ox+xx]=245;return{p,w,h}}
function observe(im,t){let sx=0,sy=0,no=0,minx=99,maxx=-1,miny=99,maxy=-1,sum=0,n=0;for(let y=0;y<im.h;y++)for(let x=0;x<im.w;x++){let v=im.p[y*im.w+x];if(v>220){sx+=x;sy+=y;no++}else if(v>100){minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);sum+=v;n++}}return{obj:no?{x:sx/no,y:sy/no,step:t}:null,field:n>6?{w:maxx-minx+1,h:maxy-miny+1,area:n,mean:sum/n,cx:(minx+maxx)/2,cy:(miny+maxy)/2}:null}}
function features(f){if(!f)return null;let w=f.w/20,h=f.h/20,a=f.area/250,m=f.mean/255,x=f.cx/80,y=f.cy/45,s=(f.w-f.h)/(f.w+f.h),ab=Math.abs(s),fill=f.area/(f.w*f.h);return[1,w,h,a,m,x,y,s,ab,fill,x*m,y*m,w*m,h*m]}
function dot(a,b){return a.reduce((s,x,i)=>s+x*b[i],0)}
function basis(k,q){if(k===0)return 0;if(k===1)return 1;if(k===2)return q/6;return(q/6)**2}
function anchor(){let a=obsByStep[9],b=obsByStep[10];if(!a||!b)return null;return{x:b.x,y:b.y,vx:b.x-a.x,vy:b.y-a.y}}
function baseline(A,q){return{x:A.x+A.vx*q,y:A.y+A.vy*q}}
function predict(e,A,F,q){let b=baseline(A,q),z=basis(e.k,q);return{base:b,model:{x:b.x+dot(e.wx,F)*z,y:b.y+dot(e.wy,F)*z}}}
function dist(a,b){return Math.hypot(a.x-b.x,a.y-b.y)}
function ci(xs){if(!xs.length)return null;let m=xs.reduce((a,b)=>a+b,0)/xs.length,v=xs.length>1?xs.reduce((s,x)=>s+(x-m)**2,0)/(xs.length-1):0,d=1.96*Math.sqrt(v/xs.length);return{mean:m,low:m-d,high:m+d}}
function score(q){let z=ci(q.ep);return{tests:q.n,episodes:q.ep.length,modelError:q.n?q.m/q.n:null,baselineError:q.n?q.b/q.n:null,gain:q.n?(q.b-q.m)/q.n:null,episodeGainCI95:z,supported:!!z&&z.low>0}}
function modelHash(){return crypto.createHash("sha256").update(JSON.stringify({experts:S.experts.map(e=>({k:e.k,wx:e.wx,wy:e.wy})),winner:S.winner})).digest("hex")}
function selected(){return S.winner==null?null:S.experts[S.winner]}
function ranked(){let e=selected();if(!e)return[];return N.map((name,i)=>({name,xWeight:e.wx[i],yWeight:e.wy[i],magnitude:Math.hypot(e.wx[i],e.wy[i])})).sort((a,b)=>b.magnitude-a.magnitude)}
function disagreement(A,F,q){let ps=S.experts.slice(1).map(e=>predict(e,A,F,q).model),mx=ps.reduce((s,p)=>s+p.x,0)/ps.length,my=ps.reduce((s,p)=>s+p.y,0)/ps.length;return ps.reduce((s,p)=>s+(p.x-mx)**2+(p.y-my)**2,0)/ps.length}
function chooseProbe(A,F){return P.forecastQs.map(q=>({q,d:disagreement(A,F,q)})).sort((a,b)=>b.d-a.d)[0]}
function report(){return{phase:S.phase,episode:S.episode,totalEpisodes:320,step:S.step,tickCount:S.tickCount,lastTickAt:S.lastTickAt,fitSamples:S.fitSamples,selectionEpisodes:S.selectionEpisodes,winner:S.winner==null?null:kinds[S.winner],selection:S.experts.map(e=>({kind:kinds[e.k],meanError:e.selectN?e.selectLoss/e.selectN:null,n:e.selectN})),representation:ranked(),activeInvestigationSummary:{count:S.activeInvestigations.length,qCounts:P.forecastQs.map(q=>({q,count:S.activeInvestigations.filter(x=>x.q===q).length})),recent:S.activeInvestigations.slice(-8)},test:score(S.test),transfer:score(S.transfer),frozenAt:S.frozenAt,frozenHash:S.frozenHash,integrity:S.integrity,complete:S.complete}}

function finishEpisode(){
 const ph=S.phase,A=anchor(),F=fieldF;
 if(A&&F){
  if(ph==="fit"){
   for(let q of P.forecastQs){let actual=obsByStep[10+q];if(!actual)continue;let b=baseline(A,q),tx=actual.x-b.x,ty=actual.y-b.y;for(let e of S.experts.slice(1)){let z=basis(e.k,q),px=dot(e.wx,F)*z,py=dot(e.wy,F)*z,ex=tx-px,ey=ty-py,lr=.012;for(let i=0;i<N.length;i++){e.wx[i]+=lr*ex*F[i]*z;e.wy[i]+=lr*ey*F[i]*z}}S.fitSamples++}
  } else if(ph==="select"){
   let probe=chooseProbe(A,F),actual=obsByStep[10+probe.q];if(actual){for(let e of S.experts){let p=predict(e,A,F,probe.q);e.selectLoss+=dist(p.model,actual);e.selectN++}S.activeInvestigations.push({episode:S.episode,q:probe.q,disagreement:probe.d});S.selectionEpisodes++}
  } else if(ph==="test"||ph==="transfer"){
   let Q=ph==="test"?S.test:S.transfer,g=[];for(let q of P.forecastQs){let actual=obsByStep[10+q];if(!actual)continue;let p=predict(selected(),A,F,q),me=dist(p.model,actual),be=dist(p.base,actual);Q.n++;Q.m+=me;Q.b+=be;g.push(be-me)}if(g.length)Q.ep.push(g.reduce((a,b)=>a+b,0)/g.length)
  }
 }
 S.episode++;S.step=0;obsByStep={};fieldF=null;episodeGains=[];
 if(S.episode===120){S.winner=S.experts.map((e,i)=>({i,l:e.selectN?e.selectLoss/e.selectN:Infinity})).sort((a,b)=>a.l-b.l)[0].i;S.frozenAt=new Date().toISOString();S.frozenHash=modelHash();console.log("V72_SELECTION_COMPLETE",JSON.stringify(report()))}
 if(S.episode===220)console.log("V72_TEST_COMPLETE",JSON.stringify(report()));
 if(S.episode>120&&modelHash()!==S.frozenHash){S.integrity.frozenUnchanged=false;throw Error("frozen model mutated")}
 if(S.episode>=320){S.phase="complete";S.complete=true;console.log("V72_COMPLETE",JSON.stringify(report()))}
}
function tick(){if(S.complete)return;S.tickCount++;S.lastTickAt=new Date().toISOString();S.phase=phase(S.episode);if(S.tickCount%220===0)console.log("V72_HEARTBEAT",JSON.stringify({phase:S.phase,episode:S.episode,step:S.step,tickCount:S.tickCount}));let o=observe(render(W(S.episode,S.step),S.episode,S.step),S.step);if(o.obj)obsByStep[S.step]=o.obj;if(o.field)fieldF=features(o.field);S.step++;if(S.step>=P.steps)finishEpisode();if(!S.complete)setTimeout(tick,35)}

const BRIDGE_CONTROL="https://api.github.com/repos/Jacko952508/Wild-lands/issues/2";
let webBridge={target:null,status:"waiting",httpStatus:null,title:null,text:"",hash:null,changedAt:null,lastObservedAt:null,error:null};
function privateIP(ip){if(net.isIP(ip)===4){let a=ip.split(".").map(Number);return a[0]===10||a[0]===127||a[0]===0||(a[0]===169&&a[1]===254)||(a[0]===172&&a[1]>=16&&a[1]<=31)||(a[0]===192&&a[1]===168)}if(net.isIP(ip)===6){let s=ip.toLowerCase();return s==="::1"||s.startsWith("fc")||s.startsWith("fd")||s.startsWith("fe80:")}return true}
async function safeURL(raw){let u=new URL(raw.trim());if(!["http:","https:"].includes(u.protocol))throw Error("http(s) only");let rs=await dns.lookup(u.hostname,{all:true});if(!rs.length||rs.some(r=>privateIP(r.address)))throw Error("private/local target blocked");return u.toString()}
async function refreshBridgeTarget(){try{let r=await fetch(BRIDGE_CONTROL,{headers:{"user-agent":"CODE33-WebBridge/1.0","accept":"application/vnd.github+json"}});if(!r.ok)throw Error("control "+r.status);let j=await r.json(),raw=String(j.body||"").split(/\s+/).find(x=>/^https?:\/\//i.test(x));if(raw){let t=await safeURL(raw);if(t!==webBridge.target){webBridge.target=t;webBridge.hash=null;webBridge.status="target-changed";console.log("WEB_BRIDGE_TARGET",JSON.stringify({target:t}))}}}catch(e){webBridge.error=String(e.message||e)}}
function pageText(html){return html.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi," ").replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi," ").replace(/<[^>]+>/g," ").replace(/&nbsp;/gi," ").replace(/&amp;/gi,"&").replace(/\s+/g," ").trim()}
async function observeBridge(){if(!webBridge.target)return;try{let target=await safeURL(webBridge.target),r=await fetch(target,{redirect:"follow",headers:{"user-agent":"Mozilla/5.0 CODE33-WebBridge/1.0"},signal:AbortSignal.timeout(10000)});let html=await r.text(),title=(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||"",txt=pageText(html).slice(0,5000),h=crypto.createHash("sha256").update(String(r.status)+"\n"+title+"\n"+txt).digest("hex"),now=new Date().toISOString(),changed=h!==webBridge.hash;webBridge={target,status:"observing",httpStatus:r.status,title:pageText(title).slice(0,300),text:txt,hash:h,changedAt:changed?now:webBridge.changedAt,lastObservedAt:now,error:null};if(changed)console.log("WEB_BRIDGE_STATE",JSON.stringify(webBridge))}catch(e){webBridge.status="error";webBridge.error=String(e.message||e);webBridge.lastObservedAt=new Date().toISOString();console.log("WEB_BRIDGE_ERROR",JSON.stringify({target:webBridge.target,error:webBridge.error}))}}
setInterval(refreshBridgeTarget,60000);setInterval(observeBridge,3000);refreshBridgeTarget().then(observeBridge);

const dash=fs.readFileSync(new URL("./code33-dashboard.html",import.meta.url),"utf8");
http.createServer((req,res)=>{if(req.url==="/api"){res.setHeader("content-type","application/json");return res.end(JSON.stringify({service:"CODE33 Development Lab",protocol:P,report:report(),webBridge}))}res.setHeader("content-type","text/html; charset=utf-8");res.end(dash)}).listen(PORT,()=>console.log("CODE33 Lab v7.2 listening",PORT));tick();
