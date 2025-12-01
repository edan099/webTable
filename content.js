// 网页表格识别与导出器 - Content Script
// 全局变量
let currentTable = null;
let extractPanel = null;
let settingsPanel = null;
let isDisabledSite = false;

// 检查当前网站是否被禁用
async function checkDisabledStatus() {
  try {
    const result = await chrome.storage.sync.get(['disabledSites']);
    const disabledSites = result.disabledSites || [];
    const currentHost = window.location.hostname;
    isDisabledSite = disabledSites.includes(currentHost);
    return isDisabledSite;
  } catch (e) {
    return false;
  }
}

// 监听来自 popup 的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'updateDisabledStatus') {
    isDisabledSite = message.disabled;
    // 隐藏或显示所有悬浮按钮
    const buttons = document.querySelectorAll('.table-extractor-button-container');
    buttons.forEach(btn => {
      btn.style.display = isDisabledSite ? 'none' : '';
    });
    // 如果禁用，关闭提取面板
    if (isDisabledSite && extractPanel) {
      extractPanel.remove();
      extractPanel = null;
    }
  }
});

// 显示提示消息
function showMessage(message, type = 'success') {
  const messageDiv = document.createElement('div');
  messageDiv.className = `table-extractor-message table-extractor-message-${type}`;
  messageDiv.textContent = message;
  document.body.appendChild(messageDiv);
  
  // 3秒后自动消失
  setTimeout(() => {
    messageDiv.style.opacity = '0';
    setTimeout(() => {
      messageDiv.remove();
    }, 300);
  }, 3000);
}

// 初始化插件
async function init() {
  // 检查当前网站是否被禁用
  const disabled = await checkDisabledStatus();
  if (disabled) {
    console.log('[表格提取工具] 当前网站已禁用');
    return;
  }
  
  // 扫描页面中的所有表格
  scanTables();
  
  // 监听动态加载的内容
  observeDynamicContent();
}

// 扫描页面中的所有表格
function scanTables() {
  // 1. 扫描标准 HTML table 元素
  const tables = document.querySelectorAll('table');
  tables.forEach(table => {
    // 跳过 Element UI 等组件库内部的 table（它们会被外层 div 处理）
    if (isNestedInComponentTable(table)) {
      return;
    }
    // 避免重复添加
    if (!table.hasAttribute('data-table-extractor')) {
      table.setAttribute('data-table-extractor', 'true');
      addFloatingButton(table);
    }
  });
  
  // 2. 扫描 Element UI 表格 (.el-table)
  const elTables = document.querySelectorAll('.el-table');
  elTables.forEach(elTable => {
    if (!elTable.hasAttribute('data-table-extractor')) {
      elTable.setAttribute('data-table-extractor', 'true');
      addFloatingButton(elTable);
    }
  });
  
  // 3. 扫描 Ant Design 表格 (.ant-table-wrapper)
  const antTables = document.querySelectorAll('.ant-table-wrapper');
  antTables.forEach(antTable => {
    if (!antTable.hasAttribute('data-table-extractor')) {
      antTable.setAttribute('data-table-extractor', 'true');
      addFloatingButton(antTable);
    }
  });
}

// 检查 table 是否嵌套在组件库表格中
function isNestedInComponentTable(table) {
  let parent = table.parentElement;
  while (parent) {
    if (parent.classList.contains('el-table') || 
        parent.classList.contains('ant-table-wrapper')) {
      return true;
    }
    parent = parent.parentElement;
  }
  return false;
}

