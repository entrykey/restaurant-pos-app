import React, { useState, useEffect } from "react";
import { Scale, Minus, Plus, RefreshCw, Zap, Plug, Wifi, Usb } from "lucide-react";
import Modal from "../ui/Modal";
import { formatCurrency } from "../../utils/format";
import { useTheme } from "../../context/ThemeContext";
import { useScale } from "../../context/ScaleContext";

const CustomizationModal = ({
    isOpen,
    onClose,
    item,
    onConfirm,
    customVariant,
    setCustomVariant,
    customWeightInput,
    setCustomWeightInput,
    customWeightUnit,
    setCustomWeightUnit,
    customExtras,
    setCustomExtras,
}) => {
    const { theme } = useTheme();
    const scale = useScale();

    const [showWifiForm, setShowWifiForm] = useState(false);
    const [tempWifiIp, setTempWifiIp] = useState(scale.wifiIp || "");
    const [tempWifiPort, setTempWifiPort] = useState(scale.wifiPort || "8080");

    useEffect(() => {
        if (scale.wifiIp) setTempWifiIp(scale.wifiIp);
        if (scale.wifiPort) setTempWifiPort(scale.wifiPort);
    }, [scale.wifiIp, scale.wifiPort]);

    // Auto-grab weight from live scale when modal opens or live scale changes
    useEffect(() => {
        if (isOpen && item?.sellingType === "Weight" && scale.isScaleConnected && scale.scaleWeight > 0) {
            const val = customWeightUnit === "g" 
                ? parseFloat((scale.scaleWeight * 1000).toFixed(2)) 
                : parseFloat(scale.scaleWeight.toFixed(3));
            setCustomWeightInput(val);
        }
    }, [isOpen, item?.sellingType, scale.isScaleConnected, scale.scaleWeight, customWeightUnit]);

    const handleGrabWeight = () => {
        if (!scale.isScaleConnected) {
            if (scale.isWebSerialSupported) {
                scale.connectWebSerial();
            } else {
                setShowWifiForm(true);
            }
            return;
        }
        if (scale.scaleWeight > 0) {
            const val = customWeightUnit === "g" 
                ? parseFloat((scale.scaleWeight * 1000).toFixed(2)) 
                : parseFloat(scale.scaleWeight.toFixed(3));
            setCustomWeightInput(val);
        }
    };

    if (!item) return null;

    return (
        <Modal isOpen={isOpen} onClose={onClose} className="md:max-w-lg">
            <div className="flex flex-col h-full md:h-auto">
                <div className="mb-4">
                    <span className={`text-xs font-black ${theme.textMuted} uppercase tracking-widest`}>
                        {item.category}
                    </span>
                    <h3 className={`text-2xl font-black ${theme.textHeading}`}>{item.name}</h3>
                </div>

                <div className="space-y-8 flex-1 overflow-y-auto">
                    {/* Portion Pricing Selection (New System) */}
                    {item.portionPricing && item.portionPricing.length > 0 && (
                        <div>
                            <label className={`text-xs font-black ${theme.textMuted} uppercase mb-3 block`}>
                                Select Portion / Variation
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {item.portionPricing.map((p, i) => {
                                    const isSelected = customVariant?.name === p.name;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setCustomVariant(p)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                                                    ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                                                    : `${theme.borderLight} hover:border-indigo-200 ${theme.surfaceBg}`
                                                }`}
                                        >
                                            <div className={`font-bold ${theme.textPrimary}`}>{p.name}</div>
                                            <div className="font-black text-indigo-600 mt-1">
                                                {formatCurrency(p.price)}
                                            </div>
                                            {item.inventoryMode === 'separate' && (
                                                <div className={`text-[10px] font-bold mt-1 ${theme.textMuted}`}>
                                                    Stock: {Number(p.quantityOnHand ?? p.openingStock) || 0}
                                                </div>
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Variant Selection (Legacy Volume/Portion system) */}
                    {item.variants && item.variants.length > 0 && (!item.portionPricing || item.portionPricing.length === 0) && (
                        <div>
                            <label className={`text-xs font-black ${theme.textMuted} uppercase mb-3 block`}>
                                Select Size / Portion
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                {item.variants.map((v, i) => {
                                    const isSelected = customVariant?.name === v.name;
                                    return (
                                        <button
                                            key={i}
                                            type="button"
                                            onClick={() => setCustomVariant(v)}
                                            className={`p-4 rounded-2xl border-2 text-left transition-all ${isSelected
                                                    ? "border-indigo-600 bg-indigo-50/80 shadow-md ring-2 ring-indigo-500/20"
                                                    : `${theme.borderLight} hover:border-indigo-200 ${theme.surfaceBg}`
                                                }`}
                                        >
                                            <div className={`font-bold ${theme.textPrimary}`}>{v.name}</div>
                                            <div className="font-black text-indigo-600 mt-1">
                                                {formatCurrency(v.price)}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Weight Input */}
                    {item.sellingType === "Weight" && (
                        <div className="space-y-3">
                            {/* Live Scale Status Strip */}
                            <div className={`p-3 rounded-2xl border transition-all ${
                                scale.isScaleConnected
                                    ? "bg-emerald-50/90 border-emerald-200 text-emerald-900"
                                    : "bg-amber-50/90 border-amber-200 text-amber-900"
                            }`}>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        {scale.isScaleConnected ? (
                                            <>
                                                <span className="relative flex h-2.5 w-2.5">
                                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                                </span>
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">
                                                        Scale Live: <strong className="text-sm font-black text-emerald-700">{scale.scaleWeight.toFixed(3)} KG</strong>
                                                    </span>
                                                    <span className="text-[10px] text-emerald-600 font-medium">{scale.scalePortName}</span>
                                                </div>
                                            </>
                                        ) : (
                                            <>
                                                <Plug className="w-4 h-4 text-amber-600 shrink-0" />
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold">Scale Disconnected</span>
                                                    <span className="text-[10px] text-amber-700 font-medium">Supports USB Serial & Wi-Fi IP Scale</span>
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex items-center gap-1.5">
                                        {scale.isScaleConnected ? (
                                            <>
                                                <button
                                                    type="button"
                                                    onClick={handleGrabWeight}
                                                    className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg shadow text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                                >
                                                    <Zap size={12} />
                                                    Grab Weight
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => scale.disconnectScale()}
                                                    className="px-2 py-1 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg text-[11px] font-bold active:scale-95 transition-all cursor-pointer"
                                                    title="Disconnect Scale"
                                                >
                                                    Disconnect
                                                </button>
                                            </>
                                        ) : (
                                            <div className="flex items-center gap-1">
                                                {scale.isWebSerialSupported && (
                                                    <button
                                                        type="button"
                                                        onClick={() => scale.connectWebSerial()}
                                                        className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                                        title="Connect USB Scale via Web Serial"
                                                    >
                                                        <Usb size={12} />
                                                        USB Scale
                                                    </button>
                                                )}
                                                <button
                                                    type="button"
                                                    onClick={() => setShowWifiForm(!showWifiForm)}
                                                    className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg shadow text-[11px] font-black flex items-center gap-1 active:scale-95 transition-all cursor-pointer"
                                                    title="Connect Wi-Fi Scale over LAN IP"
                                                >
                                                    <Wifi size={12} />
                                                    Wi-Fi Scale
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Wi-Fi IP Connect Form */}
                                {showWifiForm && !scale.isScaleConnected && (
                                    <div className="mt-3 pt-3 border-t border-amber-200/80 flex flex-col gap-2">
                                        <div className="text-[11px] font-black uppercase text-amber-900 tracking-wider">
                                            Connect Wi-Fi / LAN Network Scale
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="text"
                                                placeholder="Scale IP (e.g. 192.168.1.100)"
                                                value={tempWifiIp}
                                                onChange={(e) => setTempWifiIp(e.target.value)}
                                                className="flex-1 px-2.5 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <input
                                                type="text"
                                                placeholder="Port (8080)"
                                                value={tempWifiPort}
                                                onChange={(e) => setTempWifiPort(e.target.value)}
                                                className="w-20 px-2 py-1.5 bg-white border border-amber-300 rounded-lg text-xs font-bold text-gray-800 outline-none focus:ring-2 focus:ring-amber-500"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    scale.connectWifiScale(tempWifiIp, tempWifiPort);
                                                    setShowWifiForm(false);
                                                }}
                                                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-black rounded-lg text-xs shadow active:scale-95 transition-all cursor-pointer"
                                            >
                                                Connect
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex justify-between items-end">
                                <label className={`text-xs font-black ${theme.textMuted} uppercase block`}>
                                    Enter Weight
                                </label>
                                <div className={`flex ${theme.pageBg} rounded-lg p-1 gap-1`}>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (customWeightUnit === "g") {
                                                const currentVal = parseFloat(customWeightInput);
                                                if (!isNaN(currentVal) && currentVal > 0) {
                                                    setCustomWeightInput(parseFloat((currentVal / 1000).toFixed(4)));
                                                }
                                                setCustomWeightUnit("kg");
                                            }
                                        }}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${customWeightUnit === "kg"
                                                ? "bg-white shadow text-indigo-600"
                                                : theme.textMuted
                                            }`}
                                    >
                                        KG
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            if (customWeightUnit === "kg") {
                                                const currentVal = parseFloat(customWeightInput);
                                                if (!isNaN(currentVal) && currentVal > 0) {
                                                    setCustomWeightInput(parseFloat((currentVal * 1000).toFixed(2)));
                                                }
                                                setCustomWeightUnit("g");
                                            }
                                        }}
                                        className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${customWeightUnit === "g"
                                                ? "bg-white shadow text-indigo-600"
                                                : theme.textMuted
                                            }`}
                                    >
                                        GRAMS
                                    </button>
                                </div>
                            </div>

                            <div className={`flex items-center gap-3 ${theme.pageBg} p-4 rounded-2xl border-2 border-indigo-100`}>
                                <button
                                    type="button"
                                    onClick={handleGrabWeight}
                                    title="Grab live weight from scale"
                                    className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 rounded-xl transition-all active:scale-95 cursor-pointer shrink-0"
                                >
                                    <Scale size={24} />
                                </button>
                                <input
                                    type="number"
                                    value={customWeightInput}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val === "") {
                                            setCustomWeightInput("");
                                        } else {
                                            setCustomWeightInput(parseFloat(val));
                                        }
                                    }}
                                    className={`flex-1 bg-transparent text-3xl font-black ${theme.textPrimary} outline-none w-20`}
                                    step="0.05"
                                    autoFocus
                                />
                                <span className={`font-bold ${theme.textMuted} uppercase`}>
                                    {customWeightUnit}
                                </span>
                            </div>

                            <div className="flex justify-between items-center text-xs mt-2">
                                <span className="text-gray-400 font-medium">
                                    Rate: {formatCurrency(item.pricePerUnit)} / kg
                                </span>
                                <div className="text-indigo-600 font-black text-base">
                                    Price:{" "}
                                    {formatCurrency(
                                        (customWeightUnit === "g"
                                            ? (parseFloat(customWeightInput) || 0) / 1000
                                            : parseFloat(customWeightInput) || 0) * (item.pricePerUnit || item.price || 0)
                                    )}
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Extras Selection */}
                    {item.availableExtras && item.availableExtras.length > 0 && (
                        <div>
                            <label className={`text-xs font-black ${theme.textMuted} uppercase mb-3 block`}>
                                Add Extras
                            </label>
                            <div className="space-y-3">
                                {item.availableExtras.map((extra, i) => (
                                    <div
                                        key={i}
                                        className={`flex justify-between items-center p-3 rounded-2xl border ${theme.borderLight} ${theme.surfaceBg} shadow-sm`}
                                    >
                                        <div>
                                            <div className={`font-bold ${theme.textPrimary}`}>{extra.name}</div>
                                            <div className={`text-xs font-bold ${theme.textMuted}`}>
                                                {formatCurrency(extra.price)}
                                            </div>
                                        </div>

                                        {customExtras[extra.name] > 0 ? (
                                            <div className="flex items-center gap-3 bg-indigo-50 p-1 rounded-xl">
                                                <button
                                                    onClick={() =>
                                                        setCustomExtras({
                                                            ...customExtras,
                                                            [extra.name]: customExtras[extra.name] - 1,
                                                        })
                                                    }
                                                    className="p-1 bg-white rounded-lg text-red-500 shadow-sm"
                                                >
                                                    <Minus size={14} />
                                                </button>
                                                <span className="font-bold text-sm w-4 text-center">
                                                    {customExtras[extra.name]}
                                                </span>
                                                <button
                                                    onClick={() =>
                                                        setCustomExtras({
                                                            ...customExtras,
                                                            [extra.name]: customExtras[extra.name] + 1,
                                                        })
                                                    }
                                                    className="p-1 bg-white rounded-lg text-indigo-600 shadow-sm"
                                                >
                                                    <Plus size={14} />
                                                </button>
                                            </div>
                                        ) : (
                                            <button
                                                onClick={() =>
                                                    setCustomExtras({
                                                        ...customExtras,
                                                        [extra.name]: 1,
                                                    })
                                                }
                                                className={`p-2 ${theme.pageBg} rounded-xl hover:bg-indigo-100 hover:text-indigo-600 transition-colors ${theme.textPrimary}`}
                                            >
                                                <Plus size={18} />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                <div className={`mt-6 pt-6 border-t ${theme.borderLight} ${theme.pageBg} -mx-6 -mb-6 p-6 md:rounded-b-[40px]`}>
                    <button
                        onClick={onConfirm}
                        className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold shadow-xl flex justify-between px-8 hover:bg-indigo-700 active:scale-95 transition-all"
                    >
                        <span>Add to Order</span>
                        <span>
                            {formatCurrency(
                                (item.sellingType === "Weight"
                                    ? (customWeightUnit === "g"
                                        ? (parseFloat(customWeightInput) || 0) / 1000
                                        : parseFloat(customWeightInput) || 0) * item.pricePerUnit
                                    : customVariant?.price || item.price || 0) +
                                Object.keys(customExtras).reduce(
                                    (acc, key) =>
                                        acc +
                                        item.availableExtras.find((e) => e.name === key).price *
                                        customExtras[key],
                                    0
                                )
                            )}
                        </span>
                    </button>
                </div>
            </div>
        </Modal>
    );
};

export default CustomizationModal;
