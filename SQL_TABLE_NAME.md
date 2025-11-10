# 🎯 SQL 导出 - 自定义表名功能

## 功能说明

从 v1.2.0 版本开始，支持在导出 SQL 时自定义表名！

---

## 🎨 功能特点

### 核心功能
- ✅ **可编辑表名** - 在输入框中输入自定义表名
- ✅ **默认值** - 默认使用 `table_data`
- ✅ **实时生成** - 修改后即可重新生成 SQL
- ✅ **智能清理** - 自动清理特殊字符
- ✅ **支持中文** - 完全支持中文表名

### UI 设计
- 🟡 **黄色配置区** - 醒目的配置区域
- 🔄 **刷新按钮** - 旋转动画效果
- ⌨️ **回车快捷键** - 按 Enter 立即生成
- 👁️ **智能显示** - 仅在 SQL 标签下显示

---

## 📖 使用方法

### 基本使用

1. **打开提取面板**
   - 鼠标移到表格上
   - 点击「📊 提取表格」按钮

2. **切换到 SQL 标签**
   - 点击「🟣 导出 SQL」按钮
   - 配置区自动显示

3. **修改表名**
   - 在输入框中输入想要的表名
   - 例如：`users`, `products`, `订单表` 等

4. **重新生成 SQL**
   - 方式一：按 **Enter** 键
   - 方式二：点击 **🔄** 刷新按钮

5. **复制或下载**
   - 点击「📋 复制结果」
   - 或点击「💾 下载文件」

---

## 🌰 使用示例

### 示例 1：英文表名

**输入：**
```
users
```

**生成的 SQL：**
```sql
INSERT INTO users (id, name, email) VALUES (1, 'John', 'john@example.com');
INSERT INTO users (id, name, email) VALUES (2, 'Jane', 'jane@example.com');
```

---

### 示例 2：中文表名

**输入：**
```
用户表
```

**生成的 SQL：**
```sql
INSERT INTO 用户表 (id, 姓名, 邮箱) VALUES (1, '张三', 'zhangsan@example.com');
INSERT INTO 用户表 (id, 姓名, 邮箱) VALUES (2, '李四', 'lisi@example.com');
```

---

### 示例 3：带下划线的表名

**输入：**
```
user_profiles
```

**生成的 SQL：**
```sql
INSERT INTO user_profiles (user_id, full_name, age) VALUES (1, 'John Doe', 25);
INSERT INTO user_profiles (user_id, full_name, age) VALUES (2, 'Jane Smith', 30);
```

---

### 示例 4：特殊字符自动清理

**输入：**
```
user-data@2024
```

**自动转换为：**
```
user_data_2024
```

**生成的 SQL：**
```sql
INSERT INTO user_data_2024 (id, name) VALUES (1, 'John');
```

---

## 🛡️ 表名规则

### 允许的字符
- ✅ 英文字母（a-z, A-Z）
- ✅ 数字（0-9）
- ✅ 下划线（_）
- ✅ 中文字符（\u4e00-\u9fa5）

### 自动清理
特殊字符会自动转换为下划线：
- `-` → `_`
- `@` → `_`
- `#` → `_`
- 空格 → `_`
- 其他特殊符号 → `_`

### 示例转换

| 输入 | 输出 |
|------|------|
| `user-data` | `user_data` |
| `user@2024` | `user_2024` |
| `user data` | `user_data` |
| `用户表#2024` | `用户表_2024` |

---

## ⌨️ 快捷操作

### 键盘快捷键
- **Enter** - 重新生成 SQL
- **Tab** - 切换到其他控件
- **Esc** - 关闭面板（点击外部）

### 鼠标操作
- **点击输入框** - 开始编辑
- **点击 🔄 按钮** - 重新生成
- **双击输入框** - 全选文本

---

## 🎨 UI 界面

### 配置区外观

```
┌─────────────────────────────────────┐
│  表名：[table_data         ] 🔄   │  ← 黄色配置区
└─────────────────────────────────────┘
```