// 为表格添加悬浮按钮
function addFloatingButton(table) {
  // 如果网站被禁用，不添加按钮
  if (isDisabledSite) return;
  
  // 创建悬浮按钮容器
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'table-extractor-button-container';
  
  // 创建悬浮按钮
  const button = document.createElement('button');
  button.className = 'table-extractor-button';
  button.innerHTML = '📊 提取表格';
  button.style.display = 'none';
  
  // 创建设置按钮
  const settingsButton = document.createElement('button');
  settingsButton.className = 'table-extractor-settings-button';
  settingsButton.innerHTML = '⚙️';
  settingsButton.title = '设置';
  settingsButton.style.display = 'none';
  
  // 创建禁用按钮
  const disableButton = document.createElement('button');
  disableButton.className = 'table-extractor-disable-button';
  disableButton.innerHTML = '🚫';
  disableButton.title = '禁用此网站';
  disableButton.style.display = 'none';
  
  // 创建关闭按钮
  const closeButton = document.createElement('button');
  closeButton.className = 'table-extractor-close-button';
  closeButton.innerHTML = '✕';
  closeButton.title = '隐藏按钮';
  closeButton.style.display = 'none';
  
  buttonContainer.appendChild(button);
  buttonContainer.appendChild(settingsButton);
  buttonContainer.appendChild(disableButton);
  buttonContainer.appendChild(closeButton);
  document.body.appendChild(buttonContainer);
  
  // 标记表格是否已隐藏按钮
  let isHidden = false;
  
  // 鼠标悬停事件
  table.addEventListener('mouseenter', (e) => {
    if (isHidden || isDisabledSite) return; // 如果已隐藏或网站被禁用，不再显示
    
    const rect = table.getBoundingClientRect();
    buttonContainer.style.top = `${rect.top + window.scrollY}px`;
    buttonContainer.style.left = `${rect.right + window.scrollX - 175}px`;
    button.style.display = 'block';
    settingsButton.style.display = 'block';
    disableButton.style.display = 'block';
    closeButton.style.display = 'block';
    currentTable = table;
  });
  
  table.addEventListener('mouseleave', (e) => {
    // 检查鼠标是否移动到按钮上
    setTimeout(() => {
      if (!buttonContainer.matches(':hover')) {
        button.style.display = 'none';
        settingsButton.style.display = 'none';
        disableButton.style.display = 'none';
        closeButton.style.display = 'none';
      }
    }, 100);
  });
  
  buttonContainer.addEventListener('mouseleave', () => {
    button.style.display = 'none';
    settingsButton.style.display = 'none';
    disableButton.style.display = 'none';
    closeButton.style.display = 'none';
  });
  
  // 点击提取按钮显示提取面板
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    showExtractPanel(table);
    button.style.display = 'none';
    settingsButton.style.display = 'none';
    disableButton.style.display = 'none';
    closeButton.style.display = 'none';
  });
  
  // 点击设置按钮显示设置面板
  settingsButton.addEventListener('click', (e) => {
    e.stopPropagation();
    showSettingsPanel();
    button.style.display = 'none';
    settingsButton.style.display = 'none';
    disableButton.style.display = 'none';
    closeButton.style.display = 'none';
  });
  
  // 点击禁用按钮禁用当前网站
  disableButton.addEventListener('click', async (e) => {
    e.stopPropagation();
    const currentHost = window.location.hostname;
    
    try {
      // 获取当前禁用列表
      const result = await chrome.storage.sync.get(['disabledSites']);
      const disabledSites = result.disabledSites || [];
      
      // 添加当前网站
      if (!disabledSites.includes(currentHost)) {
        disabledSites.push(currentHost);
        await chrome.storage.sync.set({ disabledSites });
      }
      
      // 更新状态
      isDisabledSite = true;
      
      // 隐藏所有按钮
      const allButtons = document.querySelectorAll('.table-extractor-button-container');
      allButtons.forEach(btn => btn.style.display = 'none');
      
      // 关闭提取面板和设置面板
      if (extractPanel) {
        extractPanel.remove();
        extractPanel = null;
      }
      closeSettingsPanel();
      
      showMessage(`已禁用 ${currentHost}，点击扩展图标可解除`, 'info');
    } catch (err) {
      showMessage('禁用失败，请重试', 'error');
    }
  });
  
  // 点击关闭按钮隐藏悬浮按钮
  closeButton.addEventListener('click', (e) => {
    e.stopPropagation();
    isHidden = true;
    button.style.display = 'none';
    settingsButton.style.display = 'none';
    disableButton.style.display = 'none';
    closeButton.style.display = 'none';
    // 显示提示消息
    showMessage('已隐藏此表格的提取按钮，刷新页面可恢复', 'info');
  });
}

