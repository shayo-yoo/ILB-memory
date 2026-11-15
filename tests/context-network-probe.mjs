import { openStPage } from './st-cdp.mjs';
process.env.ST_URL='http://127.0.0.1:8001/'; process.env.CDP_PORT='9226';
const page=await openStPage(); await page.send('Runtime.enable'); await page.send('Network.enable'); await page.send('Network.setCacheDisabled',{cacheDisabled:true});
const events=[]; const oldSend=page.send; page.send=async (method,params={})=>{if(method==='Network.enable'){} return oldSend(method,params)};
await page.send('Page.reload',{ignoreCache:true});
for(let i=0;i<40;i+=1){if(await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILB)'))break;await new Promise(r=>setTimeout(r,500));}
const report=await page.evaluate(`(()=>{const ctx=SillyTavern.getContext();return{ready:Boolean(ctx&&ctx.eventSource&&ctx.eventTypes?.CHAT_COMPLETION_PROMPT_READY),promptEvent:ctx.eventTypes?.CHAT_COMPLETION_PROMPT_READY,setPrompt:typeof ctx.setExtensionPrompt==='function',generate:typeof ctx.generate==='function'}})()`); console.log(JSON.stringify(report)); page.close();
