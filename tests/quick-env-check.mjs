import { openStPage } from './st-cdp.mjs';

process.env.ST_URL = 'http://127.0.0.1:8001/';
process.env.CDP_PORT = '9227';

async function quickCheck() {
  const page = await openStPage();
  
  try {
    await page.send('Runtime.enable');
    await page.send('Network.enable');
    
    console.log('🔍 检查ST环境...');
    const env = await page.evaluate(`(() => {
      const result = {
        timestamp: new Date().toISOString(),
        st: Boolean(globalThis.SillyTavern),
        stContext: Boolean(globalThis.SillyTavern?.getContext),
        ilbm: Boolean(globalThis.ILBM),
        ilbmMemory: Boolean(globalThis.ILBM_MEMORY),
        ilbSeries: Boolean(globalThis.ILB_SERIES),
        ilbSeriesMemory: Boolean(globalThis.ILB_SERIES?.memory),
        injectionAvailable: Boolean(globalThis.ILBM_MEMORY?.injection?.enable),
        currentChatId: globalThis.SillyTavern?.getContext?.()?.getCurrentChatId?.() || 'unknown'
      };
      
      // 检查扩展设置入口是否可见
      const settingsEntry = document.querySelector('#ilbm-settings-entry');
      result.settingsEntryVisible = settingsEntry && 
        !settingsEntry.hidden && 
        getComputedStyle(settingsEntry).display !== 'none';
      
      // 检查shell是否存在且隐藏
      const shell = document.querySelector('#ilbm-shell');
      result.shellExists = Boolean(shell);
      result.shellHidden = shell ? shell.hidden : true;
      result.shellHasHiddenAttr = shell ? shell.hasAttribute('hidden') : true;
      
      return result;
    })()`);
    
    console.log('📋 环境状态:', JSON.stringify(env, null, 2));
    
    // 检查ILBM基本功能
    console.log('🔍 测试ILBM基本功能...');
    const funcTest = await page.evaluate(`(() => {
      try {
        // 测试标记处理
        const markerResult = globalThis.ILBM?.processMarker?.('(((ILBM:[entity:短剑] 转移 [entity:甲])))') || {};
        
        // 测试实体注册
        const entityResult = globalThis.ILBM_MEMORY?.registerEntity?.({ name: '测试检查', type: 'item' }) || {};
        
        // 测试记忆状态
        const inspectResult = globalThis.ILBM_MEMORY?.inspect?.() || {};
        
        return {
          ok: true,
          markerProcessed: markerResult.ok !== false,
          entityRegistered: entityResult.id ? true : false,
          hasEntities: Array.isArray(inspectResult.entities),
          entityCount: Array.isArray(inspectResult.entities) ? inspectResult.entities.length : 0,
          hasRecords: Array.isArray(inspectResult.records),
          hasCurrentState: Boolean(inspectResult.currentState)
        };
      } catch (error) {
        return { ok: false, error: String(error?.message ?? error) };
      }
    })()`);
    
    console.log('📋 功能测试:', JSON.stringify(funcTest, null, 2));
    
    return {
      ok: env.st && env.ilbm && env.ilbmMemory,
      environment: env,
      functions: funcTest,
      summary: {
        stLoaded: env.st,
        ilbmLoaded: env.ilbm,
        ilbmMemoryAvailable: env.ilbmMemory,
        injectionAvailable: env.injectionAvailable,
        settingsEntryVisible: env.settingsEntryVisible,
        shellProperlyHidden: env.shellExists && env.shellHidden,
        markerProcessingWorks: funcTest.markerProcessed,
        entityRegistrationWorks: funcTest.entityRegistered
      }
    };
    
  } catch (error) {
    console.error('❌ 环境检查失败:', error);
    return { ok: false, error: String(error?.message ?? error) };
  } finally {
    await page.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  quickCheck().then(result => {
    console.log('\n🎯 快速检查结果:');
    console.log(JSON.stringify(result.summary, null, 2));
    
    if (result.ok && result.summary.stLoaded && result.summary.ilbmLoaded) {
      console.log('✅ 环境正常，可以继续进行GAP-007验证');
      process.exit(0);
    } else {
      console.log('❌ 环境存在问题，需要先修复');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ 检查失败:', error);
    process.exit(1);
  });
}

export { quickCheck };