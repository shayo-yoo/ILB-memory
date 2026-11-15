/**
 * 状态字段定义 - 根据ILBMemory需求文档v2 §2.1
 * MVP最小字段集：物品/角色/地点三类状态卡
 */

// 物品状态存储码 → 显示标签（需求文档§2.1.1）
// 存储使用稳定英文码，注入/界面统一显示中文，避免中文值进入持久化数据。
export const ITEM_STATUS_CODE = Object.freeze({
  INTACT: 'intact',
  DAMAGED: 'damaged',
  LOST: 'lost',
  DESTROYED: 'destroyed',
});

export const ITEM_STATUS_LABEL = Object.freeze({
  intact: '完好',
  damaged: '损坏',
  lost: '遗失',
  destroyed: '已销毁',
});

// 状态枚举定义
export const STATE_ENUMS = {
  // 物品状态（需求文档§2.1.1）
  ITEM_STATUS: ITEM_STATUS_CODE,

  ITEM_STATUS_LABEL,

  // 持续状态（需求文档§2.1.2）
  CONTINUOUS_STATUS: {
    INJURED: '受伤',
    POISONED: '中毒',
    IMPRISONED: '被囚禁',
    EXHAUSTED: '疲惫',
    DEAD: '死亡',
  },

  // 关系类型（需求文档§2.1.2）
  RELATION_TYPES: {
    FRIEND: '朋友',
    ENEMY: '敌人',
    ALLY: '盟友',
    FAMILY: '家人',
    LOVER: '恋人',
    MASTER: '主人',
    SERVANT: '仆人',
  },
};

// 状态字段定义
export const STATE_FIELDS = {
  // 物品字段（Item）
  ITEM: {
    OWNER: {
      key: 'ownerId',
      label: '持有者',
      description: '当前持有该物品的实体ID，可为"无人"',
      type: 'entity_ref',
      entityTypes: ['person', 'organization'],
      defaultValue: null
    },
    
    LOCATION: {
      key: 'locationId',
      label: '位置',
      description: '物品当前所在的地点实体ID，可为"未知"',
      type: 'entity_ref',
      entityTypes: ['place'],
      defaultValue: null
    },
    
    STATUS: {
      key: 'status',
      label: '状态',
      description: '物品的物理状态',
      type: 'enum',
      enum: ITEM_STATUS_LABEL,
      defaultValue: ITEM_STATUS_CODE.INTACT
    }
  },
  
  // 角色字段（Person）
  PERSON: {
    LOCATION: {
      key: 'locationId',
      label: '位置',
      description: '角色当前所在的地点实体ID',
      type: 'entity_ref',
      entityTypes: ['place'],
      defaultValue: null
    },
    
    CONTINUOUS_STATUS: {
      key: 'continuousStatus',
      label: '持续状态',
      description: '需要持续关注的状态，如受伤、中毒等',
      type: 'multi_enum',
      enum: STATE_ENUMS.CONTINUOUS_STATUS,
      defaultValue: []
    },
    
    RELATIONS: {
      key: 'relations',
      label: '当前有效关系',
      description: '当前生效的关系列表（只列当前有效的）',
      type: 'relation_list',
      defaultValue: []
    }
  },
  
  // 地点字段（Place）
  PLACE: {
    CHARACTERS_PRESENT: {
      key: 'charactersPresent',
      label: '在场角色',
      description: '当前在此地点的角色实体ID列表',
      type: 'entity_ref_list',
      entityTypes: ['person'],
      defaultValue: []
    },
    
    ITEMS_PRESENT: {
      key: 'itemsPresent',
      label: '在场物品',
      description: '当前在此地点的物品实体ID列表',
      type: 'entity_ref_list',
      entityTypes: ['item'],
      defaultValue: []
    }
  }
};

// 关系记录结构
export const RELATION_SCHEMA = {
  targetId: {
    type: 'string',
    description: '目标实体ID'
  },
  type: {
    type: 'string',
    enum: Object.keys(STATE_ENUMS.RELATION_TYPES)
  },
  strength: {
    type: 'number',
    optional: true,
    min: 0,
    max: 1,
    description: '关系强度（0-1）'
  },
  bidirectional: {
    type: 'boolean',
    optional: true,
    defaultValue: false,
    description: '是否是双向关系'
  },
  establishedAt: {
    type: 'number',
    description: '关系建立时间戳'
  },
  endedAt: {
    type: 'number',
    optional: true,
    description: '关系结束时间戳（如已结束）'
  }
};

