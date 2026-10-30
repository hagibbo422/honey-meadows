// Adds ?v=<version> to the local <script src> tags in index.html so browsers load the newest
// code after an update instead of an old cached copy. Run before each push:
//   node tools/stamp-version.cjs
const fs=require('fs'),path=require('path');
const file=path.join(__dirname,'..','index.html');
const v=new Date().toISOString().replace(/[-:T]/g,'').slice(0,12);
let html=fs.readFileSync(file,'utf8');
html=html.replace(/<script src="([\w.-]+\.js)(?:\?v=\w+)?"><\/script>/g,(m,f)=>`<script src="${f}?v=${v}"></script>`);
fs.writeFileSync(file,html);console.log('stamped',v);
