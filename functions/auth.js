// 基础认证中间件（简化版）
export async function onRequest(context) {
    const { request, next } = context;
    const pathname = new URL(request.url).pathname;
    
    // 对于API路径添加额外的安全处理
    if (pathname.startsWith('/api') && request.method !== 'GET') {
        // 此处的身份验证逻辑已经包含在[[games]].js中
    }
    
    // 继续处理请求
    return next();
}