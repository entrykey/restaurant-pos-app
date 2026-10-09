import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../../context/ThemeContext';

const CommonSelect = ({
    label,
    options = [],
    value,
    onChange,
    placeholder = "Select an option...",
    searchPlaceholder = "Search...",
    required = false,
    labelKey = "label",
    valueKey = "value",
    renderOption,
    className = "",
    extraAction,
    onKeyDown,
    disabled = false,
    triggerClassName = "",
    icon: Icon,
    size = "md",
    searchable
}) => {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [activeIndex, setActiveIndex] = useState(0);
    const [coords, setCoords] = useState({ top: 0, bottom: 0, left: 0, width: 0 });
    const [placement, setPlacement] = useState('bottom');
    const dropdownRef = useRef(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);

    const isSearchable = searchable !== undefined ? searchable : options.length > 5;

    const filteredOptions = options.filter(opt => {
        if (!searchTerm) return true;
        const labelText = typeof opt === 'object' && opt !== null ? opt[labelKey] : String(opt);
        return labelText?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

    const selectedOption = options.find(opt => {
        const optVal = typeof opt === 'object' && opt !== null ? opt[valueKey] : opt;
        return String(optVal) === String(value);
    });

    const rawDisplay = selectedOption
        ? (typeof selectedOption === 'object' && selectedOption !== null ? selectedOption[labelKey] : selectedOption)
        : "";
    const displayValue = rawDisplay !== null && rawDisplay !== undefined ? String(rawDisplay) : "";

    useEffect(() => {
        const handleClickOutside = (event) => {
            const isInsideTrigger = dropdownRef.current && dropdownRef.current.contains(event.target);
            const isInsideMenu = menuRef.current && menuRef.current.contains(event.target);
            
            if (!isInsideTrigger && !isInsideMenu) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const updatePosition = () => {
        if (triggerRef.current) {
            const rect = triggerRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const spaceAbove = rect.top;
            const menuHeight = 280;

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setPlacement('top');
            } else {
                setPlacement('bottom');
            }

            setCoords({
                top: rect.top,
                bottom: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useEffect(() => {
        setActiveIndex(0);
        if (isOpen) {
            updatePosition();
        }
    }, [searchTerm, isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener('scroll', updatePosition, true);
        window.addEventListener('resize', updatePosition);
        return () => {
            window.removeEventListener('scroll', updatePosition, true);
            window.removeEventListener('resize', updatePosition);
        };
    }, [isOpen]);

    const handleSelect = (opt) => {
        if (!opt || disabled || (typeof opt === 'object' && opt.disabled)) return;
        const val = typeof opt === 'object' && opt !== null ? opt[valueKey] : opt;
        if (onChange) {
            onChange(val, opt);
        }
        setIsOpen(false);
        setSearchTerm("");
    };

    const handleSearchKeyDown = (e) => {
        if (disabled) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setActiveIndex(prev => (prev < filteredOptions.length - 1 ? prev + 1 : prev));
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setActiveIndex(prev => (prev > 0 ? prev - 1 : prev));
        } else if (e.key === 'Enter') {
            e.preventDefault();
            if (filteredOptions[activeIndex]) {
                handleSelect(filteredOptions[activeIndex]);
            }
        } else if (e.key === 'Escape') {
            setIsOpen(false);
        }
    };

    const toggleOpen = () => {
        if (disabled) return;
        updatePosition();
        setIsOpen(!isOpen);
    };

    const rect = triggerRef.current ? triggerRef.current.getBoundingClientRect() : null;
    const currentWidth = coords.width || (rect ? rect.width : 0);
    const currentTop = coords.top || (rect ? rect.top : 0);
    const currentBottom = coords.bottom || (rect ? rect.bottom : 0);
    const currentLeft = coords.left || (rect ? rect.left : 0);

    const menuWidth = Math.max(currentWidth, 180);
    const leftPos = Math.max(16, Math.min(currentLeft, window.innerWidth - menuWidth - 16));

    return (
        <div className={`relative ${className} common-select-container ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={isOpen ? { zIndex: 100 } : {}} ref={dropdownRef}>
            {label && (
                <label className={`block text-xs font-black uppercase tracking-wider mb-2 ${theme?.textMuted || 'text-gray-500'}`}>
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </label>
            )}

            <div
                onClick={toggleOpen}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        toggleOpen();
                        e.preventDefault();
                    }
                    if (onKeyDown) onKeyDown(e);
                }}
                ref={triggerRef}
                className={`w-full flex items-center justify-between cursor-pointer border outline-none transition-all font-bold common-select-trigger ${
                    size === 'sm'
                        ? 'px-3 py-1.5 text-xs rounded-xl h-10'
                        : 'px-4 py-3 text-sm rounded-2xl'
                } ${
                    isOpen 
                        ? 'border-indigo-500 ring-2 ring-indigo-500/20 shadow-xs' 
                        : (triggerClassName || `${theme?.inputBorder || 'border-gray-200'}`)
                } ${theme?.inputBg || 'bg-gray-50'} ${theme?.textPrimary || 'text-gray-900'} ${disabled ? 'pointer-events-none' : ''}`}
                tabIndex={disabled ? -1 : 0}
            >
                <div className="flex items-center gap-2 overflow-hidden min-w-0">
                    {Icon && (
                        <span className={`shrink-0 transition-colors ${isOpen ? 'text-indigo-600 dark:text-indigo-400' : 'text-indigo-500/80 dark:text-indigo-400/80'}`}>
                            {React.isValidElement(Icon) ? Icon : <Icon size={size === 'sm' ? 14 : 18} />}
                        </span>
                    )}
                    <span className={`truncate ${displayValue ? (theme?.textPrimary || 'text-gray-900') : (theme?.textMuted || 'text-gray-400')} ${size === 'sm' ? 'text-xs' : ''}`}>
                        {displayValue || placeholder}
                    </span>
                </div>
                <ChevronDown size={size === 'sm' ? 14 : 18} className={`${theme?.textSecondary || 'text-gray-500'} shrink-0 transition-transform duration-200 ml-1 ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {required && !value && (
                <input
                    type="text"
                    required
                    className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0 pointer-events-none"
                    value=""
                    onChange={() => { }}
                />
            )}

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className={`fixed rounded-2xl shadow-2xl border z-[3000] overflow-hidden divide-y animate-in fade-in ${placement === 'bottom' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2'} duration-200 ${theme?.surfaceBg || 'bg-white'} ${theme?.borderLight || 'border-gray-200'} ${(theme?.borderLight || 'border-gray-200').replace('border-', 'divide-')}`}
                    style={{ 
                        top: placement === 'bottom' ? currentBottom + 6 : undefined,
                        bottom: placement === 'top' ? window.innerHeight - currentTop + 6 : undefined,
                        left: leftPos, 
                        width: menuWidth,
                        maxWidth: Math.max(menuWidth, 360)
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {isSearchable && (
                        <div className={`p-2.5 border-b pointer-events-auto ${theme?.borderLight || 'border-gray-200'} ${theme?.sectionBg || 'bg-gray-50/50'}`}>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
                                <input
                                    autoFocus
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    onKeyDown={handleSearchKeyDown}
                                    placeholder={searchPlaceholder}
                                    className={`w-full pl-8 pr-3 py-1.5 text-xs border rounded-xl outline-none focus:border-indigo-500 transition-all font-medium ${theme?.inputBg || 'bg-white'} ${theme?.inputBorder || 'border-gray-200'} ${theme?.textPrimary || 'text-gray-900'}`}
                                />
                            </div>
                        </div>
                    )}

                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const optVal = typeof opt === 'object' && opt !== null ? opt[valueKey] : opt;
                                const optLabel = typeof opt === 'object' && opt !== null ? opt[labelKey] : String(opt);
                                const isSelected = String(optVal) === String(value);
                                const isActive = idx === activeIndex;

                                return (
                                    <button
                                        key={optVal ?? idx}
                                        type="button"
                                        disabled={typeof opt === 'object' && opt?.disabled}
                                        onClick={() => (!opt || typeof opt !== 'object' || !opt.disabled) && handleSelect(opt)}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={`w-full px-3.5 py-2.5 text-left flex items-center justify-between group transition-colors whitespace-nowrap ${
                                            typeof opt === 'object' && opt?.disabled 
                                                ? 'opacity-50 cursor-not-allowed bg-red-50/40 dark:bg-red-950/20' 
                                                : isSelected || isActive
                                                    ? 'bg-indigo-50 dark:bg-indigo-950/60 font-bold' 
                                                    : `hover:bg-indigo-50/60 dark:hover:bg-indigo-950/40 ${theme?.textPrimary || 'text-gray-900'}`
                                        }`}
                                    >
                                        <div className="flex-1 min-w-0 pr-2">
                                            {renderOption ? (
                                                renderOption(opt)
                                            ) : (
                                                <div className={`font-bold ${size === 'sm' ? 'text-xs' : 'text-sm'} ${isSelected || isActive ? 'text-indigo-600 dark:text-indigo-400' : (theme?.textPrimary || 'text-gray-900')}`}>
                                                    {optLabel}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check size={size === 'sm' ? 14 : 16} className="text-indigo-600 dark:text-indigo-400 shrink-0 ml-1" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className={`p-3 text-center font-bold text-xs uppercase ${theme?.textMuted || 'text-gray-400'}`}>
                                No results found
                            </div>
                        )}
                    </div>

                    {extraAction && (
                        <div onClick={() => setIsOpen(false)} className={`p-2 border-t mt-auto ${theme?.borderLight || 'border-gray-200'} ${theme?.sectionBg || 'bg-gray-50/50'}`}>
                            {extraAction}
                        </div>
                    )}
                </div>,
                document.body
            )}
        </div>
    );
};

export default CommonSelect;

