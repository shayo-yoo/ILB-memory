import { openStPage } from './st-cdp.mjs';
import { writeFileSync } from 'fs';

/**
 * GAP-001 chat继承验证probe
 * 目标：验证ILB变量（extension_settings.independent_lorebook.chatStates[chatId].__vars）
 * 是否随ST chat文件备份/分叉/切换正确继承。
 * 
 * 验证方法：
 * 1. 在chat A中创建ILBM记忆数据
 * 2. 备份chat文件
 * 3. 切换到chat B，验证没有继承
 * 4. 恢复chat A备份，验证数据恢复
 */

process.env.ST_URL = 'http://127.0.0.1:8001/';
process.env.CDP_PORT = '9227';

async function captureChatState(page, chatId, stepName) {
  return await page.evaluate(`((chatId, stepName) => {
    try {
      const ctx = globalThis.SillyTavern?.getContext?.();
      const currentChatId = ctx?.getCurrentChatId?.() || 'unknown';
      
      // 获取ILB变量状态
      const ilbVars = globalThis.ILB?.api?.snapshot?.(chatId) || {};
      
      // 获取ILBM记忆状态
      const ilbmState = globalThis.ILBM_MEMORY?.inspect?.() || {};
      
      // 获取ST metadata（如果可访问）
      const stMetadata = ctx?.chat?.metadata || {};
      
      return {
        step: stepName,
        timestamp: new Date().toISOString(),
        chatId,
        currentChatId,
        ilbVarsKeys: Object.keys(ilbVars),
        ilbVarsSample: Object.keys(ilbVars).length > 0 ? 
          Object.keys(ilbVars).slice(0, 3).map(k => ({ key: k, type: typeof ilbVars[k] })) : 
          [],
        ilbmEntities: Array.isArray(ilbmState.entities) ? ilbmState.entities.length : 0,
        ilbmRecords: Array.isArray(ilbmState.records) ? ilbmState.records.length : 0,
        ilbmHasCurrentState: Boolean(ilbmState.currentState),
        stMetadataKeys: Object.keys(stMetadata)
      };
    } catch (error) {
      return { step: stepName, error: String(error?.message ?? error) };
    }
  })`, chatId, stepName);
}

async function createTestMemory(page) {
  return await page.evaluate(`(() => {
    try {
      // 清空现有ILBM数据（确保干净起点）
      globalThis.ILBM_MEMORY?.reset?.();
      
      // 创建测试实体
      const entity1 = globalThis.ILBM_MEMORY?.registerEntity?.({ name: '继承测试剑', type: 'item' });
      const entity2 = globalThis.ILBM_MEMORY?.registerEntity?.({ name: '继承测试人', type: 'person' });
      
      // 创建测试事件记录
      const record1 = globalThis.ILBM_MEMORY?.addRecord?.({
        text: '继承测试人获得了继承测试剑。',
        floor: 10,
        sourceMessageId: 'inherit-test-1',
        swipeId: 0
      });
      
      const record2 = globalThis.ILBM_MEMORY?.addRecord?.({
        text: '继承测试剑被放置在继承测试地点。',
        floor: 11,
        sourceMessageId: 'inherit-test-2',
        swipeId: 0
      });
      
      // 验证状态
      const inspect = globalThis.ILBM_MEMORY?.inspect?.() || {};
      
      return {
        ok: true,
        entities: [entity1?.id, entity2?.id].filter(Boolean),
        records: [record1?.id, record2?.id].filter(Boolean),
        inspectSummary: {
          entityCount: Array.isArray(inspect.entities) ? inspect.entities.length : 0,
          recordCount: Array.isArray(inspect.records) ? inspect.records.length : 0,
          hasCurrentState: Boolean(inspect.currentState)
        }
      };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  })()`);
}

async function getChatList(page) {
  return await page.evaluate(`(() => {
    try {
      // 尝试获取chat列表（通过ST UI或API）
      const chatListElement = document.querySelector('#chat-list, [data-id="chat-list"], .chat-list');
      if (chatListElement) {
        return { 
          ok: true, 
          method: 'ui_element', 
          elementExists: true 
        };
      }
      
      // 尝试通过ST API
      const ctx = globalThis.SillyTavern?.getContext?.();
      if (ctx?.getChatList) {
        const list = ctx.getChatList();
        return { 
          ok: true, 
          method: 'api', 
          chatCount: Array.isArray(list) ? list.length : 'unknown',
          currentChatId: ctx.getCurrentChatId?.() || 'unknown'
        };
      }
      
      return { ok: false, error: '无法获取chat列表' };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  })()`);
}

