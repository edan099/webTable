# 🔒 权限使用说明与理由

## Chrome Web Store 权限审核要求

在发布到 Chrome Web Store 时，需要在「隐私权规范」标签页中说明权限使用理由。

---

## 📋 当前使用的权限

### 主机权限（content_scripts）
```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content.js"],
    "css": ["style.css"]
  }
]
```

---

## ✍️ 权限理由说明（复制到 Web Store）

### 中文版本（推荐）

```
权限使用说明：

1. 【内容脚本 - 所有网站访问权限】
   理由：本扩展程序的核心功能是识别和提取网页中的表格数据。
   
   为什么需要 <all_urls> 权限：
   • 用户可能在任何网站上遇到需要提取的表格
   • 表格可能出现在各种网站：数据分析平台、后台管理系统、文档网站、电商平台等
   • 无法预先知道用户会在哪些网站使用此功能
   
   具体用途：
   • 检测页面中的 <table> 元素及组件库表格（Element UI、Ant Design）
   • 在表格上方显示提取按钮（非侵入式 UI）
   • 读取表格内容并转换为 JSON/CSV/SQL 格式
   • 监听动态加载的表格内容
   
   隐私承诺：
   • 完全在本地运行，不上传任何数据
   • 不收集用户浏览历史
   • 不访问或修改用户输入的敏感信息
   • 仅在用户主动点击提取按钮时读取表格数据
   • 开源代码，可供审计
```

---

### 英文版本（备选）

```
Permission Usage Explanation:

1. [Content Scripts - Access to all websites]
   Justification: The core functionality of this extension is to identify and extract table data from web pages.
   
   Why <all_urls> permission is needed:
   • Users may encounter tables that need to be extracted on any website
   • Tables can appear on various sites: data analytics platforms, admin systems, documentation sites, e-commerce platforms, etc.
   • It's impossible to predict which websites users will use this feature on
   
   Specific uses:
   • Detect <table> elements and component library tables (Element UI, Ant Design) on pages
   • Display extraction button above tables (non-intrusive UI)
   • Read table content and convert to JSON/CSV/SQL formats
   • Monitor dynamically loaded table content
   
   Privacy commitment:
   • Runs completely locally, no data uploaded
   • Does not collect browsing history
   • Does not access or modify sensitive user input
   • Only reads table data when user explicitly clicks the extraction button
   • Open source code, available for audit
```

---

## 📝 如何在 Web Store 中填写

### 步骤 1：进入隐私权规范标签页

1. 登录 Chrome Web Store 开发者控制台
2. 选择您的扩展程序
3. 点击「隐私权规范」或「Privacy」标签

### 步骤 2：填写权限理由

找到「需使用主机权限的理由」或「Host Permission Justification」字段

**复制粘贴以下内容：**

```
本扩展程序需要访问所有网站以实现其核心功能：识别和提取网页表格数据。

【必要性】
用户可能在任何网站上遇到需要提取的表格，包括但不限于：
- 企业内部管理系统
- 数据分析平台
- 在线文档和报表
- 电商和社交网站

无法预先限定特定域名，因为表格可能出现在互联网的任何位置。

【实际用途】
1. 检测页面中的标准 HTML 表格和组件库表格（Element UI、Ant Design）
2. 在表格上显示非侵入式的提取按钮
3. 仅在用户主动点击时读取表格内容
4. 将数据转换为 JSON、CSV、SQL 格式供用户使用

【隐私保护】
- 完全本地运行，不上传任何数据到服务器
- 不收集用户浏览历史或个人信息
- 不访问用户输入的密码或敏感信息
- 只读取用户明确要求提取的表格数据
- 开源代码，可供公开审计

【用户控制】
- 用户完全控制何时提取数据
- 仅在用户点击提取按钮时才会读取表格
- 可随时禁用或卸载扩展程序
```

---

## 🔍 审核常见问题

### Q1: 为什么不使用更具体的匹配模式？

**A:** 因为表格可能出现在任何网站上。如果限制为特定域名（如 `*.example.com`），用户就无法在其他网站使用此功能，这违背了扩展程序的设计初衷。

### Q2: 是否可以使用可选权限（optional_permissions）？

**A:** 理论上可以，但会极大降低用户体验：
- 用户需要在每个新网站上手动授权
- 失去了「开箱即用」的便利性
- 对于表格提取这种通用工具，不适合使用可选权限

### Q3: 如何证明不会滥用权限？

**A:** 
1. 强调开源代码可审计
2. 说明完全本地运行
3. 不请求网络权限
4. 只在用户明确操作时读取数据
5. 提供清晰的使用说明

---

## 🎯 优化建议

### 如果审核被拒，可以尝试：

#### 方案 1：更详细的说明
添加更多技术细节和使用场景示例。

#### 方案 2：提供演示视频
录制一个简短视频展示：
- 扩展程序的实际使用场景
- 如何保护用户隐私
- 权限的必要性

#### 方案 3：添加隐私政策页面
创建一个详细的隐私政策页面，并在说明中引用。

---

## 📄 隐私政策模板

如果需要，可以创建以下隐私政策页面：

```markdown
# 隐私政策

## 数据收集
本扩展程序不收集、存储或传输任何用户数据。

## 权限使用
- **所有网站访问权限**：仅用于检测和提取用户主动选择的表格数据

## 数据处理
- 所有数据处理完全在本地进行
- 不与任何第三方服务器通信
- 不使用 cookies 或跟踪技术

## 用户控制
- 用户完全控制何时使用提取功能
- 可随时禁用或卸载扩展程序

## 联系方式
如有疑问，请联系：[您的邮箱]

最后更新：2024-11-10
```

---

## ✅ 填写检查清单

提交前确认：

- [ ] 说明了为什么需要 `<all_urls>` 权限
- [ ] 解释了具体使用场景
- [ ] 强调了隐私保护措施
- [ ] 说明了用户控制权
- [ ] 提到了开源/可审计
- [ ] 语言清晰、诚恳
- [ ] 字数适中（200-500 字）

---

## 🚀 提交建议

### 提交时的注意事项

1. **语气要诚恳**
   - 不要使用模板化的语言
   - 真诚说明权限必要性
   - 展示对用户隐私的重视

2. **提供证据**
   - GitHub 代码链接（如有）
   - 演示视频（如有）
   - 用户评价（如有）

3. **及时响应**
   - 如果审核团队有疑问，及时回复
   - 提供额外说明或修改

---

## 📞 如果审核失败

### 常见拒绝原因

1. **权限理由不充分**
   → 补充更详细的使用场景说明

2. **怀疑有数据收集**
   → 强调本地运行，提供代码审计链接

3. **认为权限过度**
   → 解释为什么不能使用更窄的匹配模式

### 申诉流程

1. 查看拒绝原因
2. 根据反馈修改说明
3. 重新提交审核
4. 必要时联系支持团队

---

## 💡 最佳实践

### 推荐的说明结构

1. **开头（1-2 句）**：简述扩展程序功能
2. **必要性（2-3 句）**：为什么需要这个权限
3. **具体用途（3-4 句）**：权限的实际使用方式
4. **隐私承诺（2-3 句）**：如何保护用户隐私
5. **结尾（1 句）**：再次强调用户控制权

---

**祝您顺利通过审核！** 🎉

如有问题，可以查看 Chrome 官方文档：
https://developer.chrome.com/docs/webstore/program-policies/
