import React, { useEffect, useState } from "react";
import { CheckCircle, XCircle, Info, X } from "lucide-react";

const AlertDialog = ({
    isOpen,
    onClose,
    title,
    message,
    type = "info" // success, error, info
}) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300); // Wait for animation
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const config = {
        success: {
            icon: <CheckCircle size={48} className="text-green-500" />,
            bg: "bg-green-50",
            button: "bg-green-600 hover:bg-green-700 text-white",
            titleColor: "text-green-800"
        },
        error: {
            icon: <XCircle size={48} className="text-red-500" />,
            bg: "bg-red-50",
            button: "bg-red-600 hover:bg-red-700 text-white",
            titleColor: "text-red-800"
        },
        info: {
            icon: <Info size={48} className="text-indigo-500" />,
            bg: "bg-indigo-50",
            button: "bg-indigo-600 hover:bg-indigo-700 text-white",
            titleColor: "text-indigo-800"
        }
    };

    const currentConfig = config[type] || config.info;

    return (
        <div
            className={`fixed inset-0 z-[110] flex items-center justify-center p-4 transition-all duration-300 ${isOpen ? "bg-black/40 backdrop-blur-sm opacity-100" : "bg-black/0 backdrop-blur-none opacity-0"
                }`}
        >
            <div
                className={`w-full max-w-sm bg-white rounded-[32px] shadow-2xl p-6 relative transform transition-all duration-300 ${isOpen ? "scale-100 translate-y-0" : "scale-95 translate-y-4"
                    }`}
                onClick={(e) => e.stopPropagation()}
            >
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
                >
                    <X size={20} />
                </button>

                <div className="flex flex-col items-center text-center">
                    <div className={`mb-4 p-4 rounded-full ${currentConfig.bg} animate-in zoom-in duration-300`}>
                        {currentConfig.icon}
                    </div>

                    <h3 className={`text-xl font-black mb-2 ${currentConfig.titleColor}`}>
                        {title}
                    </h3>

                    <p className="text-gray-600 font-medium mb-6 leading-relaxed">
                        {message}
                    </p>

                    <button
                        onClick={onClose}
                        className={`w-full py-3 rounded-xl font-bold transition-all transform active:scale-95 ${currentConfig.button} shadow-lg`}
                    >
                        Okay, Got it
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AlertDialog;