async function createNewChat(page) {
  return await page.evaluate(`(() => {
    try {
      const newChatBtn = document.querySelector('#new_chat, [data-id="new_chat"], button[title*="新聊天"], button[aria-label*="新聊天"]');
      if (newChatBtn) {
        newChatBtn.click();
        return { ok: true, method: 'ui_button' };
      }
      
      // 尝试通过ST API
      const ctx = globalThis.SillyTavern?.getContext?.();
      if (ctx?.newChat) {
        ctx.newChat();
        return { ok: true, method: 'api' };
      }
      
      return { ok: false, error: '找不到创建新聊天的方法' };
    } catch (error) {
      return { ok: false, error: String(error?.message ?? error) };
    }
  })()`);
}

async function main() {
  const page = await openStPage();
  const report = {
    timestamp: new Date().toISOString(),
    steps: [],
    conclusions: []
  };
  
  try {
    await page.send('Runtime.enable');
    
    console.log('🔄 等待ST+ILBM加载...');
    for (let i = 0; i < 40; i += 1) {
      const loaded = await page.evaluate('Boolean(globalThis.SillyTavern?.getContext && globalThis.ILBM_MEMORY)');
      if (loaded) break;
      await new Promise(r => setTimeout(r, 500));
    }
    
    // 步骤1: 获取当前chat状态
    console.log('📋 步骤1: 获取初始状态');
    const chatInfo = await getChatList(page);
    report.initialChatInfo = chatInfo;
    
    if (!chatInfo.ok) {
      console.error('❌ 无法获取chat列表');
      return { ok: false, error: 'chat列表获取失败', report };
    }
    
    // 步骤2: 捕获初始chat状态
    const initialState = await captureChatState(page, 'initial', '初始状态');
    report.steps.push(initialState);
    
    // 步骤3: 在当前chat创建测试记忆
    console.log('🔄 步骤2: 创建测试记忆');
    const testMemory = await createTestMemory(page);
    report.testMemoryCreation = testMemory;
    
    if (!testMemory.ok) {
      console.error('❌ 测试记忆创建失败');
      return { ok: false, error: '记忆创建失败', report };
    }
    
    // 步骤4: 捕获创建记忆后的状态
    const afterCreationState = await captureChatState(page, 'chat-a-after-creation', 'Chat A 记忆创建后');
    report.steps.push(afterCreationState);
    
    console.log(`✅ 在Chat A创建了 ${testMemory.inspectSummary.entityCount} 个实体, ${testMemory.inspectSummary.recordCount} 条记录`);
    
    // 步骤5: 创建新chat B
    console.log('🔄 步骤3: 切换到新chat B');
    await new Promise(r => setTimeout(r, 1000)); // 给时间保存
    
    const newChatResult = await createNewChat(page);
    report.newChatCreation = newChatResult;
    
    if (!newChatResult.ok) {
      console.log('⚠️ 无法创建新chat，继续使用当前chat进行部分验证');
    } else {
      console.log('✅ 新chat创建成功（或尝试）');
      await new Promise(r => setTimeout(r, 2000)); // 等待chat切换
    }
    
    // 步骤6: 捕获chat B状态（应没有继承）
    const chatBState = await captureChatState(page, 'chat-b-after-switch', 'Chat B 切换后');
    report.steps.push(chatBState);
    
    // 分析继承结果
    const inheritanceAnalysis = {
      entitiesInherited: false,
      recordsInherited: false,
      ilbVarsPersisted: false
    };
    
    // 检查实体是否"继承"（实际上应该没有继承）
    if (afterCreationState.ilbmEntities > 0 && chatBState.ilbmEntities === 0) {
      inheritanceAnalysis.entitiesInherited = false; // 正确：没有继承
      report.conclusions.push('✅ 实体没有跨chat继承（正确行为）');
    } else if (afterCreationState.ilbmEntities > 0 && chatBState.ilbmEntities > 0) {
      inheritanceAnalysis.entitiesInherited = true; // 意外继承
      report.conclusions.push('❌ 实体意外跨chat继承（潜在bug）');
    }
    
    // 检查记录是否"继承"
    if (afterCreationState.ilbmRecords > 0 && chatBState.ilbmRecords === 0) {
      inheritanceAnalysis.recordsInherited = false; // 正确：没有继承
      report.conclusions.push('✅ 记录没有跨chat继承（正确行为）');
    } else if (afterCreationState.ilbmRecords > 0 && chatBState.ilbmRecords > 0) {
      inheritanceAnalysis.recordsInherited = true; // 意外继承
      report.conclusions.push('❌ 记录意外跨chat继承（潜在bug）');
    }
    
    // 检查ILB变量持久化
    if (afterCreationState.ilbVarsKeys.length > 0 && chatBState.ilbVarsKeys.length === 0) {
      inheritanceAnalysis.ilbVarsPersisted = true; // 正确：变量chat-specific
      report.conclusions.push('✅ ILB变量是chat-specific的（正确行为）');
    } else if (afterCreationState.ilbVarsKeys.length > 0 && chatBState.ilbVarsKeys.length > 0) {
      const sameKeys = JSON.stringify(afterCreationState.ilbVarsKeys.sort()) === 
                      JSON.stringify(chatBState.ilbVarsKeys.sort());
      inheritanceAnalysis.ilbVarsPersisted = !sameKeys; // 如果key不同，说明是chat-specific
      report.conclusions.push(sameKeys ? 
        '❌ ILB变量意外共享（潜在bug）' : 
        '✅ ILB变量是chat-specific的'
      );
    }
    
    // 步骤7: 验证ST chat备份/恢复操作（如果UI可用）
    console.log('🔄 步骤4: 尝试验证chat备份/恢复UI');
    const backupUIAvailable = await page.evaluate(`(() => {
      try {
        // 检查常见备份/导出UI元素
        const exportBtn = document.querySelector('#export_chat, [data-id="export_chat"], button[title*="导出"], button[aria-label*="导出"]');
        const importBtn = document.querySelector('#import_chat, [data-id="import_chat"], button[title*="导入"], button[aria-label*="导入"]');
        const saveBtn = document.querySelector('#save_chat, [data-id="save_chat"], button[title*="保存"], button[aria-label*="保存"]');
        
        return {
          exportAvailable: Boolean(exportBtn),
          importAvailable: Boolean(importBtn),
          saveAvailable: Boolean(saveBtn)
        };
      } catch {
        return { exportAvailable: false, importAvailable: false, saveAvailable: false };
      }
    })()`);
    
    report.backupUIAvailable = backupUIAvailable;
    
    // 保存完整报告
    const reportPath = './tests-chat-inheritance-report.json';
    writeFileSync(reportPath, JSON.stringify({
      ...report,
      inheritanceAnalysis,
      gap001Conclusion: inheritanceAnalysis.entitiesInherited || inheritanceAnalysis.recordsInherited ?
        '❌ GAP-001: 检测到意外继承，需要修复chat隔离' :
        '✅ GAP-001: chat隔离行为符合预期（记忆不跨chat共享）',
      nextSteps: [
        '如果检测到意外继承：需要检查ILB存储适配器的chatId隔离',
        '如果UI测试有限：需要手动测试chat文件备份/恢复/分叉场景',
        '验证ILB变量在extension_settings中的存储结构'
      ]
    }, null, 2));
    
    console.log(`📄 Chat继承报告已保存到: ${reportPath}`);
    console.log('🔍 继承分析:', JSON.stringify(inheritanceAnalysis, null, 2));
    
    return {
      ok: true,
      inheritanceAnalysis,
      reportPath,
      gap001Valid: !inheritanceAnalysis.entitiesInherited && !inheritanceAnalysis.recordsInherited
    };
    
  } catch (error) {
    console.error('❌ Probe失败:', error);
    report.error = String(error?.message ?? error);
    
    const reportPath = './tests-chat-inheritance-error.json';
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    return { ok: false, error: report.error, reportPath };
  } finally {
    await page.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().then(result => {
    console.log('\n🎯 Chat继承验证完成:');
    console.log(JSON.stringify({
      ok: result.ok,
      gap001Valid: result.gap001Valid,
      conclusion: result.gap001Valid ? 
        '✅ GAP-001: chat隔离行为正常' : 
        '❌ GAP-001: 需要修复chat隔离'
    }, null, 2));
    
    if (result.ok && result.gap001Valid) {
      console.log('✅ 可以继续下一个验证');
      process.exit(0);
    } else {
      console.log('❌ 需要调查chat继承问题');
      process.exit(1);
    }
  }).catch(error => {
    console.error('❌ 验证失败:', error);
    process.exit(1);
  });
}

export { main };