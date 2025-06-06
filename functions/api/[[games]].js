// 游戏API处理函数
export async function onRequest({ request, env }) {
    const { pathname, searchParams } = new URL(request.url);
    const pathSegments = pathname.split('/').filter(segment => segment);
    
    try {
        // 检查KV绑定是否存在
        if (!env.GAME) {
            throw new Error('KV命名空间GAME未绑定');
        }
        
        // 设置通用响应头
        const headers = new Headers({
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, POST, DELETE',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization'
        });
        
        // 处理OPTIONS请求（CORS预检）
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers });
        }
        
        // 处理GET请求（获取游戏列表或单个游戏）
        if (request.method === 'GET') {
            // 单个游戏请求
            if (pathSegments.length === 3) {
                const gameId = pathSegments[2];
                if (!gameId) {
                    return Response.json({ error: '缺少游戏ID' }, { status: 400, headers });
                }
                
                const game = await env.GAME.get(gameId, 'json');
                if (!game) {
                    return Response.json({ error: '游戏未找到' }, { status: 404, headers });
                }
                
                return Response.json(game, { headers });
            }
            
            // 游戏列表请求
            const searchTerm = searchParams.get('search') || '';
            const keys = await env.GAME.list();
            const games = [];
            
            // 并行获取所有游戏
            for (const key of keys.keys) {
                const game = await env.GAME.get(key.name, 'json');
                if (game) {
                    // 应用搜索过滤
                    if (searchTerm) {
                        const searchTermLower = searchTerm.toLowerCase();
                        if (
                            game.title.toLowerCase().includes(searchTermLower) ||
                            (game.description && game.description.toLowerCase().includes(searchTermLower))
                        ) {
                            games.push(game);
                        }
                    } else {
                        games.push(game);
                    }
                }
            }
            
            return Response.json(games, { headers });
        }
        
        // 处理POST请求（创建新游戏）
        if (request.method === 'POST') {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Basic ')) {
                return Response.json({ error: '需要认证' }, { 
                    status: 401,
                    headers: new Headers({ 'WWW-Authenticate': 'Basic realm="Game Management"' })
                });
            }
            
            const base64 = authHeader.split(' ')[1];
            const [user, pass] = atob(base64).split(':');
            
            // 验证凭据
            if (user !== env.USERNAME || pass !== env.PASSWORD) {
                return Response.json({ error: '无效凭据' }, { status: 401, headers });
            }
            
            const data = await request.json();
            const id = Date.now().toString();
            
            const game = {
                id,
                title: data.title || '未命名游戏',
                description: data.description || '',
                content: data.content || '<p>游戏内容为空</p>',
                createdAt: new Date().toISOString()
            };
            
            await env.GAME.put(id, JSON.stringify(game));
            return Response.json(game, { status: 201, headers });
        }
        
        // 处理DELETE请求（删除游戏）
        if (request.method === 'DELETE' && pathSegments.length === 3) {
            const authHeader = request.headers.get('Authorization');
            if (!authHeader || !authHeader.startsWith('Basic ')) {
                return Response.json({ error: '需要认证' }, { 
                    status: 401,
                    headers: new Headers({ 'WWW-Authenticate': 'Basic realm="Game Management"' })
                });
            }
            
            const base64 = authHeader.split(' ')[1];
            const [user, pass] = atob(base64).split(':');
            
            // 验证凭据
            if (user !== env.USERNAME || pass !== env.PASSWORD) {
                return Response.json({ error: '无效凭据' }, { status: 401, headers });
            }
            
            const gameId = pathSegments[2];
            await env.GAME.delete(gameId);
            return Response.json({ success: true }, { headers });
        }
        
        // 其他情况返回405错误
        return Response.json({ error: '方法不允许' }, { status: 405, headers });
        
    } catch (error) {
        console.error('API错误:', error);
        return Response.json({
            error: '服务器错误',
            details: error.message
        }, {
            status: 500,
            headers: {
                'Content-Type': 'application/json'
            }
        });
    }
}