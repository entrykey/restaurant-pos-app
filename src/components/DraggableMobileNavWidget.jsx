import React, { useState, useEffect, useRef, useCallback } from "react";
import {
    SlidersHorizontal, X, MapPin, Volume2, VolumeX, HelpCircle,
    Building2, Wifi, WifiOff, Clock, ChevronRight, GripVertical, Check
} from "lucide-react";
import { MODULES } from "../constants/modules";
import { ACTIONS } from "../constants/actions";

const STORAGE_KEY = "pos_fab_mobile_pos";

const DraggableMobileNavWidget = ({
    theme,
    branches = [],
    activeBranchId,
    setActiveBranchId,
    showBranchSelector,
    branchSelectorTitle,
    hasFullAccess,
    soundOn,
    handleToggleSound,
    restartTour,
    currentUser,
    isOwner,
    businessType,
    isOnlineOrderingEnabled,
    setIsOnlineOrderingEnabled,
    setIsBusinessTypeModalOpen,
    isTrial,
    trialDaysLeft,
    can,
    navigate,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [isBranchListOpen, setIsBranchListOpen] = useState(false);
    const [isDragging, setIsDragging] = useState(false);

    // Initial position on screen (top in px, right in px)
    const [position, setPosition] = useState(() => {
        if (typeof window === "undefined") return { top: 150, right: 12 };
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const parsed = JSON.parse(saved);
                const top = Math.min(Math.max(parsed.top, 70), (window.innerHeight || 800) - 120);
                const right = Math.min(Math.max(parsed.right, 8), (window.innerWidth || 400) - 60);
                return { top, right };
            }
        } catch (e) {}
        return { top: 150, right: 12 };
    });

    const dragRef = useRef({
        startX: 0,
        startY: 0,
        initialTop: 150,
        initialRight: 12,
        hasMoved: false,
    });

    // Handle touch start
    const handleTouchStart = (e) => {
        if (isOpen) return; // don't drag when panel is open
        const touch = e.touches[0];
        dragRef.current = {
            startX: touch.clientX,
            startY: touch.clientY,
            initialTop: position.top,
            initialRight: position.right,
            hasMoved: false,
        };
        setIsDragging(false);
    };

    // Handle touch move
    const handleTouchMove = (e) => {
        if (isOpen) return;
        const touch = e.touches[0];
        const deltaX = touch.clientX - dragRef.current.startX;
        const deltaY = touch.clientY - dragRef.current.startY;

        if (Math.hypot(deltaX, deltaY) > 5) {
            dragRef.current.hasMoved = true;
            setIsDragging(true);

            const newTop = Math.min(
                Math.max(dragRef.current.initialTop + deltaY, 70),
                window.innerHeight - 80
            );
            // deltaX > 0 means moving right (so right decreases)
            const newRight = Math.min(
                Math.max(dragRef.current.initialRight - deltaX, 8),
                window.innerWidth - 60
            );

            setPosition({ top: newTop, right: newRight });
        }
    };

    // Handle touch end
    const handleTouchEnd = () => {
        if (dragRef.current.hasMoved) {
            // Save position
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
            } catch (e) {}
            setTimeout(() => setIsDragging(false), 50);
        } else {
            // It was a tap! Toggle expanded state
            setIsDragging(false);
            setIsOpen((prev) => !prev);
        }
    };

    // Handle mouse drag (for desktop/emulator testing)
    const handleMouseDown = (e) => {
        if (isOpen) return;
        e.preventDefault();
        dragRef.current = {
            startX: e.clientX,
            startY: e.clientY,
            initialTop: position.top,
            initialRight: position.right,
            hasMoved: false,
        };

        const onMouseMove = (moveEvent) => {
            const deltaX = moveEvent.clientX - dragRef.current.startX;
            const deltaY = moveEvent.clientY - dragRef.current.startY;
            if (Math.hypot(deltaX, deltaY) > 5) {
                dragRef.current.hasMoved = true;
                setIsDragging(true);
                const newTop = Math.min(
                    Math.max(dragRef.current.initialTop + deltaY, 70),
                    window.innerHeight - 80
                );
                const newRight = Math.min(
                    Math.max(dragRef.current.initialRight - deltaX, 8),
                    window.innerWidth - 60
                );
                setPosition({ top: newTop, right: newRight });
            }
        };

        const onMouseUp = () => {
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
            if (dragRef.current.hasMoved) {
                try {
                    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
                } catch (e) {}
                setTimeout(() => setIsDragging(false), 50);
            } else {
                setIsDragging(false);
                setIsOpen((prev) => !prev);
            }
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };

    // Keep position valid on window resize
    useEffect(() => {
        const handleResize = () => {
            setPosition((prev) => ({
                top: Math.min(Math.max(prev.top, 70), window.innerHeight - 80),
                right: Math.min(Math.max(prev.right, 8), window.innerWidth - 60),
            }));
        };
        window.addEventListener("resize", handleResize);
        return () => window.removeEventListener("resize", handleResize);
    }, []);

    // Close when tapping Escape
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) setIsOpen(false);
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen]);

    return (
        <div className="md:hidden">
            {/* Backdrop when expanded */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 backdrop-blur-xs z-[180] animate-in fade-in duration-200"
                    onClick={() => {
                        setIsOpen(false);
                        setIsBranchListOpen(false);
                    }}
                />
            )}

            {/* Draggable Trigger Icon */}
            <div
                style={{
                    position: "fixed",
                    top: `${position.top}px`,
                    right: `${position.right}px`,
                    zIndex: isOpen ? 190 : 120,
                    touchAction: "none",
                }}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onMouseDown={handleMouseDown}
                className="select-none cursor-grab active:cursor-grabbing"
            >
                <button
                    type="button"
                    aria-label="Quick Controls Menu"
                    className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-xl border transition-transform ${
                        isOpen
                            ? "bg-indigo-600 text-white border-indigo-500 scale-105 ring-4 ring-indigo-500/20"
                            : isDragging
                            ? "bg-indigo-700 text-white border-indigo-400 scale-110 shadow-2xl opacity-90 ring-4 ring-indigo-500/30"
                            : "bg-gradient-to-tr from-indigo-600 via-indigo-600 to-indigo-500 text-white border-indigo-400/50 hover:scale-105 active:scale-95 shadow-indigo-600/30"
                    }`}
                >
                    <div className="flex items-center -space-x-1">
                        <GripVertical size={13} className="opacity-60 shrink-0" />
                        <SlidersHorizontal size={19} className="shrink-0" />
                    </div>

                    {/* Small Status Badges on the icon */}
                    {isTrial && (
                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-slate-900 animate-pulse" />
                    )}
                    {!soundOn && (
                        <span className="absolute -bottom-1 -left-1 px-1 py-0.2 rounded-full bg-slate-900/90 text-[8px] font-bold text-slate-300 border border-slate-700">
                            🔇
                        </span>
                    )}
                </button>
            </div>

            {/* Expanded Popover Panel */}
            {isOpen && (
                <div
                    style={{
                        position: "fixed",
                        top: `${Math.min(position.top, window.innerHeight - 440)}px`,
                        right: `${Math.min(Math.max(position.right, 10), window.innerWidth - 300)}px`,
                        zIndex: 195,
                        width: "min(290px, calc(100vw - 24px))",
                    }}
                    className={`rounded-3xl border shadow-2xl overflow-hidden flex flex-col ${theme.surfaceBg} ${theme.borderLight} animate-in zoom-in-95 duration-200`}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header */}
                    <div className={`p-3.5 border-b ${theme.borderLight} flex items-center justify-between bg-gradient-to-r from-indigo-500/10 via-transparent to-transparent`}>
                        <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold shadow-xs">
                                <SlidersHorizontal size={14} />
                            </div>
                            <div>
                                <h4 className={`text-xs font-black ${theme.textHeading} leading-tight`}>Quick Controls</h4>
                                <p className="text-[10px] text-slate-400">Draggable Shop Tools</p>
                            </div>
                        </div>
                        <button
                            type="button"
                            onClick={() => {
                                setIsOpen(false);
                                setIsBranchListOpen(false);
                            }}
                            className={`p-1.5 rounded-xl text-slate-400 hover:${theme.textPrimary} hover:bg-gray-100 dark:hover:bg-slate-800 transition-colors`}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Content List */}
                    <div className="p-3 space-y-2.5 max-h-[70vh] overflow-y-auto no-scrollbar text-xs">
                        {/* 1. Free Trial Alert if active */}
                        {isTrial && (
                            <div className="p-2.5 rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-amber-900 dark:text-amber-200 flex items-center justify-between gap-2 shadow-xs">
                                <div className="flex items-center gap-2 min-w-0">
                                    <Clock size={15} className="animate-pulse text-amber-600 shrink-0" />
                                    <div className="min-w-0">
                                        <p className="text-[9px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400">Free Trial</p>
                                        <p className="text-[11px] font-black truncate">{trialDaysLeft} days remaining</p>
                                    </div>
                                </div>
                                {can && can(MODULES.ORGANIZATION, ACTIONS.ORGANIZATION_VIEW) && (
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            navigate("/organization");
                                        }}
                                        className="px-2.5 py-1 rounded-xl bg-amber-600 text-white font-black text-[10px] uppercase tracking-wider hover:bg-amber-700 transition-colors shadow-xs shrink-0"
                                    >
                                        Upgrade
                                    </button>
                                )}
                            </div>
                        )}

                        {/* 2. Branch Selector */}
                        {showBranchSelector && (
                            <div className="space-y-1">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                                    Active Branch
                                </label>
                                <button
                                    type="button"
                                    onClick={() => setIsBranchListOpen((prev) => !prev)}
                                    className={`w-full p-2.5 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex items-center justify-between gap-2 text-left transition-colors hover:border-indigo-500`}
                                >
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                            <MapPin size={15} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-black text-xs ${theme.textHeading} truncate`}>{branchSelectorTitle}</p>
                                            <p className="text-[10px] text-slate-400">Tap to switch branch</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={14} className={`text-slate-400 transition-transform ${isBranchListOpen ? "rotate-90" : ""}`} />
                                </button>

                                {/* Branch options dropdown */}
                                {isBranchListOpen && (
                                    <div className={`p-1.5 rounded-2xl border ${theme.borderLight} bg-gray-50/80 dark:bg-slate-900/80 space-y-1 animate-in fade-in-50 duration-150`}>
                                        {branches.map((b) => {
                                            const isSelected = String(activeBranchId) === String(b._id || b.id);
                                            return (
                                                <button
                                                    key={b._id || b.id}
                                                    type="button"
                                                    onClick={() => {
                                                        setActiveBranchId(b._id || b.id);
                                                        setIsBranchListOpen(false);
                                                    }}
                                                    className={`w-full px-3 py-2 rounded-xl text-left font-bold text-xs flex items-center justify-between transition-colors ${
                                                        isSelected
                                                            ? "bg-indigo-600 text-white shadow-xs"
                                                            : `${theme.textPrimary} hover:bg-white dark:hover:bg-slate-800`
                                                    }`}
                                                >
                                                    <span className="truncate">{b.name}</span>
                                                    {isSelected && <Check size={14} />}
                                                </button>
                                            );
                                        })}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* 3. Voice Announcement Toggle */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                                Audio & Announcements
                            </label>
                            <button
                                type="button"
                                onClick={handleToggleSound}
                                className={`w-full p-2.5 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex items-center justify-between gap-2 transition-all active:scale-98`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${soundOn ? "bg-indigo-600 text-white shadow-xs" : "bg-slate-200 dark:bg-slate-800 text-slate-500"}`}>
                                        {soundOn ? <Volume2 size={15} /> : <VolumeX size={15} />}
                                    </div>
                                    <div className="text-left">
                                        <p className={`font-black text-xs ${theme.textHeading}`}>Voice Alerts</p>
                                        <p className="text-[10px] text-slate-400">{soundOn ? "Orders announced aloud" : "Voice alerts muted"}</p>
                                    </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${soundOn ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300" : "bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-400"}`}>
                                    {soundOn ? "ON" : "OFF"}
                                </span>
                            </button>
                        </div>

                        {/* 4. Interactive Guided Tour */}
                        <div className="space-y-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                                Help & Guidance
                            </label>
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    if (typeof restartTour === "function") restartTour();
                                }}
                                className={`w-full p-2.5 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex items-center gap-2 text-left hover:border-indigo-500 transition-colors`}
                            >
                                <div className="w-7 h-7 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                                    <HelpCircle size={15} />
                                </div>
                                <div>
                                    <p className={`font-black text-xs ${theme.textHeading}`}>Interactive Guided Tour</p>
                                    <p className="text-[10px] text-slate-400">Step-by-step walkthrough</p>
                                </div>
                            </button>
                        </div>

                        {/* 5. Business Type & Online Ordering (Admin / Manager) */}
                        {currentUser && (currentUser.role === "Admin" || currentUser.role === "Manager") && (
                            <div className="space-y-1 pt-1 border-t border-slate-200/60 dark:border-slate-800/60">
                                <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 block px-1">
                                    Shop Mode & Online
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setIsOpen(false);
                                            if (typeof setIsBusinessTypeModalOpen === "function") {
                                                setIsBusinessTypeModalOpen(true);
                                            }
                                        }}
                                        className={`p-2.5 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex flex-col items-start gap-1 hover:border-indigo-500 transition-colors text-left`}
                                    >
                                        <Building2 size={15} className="text-indigo-600 dark:text-indigo-400" />
                                        <span className="text-[9px] font-bold text-slate-400 uppercase">Type</span>
                                        <span className={`text-[11px] font-black ${theme.textHeading} capitalize truncate w-full`}>
                                            {typeof businessType === "object" ? businessType?.displayString : businessType || "POS"}
                                        </span>
                                    </button>

                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (typeof setIsOnlineOrderingEnabled === "function") {
                                                setIsOnlineOrderingEnabled(!isOnlineOrderingEnabled);
                                            }
                                        }}
                                        className={`p-2.5 rounded-2xl border transition-colors flex flex-col items-start gap-1 text-left ${
                                            isOnlineOrderingEnabled
                                                ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200"
                                                : "bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300"
                                        }`}
                                    >
                                        {isOnlineOrderingEnabled ? <Wifi size={15} /> : <WifiOff size={15} />}
                                        <span className="text-[9px] font-bold opacity-75 uppercase">Online</span>
                                        <span className="text-[11px] font-black">
                                            {isOnlineOrderingEnabled ? "Online ON" : "Online OFF"}
                                        </span>
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* 6. Owner: My Shops button */}
                        {isOwner && (
                            <button
                                type="button"
                                onClick={() => {
                                    setIsOpen(false);
                                    navigate("/owner-dashboard");
                                }}
                                className={`w-full p-2.5 rounded-2xl border ${theme.borderLight} ${theme.inputBg} flex items-center justify-between gap-2 text-left hover:border-indigo-500 transition-colors`}
                            >
                                <div className="flex items-center gap-2">
                                    <div className="w-7 h-7 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center shrink-0">
                                        <Building2 size={15} />
                                    </div>
                                    <div>
                                        <p className={`font-black text-xs ${theme.textHeading}`}>Shop Portfolio</p>
                                        <p className="text-[10px] text-slate-400">Switch between your shops</p>
                                    </div>
                                </div>
                                <ChevronRight size={14} className="text-slate-400" />
                            </button>
                        )}
                    </div>

                    {/* Hint Footer */}
                    <div className={`p-2.5 border-t ${theme.borderLight} text-center bg-black/5 dark:bg-white/5`}>
                        <p className="text-[10px] text-slate-400 font-medium">
                            💡 You can drag this button anywhere on the screen
                        </p>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DraggableMobileNavWidget;

