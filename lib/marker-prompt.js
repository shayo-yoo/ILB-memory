/**
 * 模式 A 的「给 AI 的标记说明」提示词。
 *
 * ILBM 本身不自动改写系统提示词；本模块只提供可复制的提示词文本，
 * 供用户放入 ILB 提示词注入、ST 系统提示词或世界书。
 * UI 可选择把它作为独立的 extension prompt 注入（默认关闭）。
 *
 * 文本必须与 lib/direct-parser.js / lib/action-state.js 的实际解析规则一致。
 */

export const MARKER_PROMPT_ZH = `【ILBM 记忆标记规则】
当剧情中发生需要长期记忆的事实变化时，在回复末尾追加内联标记；标记对用户不可见。
格式严格为：
(((ILBM:[entity:主体] 动作 [entity:客体] [entity:接收者] 补充说明)))
规则：
1. 只识别 (((ILBM:...))) 内部的 [entity:短名]；外部同名文本不会被识别。
2. 一条标记只写一个动作；同一楼层有多个动作时写多条标记。
3. 实体顺序固定为：主体、客体、接收者。短名第一次出现会自动注册。
4. 不需要写前值/后值，程序会根据动作和当前状态推导。
5. 没有值得记录的变化时不要输出标记；不要为了凑格式编造事件。
6. 不要在标记里解释、换行或嵌套其他标记。
7. 禁止改写语法：不要使用 <mem>、</mem>、<转移>、<to>、全角冒号“：”或任何 XML/Markdown 包装；必须逐字输出 (((ILBM:...))) 和 [entity:短名]。
8. 输出前逐字复制示例：(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))。

状态动作白名单（只有这些动作会改变状态）：
- 转移：主体把物品交给接收者。例：(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))
- 交给：转移的同义词。
- 获得：主体获得物品。例：(((ILBM:[entity:甲] 获得 [entity:短剑])))
- 失去：主体失去物品。例：(((ILBM:[entity:甲] 失去 [entity:短剑])))
- 移动：主体移动到地点（物品也可以用）。例：(((ILBM:[entity:短剑] 移动 [entity:营地])))
- 损坏 / 修复 / 销毁 / 遗失：物品状态变化。例：(((ILBM:[entity:短剑] 损坏)))
- 死亡 / 受伤 / 中毒：角色持续状态。例：(((ILBM:[entity:甲] 受伤)))
- 建立关系：主动方与被动方建立有向关系，尾部写角色。
  对称关系（朋友/敌人/盟友/家人/恋人）写一条即可：
  (((ILBM:[entity:甲] 建立关系 [entity:乙] 朋友)))
  不对称关系必须写两条，双方各一条：
  (((ILBM:[entity:甲] 建立关系 [entity:乙] 主人)))
  (((ILBM:[entity:乙] 建立关系 [entity:甲] 仆人)))
- 解除关系：解除指定关系；不写角色时解除该目标上的全部关系。
  (((ILBM:[entity:甲] 解除关系 [entity:乙])))

不对称关系的角色词：主人/仆人、丈夫/妻子、父母/子女、看守/俘虏、主人/宠物。
需要区分“主仆”和“主宠”时，可写“主仆:主人”或“主宠:主人”的显式形式。
其余叙事动作可以自由描述，但不会改变状态，通常不需要写标记。
反面示例（一律不得出现）：<mem>...</mem>、[entity：甲]、<转移>、<to>、(((ILBM:[entity:甲] 转移 ...))) 之外的包装。`;

export const MARKER_PROMPT_EN = `[ILBM memory markers]
When a fact worth remembering changes in the story, append inline markers at the end of your reply. Markers are invisible to the user.
Format (exact):
(((ILBM:[entity:subject] ACTION [entity:object] [entity:receiver] optional note)))
Rules:
1. Only [entity:name] inside (((ILBM:...))) is parsed.
2. One action per marker; use multiple markers for multiple changes.
3. Entity order is subject, object, receiver. New names are registered automatically.
4. Do not write before/after values; the program derives them.
5. Do not invent events or markers when nothing changed.
6. Do not explain, wrap, or nest markers.
7. Never rewrite the syntax: do not use <mem>, </mem>, <转移>, <to>, full-width colon “：”, or any XML/Markdown wrapper; output (((ILBM:...))) and [entity:name] verbatim.
8. Before sending, copy this example verbatim: (((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙]))).

State-changing actions:
- 转移/交给: subject gives object to receiver.
- 获得: subject obtains object. 失去: subject loses object.
- 移动: subject moves to a place (items work too).
- 损坏/修复/销毁/遗失: item status.
- 死亡/受伤/中毒: character condition.
- 建立关系: directed relation; append the role. Symmetric roles (朋友/敌人/盟友/家人/恋人) need one marker; asymmetric roles (主人/仆人, 丈夫/妻子, 父母/子女, 看守/俘虏, 主人/宠物) need two markers, one from each side.
- 解除关系: remove the relation to that target.
Other narrative actions are allowed but do not change state.`;

export const MARKER_SYNTAX_REFERENCE = Object.freeze({
  wrapper: '(((ILBM:[entity:主体] 动作 [entity:客体] [entity:接收者] 补充说明)))',
  entity: '[entity:短名]',
  example: '(((ILBM:[entity:甲] 转移 [entity:短剑] 给 [entity:乙])))',
  actions: Object.freeze(['转移', '交给', '获得', '失去', '移动', '损坏', '修复', '销毁', '遗失', '死亡', '受伤', '中毒', '建立关系', '解除关系']),
  symmetricRoles: Object.freeze(['朋友', '敌人', '盟友', '家人', '恋人']),
  roles: Object.freeze(['主人', '仆人', '丈夫', '妻子', '父母', '子女', '看守', '俘虏', '宠物']),
});

export function buildMarkerPrompt({ language = 'zh' } = {}) {
  return language === 'en' ? MARKER_PROMPT_EN : MARKER_PROMPT_ZH;
}

export function getMarkerPromptInfo() {
  return {
    zh: MARKER_PROMPT_ZH,
    en: MARKER_PROMPT_EN,
    reference: MARKER_SYNTAX_REFERENCE,
    autoInjection: false,
    note: 'ILBM 不自动修改系统提示词。请在 ILB 提示词注入、ST 系统提示词或世界书中使用上述文本；也可在管理面板手动注入。',
  };
}
