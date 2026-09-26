import http from "node:http";
const frameUrl=process.env.FRAME_URL||"https://ipcamlive.com/player/snapshot.php?alias=portholecamera";
let s={started:new Date().toISOString(),samples:0,changes:0,failures:0,lastSeen:null,last:null,lastHash:null};
function hash(b){let h=2166136261;for(let i=0;i<b.length;i+=Math.max(1,Math.floor(b.length/4096))){h^=b[i];h=Math.imul(h,16777619)}return (h>>>0).toString(16)}
async function tick(){try{const r=await fetch(frameUrl,{headers:{"user-agent":"Mozilla/5.0"}});const b=Buffer.from(await r.arrayBuffer());const h=hash(b),type=r.headers.get("content-type")||"";if(s.lastHash&&h!==s.lastHash)s.changes++;s.lastHash=h;s.samples++;s.lastSeen=new Date().toISOString();s.last={status:r.status,type,bytes:b.length,hash:h,isImage:type.startsWith("image/")};console.log("CODE33_FRAME",s.samples,s.lastSeen,JSON.stringify(s.last),"changes",s.changes)}catch(e){s.failures++;console.error("CODE33_FRAME_ERROR",String(e))}}
tick();setInterval(tick,5000);
http.createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({...s,alive:true,uptime:Math.floor(process.uptime()),frameUrl}))}).listen(Number(process.env.PORT||10000),"0.0.0.0");