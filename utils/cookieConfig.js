// Cookie configuration utility
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const isSecure = isProduction || req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    // Base cookie configuration
    const baseConfig = {
        httpOnly: true,
        secure: isSecure,
        sameSite: isSecure ? 'none' : 'lax',
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000, // Convert days to milliseconds
        path: '/' // Ensure cookies are available across all paths
    };

    // In development, return base config
    if (!isProduction) {
        console.log('Development cookie config:', baseConfig);
        return baseConfig;
    }

    const origin = req.get('origin');
    console.log('Setting cookie config for origin:', origin);

    // Production domain handling
    if (origin) {
        let domain;
        
        // Handle Vercel domains
        if (origin.includes('vercel.app')) {
            domain = '.vercel.app';
        }
        // Handle Render domains
        else if (origin.includes('onrender.com')) {
            domain = '.onrender.com';
        }
        // Handle custom domains
        else {
            try {
                const url = new URL(origin);
                domain = url.hostname;
            } catch (e) {
                console.error('Invalid origin URL:', origin);
            }
        }

        if (domain) {
            console.log('Setting cookie domain:', domain);
            return {
                ...baseConfig,
                domain,
                secure: true,
                sameSite: 'none'
            };
        }
    }

    // Default to base config with enhanced security
    return {
        ...baseConfig,
        secure: true,
        sameSite: 'none'
    };
};

module.exports = getCookieConfig;
