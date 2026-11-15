import { openStPage } from './st-cdp.mjs';
import { writeFileSync } from 'fs';

/**
 * GAP-007 真实上下文验证probe
 * 目标：捕获ST发送到实际provider的最终payload，验证ILBM记忆注入内容存在。
 * 
 * 验证步骤：
 * 1. 启动真实ST + ILB + ILBM + ILBR（网络安装或本地profile）
 * 2. 启用ILBM记忆注入并应用
 * 3. 发送一条包含已知实体的消息
 * 4. 通过CDP捕获Network请求payload
 * 5. 检查payload是否包含ILBM注入的记忆文本
 */

process.env.ST_URL = 'http://127.0.0.1:8001/';
process.env.CDP_PORT = '9227';

const capturedPayloads = [];

async function captureNetworkPayloads(page) {
  // 监听Network请求
  await page.send('Network.enable');
  page.on('Network.requestWillBeSent', (event) => {
    const url = event.request.url;
    // 过滤可能的provider API端点
    if (url.includes('openai') || url.includes('api.openai') || 
        url.includes('anthropic') || url.includes('claude') ||
        url.includes('localhost') && (url.includes('v1') || url.includes('chat'))) {
      
      const postData = event.request.postData;
      if (postData) {
        try {
          const parsed = JSON.parse(postData);
          capturedPayloads.push({
            url,
            timestamp: new Date().toISOString(),
            payload: parsed
          });
          console.log(`📦 捕获请求到: ${url}`);
        } catch (e) {
          console.log(`📦 捕获请求到: ${url} (无法解析JSON)`);
        }
      }
    }
  });
}

