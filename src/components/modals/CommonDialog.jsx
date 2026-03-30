import React, { useState } from 'react';
import { X, AlertCircle, CheckCircle2, Info, HelpCircle } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const CommonDialog = ({ 
    isOpen, 
    onClose, 
    onConfirm, 
    title, 
    message, 
    type = 'info', // 'info', 'success', 'warning', 'error', 'confirm', 'prompt'
    confirmText = 'Confirm',
    cancelText = 'Cancel',
    defaultValue = '',
    placeholder = 'Type here...'
}) => {
    const { theme } = useTheme();
    const [inputValue, setInputValue] = useState(defaultValue);

    if (!isOpen) return null;

    const icons = {
        info: <Info className="text-blue-500" size={24} />,
        success: <CheckCircle2 className="text-green-500" size={24} />,
        warning: <AlertCircle className="text-orange-500" size={24} />,
        error: <AlertCircle className="text-red-500" size={24} />,
        confirm: <HelpCircle className="text-indigo-500" size={24} />,
        prompt: <HelpCircle className="text-indigo-500" size={24} />
    };

    const handleConfirm = () => {
        if (type === 'prompt') {
            onConfirm(inputValue);
        } else {
            onConfirm();
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                onClick={onClose}
            />
            
            <div className={`relative w-full max-w-md ${theme.surfaceBg} rounded-[32px] shadow-2xl border ${theme.borderLight} overflow-hidden animate-in fade-in zoom-in duration-300`}>
                <div className="p-6 md:p-8">
                    <div className="flex items-start gap-4 mb-6">
                        <div className={`p-3 rounded-2xl ${theme.sectionBg} shrink-0`}>
                            {icons[type]}
                        </div>
                        <div className="flex-1">
                            <h3 className={`text-xl font-black ${theme.textHeading} mb-1`}>{title}</h3>
                            <p className={`text-sm font-medium ${theme.textSecondary} leading-relaxed`}>{message}</p>
                        </div>
                        <button 
                            onClick={onClose}
                            className={`p-2 rounded-xl ${theme.sectionBg} ${theme.textSecondary} hover:text-red-500 transition-colors`}
                        >
                            <X size={20} />
                        </button>
                    </div>

                    {type === 'prompt' && (
                        <div className="mb-8">
                            <textarea
                                autoFocus
                                value={inputValue}
                                onChange={(e) => setInputValue(e.target.value)}
                                placeholder={placeholder}
                                className={`w-full p-4 rounded-2xl border-2 ${theme.inputBorder} ${theme.inputBg} ${theme.inputText} font-bold text-sm focus:border-indigo-500 outline-none transition-all placeholder:text-gray-400 min-h-[100px] resize-none`}
                            />
                        </div>
                    )}

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest ${theme.textSecondary} ${theme.sectionBg} hover:opacity-80 transition-all active:scale-95`}
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={handleConfirm}
                            className={`flex-1 py-4 px-6 rounded-2xl font-black text-xs uppercase tracking-widest text-white shadow-xl shadow-indigo-500/20 active:scale-95 transition-all`}
                            style={{ backgroundColor: type === 'error' ? '#ef4444' : '#6366f1' }}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommonDialog;
