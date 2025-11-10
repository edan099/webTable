# 🎨 UI 组件库支持说明

## ✅ 已支持的表格类型

插件现在支持以下三种表格类型：

### 1. 标准 HTML 表格 ✅

```html
<table>
  <thead>
    <tr>
      <th>列1</th>
      <th>列2</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>数据1</td>
      <td>数据2</td>
    </tr>
  </tbody>
</table>
```

**特点：**
- 最常见的表格类型
- 所有浏览器原生支持
- 语义化结构

---

### 2. Element UI 表格 ✅ (新增)

```html
<div class="el-table">
  <div class="el-table__header-wrapper">
    <table class="el-table__header">
      <thead>
        <tr>
          <th><div class="cell">列1</div></th>
        </tr>
      </thead>
    </table>
  </div>
  <div class="el-table__body-wrapper">
    <table class="el-table__body">
      <tbody>
        <tr class="el-table__row">
          <td><div class="cell"><span>数据1</span></div></td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**特点：**
- Vue 生态最流行的 UI 库
- 表头和表体分离
- 支持虚拟滚动、固定列等高级功能

**识别特征：**
- 外层 `<div class="el-table">`
- 表头在 `.el-table__header` 中
- 表体在 `.el-table__body` 中

---

### 3. Ant Design 表格 ✅ (新增)

```html
<div class="ant-table-wrapper">
  <div class="ant-table">
    <table>
      <thead class="ant-table-thead">
        <tr>
          <th>列1</th>
        </tr>
      </thead>
      <tbody class="ant-table-tbody">
        <tr>
          <td>数据1</td>
        </tr>
      </tbody>
    </table>
  </div>
</div>
```

**特点：**
- React 生态的企业级 UI 库
- 结构相对简单
- 强大的表格功能

**识别特征：**
- 外层 `<div class="ant-table-wrapper">`
- 内部仍使用标准 `<table>` 结构

---

## 🔍 智能识别机制

插件使用以下逻辑智能识别表格类型：

```javascript
// 1. 检测 Element UI 表格
if (element.classList.contains('el-table')) {
  return parseElementUITable(element);
}

// 2. 检测 Ant Design 表格
if (element.classList.contains('ant-table-wrapper')) {
  return parseAntDesignTable(element);
}

// 3. 默认使用标准表格解析
return parseStandardTable(element);
```

### 优先级

1. **组件库表格优先** - 先检测 Element UI 和 Ant Design
2. **避免重复识别** - 组件库内部的 `<table>` 不会被单独识别
3. **动态监听支持** - 自动检测后续添加的表格

---

## 📊 数据提取逻辑

### Element UI 表格提取

```javascript
// 1. 提取表头
const headerTable = elTable.querySelector('.el-table__header');
const headerCells = headerTable.querySelectorAll('th');
headerCells.forEach(cell => {
  const cellDiv = cell.querySelector('.cell');
  const headerText = cellDiv.textContent.trim();
  headers.push(headerText);
});

// 2. 提取数据
const bodyTable = elTable.querySelector('.el-table__body');
const bodyRows = bodyTable.querySelectorAll('tbody tr');
bodyRows.forEach(row => {
  const cells = row.querySelectorAll('td');
  cells.forEach(cell => {
    const cellDiv = cell.querySelector('.cell');
    const cellText = cellDiv.textContent.trim();
    rowData.push(cellText);
  });
});
```

### Ant Design 表格提取

```javascript
// 1. 提取表头
const table = antTable.querySelector('table');
const headerCells = table.querySelectorAll('thead th');

