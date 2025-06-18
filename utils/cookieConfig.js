// Cookie configuration utility
const getCookieConfig = (req, tokenExpiryDays = 7) => {
    const isProduction = process.env.NODE_ENV === 'production';
    const baseConfig = {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? 'none' : 'lax',
        maxAge: tokenExpiryDays * 24 * 60 * 60 * 1000 // Convert days to milliseconds
    };

    if (!isProduction) {
        return baseConfig;
    }

    const origin = req.get('origin');
    console.log('Setting cookie config for origin:', origin);

    if (origin) {
        // Handle Vercel domains
        if (origin.includes('vercel.app')) {
            // Extract the root domain for Vercel
            const domain = '.vercel.app';
            console.log('Setting cookie domain for Vercel:', domain);
            return {
                ...baseConfig,
                domain,
                secure: true,
                sameSite: 'none'
            };
        }
        
        // Handle Render domains
        if (origin.includes('onrender.com')) {
            const domain = '.onrender.com';
            console.log('Setting cookie domain for Render:', domain);
            return {
                ...baseConfig,
                domain,
                secure: true,
                sameSite: 'none'
            };
        }
    }

    // Default to base config if no specific domain matches
    return baseConfig;
};

module.exports = getCookieConfig;