// 显示提取面板
function showExtractPanel(table) {
  // 如果面板已存在，先移除
  if (extractPanel) {
    extractPanel.remove();
  }
  
  currentTable = table;
  
  // 创建面板
  extractPanel = document.createElement('div');
  extractPanel.className = 'table-extractor-panel';
  extractPanel.innerHTML = `
    <div class="panel-header">
      <h3>📊 表格提取工具</h3>
      <button class="close-btn" title="关闭">✕</button>
    </div>
    <div class="panel-tabs">
      <button class="tab-btn active" data-format="json">🟢 导出 JSON</button>
      <button class="tab-btn" data-format="csv">🔵 导出 CSV</button>
      <button class="tab-btn" data-format="sql">🟣 导出 SQL</button>
    </div>
    <div class="panel-config" id="sqlConfig" style="display: none;">
      <div class="config-item">
        <label for="tableNameInput">表名：</label>
        <input type="text" id="tableNameInput" value="table_data" placeholder="输入表名">
        <button class="refresh-btn" title="重新生成">🔄</button>
      </div>
    </div>
    <div class="panel-content">
      <div class="output-area">
        <pre id="outputContent"></pre>
      </div>
      <div class="panel-actions">
        <button class="action-btn copy-btn">📋 复制结果</button>
        <button class="action-btn download-btn">💾 下载文件</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(extractPanel);
  
  // 绑定事件
  bindPanelEvents();
  
  // 默认显示 JSON 格式
  extractData('json');
}

// 绑定面板事件
function bindPanelEvents() {
  // 关闭按钮
  extractPanel.querySelector('.close-btn').addEventListener('click', () => {
    extractPanel.remove();
    extractPanel = null;
  });
  
  // 标签切换
  const tabBtns = extractPanel.querySelectorAll('.tab-btn');
  const sqlConfig = extractPanel.querySelector('#sqlConfig');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const format = btn.getAttribute('data-format');
      
      // 显示或隐藏 SQL 配置区
      if (format === 'sql') {
        sqlConfig.style.display = 'block';
      } else {
        sqlConfig.style.display = 'none';
      }
      
      extractData(format);
    });
  });
  
  // 表名输入框回车或刷新按钮点击时重新生成
  const tableNameInput = extractPanel.querySelector('#tableNameInput');
  const refreshBtn = extractPanel.querySelector('.refresh-btn');
  
  const regenerateSQL = () => {
    const activeTab = extractPanel.querySelector('.tab-btn.active');
    if (activeTab && activeTab.getAttribute('data-format') === 'sql') {
      extractData('sql');
    }
  };
  
  tableNameInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      regenerateSQL();
    }
  });
  
  refreshBtn.addEventListener('click', regenerateSQL);
  
  // 复制按钮
  extractPanel.querySelector('.copy-btn').addEventListener('click', () => {
    const content = extractPanel.querySelector('#outputContent').textContent;
    copyToClipboard(content);
  });
  
  // 下载按钮
  extractPanel.querySelector('.download-btn').addEventListener('click', () => {
    const format = extractPanel.querySelector('.tab-btn.active').getAttribute('data-format');
    const content = extractPanel.querySelector('#outputContent').textContent;
    downloadFile(content, format);
  });
  
  // 点击面板外部关闭
  document.addEventListener('click', handleOutsideClick);
}

// 处理点击面板外部
function handleOutsideClick(e) {
  if (extractPanel && !extractPanel.contains(e.target) && !e.target.classList.contains('table-extractor-button')) {
    extractPanel.remove();
    extractPanel = null;
    document.removeEventListener('click', handleOutsideClick);
  }
}

// 提取表格数据
function extractData(format) {
  if (!currentTable) return;
  
  const data = parseTable(currentTable);
  let output = '';
  
  switch (format) {
    case 'json':
      output = convertToJSON(data);
      break;
    case 'csv':
      output = convertToCSV(data);
      break;
    case 'sql':
      output = convertToSQL(data);
      break;
  }
  
  extractPanel.querySelector('#outputContent').textContent = output;
}

// 解析表格数据
function parseTable(table) {
  // 检测表格类型
  if (table.classList && table.classList.contains('el-table')) {
    return parseElementUITable(table);
  } else if (table.classList && table.classList.contains('ant-table-wrapper')) {
    return parseAntDesignTable(table);
  } else {
    return parseStandardTable(table);
  }
}

// 解析标准 HTML 表格
function parseStandardTable(table) {
  const rows = table.querySelectorAll('tr');
  const data = {
    headers: [],
    rows: []
  };
  
  if (rows.length === 0) return data;
  
  // 提取表头
  const firstRow = rows[0];
  const headerCells = firstRow.querySelectorAll('th, td');
  headerCells.forEach(cell => {
    data.headers.push(cell.textContent.trim() || `列${data.headers.length + 1}`);
  });
  
  // 如果第一行是 th，从第二行开始提取数据；否则从第一行开始
  const hasHeaderRow = firstRow.querySelector('th') !== null;
  const startRow = hasHeaderRow ? 1 : 0;
  
  // 如果没有表头行，使用第一行作为表头
  if (!hasHeaderRow && rows.length > 0) {
    data.headers = [];
    const cells = rows[0].querySelectorAll('td');
    cells.forEach((cell, index) => {
      data.headers.push(`列${index + 1}`);
    });
  }
  
  // 提取数据行
  for (let i = startRow; i < rows.length; i++) {
    const cells = rows[i].querySelectorAll('td');
    if (cells.length === 0) continue;
    
    const rowData = [];
    cells.forEach((cell, index) => {
      // 只提取与表头数量相同的列数
      if (data.headers.length > 0 && index >= data.headers.length) {
        return;
      }
      rowData.push(cell.textContent.trim());
    });
    
    // 如果行数据不为空，才添加
    if (rowData.length > 0) {
      data.rows.push(rowData);
    }
  }
  
  return data;
}

// 解析 Element UI 表格
function parseElementUITable(elTable) {
  const data = {
    headers: [],
    rows: []
  };
  
  // 1. 提取表头 - 从 el-table__header 中获取
  const headerTable = elTable.querySelector('.el-table__header');
  if (headerTable) {
    const headerCells = headerTable.querySelectorAll('th');
    headerCells.forEach(cell => {
      // 跳过 gutter 列
      if (cell.classList.contains('gutter')) return;
      
      const cellDiv = cell.querySelector('.cell');
      const headerText = cellDiv ? cellDiv.textContent.trim() : cell.textContent.trim();
      if (headerText) {
        data.headers.push(headerText);
      }
    });
  }
  
  // 2. 提取数据行 - 从 el-table__body 中获取
  const bodyTable = elTable.querySelector('.el-table__body');
  if (bodyTable) {
    const bodyRows = bodyTable.querySelectorAll('tbody tr');
    bodyRows.forEach(row => {
      // 跳过空行
      if (!row.classList.contains('el-table__row')) return;
      
      const cells = row.querySelectorAll('td');
      const rowData = [];
      
      cells.forEach((cell, index) => {
        // 只提取与表头数量相同的列数
        if (data.headers.length > 0 && index >= data.headers.length) {
          return;
        }
        
        const cellDiv = cell.querySelector('.cell');
        const cellText = cellDiv ? cellDiv.textContent.trim() : cell.textContent.trim();
        rowData.push(cellText);
      });
      
      if (rowData.length > 0) {
        data.rows.push(rowData);
      }
    });
  }
  
  // 如果没有找到表头，生成默认表头
  if (data.headers.length === 0 && data.rows.length > 0) {
    for (let i = 0; i < data.rows[0].length; i++) {
      data.headers.push(`列${i + 1}`);
    }
  }
  
  return data;
}

// 解析 Ant Design 表格
function parseAntDesignTable(antTable) {
  const data = {
    headers: [],
    rows: []
  };
  
  // 查找实际的 table 元素
  const table = antTable.querySelector('table');
  if (!table) return data;
  
  // 1. 提取表头
  const headerCells = table.querySelectorAll('thead th');
  headerCells.forEach(cell => {
    const headerText = cell.textContent.trim();
    if (headerText) {
      data.headers.push(headerText);
    }
  });
  
  // 2. 提取数据行
  const bodyRows = table.querySelectorAll('tbody tr');
  bodyRows.forEach(row => {
    const cells = row.querySelectorAll('td');
    const rowData = [];
    
    cells.forEach((cell, index) => {
      // 只提取与表头数量相同的列数
      if (data.headers.length > 0 && index >= data.headers.length) {
        return;
      }
      rowData.push(cell.textContent.trim());
    });
    
    if (rowData.length > 0) {
      data.rows.push(rowData);
    }
  });
  
  // 如果没有找到表头，生成默认表头
  if (data.headers.length === 0 && data.rows.length > 0) {
    for (let i = 0; i < data.rows[0].length; i++) {
      data.headers.push(`列${i + 1}`);
    }
  }
  
  return data;
}

// 转换为 JSON 格式
function convertToJSON(data) {
  const result = data.rows.map(row => {
    const obj = {};
    data.headers.forEach((header, index) => {
      obj[header] = row[index] || '';
    });
    return obj;
  });
  
  return JSON.stringify(result, null, 2);
}

// 转换为 CSV 格式
function convertToCSV(data) {
  const lines = [];
  
  // 添加表头
  lines.push(data.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
  
  // 添加数据行
  data.rows.forEach(row => {
    const line = row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',');
    lines.push(line);
  });
  
  return lines.join('\n');
}

// 转换为 SQL 格式
function convertToSQL(data, tableName = 'table_data') {
  if (data.rows.length === 0) {
    return '-- 没有数据可导出';
  }
  
  // 如果面板存在，从输入框获取表名
  if (extractPanel) {
    const tableNameInput = extractPanel.querySelector('#tableNameInput');
    if (tableNameInput && tableNameInput.value.trim()) {
      tableName = tableNameInput.value.trim();
    }
  }
  
  // 清理表名，只保留字母、数字、下划线和中文
  tableName = tableName.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_');
  
  const columns = data.headers.map(h => h.replace(/[^a-zA-Z0-9_\u4e00-\u9fa5]/g, '_')).join(', ');
  
  const lines = [`-- INSERT 语句\n`];
  
  data.rows.forEach((row, index) => {
    const values = row.map(cell => {
      // 处理 NULL 值
      if (cell === '' || cell === null || cell === undefined) {
        return 'NULL';
      }
      // 处理数字
      if (!isNaN(cell) && cell.trim() !== '') {
        return cell;
      }
      // 处理字符串
      return `'${String(cell).replace(/'/g, "''")}'`;
    }).join(', ');
    
    lines.push(`INSERT INTO ${tableName} (${columns}) VALUES (${values});`);
  });
  
  return lines.join('\n');
}

