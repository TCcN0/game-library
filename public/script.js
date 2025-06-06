// 前端交互逻辑
const API_BASE = '/api/games';

// DOM 元素
const gameListEl = document.getElementById('gameList');
const searchBtn = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const loginBtn = document.getElementById('loginBtn');
const addGameForm = document.getElementById('addGameForm');
const notification = document.getElementById('notification');
const tabBtns = document.querySelectorAll('.tab-btn');

// 认证状态
let isAuthenticated = false;
let authErrorCount = 0;

// 初始化页面
document.addEventListener('DOMContentLoaded', () => {
    // 设置标签页
    setupTabs();
    
    // 加载游戏列表
    loadGames();
    
    // 登录按钮事件
    loginBtn.addEventListener('click', handleLogin);
    
    // 设置搜索功能
    searchBtn.addEventListener('click', () => {
        const searchText = searchInput.value.trim().toLowerCase();
        loadGames(searchText);
    });
    
    // 表单提交事件
    addGameForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        await handleSubmitGame();
    });
});

function setupTabs() {
    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            // 移除所有活动状态
            tabBtns.forEach(b => b.classList.remove('active'));
            document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
            
            // 设置当前活动标签
            btn.classList.add('active');
            const tabId = btn.dataset.tab;
            document.getElementById(`${tabId}Tab`).classList.add('active');
        });
    });
}

async function loadGames(search = '') {
    try {
        // 显示加载状态
        gameListEl.innerHTML = '<div class="loading">加载游戏中...</div>';
        
        const url = search ? `${API_BASE}?search=${encodeURIComponent(search)}` : API_BASE;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API请求失败: ${response.status}`);
        }
        
        const games = await response.json();
        renderGameList(games);
        
    } catch (error) {
        showNotification(`加载失败: ${error.message}`, 'error');
        gameListEl.innerHTML = `<div class="error">错误: ${error.message}</div>`;
    }
}

function renderGameList(games) {
    if (!games || games.length === 0) {
        gameListEl.innerHTML = '<div class="empty">没有找到游戏</div>';
        return;
    }
    
    const gameListHTML = games.map(game => {
        return `
        <div class="game-card" data-id="${game.id}">
            <div class="game-header">
                <h3>${game.title}</h3>
                <p>${truncate(game.description, 40) || '无描述'}</p>
            </div>
            <div class="game-content">
                <div class="game-preview">${truncate(game.content, 120)}</div>
            </div>
            <div class="game-actions">
                <button class="btn" onclick="playGame('${game.id}')">运行</button>
                ${isAuthenticated ? 
                  `<button class="btn btn-danger" onclick="deleteGame('${game.id}')">删除</button>` : 
                  ''
                }
            </div>
        </div>
        `;
    }).join('');
    
    gameListEl.innerHTML = gameListHTML;
}

function handleLogin() {
    if (!isAuthenticated) {
        const username = prompt('用户名:');
        const password = prompt('密码:');
        
        // 简单模拟认证
        if (username === "天小材" && password === "114514") {
            isAuthenticated = true;
            loginBtn.textContent = '登出';
            showNotification('登录成功', 'success');
            authErrorCount = 0;
        } else {
            authErrorCount++;
            if (authErrorCount >= 3) {
                showNotification('认证失败次数过多，请重试', 'error');
            } else {
                showNotification('用户名或密码错误', 'error');
            }
        }
    } else {
        isAuthenticated = false;
        loginBtn.textContent = '登录';
        showNotification('您已登出', 'success');
    }
}

async function handleSubmitGame() {
    if (!isAuthenticated) {
        showNotification('请先登录才能添加游戏', 'error');
        return;
    }
    
    const title = document.getElementById('gameTitle').value;
    const description = document.getElementById('gameDesc').value;
    const content = document.getElementById('gameContent').value;
    
    try {
        const response = await fetch(API_BASE, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Basic ${btoa("天小材:114514")}`
            },
            body: JSON.stringify({ title, description, content })
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        showNotification('游戏添加成功', 'success');
        document.getElementById('addGameForm').reset();
        loadGames();
        
    } catch (error) {
        console.error('添加游戏失败:', error);
        showNotification(`添加失败: ${error.message}`, 'error');
    }
}

async function playGame(id) {
    try {
        const response = await fetch(`${API_BASE}/${id}`);
        
        if (!response.ok) {
            throw new Error('获取游戏失败');
        }
        
        const game = await response.json();
        runGame(game.content);
        
    } catch (error) {
        showNotification(`无法运行游戏: ${error.message}`, 'error');
    }
}

function runGame(content) {
    const win = window.open('', '_blank');
    win.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>游戏运行中</title>
            <style>
                body, html {
                    margin: 0;
                    padding: 0;
                    width: 100%;
                    height: 100%;
                    overflow: hidden;
                }
                #game-container {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    background: #000;
                }
            </style>
        </head>
        <body>
            <div id="game-container">${content}</div>
            <div style="position: fixed; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 5px 10px; border-radius: 5px;">
                <button onclick="window.close()">关闭游戏</button>
            </div>
        </body>
        </html>
    `);
    win.document.close();
}

async function deleteGame(id) {
    if (!isAuthenticated) {
        showNotification('请先登录', 'error');
        return;
    }
    
    if (!confirm('确定删除这个游戏吗？此操作不可撤销')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Basic ${btoa("天小材:114514")}`
            }
        });
        
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(errorText);
        }
        
        showNotification('游戏已删除', 'success');
        loadGames();
        
    } catch (error) {
        console.error('删除游戏失败:', error);
        showNotification(`删除失败: ${error.message}`, 'error');
    }
}

function showNotification(message, type = 'success') {
    notification.textContent = message;
    notification.className = `notification show ${type}`;
    
    setTimeout(() => {
        notification.classList.remove('show');
    }, 3000);
}

function truncate(text, maxLength) {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
}

// 全局方法
window.playGame = playGame;
window.deleteGame = deleteGame;