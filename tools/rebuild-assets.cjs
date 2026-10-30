const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'..'),scope={window:{}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets-embedded.js'),'utf8'),scope);
const assets=scope.window.HONEY_MEADOWS_ASSETS;
for(const name of Object.keys(assets)){
 const file=path.join(root,'assets',name.startsWith('team_')?'teams/'+name.slice(5)+'.png':name+'.png');
 if(fs.existsSync(file))assets[name]='data:image/png;base64,'+fs.readFileSync(file).toString('base64');
}
fs.writeFileSync(path.join(root,'assets-embedded.js'),'// Offline image fallbacks. Normal PNG files take priority.\nwindow.HONEY_MEADOWS_ASSETS='+JSON.stringify(assets)+';\n');
console.log('Rebuilt '+Object.keys(assets).length+' image fallbacks.');