// 根据实体类型获取状态字段定义
export function getStateFieldsForEntityType(entityType) {
  switch (entityType) {
    case 'item':
      return STATE_FIELDS.ITEM;
    case 'person':
    case 'character':
      return STATE_FIELDS.PERSON;
    case 'place':
    case 'location':
      return STATE_FIELDS.PLACE;
    default:
      return {};
  }
}

// 构建状态卡的显示文本（可读格式）
// options.nameOf: 可选 (id) => 实体短名；未提供时退化为 ID 前缀。
export function formatStateCard(entity, state, options = {}) {
  const fields = getStateFieldsForEntityType(entity.type);
  const parts = [];
  const nameOf = typeof options.nameOf === 'function' ? options.nameOf : (id) => (id ? `实体${String(id).substring(0, 8)}` : null);

  for (const [fieldKey, fieldDef] of Object.entries(fields)) {
    const value = state[fieldDef.key];
    if (value === undefined || value === null) continue;
    
    let displayValue;
    
    switch (fieldDef.type) {
      case 'enum':
        displayValue = fieldDef.enum[value] || value;
        break;
        
      case 'multi_enum':
        if (Array.isArray(value) && value.length > 0) {
          displayValue = value.map(v => fieldDef.enum[v] || v).join('、');
        }
        break;
        
      case 'entity_ref':
        displayValue = value ? (nameOf(value) ?? String(value)) : '无人/未知';
        break;
        
      case 'entity_ref_list':
        if (Array.isArray(value) && value.length > 0) {
          displayValue = value.map(id => nameOf(id) ?? String(id)).join('、');
        } else if (value === null || value === undefined || value.length === 0) {
          displayValue = '无';
        }
        break;
        
      case 'relation_list':
        if (Array.isArray(value) && value.length > 0) {
          const relationCounts = {};
          value.forEach(rel => {
            const typeName = STATE_ENUMS.RELATION_TYPES[rel.type] || rel.type;
            relationCounts[typeName] = (relationCounts[typeName] || 0) + 1;
          });
          
          displayValue = Object.entries(relationCounts)
            .map(([type, count]) => `${type}×${count}`)
            .join('、');
        } else {
          displayValue = '无';
        }
        break;
        
      default:
        displayValue = String(value);
    }
    
    if (displayValue !== undefined) {
      parts.push(`${fieldDef.label}=${displayValue}`);
    }
  }
  
  return parts.length > 0 ? parts.join('，') : '暂无状态';
}

// 判断枚举值是否合法：同时接受存储码（键）与显示标签（值）
function isEnumValue(enumMap, value) {
  if (enumMap == null || value == null) return false;
  return Object.prototype.hasOwnProperty.call(enumMap, value) || Object.values(enumMap).includes(value);
}

function describeEnum(enumMap) {
  return Object.keys(enumMap || {}).join(', ');
}

// 验证状态变更是否符合字段定义
export function validateStateChange(entityType, field, value) {
  const fields = getStateFieldsForEntityType(entityType);
  const fieldDef = Object.values(fields).find(f => f.key === field);
  
  if (!fieldDef) {
    return { valid: false, error: `字段 ${field} 在 ${entityType} 类型中未定义` };
  }
  
  switch (fieldDef.type) {
    case 'enum':
      if (!isEnumValue(fieldDef.enum, value)) {
        return {
          valid: false,
          error: `值 ${value} 不在允许的枚举中：${describeEnum(fieldDef.enum)}`
        };
      }
      break;
      
    case 'multi_enum':
      if (Array.isArray(value)) {
        for (const v of value) {
          if (!isEnumValue(fieldDef.enum, v)) {
            return {
              valid: false,
              error: `值 ${v} 不在允许的枚举中：${describeEnum(fieldDef.enum)}`
            };
          }
        }
      } else {
        return { valid: false, error: `字段 ${field} 需要数组值` };
      }
      break;
      
    case 'entity_ref':
    case 'entity_ref_list':
      // 基本验证：确保是字符串或字符串数组
      if (fieldDef.type === 'entity_ref') {
        if (typeof value !== 'string' && value !== null) {
          return { valid: false, error: `字段 ${field} 需要字符串或null` };
        }
      } else {
        if (!Array.isArray(value) || !value.every(v => typeof v === 'string')) {
          return { valid: false, error: `字段 ${field} 需要字符串数组` };
        }
      }
      break;
  }
  
  return { valid: true, fieldDef };
}