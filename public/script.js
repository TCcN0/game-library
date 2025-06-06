// 配置信息
const API_BASE = '/api/games';
const USERNAME = "天小材";
const PASSWORD = "114514";

// DOM元素
const gameGrid = document.getElementById('gameGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const gameTitle = document.getElementById('gameTitle');
const gameDesc = document.getElementById('gameDesc');
const gameHtml = document.getElementById('gameHtml');
const uploadGameBtn = document.getElementById('uploadGameBtn');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const loginModal = document.getElementById('loginModal');
const loginForm = document.getElementById('loginForm');
const notification = document.getElementById('notification');
const tabs = document.querySelectorAll('[data-tab]');
const tabSections = document.querySelectorAll('.tab-content');
const fileUploadArea = document.getElementById('fileUploadArea');
const htmlFile = document.getElementById('htmlFile');
const gamePreview = document.getElementById('gamePreview');
const gameFrame = document.getElementById('gameFrame');
const previewTitle = document.getElementById('previewTitle');
const closePreview = document.getElementById('closePreview');

// 状态变量
let isAuthenticated = false;
let authToken = null;
let gameData = [];
let currentFilter = 'all';

// 粒子背景初始化
const initParticles = () => {
    const canvas = document.getElementById('particles');
    const ctx = canvas.getContext('2d');
    
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const particles = [];
    const particleCount = 100;
    
    // 创建粒子
    for (let i = 0; i < particleCount; i++) {
        particles.push({
            x: Math.random() * canvas.width,
            y: Math.random() * canvas.height,
            radius: Math.random() * 3 + 1,
            color: `rgba(${Math.random() > 0.5 ? 123 : 100}, ${Math.random() > 0.5 ? 104 : 223}, ${Math.random() > 0.5 ? 238 : 204}, ${Math.random() * 0.3 + 0.2})`,
            speedX: (Math.random() - 0.5) * 0.5,
            speedY: (Math.random() - 0.5) * 0.5,
            angle: 0
        });
    }
    
    // 动画循环
    const animate = () => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 更新和绘制粒子
        particles.forEach(p => {
            p.x += p.speedX;
            p.y += p.speedY;
            
            // 边界检查
            if (p.x < 0 || p.x > canvas.width) p.speedX *= -1;
            if (p.y < 0 || p.y > canvas.height) p.speedY *= -1;
            
            // 绘制粒子
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
            ctx.fillStyle = p.color;
            ctx.fill();
        });
        
        // 绘制连接线
        for (let i = 0; i < particles.length; i++) {
            for (let j = i + 1; j < particles.length; j++) {
                const distance = Math.sqrt(
                    Math.pow(particles[i].x - particles[j].x, 2) + 
                    Math.pow(particles[i].y - particles[j].y, 2)
                );
                
                if (distance < 150) {
                    const opacity = 1 - distance / 150;
                    ctx.beginPath();
                    ctx.moveTo(particles[i].x, particles[i].y);
                    ctx.lineTo(particles[j].x, particles[j].y);
                    ctx.strokeStyle = `rgba(200, 216, 255, ${opacity * 0.1})`;
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            }
        }
        
        requestAnimationFrame(animate);
    };
    
    // 开始动画
    animate();
    
    // 响应式调整
    window.addEventListener('resize', () => {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
    });
};

// 初始化
document.addEventListener('DOMContentLoaded', async () => {
    initParticles();
    setupEventListeners();
    await loadGames();
    
    // 设置用户头像
    document.getElementById('userAvatar').textContent = USERNAME.charAt(0).toUpperCase();
});

// 设置事件监听器
function setupEventListeners() {
    // 标签页切换
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const targetTab = tab.dataset.tab;
            
            // 检查上传权限
            if (targetTab === 'add' && !isAuthenticated) {
                showNotification('请先登录以上传游戏', 'error');
                openLoginModal();
                return;
            }
            
            // 更新标签状态
            tabs.forEach(t => t.closest('a').classList.remove('active'));
            tab.classList.add('active');
            
            // 显示对应面板
            tabSections.forEach(section => {
                section.classList.remove('active');
                if (section.id === `${targetTab}Section`) {
                    section.classList.add('active');
                }
            });
        });
    });
    
    // 搜索功能
    searchBtn.addEventListener('click', searchGames);
    searchInput.addEventListener('keyup', e => {
        if (e.key === 'Enter') searchGames();
    });
    
    // 文件上传功能
    fileUploadArea.addEventListener('click', () => htmlFile.click());
    htmlFile.addEventListener('change', handleFileUpload);
    
    // 上传游戏
    uploadGameBtn.addEventListener('click', uploadGame);
    
    // 登录功能
    loginBtn.addEventListener('click', openLoginModal);
    logoutBtn.addEventListener('click', logout);
    loginForm.addEventListener('submit', handleLogin);
    
    // 游戏预览关闭
    closePreview.addEventListener('click', closeGamePreview);
    
    // 游戏类别筛选
    document.querySelectorAll('.filter-tags .tag').forEach(tag => {
        tag.addEventListener('click', () => {
            currentFilter = tag.textContent.toLowerCase();
            document.querySelectorAll('.filter-tags .tag').forEach(t => t.classList.remove('active'));
            tag.classList.add('active');
            renderGameList();
        });
    });
}

