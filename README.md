# 📊 网页表格识别与导出器

一个强大的 Chrome 浏览器插件，可以自动识别网页中的表格并支持多种格式导出。

## ✨ 功能特性

- 🔍 **自动识别表格** - 自动扫描并识别网页中的所有 `<table>` 元素
- 🎯 **智能悬浮按钮** - 鼠标悬停表格时显示优雅的提取按钮
- 📋 **多格式导出** - 支持 JSON、CSV、SQL 三种格式
- 💾 **一键下载** - 直接下载导出的文件
- 📝 **快速复制** - 一键复制到剪贴板
- 🌐 **动态内容支持** - 自动检测动态加载的表格
- 🎨 **精美界面** - 现代化的中文操作面板

## 🚀 快速开始

### 安装方式

#### 方式一：开发者模式安装（推荐）

1. 下载或克隆本项目到本地
2. 打开 Chrome 浏览器，访问 `chrome://extensions/`
3. 开启右上角的「开发者模式」
4. 点击「加载已解压的扩展程序」
5. 选择本项目的文件夹
6. 安装完成！

#### 方式二：打包为 CRX 文件

1. 在 `chrome://extensions/` 页面，点击「打包扩展程序」
2. 选择本项目文件夹作为扩展程序根目录
3. 点击「打包扩展程序」按钮
4. 将生成的 `.crx` 文件拖拽到 Chrome 浏览器中安装

## 📖 使用说明

### 基本操作

1. **访问含有表格的网页**
   - 打开任何包含 HTML 表格的网页
   
2. **悬停表格**
   - 将鼠标移动到表格上方
   - 右上角会出现「📊 提取表格」按钮

3. **打开提取面板**
   - 点击悬浮按钮
   - 弹出功能面板

4. **选择导出格式**
   - 🟢 **导出 JSON** - 将表格转换为 JSON 数组对象
   - 🔵 **导出 CSV** - 将表格转换为逗号分隔值格式
   - 🟣 **导出 SQL** - 将表格转换为 INSERT SQL 语句

5. **获取数据**
   - 📋 **复制结果** - 将数据复制到剪贴板
   - 💾 **下载文件** - 下载为对应格式的文件

### 导出格式说明

#### JSON 格式
```json
[
  {
    "姓名": "张三",
    "年龄": "25",
    "职位": "工程师"
  },
  {
    "姓名": "李四",
    "年龄": "30",
    "职位": "设计师"
  }
]
```

#### CSV 格式
```csv
"姓名","年龄","职位"
"张三","25","工程师"
"李四","30","设计师"
```

#### SQL 格式
```sql
INSERT INTO table_data (姓名, 年龄, 职位) VALUES ('张三', 25, '工程师');
INSERT INTO table_data (姓名, 年龄, 职位) VALUES ('李四', 30, '设计师');
```

## 🛠️ 技术栈

- **Manifest V3** - Chrome 扩展最新版本规范
- **原生 JavaScript** - 无依赖，轻量高效
- **CSS3** - 现代化 UI 设计
- **MutationObserver API** - 监听动态内容变化

## 📁 项目结构

```
webTable/
├── manifest.json       # 插件配置文件
├── content.js         # 核心逻辑脚本
├── style.css          # 样式文件
├── icon16.png         # 16x16 图标
├── icon48.png         # 48x48 图标
├── icon128.png        # 128x128 图标
└── README.md          # 项目说明
```

## 🎨 核心功能实现

### 表格检测
- 使用 `document.querySelectorAll('table')` 扫描页面
- 通过 `MutationObserver` 监听动态加载的表格
- 为每个表格添加标识避免重复处理

### 数据提取
- 智能识别表头（`<th>` 或第一行 `<td>`）
- 逐行解析 `<tr>` 和 `<td>` 提取数据
- 支持空值和特殊字符处理

### 格式转换
- **JSON**：使用对象数组结构，格式化输出
- **CSV**：符合 RFC 4180 标准，处理引号转义
- **SQL**：自动生成 INSERT 语句，处理 NULL 和字符串转义

### UI 交互
- 非侵入式设计，不影响原网页布局
- 使用 `position: fixed/absolute` 实现浮动 UI
- 优雅的动画效果和响应式设计

## 🔧 高级特性

### 动态内容监听
使用 `MutationObserver` 自动检测页面变化：
```javascript
const observer = new MutationObserver((mutations) => {
  // 检测新添加的表格
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.tagName === 'TABLE') {
        addFloatingButton(node);
      }
    });
  });
});
```

### 样式隔离
使用 CSS `all: initial` 防止样式冲突：
```css
.table-extractor-panel,
.table-extractor-panel * {
  all: initial;
}
```

## 🐛 问题排查

### 悬浮按钮不显示
- 确认页面中存在 `<table>` 元素
- 检查浏览器控制台是否有错误信息
- 尝试刷新页面

### 导出数据为空
- 检查表格是否有有效的行和列
- 确认表格不是通过 Canvas 或图片实现的

### 样式异常
- 某些网站可能有 CSP 限制
- 尝试在隐私模式下测试

## 📝 更新日志

### v1.0.0 (2024)
- ✅ 初始版本发布
- ✅ 支持 JSON、CSV、SQL 三种格式导出
- ✅ 智能表格检测
- ✅ 动态内容支持
- ✅ 一键复制和下载功能
- ✅ 精美的中文界面

## 🤝 贡献指南

欢迎提交 Issue 和 Pull Request！

1. Fork 本项目
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 MIT 许可证。

## 💬 反馈与支持

如有问题或建议，欢迎：
- 提交 GitHub Issue
- 发送邮件反馈

---

**享受便捷的表格提取体验！** 🎉
