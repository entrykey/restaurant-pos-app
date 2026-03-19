import React from "react";
import { X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const Modal = ({ isOpen, onClose, title, children, className = "" }) => {
    const { theme } = useTheme();
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
            <div
                className={`${theme.surfaceBg} w-full rounded-[40px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh] ${className}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className={`p-6 ${theme.pageBg} border-b ${theme.borderLight} flex justify-between items-center shrink-0`}>
                    <div>
                        {title && <h3 className={`text-2xl font-black ${theme.textHeading}`}>{title}</h3>}
                    </div>
                    <button
                        onClick={onClose}
                        className={`p-2 ${theme.surfaceBg} rounded-full shadow-sm hover:${theme.pageBg} transition-colors ${theme.textPrimary}`}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

export default Modal;
