/**
 * Cookie configuration utility that handles cross-domain authentication
 * between Vercel frontend and Render backend
 */
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProd = process.env.NODE_ENV === 'production';
    const origin = req.get('origin');
    
    // Enhanced logging for debugging
    console.log('Cookie Config Details:', {
        environment: process.env.NODE_ENV,
        secure: req.secure,
        protocol: req.protocol,
        origin,
        host: req.get('host'),
        'x-forwarded-proto': req.get('x-forwarded-proto'),
        headers: req.headers
    });

    // Base cookie configuration
    const config = {
        httpOnly: true,      // Prevent JavaScript access
        path: '/',           // Available on all paths
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000  // 7 days
    };

    if (isProd) {
        // Production configuration (Vercel frontend to Render backend)
        config.secure = true;       // Required for cross-origin HTTPS
        config.sameSite = 'None';   // Required for cross-origin cookies
        
        // Don't set domain - let browser handle it as host-only cookie
        // This is crucial for cross-origin cookies between Vercel and Render
        
        console.log('Production cookie config:', config);
    } else {
        // Development configuration
        const isLocalHttps = req.secure || req.get('x-forwarded-proto') === 'https';
        
        config.secure = isLocalHttps;
        config.sameSite = isLocalHttps ? 'None' : 'Lax';
        
        // For local development, don't set domain to work with both localhost and 127.0.0.1
        console.log('Development cookie config:', config);
    }

    return config;
};

module.exports = getCookieConfig;
