// Encrypts the Etsy Sales sheet links with the Headquarters password, so the public code
// only contains scrambled text. Usage:
//   node tools/encrypt-sheet.cjs "<password>" "<sheetId>" "<csvUrl>"
// Paste the printed object into game-data.js as etsySecret.
const crypto=require('crypto');
const [password,etsySheetId,etsySheetCsvUrl]=process.argv.slice(2);
if(!password||!etsySheetId){console.error('Usage: node tools/encrypt-sheet.cjs "<password>" "<sheetId>" "<csvUrl>"');process.exit(1);}
const iterations=600000,salt=crypto.randomBytes(16),iv=crypto.randomBytes(12);
const key=crypto.pbkdf2Sync(password,salt,iterations,32,'sha256');
const c=crypto.createCipheriv('aes-256-gcm',key,iv);
const data=Buffer.concat([c.update(JSON.stringify({etsySheetId,etsySheetCsvUrl:etsySheetCsvUrl||''}),'utf8'),c.final(),c.getAuthTag()]);
console.log(JSON.stringify({v:1,iterations,salt:salt.toString('base64'),iv:iv.toString('base64'),data:data.toString('base64')}));
