// DOM元素
const elements = {
    gamesContainer: document.getElementById('gamesContainer'),
    searchInput: document.getElementById('searchInput'),
    searchBtn: document.getElementById('searchBtn'),
    adminLoginBtn: document.getElementById('adminLoginBtn'),
    addGameBtn: document.getElementById('addGameBtn'),
    adminActions: document.getElementById('adminActions'),
    logoutBtn: document.getElementById('logoutBtn'),
    gameViewModal: document.getElementById('gameViewModal'),
    addGameModal: document.getElementById('addGameModal'),
    loginModal: document.getElementById('loginModal'),
    closeButtons: document.querySelectorAll('.close-btn'),
    gameForm: document.getElementById('gameForm'),
    loginForm: document.getElementById('loginForm'),
    categoryItems: document.querySelectorAll('aside li'),
    deleteGameBtn: document.getElementById('deleteGameBtn'),
    gameViewTitle: document.getElementById('gameViewTitle'),
    gameFrameContainer: document.getElementById('gameFrameContainer'),
    tabButtons: document.querySelectorAll('.tab-btn'),
    fileTab: document.getElementById('fileTab'),
    codeTab: document.getElementById('codeTab')
};

// 当前选中的分类和搜索词
let currentCategory = 'all';
let currentSearch = '';
let currentGameId = null;

// 辅助函数：显示模态框
function showModal(modal) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(m => {
        m.classList.remove('active');
    });
    modal.classList.add('active');
}

// 辅助函数：隐藏模态框
function hideAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.classList.remove('active');
    });
}

// 辅助函数：创建游戏卡片
function createGameCard(game) {
    // 默认缩略图URL，可以替换为实际图片
    const defaultImage = `https://via.placeholder.com/300x180/3a0ca3/ffffff?text=${encodeURIComponent(game.name)}`;
    
    return `
        <div class="game-card" data-id="${game.id}">
            <img src="${game.image || defaultImage}" alt="${game.name}">
            <div class="card-body">
                <h3>${game.name}</h3>
                <span class="category">${getCategoryName(game.category)}</span>
                <p class="game-desc">${game.description || '欢迎游玩这款精彩的游戏'}</p>
                <button class="play-btn">开始游戏</button>
            </div>
        </div>
    `;
}

// 辅助函数：获取分类名称
function getCategoryName(category) {
    const categories = {
        puzzle: '解谜游戏',
        action: '动作游戏',
        arcade: '街机游戏',
        racing: '赛车游戏',
        strategy: '策略游戏'
    };
    return categories[category] || category;
}

// 辅助函数：显示加载指示器
function showLoader() {
    elements.gamesContainer.innerHTML = '';
    elements.loadingIndicator.classList.remove('hidden');
}

// 辅助函数：隐藏加载指示器
function hideLoader() {
    elements.loadingIndicator.classList.add('hidden');
}

// 获取游戏数据
async function fetchGames() {
    showLoader();
    
    try {
        const response = await fetch('/api/games');
        if (!response.ok) throw new Error('网络响应不正常');
        
        const data = await response.json();
        
        if (!Array.isArray(data)) {
            throw new Error('返回的数据格式不正确');
        }
        
        // 过滤游戏（基于分类和搜索词）
        const filteredGames = data.filter(game => {
            const matchesCategory = currentCategory === 'all' || game.category === currentCategory;
            const matchesSearch = game.name.toLowerCase().includes(currentSearch.toLowerCase());
            return matchesCategory && matchesSearch;
        });
        
        // 渲染游戏卡片
        elements.gamesContainer.innerHTML = '';
        filteredGames.forEach(game => {
            elements.gamesContainer.innerHTML += createGameCard(game);
        });
        
        // 添加事件监听器到游戏卡片
        document.querySelectorAll('.game-card').forEach(card => {
            card.addEventListener('click', function() {
                const gameId = this.dataset.id;
                showGame(gameId);
            });
        });
        
    } catch (error) {
        console.error('获取游戏数据时出错:', error);
        elements.gamesContainer.innerHTML = `
            <div class="error">
                <p>加载游戏失败，请刷新页面重试</p>
            </div>
        `;
    } finally {
        hideLoader();
    }
}

// 显示游戏
function showGame(gameId) {
    currentGameId = gameId;
    
    fetch(`/api/games/${gameId}`)
        .then(response => response.json())
        .then(game => {
            if (!game) throw new Error('游戏数据不可用');
            
            elements.gameViewTitle.textContent = game.name;
            
            // 如果是管理员，显示删除按钮
            if (isAdminLoggedIn()) {
                elements.deleteGameBtn.classList.remove('hidden');
            } else {
                elements.deleteGameBtn.classList.add('hidden');
            }
            
            // 在iframe中加载游戏
            if (game.type === 'file') {
                // 创建Base64游戏数据的Blob URL
                const blob = new Blob([game.content], { type: 'text/html' });
                const url = URL.createObjectURL(blob);
                
                elements.gameFrameContainer.innerHTML = `
                    <iframe src="${url}" allowfullscreen sandbox="allow-same-origin allow-scripts"></iframe>
                `;
            } else {
                // 直接加载代码
                elements.gameFrameContainer.innerHTML = `
                    <iframe srcdoc="${encodeURIComponent(game.content)}" allowfullscreen sandbox="allow-same-origin allow-scripts"></iframe>
                `;
            }
            
            // 显示模态框
            showModal(elements.gameViewModal);
        })
        .catch(error => {
            console.error('加载游戏时出错:', error);
            alert('加载游戏失败，请重试');
        });
}

