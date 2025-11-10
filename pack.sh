#!/bin/bash

# Chrome 插件打包脚本
# 用法：./pack.sh

echo "📦 开始打包 Chrome 插件..."
echo ""

# 获取版本号
VERSION=$(grep '"version"' manifest.json | sed 's/.*"version": "\(.*\)".*/\1/')
echo "📌 当前版本：v${VERSION}"
echo ""

# 检查必需文件
echo "🔍 检查必需文件..."
REQUIRED_FILES=(
  "manifest.json"
  "content.js"
  "style.css"
  "icon16.png"
  "icon48.png"
  "icon128.png"
  "README.md"
  "LICENSE"
)

MISSING_FILES=()
for file in "${REQUIRED_FILES[@]}"; do
  if [ ! -f "$file" ]; then
    MISSING_FILES+=("$file")
    echo "❌ 缺少文件：$file"
  else
    echo "✅ $file"
  fi
done

echo ""

if [ ${#MISSING_FILES[@]} -ne 0 ]; then
  echo "⚠️  警告：缺少 ${#MISSING_FILES[@]} 个必需文件"
  echo "请确保所有文件都已创建"
  exit 1
fi

# 创建打包目录
PACKAGE_DIR="webTable-v${VERSION}"
ZIP_FILE="${PACKAGE_DIR}.zip"

echo "📁 创建打包目录：${PACKAGE_DIR}"

# 如果目录已存在，先删除
if [ -d "$PACKAGE_DIR" ]; then
  rm -rf "$PACKAGE_DIR"
fi

# 创建临时目录
mkdir -p "$PACKAGE_DIR"

# 复制必需文件
echo "📄 复制文件..."
cp manifest.json "$PACKAGE_DIR/"
cp content.js "$PACKAGE_DIR/"
cp style.css "$PACKAGE_DIR/"
cp icon16.png "$PACKAGE_DIR/"
cp icon48.png "$PACKAGE_DIR/"
cp icon128.png "$PACKAGE_DIR/"
cp README.md "$PACKAGE_DIR/"
cp LICENSE "$PACKAGE_DIR/"

echo ""
echo "✅ 所有文件已复制"
echo ""

# 打包为 ZIP
echo "🗜️  压缩为 ZIP 文件..."
if [ -f "$ZIP_FILE" ]; then
  rm "$ZIP_FILE"
fi

# 使用 zip 命令打包（Mac/Linux）
cd "$PACKAGE_DIR"
zip -r "../${ZIP_FILE}" ./* > /dev/null 2>&1
cd ..

# 清理临时目录
rm -rf "$PACKAGE_DIR"

if [ -f "$ZIP_FILE" ]; then
  FILE_SIZE=$(du -h "$ZIP_FILE" | cut -f1)
  echo "✅ 打包成功！"
  echo ""
  echo "📦 文件信息："
  echo "   文件名：${ZIP_FILE}"
  echo "   大小：${FILE_SIZE}"
  echo "   路径：$(pwd)/${ZIP_FILE}"
  echo ""
  echo "🎯 下一步："
  echo "   1. 在 Chrome 中打包为 CRX："
  echo "      chrome://extensions/ → 打包扩展程序"
  echo ""
  echo "   2. 或发布到 Chrome Web Store："
  echo "      https://chrome.google.com/webstore/devconsole"
  echo ""
  echo "   3. 查看详细发布指南："
  echo "      cat PUBLISH.md"
  echo ""
else
  echo "❌ 打包失败"
  exit 1
fi

echo "🎉 打包完成！"
