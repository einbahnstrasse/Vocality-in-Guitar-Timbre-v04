// Runs apps-script/Code.gs against an in-memory imitation of Google Sheets (tests/gasmock.mjs).
// Usage: node tests/apps-script.test.mjs   (no installs needed)
import {loadScript} from './gasmock.mjs';
import {fileURLToPath} from 'url';
const CODE=fileURLToPath(new URL('../apps-script/Code.gs', import.meta.url));
const G=loadScript(CODE);
const post=(o)=>JSON.parse(G.ctx.doPost({postData:{contents:typeof o==='string'?o:JSON.stringify(o)}}).t);
const rows=(id,tag)=>Array.from({length:17},(_,i)=>({question:i+1,part:i<5?1:2,test_file:'f',answer:tag,A_plays:i}));
const ids=['DOE-Jane-1','ROE-Sam-2','POE-Al-3'];
for(const id of ids) post({sessionId:id,lastName:id.split('-')[0],status:'in progress',answers:{1:'A'}});
console.log('in-progress saves → Responses rows:',G.sheets.Responses.getLastRow()-1,'| Listening tab exists:',!!G.sheets.Listening);
for(const id of ids) post({sessionId:id,status:'complete',answers:{1:'B'},rows:rows(id,'v1')});
console.log('after submit → Listening rows:',G.sheets.Listening.getLastRow()-1,'(expect 51)');
// shuffle Listening data rows (as if user sorted by question)
const L=G.sheets.Listening.rows; const body=L.slice(1).sort((a,b)=>a[4]-b[4]||String(a[1]).localeCompare(b[1])); L.splice(1,L.length-1,...body);
post({sessionId:'ROE-Sam-2',status:'complete',answers:{1:'C'},rows:rows('ROE-Sam-2','v2')});  // resubmit after sort
const lr=G.sheets.Listening.rows.slice(1);
console.log('after sorted + resubmit → Listening rows:',lr.length,'(expect 51) | ROE rows:',lr.filter(r=>r[1]==='ROE-Sam-2').length,'all v2:',lr.filter(r=>r[1]==='ROE-Sam-2').every(r=>r[7]==='v2'),'| others intact:',lr.filter(r=>r[1]!=='ROE-Sam-2').length===34);
console.log('Responses rows:',G.sheets.Responses.getLastRow()-1,'| ROE Q1:',G.sheets.Responses.rows.find(r=>r[1]==='ROE-Sam-2')[5]);
console.log('stats today:',Object.entries(G.props).map(([k,v])=>k+'='+v).join(' '));
// busy
G.setLock(false); console.log('busy response:',JSON.stringify(post({sessionId:'X',status:'in progress'}))); G.setLock(true);
// errors → one email
console.log('bad JSON:',post('not json').ok, post('{also bad').ok, '| error emails sent:',G.mails.filter(m=>m.subj.includes('failed')).length,'(expect 1)');
// health
console.log('health:',G.ctx.doGet().t, '| Status row:',JSON.stringify(G.sheets.Status.rows[1].slice(1)));
// setup + summary (move today's stats to "yesterday")
G.ctx.setup(); G.ctx.setup(); console.log('triggers after 2x setup:',G.triggers.length,'| setup email:',G.mails.at(-1).subj);
const today=Object.keys(G.props)[0]; const y=new Date(Date.now()-864e5).toISOString().slice(0,10); G.props['stats:'+y]=G.props[today];
G.ctx.dailySummary(); console.log('summary email:',G.mails.at(-1).subj); console.log(G.mails.at(-1).body);
