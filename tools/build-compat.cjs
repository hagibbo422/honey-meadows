// Rewrites the game's scripts so they run on older iPads (Safari 12 / iPadOS 12).
// Converts newer syntax (?. and ??) into older equivalents, in place, and checks the
// inline <script> blocks in index.html. Safe to run repeatedly. Run before every push:
//   npm i -g esbuild   (or: npx esbuild …)   then   node tools/build-compat.cjs
const fs=require('fs'),path=require('path'),{execFileSync}=require('child_process');
const root=path.join(__dirname,'..');
const esbuild=process.env.ESBUILD||'esbuild';
const files=['game-data.js','game.js','thunder-feed.js','etsy-hq.js','hq-art-board.js','admin.js','catalog-data.js','books-catalog.js','research-data.js','research-board.js','compat.js'];
const transform=src=>execFileSync(esbuild,['--target=safari12','--loader=js','--log-level=error','--charset=utf8'],{input:src}).toString();
for(const f of files){const p=path.join(root,f);if(!fs.existsSync(p))continue;fs.writeFileSync(p,transform(fs.readFileSync(p,'utf8')));console.log('converted',f);}
const idx=path.join(root,'index.html');let html=fs.readFileSync(idx,'utf8');
html=html.replace(/<script>([\s\S]*?)<\/script>/g,(m,code)=>'<script>\n'+transform(code)+'</script>');
fs.writeFileSync(idx,html);console.log('converted inline scripts in index.html');
