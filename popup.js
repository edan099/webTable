// 表格提取工具 - 设置面板

let currentHost = '';
let disabledSites = [];

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
  // 获取当前标签页的 URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    try {
      const url = new URL(tab.url);
      currentHost = url.hostname;
      document.getElementById('currentUrl').textContent = currentHost;
    } catch (e) {
      document.getElementById('currentUrl').textContent = '无法获取';
    }
  }
  
  // 加载禁用列表
  await loadDisabledSites();
  
  // 更新 UI
  updateUI();
  
  // 绑定事件
  document.getElementById('toggleBtn').addEventListener('click', toggleCurrentSite);
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
  
  if (disabledSites.length === 0) {
    itemsEl.innerHTML = '<div class="empty-tip">暂无禁用的网站</div>';
  } else {
    itemsEl.innerHTML = disabledSites.map(host => `
      <div class="disabled-item">
        <span class="disabled-item-url">${host}</span>
        <button class="remove-btn" data-host="${host}" title="解除禁用">✕</button>
      </div>
    `).join('');
    
    // 绑定移除按钮事件
    itemsEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        removeSite(btn.dataset.host);
      });
    });
  }
}