// 加载游戏
async function loadGames() {
    try {
        gameGrid.innerHTML = `
            <div class="card-loader">
                <div class="loader-circle"></div>
                <p>从Cloudflare KV加载游戏中...</p>
            </div>
        `;
        
        const response = await fetch(API_BASE);
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        gameData = await response.json();
        gameData.forEach(game => {
            game.playCount = game.playCount || 0;
            game.favoriteCount = game.favoriteCount || 0;
        });
        
        // 更新UI
        renderGameList();
        updateStats();
    } catch (error) {
        console.error('加载游戏失败:', error);
        showNotification(`加载失败: ${error.message}`, 'error');
        gameGrid.innerHTML = `
            <div class="error">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>无法加载游戏数据</h3>
                <p>${error.message}</p>
                <button class="glow-btn" id="retryBtn">重新加载</button>
            </div>
        `;
        document.getElementById('retryBtn').addEventListener('click', loadGames);
    }
}

// 渲染游戏列表
function renderGameList() {
    // 应用搜索过滤
    let filteredGames = [...gameData];
    const searchTerm = searchInput.value.trim().toLowerCase();
    
    if (searchTerm) {
        filteredGames = filteredGames.filter(game => {
            return game.title.toLowerCase().includes(searchTerm) || 
                   (game.description && game.description.toLowerCase().includes(searchTerm));
        });
    }
    
    // 应用类别过滤
    if (currentFilter !== 'all') {
        filteredGames = filteredGames.filter(game => {
            return game.category && game.category.toLowerCase() === currentFilter;
        });
    }
    
    if (!filteredGames || filteredGames.length === 0) {
        gameGrid.innerHTML = `
            <div class="no-games">
                <i class="fas fa-gamepad"></i>
                <h3>未找到游戏</h3>
                <p>没有匹配${searchTerm ? `"${searchTerm}"` : currentFilter !== 'all' ? `"${currentFilter}"类别` : ''}的游戏</p>
                <button class="glow-btn" id="addFirstGameBtn">添加第一个游戏</button>
            </div>
        `;
        document.getElementById('addFirstGameBtn').addEventListener('click', () => {
            document.querySelector('[data-tab="add"]').click();
        });
        return;
    }
    
    // 生成游戏卡片
    gameGrid.innerHTML = filteredGames.map(game => {
        const categoryClass = game.category ? game.category.toLowerCase() : 'all';
        return `
            <div class="game-card" data-id="${game.id}">
                <div class="game-thumb">
                    <div class="game-thumbnail" style="background: ${getRandomGradient()}"></div>
                </div>
                <div class="game-info">
                    <div class="game-title">
                        ${game.title}
                        <span class="game-category ${categoryClass}">${game.category || '一般'}</span>
                    </div>
                    <p class="game-desc">${game.description || '暂无描述'}</p>
                    <div class="game-meta">
                        <div><i class="fas fa-play"></i> ${game.playCount} 游玩</div>
                        <div><i class="fas fa-heart"></i> ${game.favoriteCount} 收藏</div>
                        <div><i class="fas fa-calendar"></i> ${formatDate(game.uploadDate)}</div>
                    </div>
                    <div class="game-actions">
                        <button class="glow-btn" onclick="playGame('${game.id}')">
                            <i class="fas fa-play"></i> 玩游戏
                        </button>
                        <button class="btn-icon" onclick="toggleFavorite('${game.id}')">
                            <i class="fas fa-heart"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// 玩游戏的函数
function playGame(gameId) {
    const game = gameData.find(g => g.id === gameId);
    if (game) {
        // 更新播放计数
        game.playCount = (game.playCount || 0) + 1;
        
        // 打开预览窗口
        previewTitle.textContent = game.title;
        gameFrame.srcdoc = game.html;
        
        // 添加到历史记录（在真实项目中需要保存到存储）
        addToPlayHistory(game);
        
        // 显示预览窗口
        gamePreview.classList.add('active');
    }
}

// 关闭游戏预览
function closeGamePreview() {
    gamePreview.classList.remove('active');
}

// 辅助函数：生成随机渐变
function getRandomGradient() {
    const gradients = [
        'linear-gradient(45deg, #7b68ee, #64dfcc)',
        'linear-gradient(45deg, #ff4da8, #ff845e)',
        'linear-gradient(45deg, #64dfcc, #5271ff)',
        'linear-gradient(45deg, #ff4da8, #7b68ee)',
        'linear-gradient(45deg, #5271ff, #64dfcc)'
    ];
    return gradients[Math.floor(Math.random() * gradients.length)];
}

// 辅助函数：格式化日期
function formatDate(dateString) {
    const date = new Date(dateString);
    return `${date.getFullYear()}.${(date.getMonth() + 1).toString().padStart(2, '0')}.${date.getDate().toString().padStart(2, '0')}`;
}

// 更新统计信息
function updateStats() {
    document.getElementById('totalGames').textContent = gameData.length;
    
    // 计算存储大小
    const totalBytes = gameData.reduce((sum, game) => 
        sum + (game.html ? game.html.length : 0), 0);
    const totalMB = (totalBytes / 1024 / 1024).toFixed(2);
    document.getElementById('storageSize').textContent = `${totalMB} MB`;
    
    // 计算总游玩次数
    const totalPlayCount = gameData.reduce((sum, game) => 
        sum + (game.playCount || 0), 0);
    document.getElementById('popularity').textContent = totalPlayCount;
}

// 显示通知
function showNotification(message, type = 'success') {
    notification.querySelector('.message').textContent = message;
    notification.className = `neon-notification ${type} show`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

// 打开登录模态框
function openLoginModal() {
    loginModal.classList.add('active');
}

// 关闭登录模态框
function closeLoginModal() {
    loginModal.classList.remove('active');
}

// 登录处理
function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('username').value.trim();
    const password = document.getElementById('password').value.trim();
    
    if (username === USERNAME && password === PASSWORD) {
        isAuthenticated = true;
        authToken = btoa(`${username}:${password}`);
        
        // 更新UI
        loginBtn.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        showNotification(`欢迎回来，${username}！`, 'success');
        closeLoginModal();
    } else {
        showNotification('用户名或密码错误', 'error');
    }
}

// 退出登录
function logout() {
    isAuthenticated = false;
    authToken = null;
    loginBtn.classList.remove('hidden');
    logoutBtn.classList.add('hidden');
    showNotification('您已退出登录', 'success');
}

// 将游戏添加到播放历史
function addToPlayHistory(game) {
    // 在真实项目中，这里应该保存到localStorage或IndexedDB
    console.log(`[历史记录] 玩过游戏: ${game.title}`);
}

// 切换收藏状态
function toggleFavorite(gameId) {
    const game = gameData.find(g => g.id === gameId);
    if (game) {
        game.favoriteCount = (game.favoriteCount || 0) + (game.favoriteCount > 0 ? -1 : 1);
        showNotification(game.favoriteCount > 0 ? 
            '已添加到收藏夹' : '已从收藏夹移除', 'success');
    }
}
