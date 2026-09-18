// Sound Service for POS Voice Announcements & Payment Sound Effects

const SOUND_KEY = "pos_sound_enabled";

export const isSoundEnabled = () => {
    try {
        const val = localStorage.getItem(SOUND_KEY);
        return val !== "false"; // Default to true if not set
    } catch (e) {
        return true;
    }
};

export const setSoundEnabled = (enabled) => {
    try {
        localStorage.setItem(SOUND_KEY, enabled ? "true" : "false");
        window.dispatchEvent(new CustomEvent("pos_sound_changed", { detail: { enabled: !!enabled } }));
    } catch (e) {
        console.warn("Could not save sound preference:", e);
    }
};

export const toggleSoundEnabled = () => {
    const nextState = !isSoundEnabled();
    setSoundEnabled(nextState);
    return nextState;
};

/**
 * Announce item name and quantity via Web Speech API (SpeechSynthesis)
 * Example: "1 Head Cap" or "2 Blue Shirt"
 */
export const announceItemAdded = (itemName, quantity = 1) => {
    if (!isSoundEnabled()) return;
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    try {
        window.speechSynthesis.cancel(); // Cancel any ongoing speech to avoid backlog delay

        const cleanName = String(itemName || "").trim();
        if (!cleanName) return;

        const qtyNum = parseFloat(quantity) || 1;
        const qtyStr = Number.isInteger(qtyNum) ? String(qtyNum) : qtyNum.toFixed(1);
        const text = `${qtyStr} ${cleanName}`;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.05; // Slightly upbeat speech rate for snappy POS feedback
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        window.speechSynthesis.speak(utterance);
    } catch (err) {
        console.warn("TTS Speech Synthesis error:", err);
    }
};

/**
 * Synthesize a realistic metallic coin dropping sound effect on payment completion
 * Uses Web Audio API (zero external network request or audio file dependency)
 */
export const playCoinDropSound = () => {
    if (!isSoundEnabled()) return;
    if (typeof window === "undefined") return;

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;

        const ctx = new AudioContextClass();

        const playCoinTap = (delay, frequency1, frequency2, gainPeak = 0.35) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gainNode = ctx.createGain();

            osc1.type = "sine";
            osc2.type = "triangle";

            const startTime = ctx.currentTime + delay;

            osc1.frequency.setValueAtTime(frequency1, startTime);
            osc2.frequency.setValueAtTime(frequency2, startTime);

            // Pitch drop effect mimicking metal impact friction
            osc1.frequency.exponentialRampToValueAtTime(frequency1 * 0.72, startTime + 0.12);

            gainNode.gain.setValueAtTime(0, startTime);
            gainNode.gain.linearRampToValueAtTime(gainPeak, startTime + 0.006);
            gainNode.gain.exponentialRampToValueAtTime(0.0001, startTime + 0.16);

            osc1.connect(gainNode);
            osc2.connect(gainNode);
            gainNode.connect(ctx.destination);

            osc1.start(startTime);
            osc2.start(startTime);
            osc1.stop(startTime + 0.17);
            osc2.stop(startTime + 0.17);
        };

        // 4-stage realistic coin dropping sequence into register
        playCoinTap(0, 2600, 5200, 0.4);     // Coin 1 initial hit
        playCoinTap(0.07, 2100, 4200, 0.35);  // Coin 2 impact
        playCoinTap(0.14, 2800, 5600, 0.3);   // Coin 3 bounce
        playCoinTap(0.22, 2300, 4600, 0.2);   // Settle chime
    } catch (err) {
        console.warn("Coin sound playback error:", err);
    }
};
