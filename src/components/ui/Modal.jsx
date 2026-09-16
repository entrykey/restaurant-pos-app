import React from "react";
import { X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const Modal = ({ isOpen, onClose, title, children, className = "" }) => {
    const { theme } = useTheme();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[2000] flex items-center justify-center p-4 animate-in fade-in">
            <div
                className={`${theme.surfaceBg} ${theme.textPrimary} border ${theme.borderLight} w-full rounded-[32px] md:rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-5 md:p-6 ${theme.surfaceBg} border-b ${theme.borderLight} flex justify-between items-center shrink-0`}>
                    <div>
                        {title && <h3 className={`text-xl md:text-2xl font-black ${theme.textHeading}`}>{title}</h3>}
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className={`p-2 ${theme.pageBg} rounded-full shadow-sm hover:opacity-80 transition-colors ${theme.textPrimary}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className={`flex-1 overflow-y-auto p-5 md:p-6 ${theme.surfaceBg}`}>
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
