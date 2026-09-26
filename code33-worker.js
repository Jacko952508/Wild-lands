import http from "node:http";
const source=process.env.SOURCE_URL||"https://g0.ipcamlive.com/player/player.php?alias=portholecamera";
const interval=5000; let s={started:new Date().toISOString(),samples:0,changes:0,failures:0,lastSeen:null,mediaHints:[]};
function hints(t){return [...new Set((t.match(/[^"'\s<>]{0,100}(?:m3u8|hls|webrtc|snapshot|jpeg|jpg|stream)[^"'\s<>]{0,180}/gi)||[]).map(x=>x.replace(/\\\//g,"/").replace(/&amp;/g,"&"))) ].slice(0,30)}
async function tick(){try{const r=await fetch(source,{headers:{"user-agent":"Mozilla/5.0"}});const t=await r.text();const h=hints(t);s.samples++;s.lastSeen=new Date().toISOString();if(h.length)s.mediaHints=h;console.log("CODE33 media-hints",JSON.stringify({n:s.samples,at:s.lastSeen,hints:h}))}catch(e){s.failures++;console.error("CODE33 failure",String(e))}}
tick();setInterval(tick,interval);
http.createServer((q,r)=>{r.setHeader("content-type","application/json");r.end(JSON.stringify({...s,alive:true,uptime:Math.floor(process.uptime()),source}))}).listen(Number(process.env.PORT||10000),"0.0.0.0");