async function main() {
  const page = await openStPage();
  
  try {
    await page.send('Runtime.enable');
    await captureNetworkPayloads(page);
    
    // 等待ST、ILB、ILBM加载
    console.log('🔄 等待扩展加载...');
    for (let i = 0; i < 40; i += 1) {
      const loaded = await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILBM)');
      if (loaded) break;
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 清空聊天，确保干净状态
    await page.evaluate(`(() => {
      const ctx = globalThis.SillyTavern?.getContext();
      if (ctx?.chat?.length > 0) {
        ctx.chat = [];
        ctx.saveChatDebounced?.();
      }
      return '聊天已清空';
    })()`);
    await new Promise(r => setTimeout(r, 1000));
    
    // 创建测试实体和记录
    console.log('🔄 创建测试记忆...');
    const setupResult = await page.evaluate(`(() => {
      try {
        // 注册测试实体
        globalThis.ILBM_MEMORY?.registerEntity?.({ name: '测试短剑', type: 'item' });
        globalThis.ILBM_MEMORY?.registerEntity?.({ name: '测试角色', type: 'person' });
        
        // 添加测试事件记录
        globalThis.ILBM_MEMORY?.addRecord?.({
          text: '测试角色将测试短剑交给另一个角色。',
          floor: 1,
          sourceMessageId: 'test-msg-1',
          swipeId: 0
        });
        
        // 启用记忆注入
        globalThis.ILBM_MEMORY?.injection?.enable?.();
        globalThis.ILBM_MEMORY?.injection?.apply?.();
        
        // 获取当前记忆文本
        const memoryText = globalThis.ILBM_MEMORY?.buildMemoryText?.({ tokenBudget: 1000 });
        return { 
          ok: true, 
          entities: globalThis.ILBM_MEMORY?.inspect?.()?.entities?.length ?? 0,
          records: globalThis.ILBM_MEMORY?.inspect?.()?.records?.length ?? 0,
          memoryText: memoryText?.text?.substring(0, 200) + '...',
          injectionEnabled: globalThis.ILBM_MEMORY?.injection?.enabled?.() ?? false
        };
      } catch (error) {
        return { ok: false, error: String(error?.message ?? error) };
      }
    })()`);
    
    console.log('📋 测试设置结果:', JSON.stringify(setupResult, null, 2));
    
    if (!setupResult.ok) {
      console.error('❌ 测试设置失败');
      return { ok: false, error: setupResult.error };
    }
    
    // 发送测试消息触发实际请求
    console.log('🔄 发送测试消息...');
    await page.evaluate(`(() => {
      try {
        const input = document.querySelector('#send_textarea, [data-id="send_textarea"], textarea[name="message"]');
        if (input) {
          input.value = '请描述一下测试短剑的情况';
          input.dispatchEvent(new Event('input', { bubbles: true }));
          
          const sendBtn = document.querySelector('#send_but, [data-id="send_but"], button[aria-label*="发送"], button:has(svg)');
          if (sendBtn) {
            sendBtn.click();
            return true;
          }
        }
        return false;
      } catch {
        return false;
      }
    })()`);
    
    // 等待请求发送（给足够时间让请求完成）
    console.log('🔄 等待请求发送...');
    await new Promise(r => setTimeout(r, 5000));
    
    // 检查捕获的payloads
    console.log(`📊 捕获到 ${capturedPayloads.length} 个可能provider请求`);
    
    const analysis = {
      totalCaptured: capturedPayloads.length,
      requests: capturedPayloads.map(p => ({
        url: p.url,
        hasMessages: Array.isArray(p.payload?.messages),
        messageCount: Array.isArray(p.payload?.messages) ? p.payload.messages.length : 0,
        hasPrompt: typeof p.payload?.prompt === 'string',
        promptLength: typeof p.payload?.prompt === 'string' ? p.payload.prompt.length : 0
      })),
      ilbmEvidence: []
    };
    
    // 检查每个payload是否包含ILBM记忆内容
    for (const req of capturedPayloads) {
      let found = false;
      const memoryKeywords = ['测试短剑', '测试角色', '记忆', '当前状态', '历史'];
      
      // 检查messages数组
      if (Array.isArray(req.payload?.messages)) {
        const allContent = req.payload.messages.map(m => m.content).join(' ');
        for (const keyword of memoryKeywords) {
          if (allContent.includes(keyword)) {
            found = true;
            analysis.ilbmEvidence.push({
              url: req.url,
              location: 'messages',
              keyword,
              sample: allContent.substring(Math.max(0, allContent.indexOf(keyword) - 50), Math.min(allContent.indexOf(keyword) + 100, allContent.length))
            });
          }
        }
      }
      
      // 检查prompt字段
      if (typeof req.payload?.prompt === 'string') {
        for (const keyword of memoryKeywords) {
          if (req.payload.prompt.includes(keyword)) {
            found = true;
            analysis.ilbmEvidence.push({
              url: req.url,
              location: 'prompt',
              keyword,
              sample: req.payload.prompt.substring(Math.max(0, req.payload.prompt.indexOf(keyword) - 50), Math.min(req.payload.prompt.indexOf(keyword) + 100, req.payload.prompt.length))
            });
          }
        }
      }
    }
    
    // 保存完整诊断报告
    const reportPath = './tests-context-payload-report.json';
    writeFileSync(reportPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      setupResult,
      capturedPayloads: capturedPayloads.map(p => ({
        url: p.url,
        timestamp: p.timestamp,
        payloadKeys: Object.keys(p.payload || {})
      })),
      analysis,
      conclusion: analysis.ilbmEvidence.length > 0 
        ? '✅ ILBM记忆内容在provider请求中被检测到'
        : '❌ 未检测到ILBM记忆内容在provider请求中'
    }, null, 2));
    
    console.log(`📄 报告已保存到: ${reportPath}`);
    console.log('🔍 分析结果:', JSON.stringify(analysis, null, 2));
    
    // 清理：关闭记忆注入
    await page.evaluate(`(() => {
      try {
        globalThis.ILBM_MEMORY?.injection?.disable?.();
        return '清理完成';
      } catch {
        return '清理失败';
      }
    })()`);
    
    return {
      ok: true,
      analysis,
      evidenceFound: analysis.ilbmEvidence.length > 0,
      reportPath
    };
    
  } catch (error) {
    console.error('❌ Probe失败:', error);
    return { ok: false, error: String(error?.message ?? error) };
  } finally {
    await page.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(result => {
    console.log('🎯 Probe完成:', JSON.stringify({ 
      ok: result.ok, 
      evidenceFound: result.evidenceFound,
      totalCaptured: result.analysis?.totalCaptured || 0,
      ilbmEvidenceCount: result.analysis?.ilbmEvidence?.length || 0
    }, null, 2));
    process.exit(result.ok && result.evidenceFound ? 0 : 1);
  }).catch(error => {
    console.error('❌ Probe异常:', error);
    process.exit(1);
  });
}

export { main };