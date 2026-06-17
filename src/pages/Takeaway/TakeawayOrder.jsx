import React, { useEffect, useState, useRef, useCallback, useMemo } from "react";
import {
    Menu as MenuIcon,
    ShoppingCart,
    Search,
    X,
    Printer,
    Check,
    Utensils,
    Plus,
    Minus,
    Edit3,
    LayoutGrid,
    List as ListIcon,
    Loader2,
    Info,
    Mic,
    MicOff,
    ArrowUpDown,
    Flame,
} from "lucide-react";
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition';
import FoodItemCard from "../../components/FoodItemCard";
import { useApp } from "../../context/AppContext";
import { itemService, customerService, api } from "../../services/api";
import { DEFAULT_ITEM_IMAGE, getBingImage } from "../../utils/getImage";
import { useTheme } from "../../context/ThemeContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useOrder } from "../../context/OrderContext";
import { useTakeaway } from "./TakeawayContext";
import { toast } from "react-hot-toast";
import {
    applyCartStockToMenu,
    buildBaseStockMap,
    canAddToCart,
    collectOpenCartItems,
} from "../../utils/cartStockUtils";

const TakeawayOrder = ({
    isTakeaway,
    activeTableId,
    tables,
    takeawayOrder,
    formatCurrency,
    calculateTotal,
    calculateItemTotal,
    calculateBillDetails,
    handlePrintReceipt,
    handleSendToKOT,
    setIsPaymentModalOpen,
    setBillingStage,
    initiateAddItem,
    updateItemQuantity,
    updateItemUnit,
    openNoteModal,
    takeawayCustName,
    setTakeawayCustName,
    takeawayCustPhone,
    setTakeawayCustPhone,
    orderSearch,
    setOrderSearch,
    setIsTakeaway,
    setView,
    settings,
    hasPermission,
    hasPermissionFor = () => false,
    currentUser,
    menu,
    setMenu,
    offers = [],
}) => {
    const { theme, themeName } = useTheme();
    const { activeBranchId } = useApp();
    const {
        isExchange, setIsExchange, exchangeCredit, setExchangeCredit,
        setOriginalOrderId, setReturnedItems,
        resetExchange, billDiscount, setBillDiscount, dismissOffer
    } = useOrder();
    const {
        selectedCustomer, setSelectedCustomer,
        resetTakeaway, tabs, activeTabId,
    } = useTakeaway();

    const location = useLocation();
    const navigate = useNavigate();
    const initRef = useRef(false);
    const scanBufferRef = useRef("");
    const lastScanKeyTimeRef = useRef(Date.now());

    // --- Voice Recognition Logic ---
    const { transcript, listening, resetTranscript, browserSupportsSpeechRecognition } = useSpeechRecognition();
    const [isProcessingVoice, setIsProcessingVoice] = useState(false);

    const startListening = () => {
        resetTranscript();
        SpeechRecognition.startListening({ continuous: true, language: 'en-IN' });
    };

    const stopListening = async () => {
        SpeechRecognition.stopListening();
        if (!transcript) return;

        setIsProcessingVoice(true);
        try {
            const res = await api.post('/items/voice-search', {
                text: transcript,
                branchId: activeBranchId,
                shopId: currentUser?.shopId || currentUser?.shop_id
            });

            const data = res.data;
            if (data.product) {
                handleInitiateAddItem(data.product, data.quantity || 1);
                toast.success(`Voice added: ${data.quantity || 1} ${data.product.name}`);
            } else {
                toast.error("Could not find matching product from voice input.");
            }
        } catch (error) {
            console.error("Voice processing error:", error);
            toast.error("Failed to process voice input.");
        } finally {
            setIsProcessingVoice(false);
            resetTranscript();
            setOrderSearch(""); // Clear the search bar
        }
    };

    // Live visual feedback: show what is being spoken in the search bar
    useEffect(() => {
        if (listening && transcript) {
            setOrderSearch(transcript);
        }
    }, [transcript, listening, setOrderSearch]);
    // --------------------------------

    // Effect to initialize exchange state from navigation state (fallback/initial)
    useEffect(() => {
        if (location.state?.isExchange && !initRef.current) {
            initRef.current = true;
            // Reset existing takeaway state for a clean exchange order
            resetTakeaway();
            
            setIsExchange(true);
            setExchangeCredit(location.state.creditAmount || 0);
            setOriginalOrderId(location.state.originalOrderId);
            if (location.state.returnedItems) {
                setReturnedItems(location.state.returnedItems);
            }
            if (location.state.customer) {
                setTakeawayCustName(location.state.customer?.name || "");
                setTakeawayCustPhone(location.state.customer?.phone || "");
            }

            // Clear the state from location to prevent re-initialization on re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state, setIsExchange, setExchangeCredit, setOriginalOrderId, setReturnedItems, setTakeawayCustName, setTakeawayCustPhone, resetTakeaway, navigate, location.pathname]);

    const isWholesale = takeawayOrder?.orderType === "WHOLESALE";
    const isDirectSale = takeawayOrder?.orderType === "DIRECT_SALE";

    // derives heading from orderType or context

    const orderTypeLabels = {
        'DINE_IN': 'Dine-in Order',
        'TAKEAWAY': 'Takeaway Order',
        'ONLINE_ORDER': 'Online Order',
        'DIRECT_SALE': 'Direct Sale',
        'WHOLESALE': 'Wholesale Order',
    };

    const [activeMenuCategory, setActiveMenuCategory] = useState("All");
    const [mobileOrderTab, setMobileOrderTab] = useState("menu");
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"
    const [isSearchingRemote, setIsSearchingRemote] = useState(false);
    const [remoteMenu, setRemoteMenu] = useState(null); // null → use local menu
    const [localMenu, setLocalMenu] = useState([]);
    const [baseStockMap, setBaseStockMap] = useState({});
    const [isMenuLoading, setIsMenuLoading] = useState(false);
    const [activeOfferTip, setActiveOfferTip] = useState(null);

    // Sort state: 'popular' | 'name' | 'stock'
    const [sortMode, setSortMode] = useState('popular');
    // Map of itemId -> totalOrdered
    const [popularityMap, setPopularityMap] = useState({}); // { x: number, y: number, offer: any }

    const fetchMenu = React.useCallback(async () => {
        setIsMenuLoading(true);
        try {
            const payload = {
                page: 1,
                limit: 1000, // Fetch all for POS
                filters: {
                    shopId: currentUser?.shopId || currentUser?.shop_id,
                    branchId: activeBranchId || null,
                    isActive: true,
                },
            };
            const response = await itemService.getItems(payload);
            const items = (response?.data || []).filter(item => item.isSellable !== false);
            const mapped = items.map((item) => ({
                ...item,
                id: item._id || item.id,
                price: item.pricing?.sellingPrice ?? item.price ?? 0,
                pricePerUnit: item.pricing?.sellingPrice ?? item.price ?? 0,
                sellingPrice: item.pricing?.sellingPrice ?? item.price ?? 0,
                category: item.categoryId?.name || item.category || "Others",
                unitName: item.unitId?.name || item.unitName || "Unit",
                sellingType: item.weightBased
                    ? "Weight"
                    : item.sellingType || "Standard",
                unitId: item.unitId,
                secondaryUnitId: item.secondaryUnitId,
                secondaryUnitName: item.secondaryUnitId?.name || "",
                conversionFactor: item.conversionFactor || 1,
                selectedUnit: item.defaultSalesUnit || "PRIMARY",
                quantityOnHand: item.quantityOnHand ?? 0,
            }));
            setLocalMenu(mapped);
            setBaseStockMap(buildBaseStockMap(mapped));
            if (setMenu) setMenu(mapped); // Sync with global if provided
        } catch (err) {
            console.error("Failed to fetch fresh menu:", err);
        } finally {
            setIsMenuLoading(false);
        }
    }, [currentUser?.shop_id, activeBranchId, setMenu]);

    useEffect(() => {
        fetchMenu();
    }, [fetchMenu]);

    // Fetch popularity data
    useEffect(() => {
        const shopId = currentUser?.shopId || currentUser?.shop_id;
        if (!shopId) return;
        itemService.getPopularItems({ shopId, branchId: activeBranchId || undefined, limit: 30 })
            .then(data => {
                const map = {};
                (data || []).forEach(p => { map[p.itemId] = p.totalOrdered; });
                setPopularityMap(map);
            })
            .catch(() => {});
    }, [currentUser?.shopId, currentUser?.shop_id, activeBranchId]);

    const [customerSearchResults, setCustomerSearchResults] = useState([]);
    const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
    const [custSearchTerm, setCustSearchTerm] = useState("");
    const custSearchRef = useRef(null);

    // New customer dialog state
    const [showNewCustDialog, setShowNewCustDialog] = useState(false);
    const [newCustForm, setNewCustForm] = useState({ name: "", phone: "", email: "" });
    const [savingNewCust, setSavingNewCust] = useState(false);

    // Discount UI state
    const [discountInputType, setDiscountInputType] = useState("flat"); // 'flat' | 'percent'
    const [discountInputValue, setDiscountInputValue] = useState("");

    const handleCustomerSearch = async (term, type) => {
        if (!term || term.length < 2) {
            setCustomerSearchResults([]);
            return;
        }

        try {
            const params = {
                branchId: activeBranchId,
                search: term
            };
            const response = await customerService.getCustomers(params);
            // getCustomers returns { data: [...], pagination: {...} }
            const results = response?.data || (Array.isArray(response) ? response : []);
            setCustomerSearchResults(results);
            setShowCustomerDropdown(true);
        } catch (err) {
            console.error("Customer search failed:", err);
        }
    };

    const selectCustomer = (customer) => {
        setTakeawayCustName(customer?.name || "");
        setTakeawayCustPhone(customer.phone);
        setCustSearchTerm(customer.name || customer.phone || "");
        setSelectedCustomer(customer);
        setShowCustomerDropdown(false);
        setCustomerSearchResults([]);

        // Auto-apply discount if it exists
        if (customer.discountPercentage > 0) {
            setBillDiscount({ type: 'percent', value: customer.discountPercentage });
            setDiscountInputType('percent');
            setDiscountInputValue(String(customer.discountPercentage));
        } else {
            setBillDiscount({ type: 'flat', value: 0 });
            setDiscountInputValue("");
        }
    };

    const handleSaveNewCustomer = async (e) => {
        e.preventDefault();
        if (!newCustForm.name && !newCustForm.phone) return;
        setSavingNewCust(true);
        try {
            const created = await customerService.createCustomer({
                name: newCustForm.name,
                phone: newCustForm.phone,
                email: newCustForm.email || undefined,
                branchId: activeBranchId,
                status: 'ACTIVE'
            });
            selectCustomer(created);
            setShowNewCustDialog(false);
            setNewCustForm({ name: "", phone: "", email: "" });
            toast.success("Customer added and selected");
        } catch (err) {
            toast.error(err?.message || "Failed to create customer");
        } finally {
            setSavingNewCust(false);
        }
    };

    const applyDiscount = (type, raw) => {
        const val = parseFloat(raw) || 0;
        setDiscountInputType(type);
        setDiscountInputValue(raw);
        setBillDiscount({ type, value: val });
    };

    // Debounced AI/Backend search
    useEffect(() => {
        const term = (orderSearch || "").trim();

        // If search cleared or too short, go back to local menu
        if (term.length < 2) {
            setRemoteMenu(null);
            setIsSearchingRemote(false);
            return;
        }

        let cancelled = false;
        setIsSearchingRemote(true);

        const handle = setTimeout(async () => {
            try {
                const payload = {
                    page: 1,
                    limit: 200,
                    search: term,
                    filters: {
                        shopId: currentUser?.shop_id,
                        branchId: activeBranchId || null,
                        isActive: true, // Should probably always be true in search too
                    },
                };

                const response = await itemService.getItems(payload);
                if (cancelled) return;

                const items = (response?.data || []).filter(item => item.isSellable !== false);

                const mapped = items.map((item) => ({
                    ...item,
                    id: item._id || item.id,
                    price: item.pricing?.sellingPrice ?? item.price ?? 0,
                    pricePerUnit: item.pricing?.sellingPrice ?? item.price ?? 0,
                    sellingPrice: item.pricing?.sellingPrice ?? item.price ?? 0,
                    category: item.categoryId?.name || item.category || "Others",
                    unitName: item.unitId?.name || item.unitName || "Unit",
                    sellingType: item.weightBased
                        ? "Weight"
                        : item.sellingType || "Standard",
                    unitId: item.unitId,
                    secondaryUnitId: item.secondaryUnitId,
                    secondaryUnitName: item.secondaryUnitId?.name || "",
                    conversionFactor: item.conversionFactor || 1,
                    selectedUnit: item.defaultSalesUnit || "PRIMARY",
                    quantityOnHand: item.quantityOnHand ?? 0,
                }));

                setRemoteMenu(mapped);
                setBaseStockMap((prev) => ({ ...prev, ...buildBaseStockMap(mapped) }));
            } catch (err) {
                console.error("Failed to AI-search menu:", err);
                setRemoteMenu(null);
            } finally {
                if (!cancelled) setIsSearchingRemote(false);
            }
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(handle);
        };
    }, [orderSearch, currentUser?.shop_id, activeBranchId]);

    const activeMenu = remoteMenu || localMenu || menu || [];

    const currentOrder = useMemo(() => (
        isTakeaway
            ? takeawayOrder
            : tables.find((t) => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId))?.order || { items: [] }
    ), [isTakeaway, takeawayOrder, tables, activeTableId]);

    const allCartItems = useMemo(() => collectOpenCartItems({
        currentOrderItems: currentOrder?.items || [],
        isTakeaway,
        tabs,
        activeTabId,
        tables,
        activeTableId,
    }), [currentOrder?.items, isTakeaway, tabs, activeTabId, tables, activeTableId]);

    const displayMenu = useMemo(
        () => applyCartStockToMenu(activeMenu, allCartItems, baseStockMap),
        [activeMenu, allCartItems, baseStockMap],
    );

    const handleInitiateAddItem = useCallback((menuItem, quantity = 1) => {
        if (!canAddToCart(menuItem, allCartItems, baseStockMap, quantity)) {
            toast.error(`Insufficient stock for ${menuItem.name}`);
            return;
        }
        initiateAddItem(menuItem, quantity);
    }, [allCartItems, baseStockMap, initiateAddItem]);

    const handleUpdateItemQuantity = useCallback((itemIndex, delta) => {
        if (delta > 0) {
            const item = currentOrder?.items?.[itemIndex];
            if (item && !canAddToCart(item, allCartItems, baseStockMap, delta)) {
                toast.error(`Insufficient stock for ${item.name}`);
                return;
            }
        }
        updateItemQuantity(itemIndex, delta);
    }, [allCartItems, baseStockMap, currentOrder?.items, updateItemQuantity]);

    // Global Barcode Listener for POS
    const handleBarcodeSearch = useCallback(async (code) => {
        if (!code) return;
        
        const cleanCode = String(code).trim().toLowerCase();
        
        // 1. Search in local active menu first
        const found = displayMenu.find(it => 
            (it.itemCode && String(it.itemCode).toLowerCase() === cleanCode) || 
            (it.barcode && String(it.barcode).toLowerCase() === cleanCode)
        );

        if (found) {
            handleInitiateAddItem(found);
            toast.success(`Added ${found.name} to cart`, {
                icon: '🛒',
                duration: 2000,
                style: {
                    borderRadius: '12px',
                    background: '#333',
                    color: '#fff',
                    fontWeight: '900',
                    textTransform: 'uppercase',
                    fontSize: '12px'
                },
            });
            return;
        }

        // 2. Fallback: Search via API (maybe item is not in local menu yet)
        try {
            const response = await itemService.getItems({
                limit: 1,
                filters: {
                    shopId: currentUser?.shopId || currentUser?.shop_id,
                    branchId: activeBranchId || undefined,
                    $or: [
                        { itemCode: code },
                        { barcode: code }
                    ]
                }
            });
            const itemsList = response.data || response.items || response;
            const itemsArray = Array.isArray(itemsList) ? itemsList : (itemsList.data ? itemsList.data : []);
            const foundRemote = itemsArray[0];

            if (foundRemote) {
                // Normalize for POS
                const normalizedItem = {
                    ...foundRemote,
                    id: foundRemote._id || foundRemote.id,
                    price: foundRemote.pricing?.sellingPrice ?? foundRemote.price ?? 0,
                    category: foundRemote.categoryId?.name || foundRemote.category || "Others",
                    unitName: foundRemote.unitId?.name || foundRemote.unitName || "Unit",
                    quantityOnHand: foundRemote.quantityOnHand ?? 0,
                    itemType: foundRemote.itemType,
                    stockSettings: foundRemote.stockSettings,
                };
                handleInitiateAddItem(normalizedItem);
                toast.success(`Added ${normalizedItem.name} to cart`, { icon: '🛒' });
            } else {
                toast.error(`Code "${code}" not found`);
            }
        } catch (error) {
            console.error("POS Barcode search failed:", error);
            toast.error(`Search failed for "${code}"`);
        }
    }, [displayMenu, handleInitiateAddItem, currentUser?.shop_id, activeBranchId]);

    useEffect(() => {
        const handleKeyDown = (e) => {
            const currentTime = Date.now();
            
            // If more than 50ms between keys, it's likely manual typing
            // Scanners usually pulse at 10-30ms
            if (currentTime - lastScanKeyTimeRef.current > 50) {
                scanBufferRef.current = "";
            }

            lastScanKeyTimeRef.current = currentTime;

            if (e.key === 'Enter' || e.key === 'Tab') {
                if (scanBufferRef.current.length >= 3) {
                    // Prevent default only if we have a valid buffer that looks like a barcode
                    // This prevents accidental submission of other forms
                    const code = scanBufferRef.current;
                    scanBufferRef.current = "";
                    e.preventDefault();
                    handleBarcodeSearch(code);
                } else {
                    scanBufferRef.current = "";
                }
            } else if (e.key.length === 1) {
                scanBufferRef.current += e.key;
            }
        };

        window.addEventListener('keydown', handleKeyDown, true); // Use capture phase to catch it early
        return () => window.removeEventListener('keydown', handleKeyDown, true);
    }, [handleBarcodeSearch]);

    // Derive categories dynamically from the menu prop (already normalized in AppContent)
    const categories = ["All", ...new Set(displayMenu.map((item) => item.category || "Others"))];

    const activeTable = !isTakeaway && activeTableId ? tables.find((t) => String(t.id) === String(activeTableId) || String(t._id) === String(activeTableId)) : null;
    const displayTitle = activeTable
        ? (activeTable.name || `Table ${activeTable.tableNumber}`)
        : orderTypeLabels[currentOrder.orderType] || "POS Order";

    const isSentToKOT = currentOrder.isSentToKOT;
    const hasPendingKitchenItems = (currentOrder.items || []).some((item) => {
        const previouslySent = item.sentQuantity || 0;
        return (item.quantity || 0) - previouslySent > 0;
    });

    const billDetails = calculateBillDetails(
        currentOrder.items,
        billDiscount,
        settings?.defaultTaxPercent || 0,
        false,
        isTakeaway ? exchangeCredit : 0
    );

    return (
        <div className={`flex flex-col h-full overflow-hidden ${theme.pageBg}`}>
            {/* Mobile/Tablet Tab Switcher — visible below xl */}
            <div className={`xl:hidden flex p-2 ${theme.surfaceBg} border-b ${theme.borderLight} gap-2 shrink-0`}>
                <button
                    onClick={() => setMobileOrderTab("menu")}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${mobileOrderTab === "menu" ? "bg-indigo-600 text-white" : `${theme.sectionBg} ${theme.textMuted}`
                        }`}
                >
                    <MenuIcon size={16} /> Menu
                </button>
                <button
                    onClick={() => setMobileOrderTab("cart")}
                    className={`flex-1 py-2 rounded-lg font-bold text-sm flex items-center justify-center gap-2 ${mobileOrderTab === "cart" ? "bg-indigo-600 text-white" : `${theme.sectionBg} ${theme.textMuted}`
                        }`}
                >
                    <ShoppingCart size={16} /> Cart
                    {currentOrder.items.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center ml-1">
                            {currentOrder.items.length}
                        </span>
                    )}
                </button>
            </div>

            <div className="flex-1 flex flex-col xl:flex-row overflow-hidden">
                {/* Menu Section */}
                <div
                    className={`flex-1 ${theme.pageBg} flex flex-col min-h-0 ${mobileOrderTab === "cart" ? "hidden xl:flex" : "flex"
                        }`}
                >
                    {/* On small screens: entire section scrolls. On xl+: only grid scrolls */}
                    <div className="flex flex-col flex-1 min-h-0 overflow-y-auto xl:overflow-hidden custom-scrollbar p-2 sm:p-4">
                    {/* Breadcrumb — only shown for table orders */}
                    {!isTakeaway && (
                        <button
                            onClick={() => {
                                setIsTakeaway(false);
                                setView("tables");
                                navigate("/dininghall");
                            }}
                            className={`flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest mb-3 transition-colors hover:opacity-70 ${theme.textMuted} w-fit`}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
                            Dining Hall
                        </button>
                    )}
                    <div className="flex justify-between items-center mb-2 sm:mb-6">
                        <h2 className={`text-lg sm:text-xl md:text-2xl font-black ${theme.textHeading}`}>
                            {displayTitle}
                        </h2>
                            <button
                                onClick={() => {
                                    setIsTakeaway(false);
                                    setView("tables");
                                }}
                                className={`p-2 ${theme.surfaceBg} rounded-full shadow-sm ${theme.textPrimary}`}
                            >
                                <X />
                            </button>
                    </div>

                    {isTakeaway && (
                        <div className="mb-2 sm:mb-4 relative">
                            {/* Single unified customer search */}
                            <div className="relative" ref={custSearchRef}>
                                {selectedCustomer ? (
                                    <div className={`flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border ${theme.borderLight} ${theme.inputBg}`}>
                                        <div className="min-w-0">
                                            <span className={`font-black text-sm ${theme.textPrimary}`}>{selectedCustomer.name || selectedCustomer.phone}</span>
                                            {selectedCustomer.phone && <span className={`text-xs ml-2 ${theme.textMuted}`}>{selectedCustomer.phone}</span>}
                                        </div>
                                        <button
                                            onClick={() => {
                                                setSelectedCustomer(null);
                                                setTakeawayCustName("");
                                                setTakeawayCustPhone("");
                                                setCustSearchTerm("");
                                                setBillDiscount({ type: 'flat', value: 0 });
                                                setDiscountInputValue("");
                                            }}
                                            className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                        >
                                            <X size={16} />
                                        </button>
                                    </div>
                                ) : (
                                    <div className="relative">
                                        <Search className={`absolute left-3 top-1/2 -translate-y-1/2 ${theme.textMuted}`} size={15} />
                                        <input
                                            value={custSearchTerm}
                                            onChange={(e) => {
                                                const v = e.target.value;
                                                setCustSearchTerm(v);
                                                setTakeawayCustName(v);
                                                handleCustomerSearch(v, "name");
                                            }}
                                            onFocus={() => { if (custSearchTerm.length >= 2) setShowCustomerDropdown(true); }}
                                            onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                                            placeholder="Search customer by name or phone…"
                                            className={`w-full pl-9 pr-4 py-2.5 border ${theme.borderLight} rounded-xl outline-none text-sm ${theme.inputBg} ${theme.textPrimary}`}
                                        />
                                    </div>
                                )}

                                {/* Dropdown results */}
                                {showCustomerDropdown && !selectedCustomer && (
                                    <div className={`absolute top-full left-0 right-0 mt-1 ${theme.surfaceBg} border ${theme.borderLight} rounded-xl shadow-xl z-[60] overflow-hidden`}>
                                        {customerSearchResults.length > 0 ? (
                                            <div className="max-h-52 overflow-y-auto">
                                                {customerSearchResults.map(cust => (
                                                    <div
                                                        key={cust._id}
                                                        onMouseDown={() => selectCustomer(cust)}
                                                        className={`p-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 cursor-pointer border-b ${theme.borderLight} last:border-0 flex items-center justify-between`}
                                                    >
                                                        <div>
                                                            <div className={`font-bold text-sm ${theme.textPrimary}`}>{cust.name}</div>
                                                            <div className={`text-xs ${theme.textMuted}`}>
                                                                {cust.phone}
                                                                {cust.discountPercentage > 0 && <span className="text-emerald-600 ml-2">· {cust.discountPercentage}% disc</span>}
                                                            </div>
                                                        </div>
                                                        <Check size={14} className="text-indigo-500 opacity-0 group-hover:opacity-100" />
                                                    </div>
                                                ))}
                                            </div>
                                        ) : custSearchTerm.length >= 2 ? (
                                            <div className="p-3">
                                                <p className={`text-xs font-bold ${theme.textMuted} mb-2`}>No customer found for "{custSearchTerm}"</p>
                                                <button
                                                    onMouseDown={() => {
                                                        const isPhone = /^\d+$/.test(custSearchTerm.trim());
                                                        setNewCustForm({
                                                            name: isPhone ? "" : custSearchTerm,
                                                            phone: isPhone ? custSearchTerm : "",
                                                            email: ""
                                                        });
                                                        setShowCustomerDropdown(false);
                                                        setShowNewCustDialog(true);
                                                    }}
                                                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 text-xs font-black hover:bg-indigo-100 transition-colors"
                                                >
                                                    <Plus size={14} /> Add "{custSearchTerm}" as new customer
                                                </button>
                                            </div>
                                        ) : null}
                                    </div>
                                )}
                            </div>

                            {/* New Customer Dialog */}
                            {showNewCustDialog && (
                                <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                                    <div className={`w-full max-w-md rounded-3xl shadow-2xl ${theme.surfaceBg} border ${theme.borderLight}`}>
                                        <div className={`p-5 border-b ${theme.borderLight} flex items-center justify-between`}>
                                            <h3 className={`text-lg font-black ${theme.textHeading} flex items-center gap-2`}>
                                                <Plus size={18} className="text-indigo-600" /> Add New Customer
                                            </h3>
                                            <button onClick={() => setShowNewCustDialog(false)} className={`p-1.5 rounded-full ${theme.textMuted} hover:bg-gray-100 dark:hover:bg-gray-800`}><X size={18} /></button>
                                        </div>
                                        <form onSubmit={handleSaveNewCustomer} className="p-5 space-y-4">
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1`}>Name *</label>
                                                <input
                                                    required
                                                    value={newCustForm.name}
                                                    onChange={e => setNewCustForm(f => ({ ...f, name: e.target.value }))}
                                                    placeholder="Customer name"
                                                    className={`w-full p-3 rounded-xl border outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1`}>Phone *</label>
                                                <input
                                                    required
                                                    value={newCustForm.phone}
                                                    onChange={e => setNewCustForm(f => ({ ...f, phone: e.target.value }))}
                                                    placeholder="Phone number"
                                                    className={`w-full p-3 rounded-xl border outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            <div>
                                                <label className={`text-[10px] font-black uppercase tracking-widest ${theme.textMuted} block mb-1`}>Email</label>
                                                <input
                                                    type="email"
                                                    value={newCustForm.email}
                                                    onChange={e => setNewCustForm(f => ({ ...f, email: e.target.value }))}
                                                    placeholder="Optional"
                                                    className={`w-full p-3 rounded-xl border outline-none font-bold ${theme.inputBg} ${theme.borderLight} ${theme.textPrimary}`}
                                                />
                                            </div>
                                            <div className="flex gap-3 pt-2">
                                                <button type="button" onClick={() => setShowNewCustDialog(false)} className={`flex-1 py-2.5 rounded-xl font-bold text-sm ${theme.textSecondary} ${theme.inputBg}`}>Cancel</button>
                                                <button type="submit" disabled={savingNewCust} className="flex-[2] py-2.5 rounded-xl font-black text-sm bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60 flex items-center justify-center gap-2">
                                                    {savingNewCust && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                                                    Save & Select
                                                </button>
                                            </div>
                                        </form>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Search + view mode */}
                    <div className="flex items-center gap-2 sm:gap-3 mb-2 sm:mb-4">
                        <div className="relative flex-1">
                            <Search className={`absolute left-3 top-3 ${theme.textMuted}`} size={16} />
                            <input
                                value={orderSearch}
                                onChange={(e) => setOrderSearch(e.target.value)}
                                placeholder={listening ? "Listening..." : "Search menu..."}
                                className={`w-full pl-9 pr-9 p-2 sm:p-3 border ${theme.borderLight} rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-sm ${theme.inputBg} ${theme.textPrimary}`}
                            />
                            {isSearchingRemote && (
                                <Loader2 className="absolute right-3 top-3.5 h-4 w-4 text-indigo-500 animate-spin" />
                            )}
                            {!isSearchingRemote && orderSearch && (
                                <button
                                    type="button"
                                    onClick={() => setOrderSearch("")}
                                    className="absolute right-3 top-3 text-xs text-gray-400 hover:text-gray-600"
                                >
                                    Clear
                                </button>
                            )}
                        </div>

                        {/* Voice Billing Button */}
                        {browserSupportsSpeechRecognition && (
                            <button
                                type="button"
                                onClick={listening ? stopListening : startListening}
                                disabled={isProcessingVoice}
                                className={`p-2 sm:p-3 rounded-xl flex items-center justify-center transition-all shrink-0 ${
                                    listening 
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/30 animate-pulse' 
                                        : isProcessingVoice 
                                            ? 'bg-amber-500 text-white opacity-70' 
                                            : `bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-900/50`
                                }`}
                                title={listening ? "Click to process voice command" : "Start Voice Billing. E.g., '2 Pepsi', '1 Lays'"}
                            >
                                {isProcessingVoice ? <Loader2 size={20} className="animate-spin" /> : (listening ? <MicOff size={20} /> : <Mic size={20} />)}
                            </button>
                        )}

                        <div className={`inline-flex rounded-xl ${theme.surfaceBg} shadow-sm border ${theme.borderLight} overflow-hidden shrink-0`}>
                            <button
                                type="button"
                                onClick={() => setViewMode("grid")}
                                className={`px-2 sm:px-3 py-2 text-xs font-semibold flex items-center gap-1 ${viewMode === "grid"
                                    ? "bg-indigo-600 text-white"
                                    : `${theme.textMuted} hover:${theme.sectionBg}`
                                    }`}
                            >
                                <LayoutGrid size={14} />
                                <span className="hidden sm:inline">Grid</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setViewMode("list")}
                                className={`px-2 sm:px-3 py-2 text-xs font-semibold flex items-center gap-1 border-l ${theme.borderLight} ${viewMode === "list"
                                    ? "bg-indigo-600 text-white"
                                    : `${theme.textMuted} hover:${theme.sectionBg}`
                                    }`}
                            >
                                <ListIcon size={14} />
                                <span className="hidden sm:inline">List</span>
                            </button>
                        </div>

                        {/* Sort buttons */}
                        <div className={`inline-flex rounded-xl ${theme.surfaceBg} shadow-sm border ${theme.borderLight} overflow-hidden shrink-0`}>
                            {[
                                { key: 'popular', icon: <Flame size={13} />, label: 'Hot' },
                                { key: 'name',    icon: <ArrowUpDown size={13} />, label: 'Name' },
                                { key: 'stock',   icon: <ArrowUpDown size={13} />, label: 'Stock' },
                            ].map((s, i) => (
                                <button
                                    key={s.key}
                                    type="button"
                                    onClick={() => setSortMode(s.key)}
                                    className={`px-2 sm:px-3 py-2 text-xs font-semibold flex items-center gap-1 ${i > 0 ? `border-l ${theme.borderLight}` : ''} ${sortMode === s.key ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:${theme.sectionBg}`}`}
                                    title={`Sort by ${s.label}`}
                                >
                                    {s.icon}
                                    <span className="hidden sm:inline">{s.label}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex gap-1.5 sm:gap-2 overflow-x-auto pb-1 sm:pb-3 shrink-0 no-scrollbar">
                        {categories.map((cat) => {
                            const catCount = cat === "All"
                                ? activeMenu.length
                                : activeMenu.filter(i => i.category === cat).length;
                            return (
                                <button
                                    key={cat}
                                    onClick={() => setActiveMenuCategory(cat)}
                                    className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-full font-bold whitespace-nowrap transition-all border-2 text-xs sm:text-sm flex items-center gap-1.5 ${activeMenuCategory === cat
                                        ? "bg-indigo-600 border-indigo-600 text-white shadow-md"
                                        : `${theme.surfaceBg} ${theme.borderLight} ${theme.textMuted}`
                                        }`}
                                >
                                    {cat}
                                    <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${activeMenuCategory === cat ? 'bg-white/25 text-white' : `${theme.pageBg} ${theme.textSecondary}`}`}>
                                        {catCount}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    {/* Available item count bar */}
                    {!isMenuLoading && (() => {
                        const filtered = activeMenu.filter(i =>
                            activeMenuCategory === "All" || i.category === activeMenuCategory
                        );
                        const inStock = filtered.filter(i => (i.quantityOnHand ?? 1) > 0).length;
                        const outOfStock = filtered.length - inStock;
                        return (
                            <div className="flex items-center gap-3 text-[11px] font-black shrink-0">
                                <span className={`${theme.textSecondary}`}>
                                    <span className="text-indigo-500">{filtered.length}</span> items
                                </span>
                                {inStock > 0 && (
                                    <span className="flex items-center gap-1 text-emerald-500">
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                                        {inStock} in stock
                                    </span>
                                )}
                                {outOfStock > 0 && (
                                    <span className={`flex items-center gap-1 ${theme.textMuted}`}>
                                        <span className="w-1.5 h-1.5 rounded-full bg-gray-400 inline-block" />
                                        {outOfStock} out of stock
                                    </span>
                                )}
                            </div>
                        );
                    })()}

                    <div
                        className={`${viewMode === "grid"
                            ? "grid grid-cols-2 md:grid-cols-3 xl:grid-cols-3 2xl:grid-cols-4 gap-2 md:gap-3"
                            : "flex flex-col gap-2 md:gap-3"
                            } pr-1 xl:overflow-y-auto xl:flex-1 xl:min-h-0 custom-scrollbar mt-2 min-h-[320px] xl:min-h-0`}
                    >
                        {isMenuLoading ? (
                            <div className="col-span-full py-20 flex flex-col items-center justify-center gap-4">
                                <Loader2 className="h-10 w-10 text-indigo-500 animate-spin" />
                                <p className={`font-bold ${theme.textSecondary}`}>Refreshing Fresh Menu...</p>
                            </div>
                        ) : (
                            displayMenu
                                .filter((item) =>
                                    activeMenuCategory === "All" ||
                                    item.category === activeMenuCategory
                                )
                                .map(item => ({ ...item, _orderCount: popularityMap[item.id || item._id] || 0 }))
                                .sort((a, b) => {
                                    if (sortMode === 'popular') {
                                        // Primary: most ordered first; secondary: in-stock first
                                        if (b._orderCount !== a._orderCount) return b._orderCount - a._orderCount;
                                        const aStock = a.quantityOnHand > 0;
                                        const bStock = b.quantityOnHand > 0;
                                        if (aStock && !bStock) return -1;
                                        if (!aStock && bStock) return 1;
                                        return 0;
                                    }
                                    if (sortMode === 'name') return (a.name || '').localeCompare(b.name || '');
                                    if (sortMode === 'stock') {
                                        const aQ = a.quantityOnHand ?? 0;
                                        const bQ = b.quantityOnHand ?? 0;
                                        return bQ - aQ;
                                    }
                                    return 0;
                                })
                                .map((item) => {
                                    const isHot = item._orderCount > 0 && popularityMap[item.id || item._id] > 0;
                                    return (
                                        <div key={item.id} className="relative">
                                            {isHot && (
                                                <div className="absolute top-1.5 left-1.5 z-10 flex items-center gap-0.5 bg-orange-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full shadow-md pointer-events-none">
                                                    <Flame size={9} /> HOT
                                                </div>
                                            )}
                                            <FoodItemCard
                                                item={item}
                                                formatCurrency={formatCurrency}
                                                onSelect={(item) => handleInitiateAddItem(item)}
                                                viewMode={viewMode}
                                                disabled={false}
                                            />
                                        </div>
                                    );
                                })
                        )}
                    </div>
                    </div>{/* end scroll wrapper */}
                </div>

                {/* Cart Section */}
                <div
                    className={`w-full xl:w-[380px] 2xl:w-[440px] ${theme.surfaceBg} border-t xl:border-t-0 xl:border-l ${theme.borderLight} flex flex-col shrink-0 xl:h-full ${mobileOrderTab === "menu" ? "hidden xl:flex" : "flex h-full"
                        }`}
                >
                    <div className={`p-3 xl:p-6 border-b ${theme.borderLight} ${theme.surfaceBg} z-10 flex justify-between items-center`}>
                        <h3 className={`text-lg md:text-xl font-black ${theme.textPrimary}`}>Order Summary</h3>
                        <div className="flex items-center gap-2">
                            <button
                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-600"
                                title="Print Receipt"
                                onClick={handlePrintReceipt}
                            >
                                <Printer size={20} />
                            </button>
                            {isSentToKOT && (
                                <span className={`flex items-center gap-1 text-xs font-bold uppercase ${currentOrder.kotStatus === 'preparing' ? 'text-orange-500 animate-pulse' : 'text-green-600'}`}>
                                    {currentOrder.kotStatus === 'preparing' ? <Utensils size={14} /> : <Check size={14} />}
                                    {currentOrder.kotStatus === 'preparing' ? "Preparing..." : "KOT Ready"}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 overflow-y-auto p-3">
                        {currentOrder.items.length === 0 ? (
                            <div className="py-20 flex flex-col items-center justify-center text-gray-300 gap-2 border-2 border-dashed rounded-3xl m-2">
                                <Utensils size={32} />
                                <p className={`text-sm font-bold uppercase tracking-widest ${theme.textMuted}`}>Cart is empty</p>
                            </div>
                        ) : (
                            <div className={`divide-y ${theme.borderLight} border rounded-xl`}>
                                {currentOrder.items.map((item, idx) => (
                                    <div key={item.id + idx} className={`p-3 hover:${themeName === 'dark' ? 'bg-gray-800' : 'bg-gray-50'} transition-colors ${theme.surfaceBg}`}>
                                        <div className="flex justify-between items-start gap-2">
                                            <div className="flex gap-3 flex-1 min-w-0">
                                                <div className={`flex flex-col items-center ${theme.pageBg} rounded-xl p-1.5 h-fit shrink-0`}>
                                                    <button
                                                        onClick={() => handleUpdateItemQuantity(idx, 1)}
                                                        className={`p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors`}
                                                    >
                                                        <Plus size={18} />
                                                    </button>
                                                    <span className={`font-black text-base py-1 w-8 text-center ${theme.textPrimary}`}>
                                                        {item.sellingType === "Weight" && item.enteredUnit === "g"
                                                            ? `${parseFloat((item.quantity * 1000).toFixed(0))}`
                                                            : item.quantity}
                                                    </span>
                                                    <button
                                                        onClick={() => handleUpdateItemQuantity(idx, -1)}
                                                        className={`p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors`}
                                                    >
                                                        <Minus size={18} />
                                                    </button>
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex justify-between items-start">
                                                        <div className="flex items-start gap-2 min-w-0">
                                                            <img
                                                                src={getBingImage(item?.name, { w: 64, h: 64 })}
                                                                alt={item?.name || "Item"}
                                                                loading="lazy"
                                                                className={`w-10 h-10 rounded-lg object-cover ${theme.pageBg} border ${theme.borderLight} shrink-0`}
                                                                onError={(e) => {
                                                                    e.currentTarget.onerror = null;
                                                                    e.currentTarget.src = DEFAULT_ITEM_IMAGE;
                                                                }}
                                                            />
                                                            <span className={`font-bold text-sm ${theme.textPrimary} leading-tight truncate`}>
                                                                {item.name}
                                                                <span className={`ml-1 text-[10px] ${theme.textMuted} font-medium`}>
                                                                    ({(item.taxPercent !== undefined && item.taxPercent !== null) ? item.taxPercent : (settings?.defaultTaxPercent || 0)}%)
                                                                </span>
                                                            </span>
                                                        </div>
                                                        <span className={`font-bold text-sm ${theme.textPrimary} shrink-0 ml-2`}>
                                                            {formatCurrency(calculateItemTotal(item))}
                                                        </span>
                                                    </div>
                                                    {/* Unit Selector for multi-unit items */}
                                                    {(item.unitId && item.secondaryUnitId) && (
                                                        <div className="mt-1 flex items-center gap-2">
                                                            <div className={`flex rounded-lg border ${theme.borderLight} overflow-hidden text-[10px] font-black`}>
                                                                <button
                                                                    onClick={() => updateItemUnit(idx, "PRIMARY")}
                                                                    className={`px-2 py-0.5 ${item.selectedUnit !== "SECONDARY" ? "bg-indigo-600 text-white" : `${theme.surfaceBg} ${theme.textMuted}`}`}
                                                                >
                                                                    {item.unitName || "Pri"}
                                                                </button>
                                                                <button
                                                                    onClick={() => updateItemUnit(idx, "SECONDARY")}
                                                                    className={`px-2 py-0.5 border-l ${theme.borderLight} ${item.selectedUnit === "SECONDARY" ? "bg-indigo-600 text-white" : `${theme.surfaceBg} ${theme.textMuted}`}`}
                                                                >
                                                                    {item.secondaryUnitName || "Sec"}
                                                                </button>
                                                            </div>
                                                            <span className={`text-[9px] ${theme.textMuted}`}>
                                                                {item.selectedUnit === "SECONDARY" ? `1 ${item.secondaryUnitName} = ${item.conversionFactor} ${item.unitName}` : ""}
                                                            </span>
                                                        </div>
                                                    )}
                                                    {(() => {
                                                        const freeItemInfo = billDetails.freeItems?.find(fi => fi.itemId === (item.id || item._id));
                                                        const isOfferApplied = billDetails.appliedOfferItemIds?.includes(item.id || item._id);
                                                        
                                                        if (!item.selectedVariant && !isOfferApplied && !freeItemInfo) return null;

                                                        return (
                                                            <div className="mt-1 flex flex-wrap gap-1">
                                                                {item.selectedVariant && (
                                                                    <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">
                                                                        {item.selectedVariant.name}
                                                                    </span>
                                                                )}
                                                                
                                                                {freeItemInfo ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] bg-emerald-500 text-white px-1.5 py-0.5 rounded font-black uppercase tracking-tighter flex items-center gap-1 shadow-sm">
                                                                            <Plus size={10} strokeWidth={4} /> {freeItemInfo.quantity} FREE
                                                                        </span>
                                                                        <span className="text-[9px] text-emerald-600 font-bold uppercase truncate max-w-[120px]">
                                                                            {freeItemInfo.offerName}
                                                                        </span>
                                                                    </div>
                                                                ) : isOfferApplied ? (
                                                                    <div className="flex items-center gap-1">
                                                                        <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold uppercase tracking-wide flex items-center gap-1">
                                                                            <Check size={10} strokeWidth={4} /> Offer Applied
                                                                        </span>
                                                                        <div className="relative">
                                                                            <button 
                                                                                onClick={(e) => {
                                                                                    const rect = e.currentTarget.getBoundingClientRect();
                                                                                    if (activeOfferTip) {
                                                                                        setActiveOfferTip(null);
                                                                                    } else {
                                                                                        const offer = offers.find(o => 
                                                                                            o.condition?.itemIds?.includes(item.id || item._id) || 
                                                                                            o.condition?.categoryIds?.includes(item.categoryId || item.category_id)
                                                                                        );
                                                                                        if (offer) {
                                                                                            setActiveOfferTip({
                                                                                                x: rect.right,
                                                                                                y: rect.bottom,
                                                                                                offer
                                                                                            });
                                                                                        }
                                                                                    }
                                                                                }}
                                                                                className={`p-1 ${activeOfferTip?.offer?._id === (offers.find(o => o.condition?.itemIds?.includes(item.id || item._id) || o.condition?.categoryIds?.includes(item.categoryId || item.category_id))?._id) ? 'bg-indigo-100 text-indigo-700' : 'text-emerald-600 hover:bg-emerald-50'} rounded-full transition-all`}
                                                                                title="View Offer Info"
                                                                            >
                                                                                <Info size={12} />
                                                                            </button>
                                                                        </div>
                                                                    </div>
                                                                ) : null}
                                                            </div>
                                                        );
                                                    })()}
                                                    {item.suggestion && (
                                                        <div className="text-[11px] text-orange-600 italic mt-1 truncate">
                                                            Note: {item.suggestion}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="mt-2 flex items-center justify-between gap-2">
                                            <button
                                                onClick={() => openNoteModal(idx, item.suggestion)}
                                                className={`flex items-center gap-1 ${theme.surfaceBg} px-2 py-1 rounded-lg border ${theme.borderLight} text-[10px] font-bold ${theme.textMuted} hover:text-indigo-600 hover:border-indigo-200 transition-colors`}
                                            >
                                                <Edit3 size={10} />
                                                {item.suggestion ? "Edit Note" : "Add Note"}
                                            </button>
                                            {/* Per-item discount */}
                                            <div className={`flex items-center gap-1 rounded-lg border ${theme.borderLight} ${theme.inputBg} overflow-hidden`}>
                                                <span className={`pl-2 text-[9px] font-black uppercase ${theme.textMuted}`}>Disc</span>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    value={item.itemDiscount || ""}
                                                    onChange={e => {
                                                        const v = parseFloat(e.target.value) || 0;
                                                        initiateAddItem({ ...item, itemDiscount: v }, 0);
                                                    }}
                                                    placeholder="0"
                                                    className={`w-16 px-1.5 py-1 text-xs font-black outline-none bg-transparent ${theme.textPrimary}`}
                                                />
                                                <span className={`pr-2 text-[9px] font-black ${theme.textMuted}`}>₹</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    <div className={`p-3 xl:p-6 ${theme.surfaceBg} border-t ${theme.borderLight} shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20 space-y-2`}>
                        {(() => {
                            return (
                                <>
                                    <div className={`flex justify-between items-center text-xs md:text-sm ${theme.textMuted}`}>
                                        <span>Subtotal</span>
                                        <span className={theme.textPrimary}>{formatCurrency(billDetails.subtotal)}</span>
                                    </div>

                                    {/* Discount input */}
                                    <div className={`rounded-xl border ${theme.borderLight} ${theme.inputBg} overflow-hidden`}>
                                        <div className={`flex items-center border-b ${theme.borderLight}`}>
                                            <span className={`px-3 text-[10px] font-black uppercase tracking-wider ${theme.textMuted}`}>Discount</span>
                                            <div className="ml-auto flex">
                                                <button
                                                    type="button"
                                                    onClick={() => applyDiscount('flat', discountInputValue)}
                                                    className={`px-3 py-1.5 text-[10px] font-black transition-all ${discountInputType === 'flat' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:opacity-80`}`}
                                                >
                                                    ₹ Flat
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => applyDiscount('percent', discountInputValue)}
                                                    className={`px-3 py-1.5 text-[10px] font-black transition-all ${discountInputType === 'percent' ? 'bg-indigo-600 text-white' : `${theme.textMuted} hover:opacity-80`}`}
                                                >
                                                    % Off
                                                </button>
                                            </div>
                                        </div>
                                        <input
                                            type="number"
                                            min="0"
                                            value={discountInputValue}
                                            onChange={e => applyDiscount(discountInputType, e.target.value)}
                                            placeholder={discountInputType === 'percent' ? "Enter %" : "Enter amount"}
                                            className={`w-full px-3 py-2 text-sm font-black outline-none bg-transparent ${theme.textPrimary}`}
                                        />
                                    </div>
    
                                    {billDetails.appliedOffers && billDetails.appliedOffers.length > 0 && (
                                        <div className="space-y-1">
                                            <div className="text-[10px] font-bold text-green-600 uppercase tracking-wider">Applied Offers</div>
                                            {billDetails.appliedOffers.map((offer, oIdx) => offer && (
                                                <div key={offer.offerId || oIdx} className="flex justify-between items-center text-sm text-green-600 font-medium bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-lg gap-2">
                                                    <span className="truncate">{offer.name}</span>
                                                    <div className="flex items-center gap-2 flex-shrink-0">
                                                        <span>-{formatCurrency(offer.discount)}</span>
                                                        {offer.offerId && (
                                                            <button
                                                                type="button"
                                                                onClick={() => dismissOffer(offer.offerId)}
                                                                className="p-1 rounded-md hover:bg-green-100 dark:hover:bg-green-900/40 text-green-700"
                                                                title="Remove offer"
                                                            >
                                                                <X size={14} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
    
                                    <div className={`flex justify-between items-center text-xs md:text-sm ${theme.textMuted}`}>
                                        <span>Tax</span>
                                        <span className={theme.textPrimary}>{formatCurrency(billDetails.taxAmount)}</span>
                                    </div>

                                    {billDiscount.value > 0 && (
                                        <div className={`flex justify-between items-center text-sm font-bold text-emerald-600 bg-emerald-50 px-3 py-2 rounded-xl border border-emerald-100`}>
                                            <div className="flex flex-col">
                                                <span>Customer Discount</span>
                                                {billDiscount.type === 'percent' && <span className="text-[10px] opacity-70 uppercase tracking-wider">{billDiscount.value}% Off</span>}
                                            </div>
                                            <span>-{formatCurrency(billDetails.discountAmount)}</span>
                                        </div>
                                    )}

                                    {isTakeaway && exchangeCredit > 0 && (
                                        <div className={`flex justify-between items-center text-sm font-bold text-orange-600 bg-orange-50 px-3 py-2 rounded-xl border border-orange-100`}>
                                            <span>Exchange Credit</span>
                                            <span>-{formatCurrency(exchangeCredit)}</span>
                                        </div>
                                    )}
    
                                    <div className={`flex justify-between items-center text-xl font-black ${theme.textHeading} pt-2 border-t-2 border-dashed ${theme.borderLight}`}>
                                        <span>Total</span>
                                        <span>{formatCurrency(billDetails.finalTotal)}</span>
                                    </div>
                                </>
                            );
                        })()}
                        <div className="grid grid-cols-2 gap-2 pt-1">
                            {(hasPermission("orders.ORDERS.KOS") || hasPermission("orders.kos")) && (
                                <button
                                    onClick={handleSendToKOT}
                                    disabled={currentOrder.items.length === 0 || (!hasPendingKitchenItems)}
                                    className="py-2.5 xl:py-4 rounded-lg xl:rounded-xl text-sm font-bold bg-indigo-50 text-indigo-700 hover:bg-indigo-100 disabled:opacity-50 disabled:cursor-not-allowed flex justify-center items-center gap-1 md:gap-2"
                                >
                                    <Printer size={16} /> KOT
                                </button>
                            )}
                            <button
                                onClick={() => {
                                    setIsPaymentModalOpen(true);
                                    setBillingStage("review");
                                }}
                                disabled={(
                                    !hasPermissionFor("pos", "order", "process_payment") &&
                                    !hasPermission("orders.ORDERS.PROCESSPAYMENT") &&
                                    !hasPermission("orders.processpayment")
                                ) || currentOrder.items.length === 0}
                                className={`py-2.5 xl:py-4 rounded-lg xl:rounded-xl text-sm font-bold bg-green-600 text-white shadow-lg shadow-green-100 hover:bg-green-700 disabled:opacity-50 disabled:bg-gray-300 disabled:shadow-none ${(hasPermission("orders.ORDERS.KOS") || hasPermission("orders.kos")) ? "" : "col-span-2"}`}
                            >
                                {(
                                    hasPermissionFor("pos", "order", "process_payment") ||
                                    hasPermission("orders.ORDERS.PROCESSPAYMENT") ||
                                    hasPermission("orders.processpayment")
                                ) ? "Checkout" : "Checkout (Restricted)"}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
            {/* Global Offer Tooltip (Fixed Position to avoid clipping) */}
            {activeOfferTip?.offer && (
                <div 
                    className="fixed z-[9999] animate-in fade-in slide-in-from-top-2 duration-200"
                    style={{ 
                        top: activeOfferTip.y + 10, 
                        left: Math.max(10, activeOfferTip.x - 230), // Ensure it doesn't go off-screen left
                        width: '220px'
                    }}
                >
                    <div className={`${themeName === 'dark' ? 'bg-gray-900 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-900'} shadow-2xl rounded-2xl border p-4`}>
                        <div className="flex justify-between items-start mb-3">
                            <h4 className="text-xs font-black uppercase tracking-tight truncate mr-2">{activeOfferTip.offer.name || 'Offer Details'}</h4>
                            <button onClick={() => setActiveOfferTip(null)} className="text-gray-400 hover:text-red-500 p-1 shrink-0"><X size={12} /></button>
                        </div>
                        
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Offer Type</span>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">{activeOfferTip.offer.condition?.applyOn || 'N/A'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Reward Type</span>
                                <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">{activeOfferTip.offer.reward?.rewardType?.replace('_', ' ') || 'N/A'}</span>
                            </div>
                            {activeOfferTip.offer.description && (
                                <div className={`mt-3 pt-3 border-t border-dashed ${theme.borderLight}`}>
                                    <p className={`text-[11px] leading-relaxed italic ${theme.textMuted}`}>{activeOfferTip.offer.description}</p>
                                </div>
                            )}
                        </div>
                        
                        <div className={`mt-3 text-[9px] ${theme.textMuted} text-right font-mono`}>
                            Ref: {activeOfferTip.offer._id?.slice(-8).toUpperCase() || 'N/A'}
                        </div>
                    </div>
                    {/* Tiny arrow */}
                    <div className={`absolute top-[-6px] right-4 w-3 h-3 ${themeName === 'dark' ? 'bg-gray-900 border-l border-t border-gray-700' : 'bg-white border-l border-t border-gray-200'} rotate-45`}></div>
                </div>
            )}
        </div>
    );
};

export default TakeawayOrder;
