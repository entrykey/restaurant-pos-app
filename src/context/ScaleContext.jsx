import React, { createContext, useContext, useState, useRef, useEffect, useCallback } from "react";
import { toast } from "react-hot-toast";

/**
 * Robust scale string parser for physical USB/RS-232 weighing scales.
 * Handles formats like:
 * - "ST,GS,+001.250kg" -> 1.250
 * - "US,GS,+000.500kg" -> 0.500
 * - "WT:  1.250kg" -> 1.250
 * - "  1.250 kg " -> 1.250
 * - "=01.250" -> 1.250
 * - "+ 0.525" -> 0.525
 */
export function parseScaleWeightString(rawText) {
    if (!rawText || typeof rawText !== "string") return null;

    const cleaned = rawText.trim();
    if (!cleaned) return null;

    // Check for negative or positive numeric match
    const match = cleaned.match(/([-+]?\s*\d+(?:\.\d+)?)\s*(kg|g|lb)?/i);
    if (match) {
        let numStr = match[1].replace(/\s+/g, "");
        let val = parseFloat(numStr);
        if (!isNaN(val)) {
            const unit = (match[2] || "").toLowerCase();
            // Convert grams to KG if explicit 'g' unit (and val > 10)
            if (unit === "g" && Math.abs(val) >= 10) {
                val = val / 1000;
            } else if (unit === "lb") {
                val = val * 0.45359237;
            }
            return parseFloat(Math.max(0, val).toFixed(3));
        }
    }
    return null;
}

const ScaleContext = createContext(null);

