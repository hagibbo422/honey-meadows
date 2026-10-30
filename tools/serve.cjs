const http=require('http'),fs=require('fs'),path=require('path'),root=path.resolve(__dirname,'..');
http.createServer((req,res)=>{
 let target;try{target=path.resolve(root,'.'+decodeURIComponent(req.url.split('?')[0]));}catch{res.writeHead(400).end();return;}
 if(target===root)target=path.join(root,'index.html');
 if(!target.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(target,(error,data)=>{if(error){res.writeHead(404).end();return;}const ext=path.extname(target);res.setHeader('Content-Type',ext==='.html'?'text/html':ext==='.js'?'text/javascript':ext==='.png'?'image/png':ext==='.json'?'application/json':ext==='.css'?'text/css':'text/plain');res.end(data);});
}).listen(8765,'127.0.0.1',()=>console.log('Open http://127.0.0.1:8765 — Ctrl+C to stop.'));
