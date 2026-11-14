import { openStPage } from './st-cdp.mjs';

const page = await openStPage();
await page.send('Runtime.enable');
await page.send('Page.enable');
await page.send('Network.enable');
await page.send('Network.setCacheDisabled', { cacheDisabled: true });
await page.send('Page.reload', { ignoreCache: true });
for (let i = 0; i < 40; i += 1) {
  if (await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILBM)')) break;
  await new Promise(resolve => setTimeout(resolve, 500));
}
if (!await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILBM)')) throw new Error('ST/ILBM readiness timeout');
const report = await page.evaluate(`(async()=>{
 const ctx=SillyTavern.getContext(); const api=ILBM;
 const raw='探针正文 (((ILBM)))';
 const display=ctx.messageFormatting(raw,'',false,false,-1);
 const requestChat=[{role:'assistant',content:raw}];
 await ctx.eventSource.emit(ctx.eventTypes.CHAT_COMPLETION_PROMPT_READY,{chat:requestChat,dryRun:false});
 const requestData={prompt:raw,sentinel:'untouched'};
 await ctx.eventSource.emit(ctx.eventTypes.GENERATE_AFTER_DATA,requestData,false);
 const stored={mes:raw,is_user:false,swipe_id:3}; const chat=[stored];
 const fakeSource={handlers:new Map(),on(name,fn){this.handlers.set(name,fn)}}; let captured=null;
 api.capture(fakeSource,()=>({chatId:'probe-chat',marker:'(((ILBM)))',getChat:()=>chat}),payload=>{captured=payload});
 fakeSource.handlers.get(ctx.eventTypes.MESSAGE_RECEIVED)(0,'probe');
 return {version:api.version,markerTriggered:api.processMarker(raw).triggered,displayHidden:!display.includes('(((ILBM)))'),promptHidden:!requestChat[0].content.includes('(((ILBM)))'),generateHidden:!requestData.prompt.includes('(((ILBM)))'),sentinel:requestData.sentinel,promptDidNotCapture:captured?.source!=='prompt-ready',capture:!!captured,captureIndex:captured?.index,sourceKey:captured?.sourceKey,extraction:captured?.result.extractionText,storedRawPreserved:stored.mes===raw};
})()`);
console.log(JSON.stringify(report));
page.close();
if(!report.markerTriggered||!report.displayHidden||!report.promptHidden||!report.generateHidden||report.sentinel!=='untouched'||!report.promptDidNotCapture||!report.capture||report.captureIndex!==0||!report.sourceKey||report.extraction!=='探针正文 '||!report.storedRawPreserved) process.exit(1);
