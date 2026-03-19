module.exports = function override(config, env) {
    const fallback = config.resolve.fallback || {};
    
    // Webpack 5 fallbacks cho TensorFlow.js
    Object.assign(fallback, {
        "fs": false,
        "crypto": false,
        "util": require.resolve("util/")
    });
    
    config.resolve.fallback = fallback;

    // Không can thiệp vào config.plugins bằng ProvidePlugin 
    // vì làm hỏng React Refresh của Create React App v5

    // Ignore source map warnings
    config.ignoreWarnings = [/Failed to parse source map/];

    return config;
};

