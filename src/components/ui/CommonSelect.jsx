import React, { useState, useRef, useEffect } from 'react';
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
    className = ""
}) => {
    const { theme } = useTheme();
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const dropdownRef = useRef(null);

    const selectedOption = options.find(opt =>
        (typeof opt === 'object' ? opt[valueKey] : opt) === value
    );
    const displayValue = selectedOption
        ? (typeof selectedOption === 'object' ? selectedOption[labelKey] : selectedOption)
        : "";

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredOptions = options.filter(opt => {
        const label = typeof opt === 'object' ? opt[labelKey] : String(opt);
        return label?.toString().toLowerCase().includes(searchTerm.toLowerCase());
    });

    const handleSelect = (opt) => {
        const val = typeof opt === 'object' ? opt[valueKey] : opt;
        onChange(val, opt);
        setIsOpen(false);
        setSearchTerm("");
    };

    return (
        <div className={`relative ${className}`} ref={dropdownRef}>
            <div
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full px-4 py-3 flex items-center justify-between cursor-pointer border-2 rounded-2xl outline-none transition-all font-bold ${isOpen ? 'border-indigo-500' : 'border-transparent'} ${theme.inputBg} ${theme.textPrimary}`}
                tabIndex={0}
            >
                <span className={displayValue ? '' : theme.textSecondary}>
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

            {isOpen && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 z-50 overflow-hidden divide-y divide-gray-50 dark:divide-gray-700 animate-in slide-in-from-top-2 duration-200">
                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 pointer-events-auto">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                            <input
                                autoFocus
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder={searchPlaceholder}
                                className={`w-full pl-9 pr-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:border-indigo-500 transition-all font-medium ${theme.textPrimary}`}
                                onClick={(e) => e.stopPropagation()}
                            />
                        </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                        {filteredOptions.length > 0 ? (
                            filteredOptions.map((opt, idx) => {
                                const optVal = typeof opt === 'object' ? opt[valueKey] : opt;
                                const isSelected = optVal === value;
                                return (
                                    <button
                                        key={optVal || idx}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className="w-full p-4 text-left hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center justify-between group transition-colors"
                                    >
                                        <div className="flex-1">
                                            {renderOption ? (
                                                renderOption(opt)
                                            ) : (
                                                <div className={`font-black ${theme.textPrimary}`}>
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
                            <div className="p-4 text-center text-gray-400 font-bold text-xs uppercase">
                                No results found
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CommonSelect;
