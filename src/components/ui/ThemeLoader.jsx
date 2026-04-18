import React from 'react';
import { useTheme } from '../../context/ThemeContext';
import './ThemeLoader.css';

const ThemeLoader = ({ fullScreen = false, size = 'md', message = '' }) => {
    const { theme } = useTheme();

    // Map common size names to pixel values
    const sizeMap = {
        xs: 24,
        sm: 32,
        md: 48,
        lg: 64,
        xl: 80
    };

    const currentSize = sizeMap[size] || (typeof size === 'number' ? size : 48);

    const loaderContent = (
        <div className="flex flex-col items-center justify-center gap-4">
            <div 
                className="theme-loader-inner" 
                style={{ width: currentSize, height: currentSize }}
            >
                {/* Background Glow */}
                <div 
                    className={`theme-loader-glow ${theme.buttonBg}`}
                />
                
                {/* Primary Ring */}
                <div 
                    className="theme-loader-ring"
                    style={{ 
                        borderTopColor: 'currentColor',
                        borderLeftColor: 'currentColor',
                        borderBottomColor: 'transparent',
                        borderRightColor: 'transparent'
                    }}
                />
                
                {/* Secondary Ring (Slower/Delayed) */}
                <div 
                    className="theme-loader-ring"
                    style={{ 
                        animationDelay: '-0.45s',
                        opacity: 0.5,
                        borderTopColor: 'currentColor',
                        borderLeftColor: 'transparent',
                        borderBottomColor: 'transparent',
                        borderRightColor: 'transparent',
                        transform: 'scale(0.8)'
                    }}
                />

                {/* Center point */}
                <div className={`w-1.5 h-1.5 rounded-full ${theme.buttonBg} animate-pulse`} />
            </div>

            {message && (
                <p className={`text-sm font-bold tracking-widest uppercase animate-pulse ${theme.textSecondary}`}>
                    {message}
                </p>
            )}
        </div>
    );

    if (fullScreen) {
        return (
            <div className={`fixed inset-0 z-[9999] flex items-center justify-center backdrop-blur-md transition-all duration-500 ${theme.mode === 'dark' ? 'bg-black/60' : 'bg-white/60'}`}>
                {loaderContent}
            </div>
        );
    }

    return (
        <div className={`inline-flex items-center justify-center ${theme.primaryIconText}`}>
            {loaderContent}
        </div>
    );
};

export default ThemeLoader;
