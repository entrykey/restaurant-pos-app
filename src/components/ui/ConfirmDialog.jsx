import React from "react";
import { AlertTriangle, CheckCircle, HelpCircle, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const ConfirmDialog = ({
    isOpen,
    onClose,
    onConfirm,
    title = "Are you sure?",
    message = "Do you want to proceed with this action?",
    confirmText = "Yes, proceed",
    cancelText = "Cancel",
    type = "warning" // warning, danger, info, success
}) => {
    const { theme } = useTheme();
    if (!isOpen) return null;

    const icons = {
        warning: <AlertTriangle size={32} className="text-amber-500" />,
        danger: <AlertTriangle size={32} className="text-red-500" />,
        info: <HelpCircle size={32} className="text-indigo-500" />,
        success: <CheckCircle size={32} className="text-green-500" />
    };

    const confirmButtonClasses = {
        warning: "bg-amber-600 hover:bg-amber-700 text-white",
        danger: "bg-red-600 hover:bg-red-700 text-white",
        info: "bg-indigo-600 hover:bg-indigo-700 text-white",
        success: "bg-green-600 hover:bg-green-700 text-white"
    };

    return (
        <div
            className="fixed inset-0 z-[3000] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={onClose}
        >
            <div
                className={`${theme.surfaceBg} w-full max-w-md rounded-[32px] shadow-2xl p-6 relative border ${theme.borderLight} transform transition-all animate-in zoom-in-95`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-2 rounded-full ${theme.pageBg} ${theme.textSecondary} hover:${theme.textPrimary} transition-colors`}
                >
                    <X size={18} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className="mb-4 p-4 rounded-full bg-slate-100 dark:bg-slate-800">
                        {icons[type] || icons.warning}
                    </div>

                    <h3 className={`text-xl font-black mb-2 ${theme.textHeading}`}>
                        {title}
                    </h3>

                    <p className={`text-sm font-medium mb-6 leading-relaxed ${theme.textSecondary}`}>
                        {message}
                    </p>

                    <div className="flex gap-3 w-full">
                        <button
                            type="button"
                            onClick={onClose}
                            className={`flex-1 py-3 rounded-2xl font-bold transition-all ${theme.inputBg} ${theme.textSecondary} hover:${theme.textPrimary}`}
                        >
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                onConfirm?.();
                                onClose?.();
                            }}
                            className={`flex-1 py-3 rounded-2xl font-bold transition-all shadow-lg active:scale-95 ${confirmButtonClasses[type] || confirmButtonClasses.warning}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ConfirmDialog;
