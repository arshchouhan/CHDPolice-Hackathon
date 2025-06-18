/**
 * Cookie configuration utility that handles cross-domain authentication
 * between Vercel frontend and Render backend
 */
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProd = process.env.NODE_ENV === 'production';
    
    // Log request details in development
    if (!isProd) {
        console.log('Cookie Config Details:', {
            environment: process.env.NODE_ENV,
            secure: req.secure,
            protocol: req.protocol,
            origin: req.get('origin'),
            host: req.get('host')
        });
    }

    // Base cookie configuration
    const config = {
        httpOnly: true,                    // Prevent JavaScript access
        secure: isProd,                    // Must be true in production
        sameSite: isProd ? 'None' : 'Lax', // Required for cross-origin in production
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000, // 7 days
        path: '/'                          // Available on all paths
    };

    // In production, we don't set a domain
    // This ensures cookies work across different domains (Vercel and Render)
    // The browser will treat it as a host-only cookie
    
    // For local development
    if (!isProd) {
        // In local dev, we can use localhost
        // Don't set domain to allow it to work with both localhost and 127.0.0.1
        config.secure = false;  // Allow HTTP in development
    }

    return config;
};

module.exports = getCookieConfig;
