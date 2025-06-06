export async function onRequest({ request, env }) {
    const url = new URL(request.url);
    const pathname = url.pathname;
    const segments = pathname.split('/');
    
    // 提取游戏ID（最后一个路径段）
    const gameId = segments.length > 1 ? segments[segments.length - 1] : null;
    const kv = env.GAME;
    
    // 认证检查函数
    function authenticate(authHeader) {
        if (!authHeader || !authHeader.startsWith('Basic ')) return false;
        
        const token = authHeader.split(' ')[1];
        try {
            const [username, password] = atob(token).split(':');
            return username === env.USERNAME && password === env.PASSWORD;
        } catch (e) {
            return false;
        }
    }
    
    // 设置响应头
    const headers = {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization'
    };
    
    try {
        // 处理OPTIONS请求（CORS预检）
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }
        
        // GET请求处理
        if (request.method === 'GET') {
            // 特殊播放端点
            if (pathname.endsWith('/play')) {
                const id = segments[segments.length - 2];
                if (!id) return new Response(JSON.stringify({ error: '无效的游戏ID' }), { status: 400, headers });
                
                let game = await kv.get(id, 'json');
                if (!game) return new Response(JSON.stringify({ error: '游戏未找到' }), { status: 404, headers });
                
                // 更新播放计数
                game.playCount = (game.playCount || 0) + 1;
                await kv.put(id, JSON.stringify(game));
                
                return new Response(JSON.stringify({ success: true }), { headers });
            }
            
            // 获取单个游戏
            if (gameId) {
                const game = await kv.get(gameId, 'json');
                if (!game) return new Response(JSON.stringify({ error: '游戏未找到' }), { status: 404, headers });
                return new Response(JSON.stringify(game), { headers });
            }
            
            // 获取所有游戏
            const keys = await kv.list();
            const games = [];
            
            for (const key of keys.keys) {
                const game = await kv.get(key.name, 'json');
                if (game) games.push(game);
            }
            
            return new Response(JSON.stringify(games), { headers });
        }
        
        // POST请求处理（添加新游戏）
        if (request.method === 'POST') {
            if (!authenticate(request.headers.get('Authorization'))) {
                return new Response(JSON.stringify({ error: '需要认证' }), { 
                    status: 401, 
                    headers: {
                        ...headers,
                        'WWW-Authenticate': 'Basic realm="游戏库管理"'
                    }
                });
            }
            
            const data = await request.json();
            const id = Date.now().toString();
            await kv.put(id, JSON.stringify({ ...data, id }));
            
            return new Response(JSON.stringify({ id }), { 
                status: 201, 
                headers 
            });
        }
        
        // DELETE请求处理（删除游戏）
        if (request.method === 'DELETE') {
            if (!authenticate(request.headers.get('Authorization'))) {
                return new Response(JSON.stringify({ error: '需要认证' }), { 
                    status: 401,
                    headers: {
                        ...headers,
                        'WWW-Authenticate': 'Basic realm="游戏库管理"'
                    }
                });
            }
            
            if (!gameId) {
                return new Response(JSON.stringify({ error: '需要游戏ID' }), { status: 400, headers });
            }
            
            await kv.delete(gameId);
            return new Response(JSON.stringify({ success: true }), { headers });
        }
        
        // 未支持的方法
        return new Response(JSON.stringify({ error: '方法不允许' }), { status: 405, headers });
        
    } catch (error) {
        console.error('API错误:', error);
        return new Response(JSON.stringify({ 
            error: '服务器错误',
            details: error.message 
        }), { 
            status: 500,
            headers 
        });
    }
}