// 复制到剪贴板
function copyToClipboard(text) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('✅ 已复制到剪贴板');
  }).catch(err => {
    // 降级方案
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
    showToast('✅ 已复制到剪贴板');
  });
}

// 下载文件
function downloadFile(content, format) {
  const extensions = {
    json: 'json',
    csv: 'csv',
    sql: 'sql'
  };
  
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `table_export_${Date.now()}.${extensions[format]}`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  
  showToast('✅ 文件下载成功');
}

// 显示提示消息
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'table-extractor-toast';
  toast.textContent = message;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.classList.add('show');
  }, 10);
  
  setTimeout(() => {
    toast.classList.remove('show');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }, 2000);
}

// 显示设置面板
async function showSettingsPanel() {
  // 如果面板已存在，先移除
  closeSettingsPanel();
  
  const currentHost = window.location.hostname;
  
  // 获取禁用列表
  let disabledSites = [];
  try {
    const result = await chrome.storage.sync.get(['disabledSites']);
    disabledSites = result.disabledSites || [];
  } catch (e) {}
  
  const isCurrentDisabled = disabledSites.includes(currentHost);
  
  // 创建面板
  settingsPanel = document.createElement('div');
  settingsPanel.className = 'table-extractor-settings-panel';
  settingsPanel.innerHTML = `
    <div class="settings-panel-header">
      <h3>⚙️ 设置</h3>
      <button class="settings-close-btn" title="关闭">✕</button>
    </div>
    <div class="settings-panel-content">
      <div class="settings-section">
        <div class="settings-current-site">
          <span class="settings-label">当前网站</span>
          <span class="settings-host">${currentHost}</span>
          <span class="settings-status ${isCurrentDisabled ? 'disabled' : 'enabled'}">${isCurrentDisabled ? '已禁用' : '已启用'}</span>
        </div>
        <button class="settings-toggle-btn ${isCurrentDisabled ? 'enable' : 'disable'}" data-host="${currentHost}">
          ${isCurrentDisabled ? '✅ 启用此网站' : '🚫 禁用此网站'}
        </button>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">📋 已禁用的网站 (${disabledSites.length})</div>
        <div class="settings-disabled-list">
          ${disabledSites.length === 0 ? '<div class="settings-empty">暂无禁用的网站</div>' : 
            disabledSites.map(host => `
              <div class="settings-disabled-item">
                <span class="settings-disabled-host">${host}</span>
                <button class="settings-remove-btn" data-host="${host}" title="解除禁用">✕</button>
              </div>
            `).join('')}
        </div>
      </div>
    </div>
  `;
  
  document.body.appendChild(settingsPanel);
  
  // 绑定事件
  bindSettingsPanelEvents();
}

