// Minimal in-memory stand-ins for the Google Apps Script services Code.gs uses.
import fs from 'fs'; import vm from 'vm';
export function loadScript(path){
  const sheets={}, order=[]; const mails=[]; const props={}; const cache={}; const triggers=[];
  let lockFree=true;
  function mkSheet(name){const rows=[];const sh={name,rows,
    getLastRow(){let n=rows.length;while(n&&(!rows[n-1]||rows[n-1].every(v=>v===''||v==null)))n--;return n;},
    getMaxRows(){return Math.max(1000,rows.length)}, getMaxColumns(){return Math.max(26,...rows.map(r=>r?r.length:0))},
    getRange(r,c,nr=1,nc=1){const rg={
      getValues:()=>Array.from({length:nr},(_,i)=>Array.from({length:nc},(_,j)=>(rows[r-1+i]||[])[c-1+j]??'')),
      getValue:()=>(rows[r-1]||[])[c-1]??'',
      setValues:(v)=>v.forEach((row,i)=>{rows[r-1+i]=rows[r-1+i]||[];row.forEach((x,j)=>rows[r-1+i][c-1+j]=x)}),
      createTextFinder:(t)=>({matchEntireCell(){return this},findAll:()=>{const out=[];for(let i=0;i<nr;i++)for(let j=0;j<nc;j++){if(String((rows[r-1+i]||[])[c-1+j]??'')===t)out.push({getRow:()=>r+i})}return out;}})};return rg;},
    appendRow(v){rows[this.getLastRow()]=[...v]}, deleteRows(start,n){rows.splice(start-1,n)}, setFrozenRows(){}};return sh;}
  const ss={getSheetByName:n=>sheets[n],insertSheet:n=>{order.push(n);return sheets[n]=mkSheet(n)},getSheets:()=>order.map(n=>sheets[n]),getUrl:()=>'https://docs.google.com/spreadsheets/d/FAKE'};
  const ctx={SpreadsheetApp:{getActiveSpreadsheet:()=>ss},
    LockService:{getScriptLock:()=>({tryLock(){return lockFree},waitLock(){},releaseLock(){}})},
    ContentService:{createTextOutput:t=>({t,setMimeType(){return this}}),MimeType:{JSON:1}},
    PropertiesService:{getScriptProperties:()=>({getProperty:k=>props[k]??null,setProperty:(k,v)=>props[k]=v,getProperties:()=>({...props}),deleteProperty:k=>delete props[k]})},
    CacheService:{getScriptCache:()=>({get:k=>cache[k]??null,put:(k,v)=>cache[k]=v})},
    MailApp:{sendEmail:(to,subj,body)=>mails.push({to,subj,body})},
    Session:{getScriptTimeZone:()=>'America/New_York',getEffectiveUser:()=>({getEmail:()=>'owner@example.com'})},
    Utilities:{formatDate:(d)=>d.toISOString().slice(0,10)},
    ScriptApp:{getProjectTriggers:()=>triggers,deleteTrigger:t=>triggers.splice(triggers.indexOf(t),1),newTrigger:(fn)=>({timeBased(){return this},everyDays(){return this},atHour(){return this},create(){triggers.push({getHandlerFunction:()=>fn})}})},
    JSON,Array,String,Date,Math,Object,Number};
  vm.createContext(ctx); vm.runInContext(fs.readFileSync(path,'utf8'),ctx);
  return {ctx,sheets,mails,props,triggers,setLock:v=>lockFree=v};
}
