import http from "node:http";
const frameUrl=process.env.FRAME_URL||"https://ipcamlive.com/player/snapshot.php?alias=portholecamera";
const interval=5000, memories=[], maxMem=720;
let s={started:new Date().toISOString(),samples:0,changes:0,failures:0,lastSeen:null,last:null,lastHash:null,lastChange:null,changeRate:0};
function hash(b){let h=2166136261;for(let i=0;i<b.length;i+=Math.max(1,Math.floor(b.length/4096))){h^=b[i];h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
async function tick(){try{const r=await fetch(frameUrl,{headers:{"user-agent":"Mozilla/5.0","cache-control":"no-cache"}});const b=Buffer.from(await r.arrayBuffer());const h=hash(b),type=r.headers.get("content-type")||"",at=new Date().toISOString(),changed=!!s.lastHash&&h!==s.lastHash;
if(changed){s.changes++;s.lastChange=at;memories.push({at,kind:"visual-change",from:s.lastHash,to:h,bytes:b.length});if(memories.length>maxMem)memories.shift()}
s.lastHash=h;s.samples++;s.lastSeen=at;s.changeRate=s.samples>1?s.changes/(s.samples-1):0;s.last={status:r.status,type,bytes:b.length,hash:h,isImage:type.startsWith("image/"),changed};
console.log("CODE33_FRAME",s.samples,at,JSON.stringify(s.last),"changes",s.changes)}catch(e){s.failures++;console.error("CODE33_FRAME_ERROR",String(e))}}
tick();setInterval(tick,interval);
http.createServer((q,r)=>{r.setHeader("access-control-allow-origin","*");r.setHeader("content-type","application/json");if(q.url==="/memory")return r.end(JSON.stringify({count:memories.length,events:memories.slice(-100)}));if(q.url==="/frame")return fetch(frameUrl,{headers:{"user-agent":"Mozilla/5.0","cache-control":"no-cache"}}).then(x=>x.arrayBuffer().then(b=>{r.setHeader("content-type",x.headers.get("content-type")||"image/jpeg");r.end(Buffer.from(b))})).catch(e=>{r.statusCode=502;r.end(String(e))});r.end(JSON.stringify({...s,alive:true,uptime:Math.floor(process.uptime()),frameUrl,memoryEvents:memories.length}))}).listen(Number(process.env.PORT||10000),"0.0.0.0");