### 颜色主题
- **背景色**：淡黄色（#fffbeb）
- **边框色**：金黄色（#fbbf24）
- **输入框**：白色背景，金色边框
- **按钮**：金色渐变

### 动画效果
- **刷新按钮**：悬停时旋转 90 度
- **输入框聚焦**：边框高亮 + 阴影效果
- **配置区**：平滑显示/隐藏

---

## 💡 使用技巧

### 技巧 1：快速切换表名

如果需要为同一表格生成不同表名的 SQL：

1. 生成第一个 SQL，复制
2. 修改表名
3. 按 Enter 重新生成
4. 复制第二个 SQL
5. 重复以上步骤

### 技巧 2：批量处理

如果有多个表格需要导出到不同的表：

```sql
-- 表1：用户表
INSERT INTO users (id, name) VALUES (1, 'John');

-- 表2：订单表
INSERT INTO orders (order_id, amount) VALUES (1001, 199.99);

-- 表3：产品表
INSERT INTO products (product_id, title) VALUES (2001, 'iPhone');
```

### 技巧 3：使用有意义的表名

推荐的命名规范：

```
✅ 好的命名：
- users
- user_profiles
- order_items
- product_categories

❌ 避免的命名：
- table1
- data
- temp
- test
```

---

## 🔄 版本历史

### v1.2.0 - 首次发布
- ✅ 新增自定义表名功能
- ✅ UI 配置区设计
- ✅ 快捷键支持

---

## 🐛 常见问题

### Q1: 为什么我的特殊字符被替换了？

**A:** 为了确保 SQL 语句的兼容性，特殊字符会自动转换为下划线。大多数数据库不支持表名中的特殊字符。

---

### Q2: 支持哪些数据库？

**A:** 生成的 SQL 语句符合标准 SQL 语法，支持：
- MySQL
- PostgreSQL
- SQLite
- SQL Server
- Oracle
- MariaDB

---

### Q3: 中文表名在数据库中能用吗？

**A:** 大多数现代数据库支持 UTF-8 编码的中文表名，但建议：
- 生产环境使用英文表名
- 开发/测试环境可以使用中文

---

### Q4: 可以包含数字吗？

**A:** 可以！但建议：
- ✅ `user_2024` - 推荐
- ✅ `users_v2` - 推荐
- ⚠️ `2024_users` - 某些数据库不支持以数字开头

---

### Q5: 输入框为什么是黄色的？

**A:** 黄色主题用于区分配置区域，让用户清楚这是一个可编辑的设置区，而不是输出内容。

---

## 📊 对比

### 修改前（v1.1.1 及更早）

```sql
-- 固定表名
INSERT INTO table_data (id, name) VALUES (1, 'John');
```

❌ 无法修改表名  
❌ 需要手动替换

### 修改后（v1.2.0）

```sql
-- 可自定义表名
INSERT INTO users (id, name) VALUES (1, 'John');
```

✅ 可输入任意表名  
✅ 即时生成  
✅ 智能清理

---

## 🎯 最佳实践

### 推荐做法

1. **使用小写字母和下划线**
   ```
   user_profiles, order_items, product_categories
   ```

2. **复数形式表示多条记录**
   ```
   users, orders, products (而不是 user, order, product)
   ```

3. **避免保留字**
   ```
   ❌ table, user, order (数据库保留字)
   ✅ user_table, user_info, order_data
   ```

4. **描述性命名**
   ```
   ✅ customer_orders (清晰)
   ❌ co (不清晰)
   ```

---

## 🚀 未来计划

### 可能的增强功能

- [ ] 保存常用表名列表
- [ ] 表名历史记录
- [ ] 表名智能建议
- [ ] 批量导出多个表
- [ ] CREATE TABLE 语句生成

---

## 📝 反馈

如有建议或问题，欢迎反馈：
- GitHub Issues
- 插件评论区
- 邮件联系

---

**享受更灵活的 SQL 导出体验！** 🎉
