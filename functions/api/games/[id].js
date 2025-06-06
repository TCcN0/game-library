export async function onRequestGet({ env, params }) {
    try {
        const { id } = params;
        
        if (!id) {
            throw new Error('缺少游戏ID');
        }
        
        // 从KV获取游戏
        const game = await env.GAMES.get(`game:${id}`, 'json');
        
        if (!game) {
            return new Response(JSON.stringify({ error: '游戏不存在' }), {
                status: 404,
                headers: { 'Content-Type': 'application/json' }
            });
        }
        
        return new Response(JSON.stringify(game), {
            headers: { 'Content-Type': 'application/json' }
        });
        
    } catch (error) {
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}