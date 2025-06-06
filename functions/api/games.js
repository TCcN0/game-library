export async function onRequestGet({ env }) {
    try {
        const games = [];
        
        // 获取KV中的所有游戏
        const gamesKeys = await env.GAMES.list();
        
        for (const key of gamesKeys.keys) {
            const game = await env.GAMES.get(key.name, 'json');
            if (game) {
                games.push({
                    id: key.name.split(':')[1],
                    ...game
                });
            }
        }
        
        return new Response(JSON.stringify(games), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestPost({ request, env }) {
    try {
        const data = await request.json();
        const { name, category, content, type } = data;
        
        if (!name || !category || !content || !type) {
            throw new Error('缺少必要参数');
        }
        
        // 生成唯一ID和时间戳
        const id = Date.now().toString(36) + Math.random().toString(36).substring(2, 8);
        
        // 创建游戏对象
        const game = {
            id,
            name,
            category,
            content,
            type,
            createdAt: Date.now()
        };
        
        // 保存到KV
        await env.GAMES.put(`game:${id}`, JSON.stringify(game));
        
        return new Response(JSON.stringify({ success: true, id }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}

export async function onRequestDelete({ params, env }) {
    try {
        const { id } = params;
        
        if (!id) {
            throw new Error('缺少游戏ID');
        }
        
        // 删除游戏
        await env.GAMES.delete(`game:${id}`);
        
        return new Response(JSON.stringify({ success: true }), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 400,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}