// 绑定设置面板事件
function bindSettingsPanelEvents() {
  if (!settingsPanel) return;
  
  // 关闭按钮
  settingsPanel.querySelector('.settings-close-btn').addEventListener('click', closeSettingsPanel);
  
  // 切换当前网站状态
  settingsPanel.querySelector('.settings-toggle-btn').addEventListener('click', async (e) => {
    const host = e.target.dataset.host;
    await toggleSiteDisabled(host);
    // 刷新面板
    showSettingsPanel();
  });
  
  // 解除禁用按钮
  settingsPanel.querySelectorAll('.settings-remove-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      const host = e.target.dataset.host;
      await removeSiteFromDisabled(host);
      // 刷新面板
      showSettingsPanel();
    });
  });
  
  // 点击面板外部关闭
  document.addEventListener('click', handleSettingsOutsideClick);
}

// 切换网站禁用状态
async function toggleSiteDisabled(host) {
  try {
    const result = await chrome.storage.sync.get(['disabledSites']);
    let disabledSites = result.disabledSites || [];
    
    const index = disabledSites.indexOf(host);
    if (index === -1) {
      disabledSites.push(host);
      if (host === window.location.hostname) {
        isDisabledSite = true;
        hideAllButtons();
      }
      showMessage(`已禁用 ${host}`, 'info');
    } else {
      disabledSites.splice(index, 1);
      if (host === window.location.hostname) {
        isDisabledSite = false;
        showMessage(`已启用 ${host}，刷新页面生效`, 'success');
      }
    }
    
    await chrome.storage.sync.set({ disabledSites });
  } catch (e) {
    showMessage('操作失败', 'error');
  }
}