export const ScaleProvider = ({ children }) => {
    const [scaleWeight, setScaleWeight] = useState(0);
    const [rawScaleText, setRawScaleText] = useState("");
    const [isScaleConnected, setIsScaleConnected] = useState(false);
    const [scaleStatus, setScaleStatus] = useState("disconnected"); // "disconnected" | "connecting" | "connected" | "error"
    const [scaleError, setScaleError] = useState(null);
    const [scalePortName, setScalePortName] = useState("");
    const [baudRate, setBaudRate] = useState(9600);
    const [autoSync, setAutoSync] = useState(true);
    const [lastUpdated, setLastUpdated] = useState(null);

    const [connectionType, setConnectionType] = useState(() => localStorage.getItem("scale_conn_type") || "usb");
    const [wifiIp, setWifiIp] = useState(() => localStorage.getItem("scale_wifi_ip") || "");
    const [wifiPort, setWifiPort] = useState(() => localStorage.getItem("scale_wifi_port") || "8080");

    const portRef = useRef(null);
    const readerRef = useRef(null);
    const wsRef = useRef(null);
    const keepReadingRef = useRef(false);

    const isWebSerialSupported = typeof navigator !== "undefined" && "serial" in navigator;

    // Disconnect scale
    const disconnectScale = useCallback(async () => {
        keepReadingRef.current = false;
        try {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (readerRef.current) {
                await readerRef.current.cancel().catch(() => {});
                readerRef.current = null;
            }
            if (portRef.current) {
                await portRef.current.close().catch(() => {});
                portRef.current = null;
            }
        } catch (e) {
            console.error("Error closing scale connection:", e);
        } finally {
            setIsScaleConnected(false);
            setScaleStatus("disconnected");
            setScalePortName("");
            setScaleError(null);
            toast("Weighing scale disconnected.", { icon: "🔌" });
        }
    }, []);

    // Web Serial Read Loop
    const startReadLoop = useCallback(async (port) => {
        keepReadingRef.current = true;
        let buffer = "";

        try {
            while (keepReadingRef.current && port && port.readable) {
                const textDecoder = new TextDecoderStream();
                const readableStreamClosed = port.readable.pipeTo(textDecoder.writable);
                const reader = textDecoder.readable.getReader();
                readerRef.current = reader;

                try {
                    while (keepReadingRef.current) {
                        const { value, done } = await reader.read();
                        if (done) break;
                        if (value) {
                            buffer += value;
                            const lines = buffer.split(/[\r\n]+/);
                            buffer = lines.pop() || ""; // keep unfinished line tail in buffer

                            for (const line of lines) {
                                const trimmed = line.trim();
                                if (trimmed) {
                                    setRawScaleText(trimmed);
                                    const parsed = parseScaleWeightString(trimmed);
                                    if (parsed !== null && !isNaN(parsed)) {
                                        setScaleWeight(parsed);
                                        setLastUpdated(Date.now());
                                    }
                                }
                            }
                        }
                    }
                } catch (readErr) {
                    console.error("Scale read stream error:", readErr);
                } finally {
                    reader.releaseLock();
                    await readableStreamClosed.catch(() => {});
                }
            }
        } catch (err) {
            console.error("Scale pipeTo error:", err);
            setScaleStatus("error");
            setScaleError(err?.message || "Stream error");
            setIsScaleConnected(false);
        }
    }, []);

    // Connect via Web Serial API
    const connectWebSerial = useCallback(async (customBaud = 9600) => {
        if (!isWebSerialSupported) {
            toast.error("Web Serial API is not supported in this browser. Use Wi-Fi scale connection or Google Chrome.");
            return false;
        }

        try {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            setScaleStatus("connecting");
            setScaleError(null);

            // Request port from user
            const port = await navigator.serial.requestPort();
            const bRate = Number(customBaud) || 9600;
            await port.open({ baudRate: bRate, dataBits: 8, stopBits: 1, parity: "none" });

            portRef.current = port;
            setBaudRate(bRate);
            setConnectionType("usb");
            localStorage.setItem("scale_conn_type", "usb");
            setIsScaleConnected(true);
            setScaleStatus("connected");
            setScalePortName(`USB Serial (${bRate} baud)`);
            toast.success("USB scale connected successfully!", { icon: "⚖️" });

            // Start background loop
            startReadLoop(port);
            return true;
        } catch (err) {
            console.error("Web Serial connection error:", err);
            setScaleStatus("error");
            if (err.name === "NotFoundError") {
                setScaleError("Port selection cancelled");
            } else {
                setScaleError(err?.message || "Connection failed");
                toast.error(`Scale connect error: ${err?.message || "Failed to open port"}`);
            }
            setIsScaleConnected(false);
            return false;
        }
    }, [isWebSerialSupported, startReadLoop]);

    // Connect via Wi-Fi Scale (WebSocket / IP Address)
    const connectWifiScale = useCallback((targetIp, targetPort) => {
        const ip = (targetIp !== undefined ? targetIp : wifiIp).trim();
        const port = (targetPort !== undefined ? targetPort : wifiPort).toString().trim();

        if (!ip) {
            toast.error("Please enter a valid Wi-Fi scale IP address (e.g. 192.168.1.100)");
            return false;
        }

        let wsUrl = ip;
        if (!wsUrl.startsWith("ws://") && !wsUrl.startsWith("wss://")) {
            wsUrl = `ws://${wsUrl}`;
        }
        if (port && !wsUrl.slice(6).includes(":")) {
            wsUrl = `${wsUrl}:${port}`;
        }

        try {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            if (portRef.current) {
                keepReadingRef.current = false;
                portRef.current.close().catch(() => {});
                portRef.current = null;
            }

            setScaleStatus("connecting");
            setScaleError(null);

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = () => {
                setIsScaleConnected(true);
                setScaleStatus("connected");
                setConnectionType("wifi");
                setWifiIp(ip);
                setWifiPort(port);
                localStorage.setItem("scale_conn_type", "wifi");
                localStorage.setItem("scale_wifi_ip", ip);
                localStorage.setItem("scale_wifi_port", port);
                setScalePortName(`Wi-Fi Scale (${wsUrl})`);
                toast.success(`Wi-Fi scale connected (${ip})!`, { icon: "📡" });
            };

            ws.onmessage = (event) => {
                if (event.data) {
                    const rawText = String(event.data).trim();
                    setRawScaleText(rawText);
                    const parsed = parseScaleWeightString(rawText);
                    if (parsed !== null && !isNaN(parsed)) {
                        setScaleWeight(parsed);
                        setLastUpdated(Date.now());
                    }
                }
            };

            ws.onerror = (err) => {
                console.error("Wi-Fi scale WebSocket error:", err);
                setScaleStatus("error");
                setScaleError("Wi-Fi connection error");
                setIsScaleConnected(false);
                toast.error("Failed to connect to Wi-Fi scale. Verify IP address & local network.", { icon: "⚠️" });
            };

            ws.onclose = () => {
                setIsScaleConnected(false);
                setScaleStatus("disconnected");
                setScalePortName("");
            };

            return true;
        } catch (err) {
            console.error("Wi-Fi scale exception:", err);
            setScaleStatus("error");
            setScaleError(err?.message || "Failed to create WebSocket");
            toast.error(`Wi-Fi Scale Error: ${err?.message}`);
            setIsScaleConnected(false);
            return false;
        }
    }, [wifiIp, wifiPort]);

    // Auto connect saved Wi-Fi scale on initial load
    useEffect(() => {
        const savedType = localStorage.getItem("scale_conn_type");
        const savedIp = localStorage.getItem("scale_wifi_ip");
        const savedPort = localStorage.getItem("scale_wifi_port") || "8080";

        if (savedType === "wifi" && savedIp) {
            connectWifiScale(savedIp, savedPort);
        }
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            keepReadingRef.current = false;
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (readerRef.current) {
                readerRef.current.cancel().catch(() => {});
            }
            if (portRef.current) {
                portRef.current.close().catch(() => {});
            }
        };
    }, []);

    const value = {
        scaleWeight,
        setScaleWeight,
        rawScaleText,
        isScaleConnected,
        scaleStatus,
        scaleError,
        scalePortName,
        baudRate,
        setBaudRate,
        isWebSerialSupported,
        connectionType,
        setConnectionType,
        wifiIp,
        setWifiIp,
        wifiPort,
        setWifiPort,
        autoSync,
        setAutoSync,
        lastUpdated,
        connectWebSerial,
        connectWifiScale,
        disconnectScale,
    };

    return <ScaleContext.Provider value={value}>{children}</ScaleContext.Provider>;
};

export const useScale = () => {
    const context = useContext(ScaleContext);
    if (!context) {
        throw new Error("useScale must be used within a ScaleProvider");
    }
    return context;
};
