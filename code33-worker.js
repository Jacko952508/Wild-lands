import http from "node:http";
const source=process.env.SOURCE_URL||"https://g0.ipcamlive.com/player/player.php?alias=portholecamera";
const interval=Math.max(2000,Number(process.env.SAMPLE_INTERVAL_MS||5000));
let s={started:new Date().toISOString(),samples:0,changes:0,failures:0,lastSeen:null,lastBytes:0,lastFingerprint:null};
function fp(buf){let x=2166136261;const step=Math.max(1,Math.floor(buf.length/2048));for(let i=0;i<buf.length;i+=step){x^=buf[i];x=Math.imul(x,16777619)}return (x>>>0).toString(16)}
async function tick(){try{const r=await fetch(source,{headers:{"user-agent":"Mozilla/5.0"}});const b=Buffer.from(await r.arrayBuffer());const f=fp(b);s.samples++;s.lastSeen=new Date().toISOString();s.lastBytes=b.length;if(s.lastFingerprint&&s.lastFingerprint!==f)s.changes++;s.lastFingerprint=f;console.log("CODE33 visual-source",s.samples,s.lastSeen,b.length,f,s.changes)}catch(e){s.failures++;console.error("CODE33 failure",String(e))}}
tick();setInterval(tick,interval);
http.createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({...s,alive:true,uptime:Math.floor(process.uptime()),source}))}).listen(Number(process.env.PORT||10000),"0.0.0.0");