// 从禁用列表移除网站
async function removeSiteFromDisabled(host) {
  try {
    const result = await chrome.storage.sync.get(['disabledSites']);
    let disabledSites = result.disabledSites || [];
    
    const index = disabledSites.indexOf(host);
    if (index !== -1) {
      disabledSites.splice(index, 1);
      await chrome.storage.sync.set({ disabledSites });
      
      if (host === window.location.hostname) {
        isDisabledSite = false;
        showMessage(`已启用 ${host}，刷新页面生效`, 'success');
      } else {
        showMessage(`已解除禁用 ${host}`, 'success');
      }
    }
  } catch (e) {
    showMessage('操作失败', 'error');
  }
}

// 隐藏所有悬浮按钮
function hideAllButtons() {
  const allButtons = document.querySelectorAll('.table-extractor-button-container');
  allButtons.forEach(btn => btn.style.display = 'none');
  if (extractPanel) {
    extractPanel.remove();
    extractPanel = null;
  }
}

// 关闭设置面板
function closeSettingsPanel() {
  if (settingsPanel) {
    settingsPanel.remove();
    settingsPanel = null;
    document.removeEventListener('click', handleSettingsOutsideClick);
  }
}

// 处理点击设置面板外部
function handleSettingsOutsideClick(e) {
  if (settingsPanel && !settingsPanel.contains(e.target) && 
      !e.target.classList.contains('table-extractor-settings-button')) {
    closeSettingsPanel();
  }
}

// 监听动态内容
function observeDynamicContent() {
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // 检查新添加的节点是否是 Element UI 表格
          if (node.classList && node.classList.contains('el-table')) {
            if (!node.hasAttribute('data-table-extractor')) {
              node.setAttribute('data-table-extractor', 'true');
              addFloatingButton(node);
            }
          }
          
          // 检查新添加的节点是否是 Ant Design 表格
          if (node.classList && node.classList.contains('ant-table-wrapper')) {
            if (!node.hasAttribute('data-table-extractor')) {
              node.setAttribute('data-table-extractor', 'true');
              addFloatingButton(node);
            }
          }
          
          // 检查新添加的节点是否是标准表格
          if (node.tagName === 'TABLE' && !isNestedInComponentTable(node)) {
            if (!node.hasAttribute('data-table-extractor')) {
              node.setAttribute('data-table-extractor', 'true');
              addFloatingButton(node);
            }
          }
          
          // 检查新添加节点的子元素中是否有表格
          // 1. Element UI 表格
          const elTables = node.querySelectorAll ? node.querySelectorAll('.el-table') : [];
          elTables.forEach(elTable => {
            if (!elTable.hasAttribute('data-table-extractor')) {
              elTable.setAttribute('data-table-extractor', 'true');
              addFloatingButton(elTable);
            }
          });
          
          // 2. Ant Design 表格
          const antTables = node.querySelectorAll ? node.querySelectorAll('.ant-table-wrapper') : [];
          antTables.forEach(antTable => {
            if (!antTable.hasAttribute('data-table-extractor')) {
              antTable.setAttribute('data-table-extractor', 'true');
              addFloatingButton(antTable);
            }
          });
          
          // 3. 标准表格
          const tables = node.querySelectorAll ? node.querySelectorAll('table') : [];
          tables.forEach(table => {
            if (!isNestedInComponentTable(table) && !table.hasAttribute('data-table-extractor')) {
              table.setAttribute('data-table-extractor', 'true');
              addFloatingButton(table);
            }
          });
        }
      });
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
