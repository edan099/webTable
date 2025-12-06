// 网页表格识别与导出器 - Content Script

// 安全设置 HTML 内容（仅用于可信的静态模板）
const safeSetHTML = (el, html) => { el.insertAdjacentHTML('afterbegin', html); };

// 全局变量
let currentTable = null;
let extractPanel = null;
let settingsPanel = null;
let isDisabledSite = false;

// 智能过滤配置（默认值）
let filterConfig = {
  enabled: true,           // 是否启用智能过滤
  minRows: 2,              // 最小行数
  minCols: 2,              // 最小列数
  maxInteractiveRatio: 0.7, // 交互元素占比阈值
  hoverMode: 'hover'       // 显示模式: 'always' 始终显示, 'hover' 鼠标悬停显示(默认)
};

// 加载过滤配置
async function loadFilterConfig() {
  try {
    const result = await chrome.storage.sync.get(['tableFilterConfig']);
    if (result.tableFilterConfig) {
      filterConfig = { ...filterConfig, ...result.tableFilterConfig };
    }
  } catch (e) {
    // 忽略配置加载错误，使用默认配置
  }
}

// 保存过滤配置
async function saveFilterConfig(config) {
  try {
    filterConfig = { ...filterConfig, ...config };
    await chrome.storage.sync.set({ tableFilterConfig: filterConfig });
  } catch (e) {
    // 忽略保存错误
  }
}

// 智能判断是否为数据表格
function isDataTable(table) {
  // 如果未启用智能过滤，直接返回 true
  if (!filterConfig.enabled) return true;
  
  // 1. role="presentation" 明确表示布局表格
  if (table.getAttribute('role') === 'presentation') return false;
  
  // 2. 检测行列数
  const rows = table.querySelectorAll('tr');
  if (rows.length < filterConfig.minRows) return false;
  
  const firstRow = rows[0];
  const cols = firstRow ? firstRow.querySelectorAll('th, td').length : 0;
  if (cols < filterConfig.minCols) return false;
  
  // 3. 检测交互元素占比（布局表格通常包含大量链接、按钮、图片）
  const cells = table.querySelectorAll('td');
  if (cells.length === 0) return true; // 只有 th 的表格认为是数据表格
  
  let interactiveCount = 0;
  cells.forEach(cell => {
    // 检查单元格是否主要是交互元素
    const hasInteractive = cell.querySelector('a, button, input, select, textarea, form');
    const hasOnlyImage = cell.children.length === 1 && cell.querySelector('img');
    if (hasInteractive || hasOnlyImage) {
      interactiveCount++;
    }
  });
  
  const interactiveRatio = interactiveCount / cells.length;
  if (interactiveRatio > filterConfig.maxInteractiveRatio) return false;
  
  // 4. 检测常见的布局表格 class
  const layoutClasses = ['layout', 'nav', 'menu', 'toolbar', 'sidebar'];
  const tableClasses = table.className.toLowerCase();
  for (const cls of layoutClasses) {
    if (tableClasses.includes(cls)) return false;
  }
  
  return true;
}

// 获取当前页面标识（兼容 file:// 协议）
function getCurrentHost() {
  if (window.location.protocol === 'file:') {
    return 'file://' + window.location.pathname;
  }
  return window.location.hostname;
}