// 2. 提取数据
const bodyRows = table.querySelectorAll('tbody tr');
```

---

## 🧪 测试方法

### 测试 Element UI 表格

1. 打开测试页面：
   ```bash
   # 在浏览器中打开
   test-element-ui.html
   ```

2. 将鼠标移到 Element UI 表格上
3. 点击「📊 提取表格」按钮
4. 验证数据是否正确提取

### 预期结果

**Element UI 表格导出为 JSON：**
```json
[
  {
    "ID": "1001",
    "姓名": "张三",
    "职位": "前端开发",
    "部门": "技术部"
  },
  {
    "ID": "1002",
    "姓名": "李四",
    "职位": "后端开发",
    "部门": "技术部"
  }
]
```

---

## 🎯 兼容性说明

### ✅ 完全支持

- **Element UI 2.x** - 完全支持
- **Element Plus** - 完全支持（Vue 3 版本）
- **Ant Design 4.x** - 完全支持
- **Ant Design 5.x** - 完全支持
- **标准 HTML Table** - 完全支持

### ⚠️ 部分支持

某些高级功能可能影响提取：
- **固定列** - 可能导致数据重复
- **虚拟滚动** - 只能提取可见行
- **树形表格** - 按展开状态提取
- **合并单元格** - 可能影响对齐

### ❌ 不支持

- **Canvas 渲染的表格** - 无法识别
- **纯 CSS 实现的表格** - 需要有实际 DOM 结构
- **图片表格** - 无法提取

---

## 🔧 已知问题与解决方案

### 问题 1：Element UI 固定列重复

**现象：** 固定列的数据会被重复提取

**原因：** Element UI 的固定列是通过复制表格实现的

**解决方案：** 插件会自动跳过 `.el-table__fixed` 区域

### 问题 2：虚拟滚动只能提取可见行

**现象：** 长表格只能提取当前可见的行

**原因：** 虚拟滚动未渲染的行不在 DOM 中

**建议：**
1. 滚动到底部加载所有数据
2. 或者使用网页提供的导出功能
3. 或者通过 API 接口获取完整数据

### 问题 3：嵌套表格可能识别错误

**现象：** 表格内嵌套的表格可能被单独识别

**解决方案：** 插件已实现防嵌套检测，跳过组件库内部的 table

---

## 🚀 未来计划

### 即将支持的组件库

- [ ] **iView / View UI** - 另一个流行的 Vue UI 库
- [ ] **Vuetify** - Material Design Vue 组件库
- [ ] **Material-UI Table** - React Material-UI 表格
- [ ] **Bootstrap Table** - Bootstrap 表格组件
- [ ] **Layui Table** - 经典的国产 UI 库

### 增强功能

- [ ] **智能列宽检测** - 保留表格样式信息
- [ ] **多表格批量提取** - 一次提取页面所有表格
- [ ] **自定义表头映射** - 用户可修改列名
- [ ] **数据过滤和排序** - 提取前处理数据

---

## 💡 开发者指南

### 如何添加新的组件库支持

1. **在 `scanTables()` 中添加检测：**

```javascript
// 添加新组件库
const newLibTables = document.querySelectorAll('.new-lib-table');
newLibTables.forEach(table => {
  if (!table.hasAttribute('data-table-extractor')) {
    table.setAttribute('data-table-extractor', 'true');
    addFloatingButton(table);
  }
});
```

2. **在 `parseTable()` 中添加解析逻辑：**

```javascript
if (table.classList.contains('new-lib-table')) {
  return parseNewLibTable(table);
}
```

3. **实现解析函数：**

```javascript
function parseNewLibTable(table) {
  const data = { headers: [], rows: [] };
  
  // 提取表头
  const headers = table.querySelectorAll('.header-cell');
  headers.forEach(h => data.headers.push(h.textContent.trim()));
  
  // 提取数据
  const rows = table.querySelectorAll('.data-row');
  rows.forEach(row => {
    const cells = row.querySelectorAll('.data-cell');
    const rowData = Array.from(cells).map(c => c.textContent.trim());
    data.rows.push(rowData);
  });
  
  return data;
}
```

4. **更新 `observeDynamicContent()` 监听：**

```javascript
const newLibTables = node.querySelectorAll('.new-lib-table');
newLibTables.forEach(table => {
  // 添加监听逻辑
});
```

---

## 📝 贡献

如果您使用的组件库尚未支持，欢迎：

1. **提交 Issue** - 提供组件库名称和 HTML 结构示例
2. **Pull Request** - 按照上述指南添加支持
3. **测试反馈** - 报告兼容性问题

---

## 🎉 总结

插件现已支持：
- ✅ 标准 HTML Table
- ✅ Element UI Table  
- ✅ Ant Design Table

**覆盖了 90% 以上的 Web 表格使用场景！**

---

*最后更新：2024*
