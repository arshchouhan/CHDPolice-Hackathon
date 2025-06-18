/**
 * Cookie configuration utility that handles cross-domain authentication
 * between Vercel frontend and Render backend
 */
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProd = process.env.NODE_ENV === 'production';
    const origin = req.get('origin');
    
    // Check if request is secure (either directly or behind proxy)
    const isSecure = req.secure || req.get('x-forwarded-proto') === 'https';
    
    // Enhanced logging for debugging
    console.log('Cookie Config Details:', {
        environment: process.env.NODE_ENV,
        secure: isSecure,
        protocol: req.protocol,
        origin,
        host: req.get('host'),
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        headers: req.headers,
        'cf-visitor': req.get('cf-visitor')
    });

    // Base cookie configuration
    const config = {
        httpOnly: true,      // Prevent JavaScript access
        path: '/',           // Available on all paths
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000,  // 7 days
        secure: isProd || isSecure,  // Must be secure in prod or if HTTPS
        sameSite: (isProd || isSecure) ? 'None' : 'Lax'  // Must be None for cross-origin in prod
    };
    
    // Log final config
    console.log(`${isProd ? 'Production' : 'Development'} cookie config:`, {
        ...config,
        isSecure,
        isProd
    });
    
    return config;

    return config;
};

module.exports = getCookieConfig;
