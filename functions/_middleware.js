export async function onRequest(context) {
    // 添加CORS标头
    context.response = new Response(context.response.body, context.response);
    context.response.headers.set('Access-Control-Allow-Origin', '*');
    context.response.headers.set('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
    context.response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    
    // 处理OPTIONS预检请求
    if (context.request.method === 'OPTIONS') {
        return new Response(null, { status: 204 });
    }
    
    try {
        return await context.next();
    } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
        });
    }
}