// 检查当前网站是否被禁用
async function checkDisabledStatus() {
  try {
    const result = await chrome.storage.sync.get(['disabledSites']);
    const disabledSites = result.disabledSites || [];
    const currentHost = getCurrentHost();
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
  // 加载过滤配置
  await loadFilterConfig();
  
  // 检查当前网站是否被禁用
  const disabled = await checkDisabledStatus();
  if (disabled) {
    return;
  }
  
  // 扫描页面中的所有表格
  scanTables();
  
  // iframe 中可能内容加载较晚，延迟再扫描几次
  setTimeout(scanTables, 500);
  setTimeout(scanTables, 1500);
  setTimeout(scanTables, 3000);
  
  // 监听动态加载的内容
  observeDynamicContent();
}

// 清理已消失表格的按钮
function cleanupButtons() {
  const containers = document.querySelectorAll('.table-extractor-button-container');
  containers.forEach(container => {
    const table = container._associatedTable;
    if (table) {
      const rect = table.getBoundingClientRect();
      // 表格不在 DOM 中或不可见，隐藏按钮
      if (!document.body.contains(table) || rect.width === 0 || rect.height === 0) {
        container.classList.remove('visible', 'always-visible');
      } else if (filterConfig.hoverMode === 'always') {
        // 表格可见，确保按钮显示
        container.classList.add('visible', 'always-visible');
      }
    }
  });
}

// 扫描页面中的所有表格
function scanTables() {
  // 先清理已消失表格的按钮
  cleanupButtons();
  
  // 1. 扫描标准 HTML table 元素
  const tables = document.querySelectorAll('table');
  
  tables.forEach((table) => {
    // 跳过 Element UI 等组件库内部的 table（它们会被外层 div 处理）
    if (isNestedInComponentTable(table)) {
      return;
    }
    // 智能过滤：跳过界面布局表格
    if (!isDataTable(table)) {
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
  
  // 创建主按钮（提取表格）
  const button = document.createElement('button');
  button.className = 'table-extractor-button';
  button.innerHTML = '📊 提取';
  
  // 创建更多按钮（折叠菜单触发器）
  const moreButton = document.createElement('button');
  moreButton.className = 'table-extractor-more-button';
  moreButton.innerHTML = '⋯';
  moreButton.title = '更多选项';
  
  // 创建折叠菜单
  const menuContainer = document.createElement('div');
  menuContainer.className = 'table-extractor-menu';
  menuContainer.innerHTML = `
    <button class="menu-item menu-settings">⚙️ 设置</button>
    <button class="menu-item menu-disable">🚫 禁用此网站</button>
    <button class="menu-item menu-hide">✕ 隐藏按钮</button>
  `;
  
  buttonContainer.appendChild(button);
  buttonContainer.appendChild(moreButton);
  buttonContainer.appendChild(menuContainer);
  document.body.appendChild(buttonContainer);
  
  // 关联表格与按钮容器（用于清理）
  buttonContainer._associatedTable = table;
  
  // 标记表格是否已隐藏按钮
  let isHidden = false;
  
  // 更新按钮位置（右上角）
  const updatePosition = () => {
    const rect = table.getBoundingClientRect();
    buttonContainer.style.top = `${rect.top + window.scrollY + 5}px`;
    buttonContainer.style.right = `${document.documentElement.clientWidth - rect.right + 5}px`;
    buttonContainer.style.left = 'auto';
  };
  
  // 显示按钮
  const showButtons = () => {
    if (isHidden || isDisabledSite) return;
    updatePosition();
    buttonContainer.classList.add('visible');
    currentTable = table;
  };
  
  // 隐藏按钮
  const hideButtons = () => {
    if (filterConfig.hoverMode === 'always') return; // 始终显示模式不隐藏
    buttonContainer.classList.remove('visible');
    menuContainer.classList.remove('show');
  };
  
  // 根据模式设置显示
  if (filterConfig.hoverMode === 'always') {
    // 始终显示模式 - 轮询检测表格渲染状态
    let checkCount = 0;
    const maxChecks = 60; // 最多检测 60 次（约 30 秒）
    
    const checkInterval = setInterval(() => {
      checkCount++;
      const rect = table.getBoundingClientRect();
      
      // 表格已渲染且可见
      if (rect.width > 0 && rect.height > 0) {
        updatePosition();
        buttonContainer.classList.add('visible', 'always-visible');
        currentTable = table;
      }
      
      // 超过最大检测次数，停止轮询
      if (checkCount >= maxChecks) {
        clearInterval(checkInterval);
      }
    }, 500); // 每 500ms 检测一次
    
    // 监听滚动更新位置
    window.addEventListener('scroll', updatePosition, { passive: true });
    // 监听窗口大小变化
    window.addEventListener('resize', updatePosition, { passive: true });
  } else {
    // 鼠标悬停模式
    table.addEventListener('mouseenter', showButtons);
    table.addEventListener('mouseleave', (e) => {
      setTimeout(() => {
        if (!buttonContainer.matches(':hover')) {
          hideButtons();
        }
      }, 100);
    });
    buttonContainer.addEventListener('mouseleave', hideButtons);
  }
  
  // 菜单显示/隐藏控制
  let menuHideTimeout = null;
  
  const showMenu = () => {
    if (menuHideTimeout) {
      clearTimeout(menuHideTimeout);
      menuHideTimeout = null;
    }
    menuContainer.classList.add('show');
  };
  
  const hideMenuDelayed = () => {
    menuHideTimeout = setTimeout(() => {
      menuContainer.classList.remove('show');
    }, 300); // 300ms 延迟
  };
  
  // 鼠标进入更多按钮或菜单时显示
  moreButton.addEventListener('mouseenter', showMenu);
  menuContainer.addEventListener('mouseenter', showMenu);
  
  // 鼠标离开更多按钮或菜单时延迟隐藏
  moreButton.addEventListener('mouseleave', hideMenuDelayed);
  menuContainer.addEventListener('mouseleave', hideMenuDelayed);
  
  // 点击提取按钮显示提取面板
  button.addEventListener('click', (e) => {
    e.stopPropagation();
    currentTable = table;
    showExtractPanel(table);
  });
  
  // 菜单项点击事件
  const settingsBtn = menuContainer.querySelector('.menu-settings');
  const disableBtn = menuContainer.querySelector('.menu-disable');
  const hideBtn = menuContainer.querySelector('.menu-hide');
  
  settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuContainer.classList.remove('show');
    showSettingsPanel();
  });
  
  // 点击禁用按钮禁用当前网站
  disableBtn.addEventListener('click', async (e) => {
    e.stopPropagation();
    menuContainer.classList.remove('show');
    const currentHost = getCurrentHost();
    
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
      allButtons.forEach(btn => btn.classList.remove('visible'));
      
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
  
  // 点击隐藏按钮隐藏悬浮按钮
  hideBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    isHidden = true;
    buttonContainer.classList.remove('visible', 'always-visible');
    menuContainer.classList.remove('show');
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
      <button class="tab-btn active" data-format="preview">👁️ 预览</button>
      <button class="tab-btn" data-format="markdown">📝 MD</button>
      <button class="tab-btn" data-format="json">🟢 JSON</button>
      <button class="tab-btn" data-format="csv">🔵 CSV</button>
      <button class="tab-btn" data-format="sql">🟣 SQL</button>
    </div>
    <div class="panel-config" id="sqlConfig" style="display: none;">
      <div class="config-item">
        <label for="tableNameInput">表名：</label>
        <input type="text" id="tableNameInput" value="table_data" placeholder="输入表名">
        <button class="refresh-btn" title="重新生成">🔄</button>
      </div>
    </div>
    <div class="panel-content">
      <div class="output-area" id="outputArea" style="display: none;">
        <pre id="outputContent"></pre>
      </div>
      <div class="preview-area" id="previewArea" style="display: flex;">
        <div class="preview-toolbar">
          <span class="preview-hint">点击拖拽选择单元格，可复制选中区域</span>
          <button class="preview-fullscreen-btn" title="全屏查看">⛶ 全屏</button>
        </div>
        <div class="preview-table-container">
          <table class="preview-table" id="previewTable"></table>
        </div>
        <div class="preview-selection-info" id="selectionInfo" style="display: none;">
          已选择 <span id="selectedCount">0</span> 个单元格
          <button class="preview-copy-btn">📋 复制选中</button>
        </div>
      </div>
      <div class="panel-actions" style="display: none;">
        <button class="action-btn copy-btn">📋 复制结果</button>
        <button class="action-btn download-btn">💾 下载文件</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(extractPanel);
  
  // 绑定事件
  bindPanelEvents();
  
  // 默认显示预览
  renderPreviewTable();
}

// 绑定面板事件
function bindPanelEvents() {
  // 关闭按钮
  extractPanel.querySelector('.close-btn').addEventListener('click', closeExtractPanel);
  
  // 标签切换
  const tabBtns = extractPanel.querySelectorAll('.tab-btn');
  const sqlConfig = extractPanel.querySelector('#sqlConfig');
  const outputArea = extractPanel.querySelector('#outputArea');
  const previewArea = extractPanel.querySelector('#previewArea');
  const panelActions = extractPanel.querySelector('.panel-actions');
  
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      const format = btn.getAttribute('data-format');
      
      // 显示或隐藏 SQL 配置区
      sqlConfig.style.display = format === 'sql' ? 'block' : 'none';
      
      // 切换预览模式和输出模式
      if (format === 'preview') {
        outputArea.style.display = 'none';
        previewArea.style.display = 'flex';
        panelActions.style.display = 'none';
        renderPreviewTable();
      } else {
        outputArea.style.display = 'block';
        previewArea.style.display = 'none';
        panelActions.style.display = 'flex';
        extractData(format);
      }
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
  
  // 全屏按钮
  const fullscreenBtn = extractPanel.querySelector('.preview-fullscreen-btn');
  if (fullscreenBtn) {
    fullscreenBtn.addEventListener('click', toggleFullscreen);
  }
  
  // 预览区复制选中按钮
  const previewCopyBtn = extractPanel.querySelector('.preview-copy-btn');
  if (previewCopyBtn) {
    previewCopyBtn.addEventListener('click', copySelectedCells);
  }
  
  // Cmd+C / Ctrl+C 快捷键复制选中
  document.addEventListener('keydown', handleCopyShortcut);
  
  // 点击面板外部关闭
  document.addEventListener('click', handleOutsideClick);
}

// 处理 Cmd+C / Ctrl+C 快捷键
function handleCopyShortcut(e) {
  if (!extractPanel) return;
  
  // 检查是否是预览模式且有选中
  const previewArea = extractPanel.querySelector('#previewArea');
  if (previewArea && previewArea.style.display !== 'none') {
    if ((e.metaKey || e.ctrlKey) && e.key === 'c') {
      const hasSelection = previewSelection.startRow !== -1 || previewSelection.startCol !== -1;
      if (hasSelection) {
        e.preventDefault();
        copySelectedCells();
      }
    }
  }
}

// 处理点击面板外部
function handleOutsideClick(e) {
  if (extractPanel && !extractPanel.contains(e.target) && !e.target.classList.contains('table-extractor-button')) {
    closeExtractPanel();
  }
}

// 关闭提取面板
function closeExtractPanel() {
  if (extractPanel) {
    extractPanel.remove();
    extractPanel = null;
  }
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleCopyShortcut);
}

// 提取表格数据
function extractData(format) {
  if (!currentTable) return;
  
  const data = parseTable(currentTable);
  let output = '';
  
  switch (format) {
    case 'markdown':
      output = convertToMarkdown(data);
      break;
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

// 转换为 Markdown 格式
function convertToMarkdown(data) {
  const lines = [];
  
  // 添加表头
  lines.push('| ' + data.headers.map(h => h.replace(/\|/g, '\\|')).join(' | ') + ' |');
  
  // 添加分隔行
  lines.push('| ' + data.headers.map(() => '---').join(' | ') + ' |');
  
  // 添加数据行
  data.rows.forEach(row => {
    const cells = row.map(cell => String(cell).replace(/\|/g, '\\|').replace(/\n/g, '<br>'));
    lines.push('| ' + cells.join(' | ') + ' |');
  });
  
  return lines.join('\n');
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

// ============ 预览功能 ============

// 预览选择状态
let previewSelection = {
  isSelecting: false,
  startRow: null,
  startCol: null,
  endRow: -1,
  endCol: -1
};

// 渲染预览表格
function renderPreviewTable() {
  if (!currentTable || !extractPanel) return;
  
  const data = parseTable(currentTable);
  const previewTable = extractPanel.querySelector('#previewTable');
  if (!previewTable) return;
  
  // 清空表格
  previewTable.innerHTML = '';
  
  // 添加表头
  const thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  data.headers.forEach((header, colIndex) => {
    const th = document.createElement('th');
    th.textContent = header;
    th.dataset.row = '-1';
    th.dataset.col = colIndex;
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  previewTable.appendChild(thead);
  
  // 添加数据行
  const tbody = document.createElement('tbody');
  data.rows.forEach((row, rowIndex) => {
    const tr = document.createElement('tr');
    row.forEach((cell, colIndex) => {
      const td = document.createElement('td');
      td.textContent = cell;
      td.dataset.row = rowIndex;
      td.dataset.col = colIndex;
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  previewTable.appendChild(tbody);
  
  // 绑定选择事件
  bindPreviewSelectionEvents(previewTable);
}

// 绑定预览表格选择事件
function bindPreviewSelectionEvents(table) {
  const cells = table.querySelectorAll('td, th');
  const container = extractPanel.querySelector('.preview-table-container');
  let scrollInterval = null;
  let scrollDirection = { top: false, bottom: false, left: false, right: false };
  
  // 获取表格行列数
  const allRows = table.querySelectorAll('tr');
  const maxRow = allRows.length - 2; // 减去表头行
  const maxCol = allRows[0] ? allRows[0].querySelectorAll('th, td').length - 1 : 0;
  
  cells.forEach(cell => {
    // 普通点击开始选择
    cell.addEventListener('mousedown', (e) => {
      e.preventDefault();
      
      const row = parseInt(cell.dataset.row);
      const col = parseInt(cell.dataset.col);
      
      // Shift+点击：从上次选择位置到当前位置（支持表头）
      if (e.shiftKey && previewSelection.startRow !== null) {
        previewSelection.endRow = isNaN(row) ? -1 : row; // 表头 row 可能是 NaN
        previewSelection.endCol = col;
        updatePreviewSelection(table);
        return;
      }
      
      previewSelection.isSelecting = true;
      previewSelection.startRow = isNaN(row) ? -1 : row;
      previewSelection.startCol = col;
      previewSelection.endRow = previewSelection.startRow;
      previewSelection.endCol = previewSelection.startCol;
      updatePreviewSelection(table);
    });
    
    cell.addEventListener('mouseover', () => {
      if (previewSelection.isSelecting) {
        const row = parseInt(cell.dataset.row);
        previewSelection.endRow = isNaN(row) ? -1 : row;
        previewSelection.endCol = parseInt(cell.dataset.col);
        updatePreviewSelection(table);
      }
    });
  });
  
  // Cmd+方向键 快速跳到末尾
  const handleKeydown = (e) => {
    if (!e.metaKey && !e.ctrlKey) return;
    if (!extractPanel || !extractPanel.contains(document.activeElement) && 
        !container.matches(':hover')) return;
    
    const isArrowKey = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key);
    if (!isArrowKey) return;
    
    e.preventDefault();
    
    const hasSelection = previewSelection.startRow !== null;
    
    switch (e.key) {
      case 'ArrowUp':
        container.scrollTop = 0;
        if (hasSelection && (previewSelection.isSelecting || e.shiftKey)) {
          previewSelection.endRow = -1; // 表头
          updatePreviewSelection(table);
        }
        break;
      case 'ArrowDown':
        container.scrollTop = container.scrollHeight;
        if (hasSelection && (previewSelection.isSelecting || e.shiftKey)) {
          previewSelection.endRow = maxRow;
          updatePreviewSelection(table);
        }
        break;
      case 'ArrowLeft':
        container.scrollLeft = 0;
        if (hasSelection && (previewSelection.isSelecting || e.shiftKey)) {
          previewSelection.endCol = 0;
          updatePreviewSelection(table);
        }
        break;
      case 'ArrowRight':
        container.scrollLeft = container.scrollWidth;
        if (hasSelection && (previewSelection.isSelecting || e.shiftKey)) {
          previewSelection.endCol = maxCol;
          updatePreviewSelection(table);
        }
        break;
    }
  };
  
  document.addEventListener('keydown', handleKeydown);
  
  // 全局鼠标移动监听（支持鼠标离开容器后继续滚动）
  document.addEventListener('mousemove', (e) => {
    if (!previewSelection.isSelecting) return;
    
    const rect = container.getBoundingClientRect();
    const scrollSpeed = 20;
    
    // 检测鼠标相对于容器的位置
    scrollDirection.top = e.clientY < rect.top;
    scrollDirection.bottom = e.clientY > rect.bottom;
    scrollDirection.left = e.clientX < rect.left;
    scrollDirection.right = e.clientX > rect.right;
    
    // 边缘区域也触发
    const edgeSize = 30;
    if (!scrollDirection.top && e.clientY - rect.top < edgeSize) scrollDirection.top = true;
    if (!scrollDirection.bottom && rect.bottom - e.clientY < edgeSize) scrollDirection.bottom = true;
    
    const shouldScroll = scrollDirection.top || scrollDirection.bottom || 
                         scrollDirection.left || scrollDirection.right;
    
    if (shouldScroll && !scrollInterval) {
      scrollInterval = setInterval(() => {
        if (scrollDirection.top) container.scrollTop -= scrollSpeed;
        if (scrollDirection.bottom) container.scrollTop += scrollSpeed;
        if (scrollDirection.left) container.scrollLeft -= scrollSpeed;
        if (scrollDirection.right) container.scrollLeft += scrollSpeed;
        
        // 更新选择到边缘
        updateSelectionToEdge(table, container);
      }, 30);
    } else if (!shouldScroll && scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  });
  
  // 滚动时更新选择到边缘
  function updateSelectionToEdge(table, container) {
    const allCells = table.querySelectorAll('td');
    if (allCells.length === 0) return;
    
    const containerRect = container.getBoundingClientRect();
    let maxRow = -1, minRow = Infinity;
    
    // 找到可见区域的最大/最小行
    allCells.forEach(cell => {
      const cellRect = cell.getBoundingClientRect();
      if (cellRect.bottom > containerRect.top && cellRect.top < containerRect.bottom) {
        const row = parseInt(cell.dataset.row);
        const col = parseInt(cell.dataset.col);
        
        // 只考虑已选列范围内的单元格
        if (col >= Math.min(previewSelection.startCol, previewSelection.endCol) &&
            col <= Math.max(previewSelection.startCol, previewSelection.endCol)) {
          maxRow = Math.max(maxRow, row);
          minRow = Math.min(minRow, row);
        }
      }
    });
    
    // 根据滚动方向更新选择
    if (scrollDirection.bottom && maxRow > previewSelection.endRow) {
      previewSelection.endRow = maxRow;
      updatePreviewSelection(table);
    }
    if (scrollDirection.top && minRow < previewSelection.endRow) {
      previewSelection.endRow = minRow;
      updatePreviewSelection(table);
    }
  }
  
  // 停止选择和滚动
  document.addEventListener('mouseup', () => {
    previewSelection.isSelecting = false;
    if (scrollInterval) {
      clearInterval(scrollInterval);
      scrollInterval = null;
    }
  });
}

// 更新预览选择状态
function updatePreviewSelection(table) {
  const cells = table.querySelectorAll('td, th');
  const minRow = Math.min(previewSelection.startRow, previewSelection.endRow);
  const maxRow = Math.max(previewSelection.startRow, previewSelection.endRow);
  const minCol = Math.min(previewSelection.startCol, previewSelection.endCol);
  const maxCol = Math.max(previewSelection.startCol, previewSelection.endCol);
  
  let selectedCount = 0;
  
  cells.forEach(cell => {
    const rawRow = cell.dataset.row;
    const row = rawRow === undefined ? -1 : parseInt(rawRow); // 表头为 -1
    const col = parseInt(cell.dataset.col);
    
    if (row >= minRow && row <= maxRow && col >= minCol && col <= maxCol) {
      cell.classList.add('selected');
      selectedCount++;
    } else {
      cell.classList.remove('selected');
    }
  });
  
  // 更新选择信息
  const selectionInfo = extractPanel.querySelector('#selectionInfo');
  const selectedCountSpan = extractPanel.querySelector('#selectedCount');
  if (selectedCount > 0) {
    selectionInfo.style.display = 'flex';
    selectedCountSpan.textContent = selectedCount;
  } else {
    selectionInfo.style.display = 'none';
  }
}

// 复制选中的单元格
function copySelectedCells() {
  if (!extractPanel) return;
  if (previewSelection.startRow === null) return; // 没有选择
  
  const data = parseTable(currentTable);
  const minRow = Math.min(previewSelection.startRow, previewSelection.endRow);
  const maxRow = Math.max(previewSelection.startRow, previewSelection.endRow);
  const minCol = Math.min(previewSelection.startCol, previewSelection.endCol);
  const maxCol = Math.max(previewSelection.startCol, previewSelection.endCol);
  
  const lines = [];
  
  // 如果选择包含表头行
  if (minRow === -1) {
    const headerLine = data.headers.slice(minCol, maxCol + 1).join('\t');
    lines.push(headerLine);
  }
  
  // 添加数据行
  const startDataRow = Math.max(0, minRow);
  for (let r = startDataRow; r <= maxRow && r < data.rows.length; r++) {
    const rowData = data.rows[r].slice(minCol, maxCol + 1);
    lines.push(rowData.join('\t'));
  }
  
  copyToClipboard(lines.join('\n'));
}

// 切换全屏
function toggleFullscreen() {
  if (!extractPanel) return;
  
  const isFullscreen = extractPanel.classList.contains('fullscreen');
  
  if (isFullscreen) {
    extractPanel.classList.remove('fullscreen');
    extractPanel.querySelector('.preview-fullscreen-btn').innerHTML = '⛶ 全屏';
  } else {
    extractPanel.classList.add('fullscreen');
    extractPanel.querySelector('.preview-fullscreen-btn').innerHTML = '⛶ 退出全屏';
  }
}

// ============ 工具函数 ============

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
    markdown: 'md',
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
  
  const currentHost = getCurrentHost();
  
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
  safeSetHTML(settingsPanel, `
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
        <div class="settings-section-title">👁️ 按钮显示</div>
        <div class="settings-radio-group">
          <label class="settings-radio-label">
            <input type="radio" name="hoverMode" value="hover" ${filterConfig.hoverMode === 'hover' ? 'checked' : ''}>
            <span>鼠标移到表格时显示（默认）</span>
          </label>
          <label class="settings-radio-label">
            <input type="radio" name="hoverMode" value="always" ${filterConfig.hoverMode === 'always' ? 'checked' : ''}>
            <span>始终显示</span>
          </label>
        </div>
      </div>
      <div class="settings-section">
        <div class="settings-section-title">🧠 智能过滤</div>
        <div class="settings-filter-group">
          <label class="settings-checkbox-label">
            <input type="checkbox" id="filterEnabled" ${filterConfig.enabled ? 'checked' : ''}>
            <span>启用智能过滤（自动跳过布局表格）</span>
          </label>
        </div>
        <div class="settings-filter-options" id="filterOptions" style="${filterConfig.enabled ? '' : 'opacity: 0.5; pointer-events: none;'}">
          <div class="settings-filter-item">
            <label>最小行数</label>
            <input type="number" id="filterMinRows" value="${filterConfig.minRows}" min="1" max="10">
          </div>
          <div class="settings-filter-item">
            <label>最小列数</label>
            <input type="number" id="filterMinCols" value="${filterConfig.minCols}" min="1" max="10">
          </div>
        </div>
        <div class="settings-filter-hint">少于指定行列数的表格将被跳过</div>
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
  `);
  
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
  
  // 显示模式选择
  const hoverModeRadios = settingsPanel.querySelectorAll('input[name="hoverMode"]');
  hoverModeRadios.forEach(radio => {
    radio.addEventListener('change', async (e) => {
      const hoverMode = e.target.value;
      await saveFilterConfig({ hoverMode });
      showMessage('已保存，刷新页面生效', 'success');
    });
  });
  
  // 智能过滤开关
  const filterEnabledCheckbox = settingsPanel.querySelector('#filterEnabled');
  const filterOptions = settingsPanel.querySelector('#filterOptions');
  if (filterEnabledCheckbox) {
    filterEnabledCheckbox.addEventListener('change', async (e) => {
      const enabled = e.target.checked;
      await saveFilterConfig({ enabled });
      if (filterOptions) {
        filterOptions.style.opacity = enabled ? '' : '0.5';
        filterOptions.style.pointerEvents = enabled ? '' : 'none';
      }
      showMessage(enabled ? '智能过滤已启用，刷新页面生效' : '智能过滤已关闭，刷新页面生效', 'info');
    });
  }
  
  // 最小行数
  const minRowsInput = settingsPanel.querySelector('#filterMinRows');
  if (minRowsInput) {
    minRowsInput.addEventListener('change', async (e) => {
      const minRows = parseInt(e.target.value) || 2;
      await saveFilterConfig({ minRows });
      showMessage('已保存，刷新页面生效', 'success');
    });
  }
  
  // 最小列数
  const minColsInput = settingsPanel.querySelector('#filterMinCols');
  if (minColsInput) {
    minColsInput.addEventListener('change', async (e) => {
      const minCols = parseInt(e.target.value) || 2;
      await saveFilterConfig({ minCols });
      showMessage('已保存，刷新页面生效', 'success');
    });
  }
  
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
      if (host === getCurrentHost()) {
        isDisabledSite = true;
        hideAllButtons();
      }
      showMessage(`已禁用 ${host}`, 'info');
    } else {
      disabledSites.splice(index, 1);
      if (host === getCurrentHost()) {
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
      
      if (host === getCurrentHost()) {
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
  
  // 始终显示模式下，用户点击后延迟扫描（无性能损耗）
  if (filterConfig.hoverMode === 'always') {
    let scanTimeout = null;
    document.addEventListener('click', () => {
      // 防抖：点击后 500ms 扫描一次
      if (scanTimeout) clearTimeout(scanTimeout);
      scanTimeout = setTimeout(() => {
        scanTables();
      }, 500);
    }, { passive: true });
  }
}

// 页面加载完成后初始化
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}

// 监听 iframe 内容加载完成
window.addEventListener('load', () => {
  setTimeout(scanTables, 100);
});
