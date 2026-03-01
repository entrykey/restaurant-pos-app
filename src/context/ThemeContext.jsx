import React, { createContext, useContext, useState, useEffect } from 'react';

// Define themes with space for future additions
export const themes = {
    light: {
        // General
        background: "bg-indigo-900",
        cardBg: "bg-white",
        textPrimary: "text-gray-900",
        textSecondary: "text-gray-400",
        textHeading: "text-black",
        textMuted: "text-gray-500",
        borderLight: "border-gray-100",

        // Layout
        pageBg: "bg-gray-50/30",
        surfaceBg: "bg-white",

        // Table (CommonTable)
        tableHeaderBg: "bg-gray-50/50",
        tableHeaderText: "text-gray-400",
        tableRowHover: "hover:bg-indigo-50/20",
        tableBorder: "border-gray-100",

        // Semantic Sections
        sectionBg: "bg-gray-50/50",
        sectionBorder: "border-gray-100",
        infoBg: "bg-blue-50/50",
        infoBorder: "border-blue-100",
        infoText: "text-blue-600",
        warningBg: "bg-orange-50/50",
        warningBorder: "border-orange-100",
        warningText: "text-orange-600",
        successBg: "bg-green-100",
        successText: "text-green-600",

        // Sidebar
        sidebarBg: "bg-indigo-900",
        sidebarText: "text-white",
        sidebarItemActiveBg: "bg-indigo-600",
        sidebarItemHoverBg: "hover:bg-indigo-800",
        sidebarLogoBg: "bg-white",
        sidebarLogoText: "text-indigo-900",
        sidebarLogoutText: "text-red-300",
        sidebarLogoutHoverBg: "hover:bg-red-900/30",

        // Icons & Primary elements
        primaryIconBg: "bg-indigo-100",
        primaryIconText: "text-indigo-600",

        // Inputs
        inputBg: "bg-gray-50",
        inputBorder: "border-gray-200", // Not explicitly in Login.jsx yet but good practice
        inputFocus: "focus:ring-indigo-500",
        inputText: "text-gray-900",

        // Buttons
        buttonBg: "bg-indigo-600",
        buttonHoverBg: "hover:bg-indigo-700",
        buttonText: "text-white",

        // Error
        errorBg: "bg-red-50",
        errorText: "text-red-600",

        // Links
        linkText: "text-indigo-600",
        linkHover: "hover:text-indigo-800",
    },
    dark: {
        // General
        background: "bg-gray-900",
        cardBg: "bg-gray-800",
        textPrimary: "text-white",
        textSecondary: "text-gray-300",
        textHeading: "text-white",
        textMuted: "text-gray-400",
        borderLight: "border-gray-700",

        // Layout
        pageBg: "bg-gray-900",
        surfaceBg: "bg-gray-800",

        // Table (CommonTable)
        tableHeaderBg: "bg-gray-800/80",
        tableHeaderText: "text-gray-400",
        tableRowHover: "hover:bg-gray-700/50",
        tableBorder: "border-gray-700",

        // Semantic Sections
        sectionBg: "bg-gray-800/50",
        sectionBorder: "border-gray-700",
        infoBg: "bg-blue-900/20",
        infoBorder: "border-blue-800/50",
        infoText: "text-blue-400",
        warningBg: "bg-orange-900/20",
        warningBorder: "border-orange-800/50",
        warningText: "text-orange-400",
        successBg: "bg-green-900/30",
        successText: "text-green-400",

        // Sidebar
        sidebarBg: "bg-gray-900",
        sidebarText: "text-white",
        sidebarItemActiveBg: "bg-indigo-600",
        sidebarItemHoverBg: "hover:bg-gray-800",
        sidebarLogoBg: "bg-gray-800",
        sidebarLogoText: "text-white",
        sidebarLogoutText: "text-red-400",
        sidebarLogoutHoverBg: "hover:bg-red-900/50",

        // Icons & Primary elements
        primaryIconBg: "bg-gray-700",
        primaryIconText: "text-indigo-400",

        // Inputs
        inputBg: "bg-gray-700",
        inputBorder: "border-gray-600",
        inputFocus: "focus:ring-indigo-500",
        inputText: "text-white",

        // Buttons
        buttonBg: "bg-indigo-600",
        buttonHoverBg: "hover:bg-indigo-500",
        buttonText: "text-white",

        // Error
        errorBg: "bg-red-900/50",
        errorText: "text-red-300",

        // Links
        linkText: "text-indigo-400",
        linkHover: "hover:text-indigo-300",
    }
    // Future themes can be added here
};

const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
    // Check system preference or local storage initially, defaulting to 'light'
    const [themeName, setThemeName] = useState(() => {
        const saved = localStorage.getItem('app-theme');
        if (saved && themes[saved]) return saved;
        // Check system preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            return 'dark';
        }
        return 'light';
    });

    useEffect(() => {
        localStorage.setItem('app-theme', themeName);
        // Optionally update body classes if needed globally
        // document.body.className = themes[themeName].background;
    }, [themeName]);

    // Listen for system theme changes in real-time
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

        const handleChange = (e) => {
            // Update the theme based on the new system preference
            setThemeName(e.matches ? 'dark' : 'light');
        };

        // Modern browsers
        if (mediaQuery.addEventListener) {
            mediaQuery.addEventListener('change', handleChange);
            return () => mediaQuery.removeEventListener('change', handleChange);
        }
        // Fallback for older browsers
        else if (mediaQuery.addListener) {
            mediaQuery.addListener(handleChange);
            return () => mediaQuery.removeListener(handleChange);
        }
    }, []);

    const setTheme = (name) => {
        if (themes[name]) {
            setThemeName(name);
        }
    };

    const theme = themes[themeName];

    return (
        <ThemeContext.Provider value={{ theme, themeName, setTheme, availableThemes: Object.keys(themes) }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = () => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
};
