/**
 * Cookie configuration utility that handles cross-domain authentication
 * between Vercel frontend and Render backend
 */
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProd = process.env.NODE_ENV === 'production';
    const origin = req.get('origin');
    const host = req.get('host');

    // Enhanced logging
    console.log('Cookie Config Details:', {
        environment: process.env.NODE_ENV,
        secure: req.secure,
        protocol: req.protocol,
        origin,
        host,
        headers: req.headers
    });

    // Base cookie configuration
    const config = {
        httpOnly: true,     // Prevent JavaScript access
        secure: isProd,     // Must be true in production
        path: '/',          // Available on all paths
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000 // 7 days
    };

    if (isProd) {
        // Production configuration
        config.secure = true;
        config.sameSite = 'None';

        // Don't set domain in production
        // This allows cookies to work across different domains (Vercel frontend and Render backend)
        // The browser will treat it as a host-only cookie
    } else {
        // Development configuration
        config.secure = false;  // Allow HTTP in development
        config.sameSite = 'Lax';
        
        // In local dev, don't set domain to work with both localhost and 127.0.0.1
        if (origin?.includes('localhost') || origin?.includes('127.0.0.1')) {
            // Don't set domain for local development
        }
    }

    return config;
};

module.exports = getCookieConfig;