// 检查管理员是否已登录
function isAdminLoggedIn() {
    return localStorage.getItem('adminSession') === 'valid';
}

// 管理员登录
function adminLogin(username, password) {
    if (username === '天小材' && password === '114514') {
        localStorage.setItem('adminSession', 'valid');
        return true;
    }
    return false;
}

// 管理员登出
function adminLogout() {
    localStorage.removeItem('adminSession');
    elements.adminActions.classList.add('hidden');
    elements.adminLoginBtn.classList.remove('hidden');
    hideAllModals();
}

// 删除当前游戏
function deleteCurrentGame() {
    if (!currentGameId) return;
    
    if (!confirm('确定要删除这个游戏吗？此操作不可撤销。')) {
        return;
    }
    
    fetch(`/api/games/${currentGameId}`, {
        method: 'DELETE'
    })
    .then(response => {
        if (response.ok) {
            hideAllModals();
            fetchGames();
        } else {
            throw new Error('删除游戏失败');
        }
    })
    .catch(error => {
        console.error('删除游戏时出错:', error);
        alert('删除游戏失败，请重试');
    });
}

// 添加新游戏
function addNewGame(event) {
    event.preventDefault();
    
    const gameName = document.getElementById('gameName').value;
    const gameCategory = document.getElementById('gameCategory').value;
    
    const fileInput = document.getElementById('gameFile');
    const codeInput = document.getElementById('gameCode');
    
    let content = '';
    let type = '';
    
    if (fileInput.files.length > 0) {
        // 从文件中读取内容
        const file = fileInput.files[0];
        const reader = new FileReader();
        
        reader.onload = async function(event) {
            content = event.target.result;
            type = 'file';
            
            // 发送到API
            await sendGameData(gameName, gameCategory, content, type);
        };
        
        reader.readAsText(file);
    } else {
        // 使用文本区域中的代码
        content = codeInput.value;
        type = 'code';
        
        // 发送到API
        sendGameData(gameName, gameCategory, content, type);
    }
}

// 发送游戏数据到API
async function sendGameData(name, category, content, type) {
    const gameData = {
        name,
        category,
        content,
        type
    };
    
    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });
        
        if (response.ok) {
            alert('游戏添加成功！');
            elements.gameForm.reset();
            hideAllModals();
            fetchGames();
        } else {
            throw new Error('添加游戏失败');
        }
    } catch (error) {
        console.error('添加游戏时出错:', error);
        alert('添加游戏失败，请重试');
    }
}

// 事件监听器设置
function setupEventListeners() {
    // 分类导航点击事件
    elements.categoryItems.forEach(item => {
        item.addEventListener('click', function() {
            document.querySelector('aside li.active').classList.remove('active');
            this.classList.add('active');
            currentCategory = this.dataset.category;
            fetchGames();
        });
    });
    
    // 搜索按钮点击事件
    elements.searchBtn.addEventListener('click', () => {
        currentSearch = elements.searchInput.value;
        fetchGames();
    });
    
    // 管理员登录按钮点击事件
    elements.adminLoginBtn.addEventListener('click', () => {
        showModal(elements.loginModal);
    });
    
    // 管理员操作按钮（登录后）
    elements.addGameBtn.addEventListener('click', () => {
        showModal(elements.addGameModal);
    });
    
    // 管理员登出按钮
    elements.logoutBtn.addEventListener('click', adminLogout);
    
    // 关闭按钮点击事件
    elements.closeButtons.forEach(button => {
        button.addEventListener('click', hideAllModals);
    });
    
    // 模态框外部点击关闭
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(event) {
            if (event.target === this) {
                hideAllModals();
            }
        });
    });
    
    // 添加游戏表单提交事件
    elements.gameForm.addEventListener('submit', addNewGame);
    
    // 登录表单提交事件
    elements.loginForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        
        if (adminLogin(username, password)) {
            elements.adminActions.classList.remove('hidden');
            elements.adminLoginBtn.classList.add('hidden');
            hideAllModals();
        } else {
            alert('用户名或密码错误！');
        }
    });
    
    // 删除游戏按钮点击事件
    elements.deleteGameBtn.addEventListener('click', deleteCurrentGame);
    
    // 标签页切换
    elements.tabButtons.forEach(button => {
        button.addEventListener('click', function() {
            // 更新按钮状态
            elements.tabButtons.forEach(btn => btn.classList.remove('active'));
            this.classList.add('active');
            
            // 显示对应的内容
            const tab = this.dataset.tab;
            document.querySelectorAll('.tab-content').forEach(content => {
                content.classList.remove('active');
            });
            document.getElementById(`${tab}Tab`).classList.add('active');
        });
    });
}

// 初始化应用
function initApp() {
    // 检查管理员登录状态
    if (isAdminLoggedIn()) {
        elements.adminActions.classList.remove('hidden');
        elements.adminLoginBtn.classList.add('hidden');
    }
    
    // 获取游戏数据
    fetchGames();
    
    // 设置事件监听器
    setupEventListeners();
}

// 页面加载完成后初始化应用
document.addEventListener('DOMContentLoaded', initApp);