import http from "node:http";
const source=process.env.SOURCE_URL||"https://clevedonpier.co.uk/porthole-room-camera/";
const interval=Math.max(2000,Number(process.env.SAMPLE_INTERVAL_MS||5000));
let s={started:new Date().toISOString(),samples:0,failures:0,lastSeen:null,lastBytes:0};
async function tick(){try{const r=await fetch(source,{headers:{"user-agent":"CODE33-Window/1.0"}});const x=await r.arrayBuffer();s.samples++;s.lastSeen=new Date().toISOString();s.lastBytes=x.byteLength;console.log("CODE33 observation",s.samples,s.lastSeen,s.lastBytes)}catch(e){s.failures++;console.error("CODE33 failure",String(e))}}
tick();setInterval(tick,interval);
http.createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({...s,alive:true,uptime:Math.floor(process.uptime()),source}))}).listen(Number(process.env.PORT||10000),"0.0.0.0");