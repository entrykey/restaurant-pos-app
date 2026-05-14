import React, { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Search, Check, ChevronDown } from 'lucide-react';
import { useTheme } from '../../../src/context/ThemeContext';

const CommonSelect = ({
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
    triggerClassName = ""
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

    const filteredOptions = options.filter(opt => {
        const label = typeof opt === 'object' ? opt[labelKey] : String(opt);
        return label?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

    const selectedOption = options.find(opt =>
        (typeof opt === 'object' ? opt[valueKey] : opt) === value
    );
    const displayValue = selectedOption
        ? (typeof selectedOption === 'object' ? selectedOption[labelKey] : selectedOption)
        : "";

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
            const menuHeight = 350; // Threshold for switching to top placement

            if (spaceBelow < menuHeight && spaceAbove > spaceBelow) {
                setPlacement('top');
            } else {
                setPlacement('bottom');
            }

            setCoords({
                top: rect.top + window.scrollY,
                bottom: rect.bottom + window.scrollY,
                left: rect.left + window.scrollX,
                width: rect.width
            });
        }
    };

    // Reset activeIndex when filteredOptions changes or dropdown opens
    useEffect(() => {
        setActiveIndex(0);
        if (isOpen) {
            updatePosition();
        }
    }, [searchTerm, isOpen]);

    // Update position on scroll/resize
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
        if (!opt || disabled) return;
        const val = typeof opt === 'object' ? opt[valueKey] : opt;
        onChange(val, opt);
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

    return (
        <div className={`relative ${className} common-select-container ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`} style={isOpen ? { zIndex: 100 } : {}} ref={dropdownRef}>
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                onKeyDown={(e) => {
                    if (disabled) return;
                    if (e.key === 'Enter' || e.key === ' ') {
                        setIsOpen(!isOpen);
                        e.preventDefault();
                    }
                    if (onKeyDown) onKeyDown(e);
                }}
                ref={triggerRef}
                className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer border-2 rounded-2xl outline-none transition-all font-bold common-select-trigger ${isOpen ? 'border-indigo-500' : (triggerClassName ? '' : 'border-transparent')} ${triggerClassName} ${theme.inputBg} ${theme.textPrimary} ${disabled ? 'pointer-events-none' : ''}`}
                tabIndex={disabled ? -1 : 0}
            >
                <span className={displayValue ? theme.textPrimary : theme.textSecondary}>
                    {displayValue || placeholder}
                </span>
                <ChevronDown size={18} className={`${theme.textSecondary} transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </div>

            {required && !value && (
                <input
                    type="text"
                    required
                    className="absolute opacity-0 w-0 h-0 p-0 m-0 border-0"
                    value=""
                    onChange={() => { }}
                />
            )}

            {isOpen && createPortal(
                <div 
                    ref={menuRef}
                    className={`fixed rounded-2xl shadow-2xl border z-[3000] overflow-hidden divide-y animate-in fade-in ${placement === 'bottom' ? 'slide-in-from-top-2' : 'slide-in-from-bottom-2'} duration-200 ${theme.surfaceBg} ${theme.borderLight} ${theme.borderLight.replace('border-', 'divide-')}`}
                    style={{ 
                        top: placement === 'bottom' ? coords.bottom - window.scrollY + 8 : undefined,
                        bottom: placement === 'top' ? window.innerHeight - (coords.top - window.scrollY) + 8 : undefined,
                        left: coords.left, 
                        width: coords.width
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    <div className={`p-3 border-b pointer-events-auto ${theme.borderLight} ${theme.sectionBg}`}>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                onKeyDown={handleSearchKeyDown}
                                placeholder={searchPlaceholder}
                                className={`w-full pl-9 pr-3 py-2 text-sm border rounded-xl outline-none focus:border-indigo-500 transition-all font-medium ${theme.inputBg} ${theme.inputBorder} ${theme.textPrimary}`}
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto custom-scrollbar">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const optVal = typeof opt === 'object' ? opt[valueKey] : opt;
                                const isSelected = optVal === value;
                                const isActive = idx === activeIndex;

                                return (
                                    <button
                                        key={optVal || idx}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        onMouseEnter={() => setActiveIndex(idx)}
                                        className={`w-full p-4 text-left flex items-center justify-between group transition-colors ${isActive ? 'bg-indigo-50 dark:bg-indigo-900/30' : 'hover:bg-indigo-50 dark:hover:bg-indigo-900/20'}`}
                                    >
                                        <div className="flex-1">
                                            {renderOption ? (
                                                renderOption(opt)
                                            ) : (
                                                <div className={`font-black ${isActive ? 'text-indigo-600 dark:text-indigo-400' : theme.textPrimary}`}>
                                                    {typeof opt === 'object' ? opt[labelKey] : String(opt)}
                                                </div>
                                            )}
                                        </div>
                                        {isSelected && (
                                            <Check size={16} className="text-indigo-600 dark:text-indigo-400 ml-2 flex-shrink-0" />
                                        )}
                                    </button>
                                );
                            })
                        ) : (
                            <div className={`p-4 text-center font-bold text-xs uppercase ${theme.textMuted}`}>
                                No results found
                            </div>
                        )}
                    </div>

                    {extraAction && (
                        <div className={`p-2 border-t mt-auto ${theme.borderLight} ${theme.sectionBg}`}>
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
