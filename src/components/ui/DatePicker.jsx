import React, { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, X } from "lucide-react";
import { useTheme } from "../../context/ThemeContext";

const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
];

const DAYS_SHORT = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const DatePicker = ({
    value,
    onChange,
    placeholder = "Select Date",
    disabled = false,
    className = "",
    minDate = null,
    maxDate = null
}) => {
    // value should be in "YYYY-MM-DD" format if passed
    const [isOpen, setIsOpen] = useState(false);

    // Parse initial date
    const initialDate = value ? new Date(value) : null;

    const [currentMonth, setCurrentMonth] = useState(initialDate ? initialDate.getMonth() : new Date().getMonth());
    const [currentYear, setCurrentYear] = useState(initialDate ? initialDate.getFullYear() : new Date().getFullYear());
    const [pickerMode, setPickerMode] = useState("date"); // 'date', 'month', 'year'

    const { theme } = useTheme();

    const containerRef = useRef(null);

    useEffect(() => {
        if (value) {
            const d = new Date(value);
            if (!isNaN(d.getTime())) {
                setCurrentMonth(d.getMonth());
                setCurrentYear(d.getFullYear());
            }
        }
    }, [value]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
                setPickerMode("date");
            }
        };

        if (isOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [isOpen]);

    const getDaysInMonth = (month, year) => {
        return new Date(year, month + 1, 0).getDate();
    };

    const getFirstDayOfMonth = (month, year) => {
        return new Date(year, month, 1).getDay();
    };

    const handleDateSelect = (day) => {
        const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        onChange(dateStr);
        setIsOpen(false);
    };

    const handleClear = (e) => {
        e.stopPropagation();
        onChange("");
        setIsOpen(false);
    };

    const handleToday = () => {
        const today = new Date();
        const dateStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        onChange(dateStr);
        setCurrentMonth(today.getMonth());
        setCurrentYear(today.getFullYear());
        setIsOpen(false);
    };

    const prevMonth = () => {
        if (currentMonth === 0) {
            setCurrentMonth(11);
            setCurrentYear(currentYear - 1);
        } else {
            setCurrentMonth(currentMonth - 1);
        }
    };

    const nextMonth = () => {
        if (currentMonth === 11) {
            setCurrentMonth(0);
            setCurrentYear(currentYear + 1);
        } else {
            setCurrentMonth(currentMonth + 1);
        }
    };

    const renderDays = () => {
        const daysInMonth = getDaysInMonth(currentMonth, currentYear);
        const firstDay = getFirstDayOfMonth(currentMonth, currentYear);
        const days = [];

        // Empty cells for previous month
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-8 h-8"></div>);
        }

        const selectedDate = value ? new Date(value) : null;
        const today = new Date();

        // Days of current month
        for (let i = 1; i <= daysInMonth; i++) {
            const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
            const isSelected = selectedDate &&
                selectedDate.getDate() === i &&
                selectedDate.getMonth() === currentMonth &&
                selectedDate.getFullYear() === currentYear;
            const isToday = today.getDate() === i &&
                today.getMonth() === currentMonth &&
                today.getFullYear() === currentYear;

            // Optional min/max constraints check here...
            const d = new Date(currentYear, currentMonth, i);
            const isMinDisabled = minDate && d < new Date(minDate);
            const isMaxDisabled = maxDate && d > new Date(maxDate);
            const isDisabledDay = isMinDisabled || isMaxDisabled;

            days.push(
                <button
                    key={`day-${i}`}
                    type="button"
                    disabled={isDisabledDay}
                    onClick={() => handleDateSelect(i)}
                    className={`
                        w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
                        ${isDisabledDay ? `${theme.textMuted} opacity-50 cursor-not-allowed` : 'cursor-pointer'}
                        ${isSelected ? 'bg-indigo-600 text-white shadow-md' :
                            isToday ? 'bg-indigo-50 text-indigo-600' :
                                !isDisabledDay ? `${theme.textPrimary} hover:${theme.inputBg}` : ''}
                    `}
                >
                    {i}
                </button>
            );
        }

        return days;
    };

    const renderMonths = () => {
        return (
            <div className="grid grid-cols-3 gap-2 p-2">
                {MONTHS.map((month, idx) => (
                    <button
                        key={month}
                        type="button"
                        onClick={() => {
                            setCurrentMonth(idx);
                            setPickerMode("date");
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-colors ${currentMonth === idx ? 'bg-indigo-600 text-white shadow-md' : `${theme.textPrimary} hover:${theme.inputBg}`
                            }`}
                    >
                        {month.substring(0, 3)}
                    </button>
                ))}
            </div>
        );
    };

    const renderYears = () => {
        // Show 12 years centered around currentYear
        const startYear = currentYear - 5;
        const years = Array.from({ length: 12 }, (_, i) => startYear + i);

        return (
            <div className="grid grid-cols-3 gap-2 p-2 h-48 overflow-y-auto">
                {years.map((year) => (
                    <button
                        key={year}
                        type="button"
                        onClick={() => {
                            setCurrentYear(year);
                            setPickerMode("date");
                        }}
                        className={`p-2 rounded-xl text-xs font-bold transition-colors ${currentYear === year ? 'bg-indigo-600 text-white shadow-md' : `${theme.textPrimary} hover:${theme.inputBg}`
                            }`}
                    >
                        {year}
                    </button>
                ))}
            </div>
        );
    };

    const displayDate = () => {
        if (!value) return "";
        const d = new Date(value);
        if (isNaN(d.getTime())) return "";
        return `${String(d.getDate()).padStart(2, '0')}-${String(d.getMonth() + 1).padStart(2, '0')}-${d.getFullYear()}`;
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                className={`
                    w-full flex items-center justify-between transition-all cursor-pointer group 
                    ${className || `px-4 py-3 border-2 rounded-2xl ${theme.inputBg} ${theme.borderLight} hover:border-indigo-400`}
                    ${disabled ? 'opacity-50 cursor-not-allowed border-gray-100' : ''}
                    ${isOpen ? 'border-indigo-500 shadow-indigo-100 shadow-lg' : ''}
                `}
                onClick={() => !disabled && setIsOpen(!isOpen)}
            >
                <div className="flex items-center gap-3 overflow-hidden">
                    <CalendarIcon size={18} className={isOpen ? 'text-indigo-600' : 'text-gray-400 group-hover:text-indigo-500 transition-colors'} />
                    <span className={`font-bold truncate text-sm mt-0.5 ${value ? theme.textPrimary : 'text-gray-400'}`}>
                        {displayDate() || placeholder}
                    </span>
                </div>
                {value && !disabled && (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="p-1 rounded-full text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors z-10"
                    >
                        <X size={14} />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className={`absolute top-full left-0 mt-2 ${theme.surfaceBg} rounded-3xl shadow-2xl border ${theme.borderLight} z-50 w-72 p-4 animate-in fade-in slide-in-from-top-2 duration-200`}>
                    {/* Header */}
                    <div className="flex items-center justify-between mb-4 px-1">
                        <button
                            type="button"
                            onClick={prevMonth}
                            className={`p-1.5 rounded-full hover:${theme.inputBg} text-gray-500 hover:${theme.textPrimary} transition-colors`}
                        >
                            <ChevronLeft size={16} />
                        </button>

                        <div className={`flex gap-1 font-black text-sm ${theme.textPrimary}`}>
                            <button
                                type="button"
                                onClick={() => setPickerMode(pickerMode === "month" ? "date" : "month")}
                                className="hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                            >
                                {MONTHS[currentMonth]}
                            </button>
                            <button
                                type="button"
                                onClick={() => setPickerMode(pickerMode === "year" ? "date" : "year")}
                                className="hover:bg-gray-100 px-2 py-1 rounded-lg transition-colors"
                            >
                                {currentYear}
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={nextMonth}
                            className={`p-1.5 rounded-full hover:${theme.inputBg} text-gray-500 hover:${theme.textPrimary} transition-colors`}
                        >
                            <ChevronRight size={16} />
                        </button>
                    </div>

                    {/* View Modes */}
                    {pickerMode === "date" && (
                        <>
                            {/* Days Header */}
                            <div className="grid grid-cols-7 gap-1 mb-2">
                                {DAYS_SHORT.map(day => (
                                    <div key={day} className={`h-8 flex items-center justify-center text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>
                                        {day}
                                    </div>
                                ))}
                            </div>

                            {/* Days Grid */}
                            <div className="grid grid-cols-7 gap-1">
                                {renderDays()}
                            </div>
                        </>
                    )}

                    {pickerMode === "month" && renderMonths()}
                    {pickerMode === "year" && renderYears()}

                    {/* Footer shortcuts */}
                    {pickerMode === "date" && (
                        <div className={`mt-4 pt-3 border-t ${theme.borderLight} flex justify-between`}>
                            <button
                                type="button"
                                onClick={handleClear}
                                className={`text-xs font-bold ${theme.textMuted} hover:${theme.textPrimary} transition-colors px-2 py-1`}
                            >
                                Clear
                            </button>
                            <button
                                type="button"
                                onClick={handleToday}
                                className="text-xs font-bold text-indigo-600 hover:text-indigo-800 transition-colors px-2 py-1"
                            >
                                Today
                            </button>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default DatePicker;
