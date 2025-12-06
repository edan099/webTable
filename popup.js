// 表格提取工具 - 设置面板

let currentHost = '';
let disabledSites = [];
let filterConfig = {
  enabled: true,
  minRows: 2,
  minCols: 2,
  hoverMode: 'hover'
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页的 URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      // file:// 协议没有 hostname，使用 "file://" + pathname
      if (url.protocol === 'file:') {
        currentHost = 'file://' + url.pathname;
      } else {
        currentHost = url.hostname;
      }
      document.getElementById('currentUrl').textContent = currentHost;
    } catch (e) {
      document.getElementById('currentUrl').textContent = '无法获取';
    }
  }
  
  // 加载禁用列表和配置
  await loadDisabledSites();
  await loadFilterConfig();
  
  // 更新 UI
  updateUI();
  updateConfigUI();
  
  // 绑定事件
  document.getElementById('toggleBtn').addEventListener('click', toggleCurrentSite);
  bindConfigEvents();
});

// 加载禁用的网站列表
async function loadDisabledSites() {
  const result = await chrome.storage.sync.get(['disabledSites']);
  disabledSites = result.disabledSites || [];
}

// 保存禁用的网站列表
async function saveDisabledSites() {
  await chrome.storage.sync.set({ disabledSites });
}

// 切换当前网站的禁用状态
async function toggleCurrentSite() {
  if (!currentHost) return;
  
  const index = disabledSites.indexOf(currentHost);
  if (index === -1) {
    // 添加到禁用列表
    disabledSites.push(currentHost);
  } else {
    // 从禁用列表移除
    disabledSites.splice(index, 1);
  }
  
  await saveDisabledSites();
  updateUI();
  
  // 通知 content script 刷新状态
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.id) {
    chrome.tabs.sendMessage(tab.id, { 
      action: 'updateDisabledStatus',
      disabled: disabledSites.includes(currentHost)
    }).catch(() => {
      // 忽略错误，可能页面还没加载 content script
    });
  }
}

// 移除指定网站的禁用
async function removeSite(host) {
  const index = disabledSites.indexOf(host);
  if (index !== -1) {
    disabledSites.splice(index, 1);
    await saveDisabledSites();
    updateUI();
  }
}

// 更新 UI
function updateUI() {
  const isDisabled = disabledSites.includes(currentHost);
  const toggleBtn = document.getElementById('toggleBtn');
  const statusBadge = document.getElementById('statusBadge');
  
  // 更新按钮状态
  if (isDisabled) {
    toggleBtn.className = 'toggle-btn enable';
    toggleBtn.innerHTML = '<span>✅</span> 启用此网站';
    statusBadge.className = 'status-badge disabled';
    statusBadge.textContent = '已禁用';
  } else {
    toggleBtn.className = 'toggle-btn disable';
    toggleBtn.innerHTML = '<span>🚫</span> 禁用此网站';
    statusBadge.className = 'status-badge enabled';
    statusBadge.textContent = '已启用';
  }
  
  // 更新禁用列表
  const countEl = document.getElementById('disabledCount');
  const itemsEl = document.getElementById('disabledItems');
  
  countEl.textContent = disabledSites.length;
  
  itemsEl.textContent = '';
  
  if (disabledSites.length === 0) {
    const emptyTip = document.createElement('div');
    emptyTip.className = 'empty-tip';
    emptyTip.textContent = '暂无禁用的网站';
    itemsEl.appendChild(emptyTip);
  } else {
    disabledSites.forEach(host => {
      const item = document.createElement('div');
      item.className = 'disabled-item';
      
      const urlSpan = document.createElement('span');
      urlSpan.className = 'disabled-item-url';
      urlSpan.textContent = host;
      
      const removeBtn = document.createElement('button');
      removeBtn.className = 'remove-btn';
      removeBtn.dataset.host = host;
      removeBtn.title = '解除禁用';
      removeBtn.textContent = '✕';
      removeBtn.addEventListener('click', () => removeSite(host));
      
      item.appendChild(urlSpan);
      item.appendChild(removeBtn);
      itemsEl.appendChild(item);
    });
  }
}

// 加载过滤配置
async function loadFilterConfig() {
  const result = await chrome.storage.sync.get(['tableFilterConfig']);
  if (result.tableFilterConfig) {
    filterConfig = { ...filterConfig, ...result.tableFilterConfig };
  }
}

// 保存过滤配置
async function saveFilterConfig() {
  await chrome.storage.sync.set({ tableFilterConfig: filterConfig });
}

// 更新配置 UI
function updateConfigUI() {
  // 显示模式
  document.getElementById('hoverModeHover').checked = filterConfig.hoverMode === 'hover';
  document.getElementById('hoverModeAlways').checked = filterConfig.hoverMode === 'always';
  
  // 智能过滤
  document.getElementById('filterEnabled').checked = filterConfig.enabled;
  document.getElementById('minRows').value = filterConfig.minRows;
  document.getElementById('minCols').value = filterConfig.minCols;
  
  // 过滤选项显示/隐藏
  document.getElementById('filterOptions').style.opacity = filterConfig.enabled ? '1' : '0.5';
}

// 绑定配置事件
function bindConfigEvents() {
  // 显示模式
  document.querySelectorAll('input[name="hoverMode"]').forEach(radio => {
    radio.addEventListener('change', async (e) => {
      filterConfig.hoverMode = e.target.value;
      await saveFilterConfig();
    });
  });
  
  // 智能过滤开关
  document.getElementById('filterEnabled').addEventListener('change', async (e) => {
    filterConfig.enabled = e.target.checked;
    document.getElementById('filterOptions').style.opacity = e.target.checked ? '1' : '0.5';
    await saveFilterConfig();
  });
  
  // 最小行数
  document.getElementById('minRows').addEventListener('change', async (e) => {
    filterConfig.minRows = parseInt(e.target.value) || 2;
    await saveFilterConfig();
  });
  
  // 最小列数
  document.getElementById('minCols').addEventListener('change', async (e) => {
    filterConfig.minCols = parseInt(e.target.value) || 2;
    await saveFilterConfig();
  });
}
