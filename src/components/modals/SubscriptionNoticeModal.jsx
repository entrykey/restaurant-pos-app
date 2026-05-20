import React, { useMemo, useState, useEffect } from "react";
import { AlertTriangle, CreditCard, ArrowRight, X } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../context/ThemeContext";
import { ROUTE_KEY_TO_PATH } from "../../constants/routeAccess";

/**
 * Floating notice card (same pattern as profile completion) — not a full-screen dialog.
 * @param {boolean} isStaff — When true, forces "contact owner" copy.
 * @param {boolean} isOwner — Optional override (e.g. AppContent passes currentUser.isOwner).
 * @param {function} onSubscribe — Optional; e.g. setView('organization') after navigation.
 * @param {boolean} elevateForProfile — When true, sit above the profile card (e.g. both shown in AppContent).
 */
const SubscriptionNoticeModal = ({
    isOpen,
    onClose,
    user,
    isStaff = false,
    isOwner: isOwnerProp,
    onSubscribe,
    elevateForProfile = false,
    title,
    message,
    showSubscribeButton = true,
}) => {
    const navigate = useNavigate();
    const { theme } = useTheme();

    const [dialogOffset, setDialogOffset] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [dragStart, setDragStart] = useState({ x: 0, y: 0 });

    const handleMouseDown = (e) => {
        if (e.target.closest("button")) return;
        setIsDragging(true);
        setDragStart({
            x: e.clientX - dialogOffset.x,
            y: e.clientY - dialogOffset.y,
        });
    };

    useEffect(() => {
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            setDialogOffset({
                x: e.clientX - dragStart.x,
                y: e.clientY - dragStart.y,
            });
        };
        const handleMouseUp = () => setIsDragging(false);
        if (isDragging) {
            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        }
        return () => {
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
        };
    }, [isDragging, dragStart]);

    const isShopBillingOwner = useMemo(() => {
        if (typeof isOwnerProp === "boolean") return isOwnerProp;
        if (user?.isOwner) return true;
        if (user?.isSuperAdmin) return true;
        return false;
    }, [isOwnerProp, user?.isOwner, user?.isSuperAdmin]);

    const showOwnerSubscribeFlow = !isStaff && isShopBillingOwner;

    const handleSubscribeClick = () => {
        // Do not call onDismiss/onClose here — that persists "dismissed" and hides the toast permanently.
        navigate(`${ROUTE_KEY_TO_PATH.ORGANIZATION}?highlight=subscription`, { replace: false });
        if (typeof onSubscribe === "function") {
            onSubscribe();
        }
    };

    if (!isOpen) return null;

    const bottomClass = elevateForProfile ? "bottom-52" : "bottom-4";

    return (
        <div
            className={`fixed right-4 ${bottomClass} z-[65] max-w-sm select-none cursor-grab active:cursor-grabbing`}
            style={{
                transform: `translate(${dialogOffset.x}px, ${dialogOffset.y}px)`,
                transition: isDragging ? "none" : "transform 0.1s ease-out",
            }}
            onMouseDown={handleMouseDown}
        >
            <div className={`relative rounded-2xl shadow-2xl border p-4 ${theme.cardBg} ${theme.inputBorder}`}>
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400 shrink-0">
                        {showOwnerSubscribeFlow ? (
                            <CreditCard size={18} />
                        ) : (
                            <AlertTriangle size={18} />
                        )}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className={`text-sm font-bold ${theme.textPrimary}`}>
                            {title || (showOwnerSubscribeFlow ? "No active subscription" : "Subscription inactive")}
                        </p>
                        <p className={`text-xs mt-1 leading-relaxed ${theme.textSecondary}`}>
                            {message || (showOwnerSubscribeFlow
                                ? "Subscribe to unlock all features. Open Organization → Subscription & Plans to choose a plan."
                                : "This shop has no active plan. Ask the shop owner to subscribe from Organization → Subscription & Plans.")}
                        </p>

                        {showOwnerSubscribeFlow && showSubscribeButton ? (
                            <button
                                type="button"
                                onClick={handleSubscribeClick}
                                className={`mt-3 w-full px-3 py-2 rounded-lg text-xs font-bold ${theme.buttonBg} ${theme.buttonText} flex items-center justify-center gap-2 hover:opacity-90 transition-opacity`}
                            >
                                <span>Subscribe</span>
                                <ArrowRight size={14} />
                            </button>
                        ) : null}

                <button
                    type="button"
                    onClick={onClose}
                    className={`absolute top-4 right-4 p-1 rounded-lg ${theme.textSecondary} hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors`}
                >
                    <X size={16} />
                </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionNoticeModal;
