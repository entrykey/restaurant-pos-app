import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

const TextContext = createContext();

export const useText = () => useContext(TextContext);

export const TextProvider = ({ children }) => {
    const { customTexts } = useAuth();
    const [isLoading, setIsLoading] = useState(true);

    // No longer need to fetch, as this comes directly in the login payload and sits in AuthContext / localStorage sync.
    useEffect(() => {
        setIsLoading(false);
    }, [customTexts]);

    // t(moduleKey, textKey, defaultText)
    const t = (moduleKey, textKey, defaultText) => {
        if (!customTexts) return defaultText;
        const mod = customTexts[moduleKey?.toUpperCase()];
        if (mod && mod[textKey] && mod[textKey].trim() !== '') {
            return mod[textKey];
        }
        return defaultText;
    };

    return (
        <TextContext.Provider value={{ t, isLoading }}>
            {children}
        </TextContext.Provider>
    );
};
