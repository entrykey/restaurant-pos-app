/**
 * Collection of Cartoon Avatars for User Profiles.
 * Pure SVG Data URIs for instant, crisp, offline-compatible rendering.
 */

export const CARTOON_AVATARS = [
    {
        id: "cartoon_chef",
        name: "Master Chef",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#4F46E5"/>
                <circle cx="50" cy="52" r="32" fill="#FFD1B3"/>
                <!-- Eyes -->
                <circle cx="40" cy="48" r="4" fill="#1F2937"/>
                <circle cx="60" cy="48" r="4" fill="#1F2937"/>
                <circle cx="41.5" cy="46.5" r="1.5" fill="#FFFFFF"/>
                <circle cx="61.5" cy="46.5" r="1.5" fill="#FFFFFF"/>
                <!-- Cheeks -->
                <circle cx="34" cy="54" r="4" fill="#F472B6" opacity="0.6"/>
                <circle cx="66" cy="54" r="4" fill="#F472B6" opacity="0.6"/>
                <!-- Smile -->
                <path d="M 42 58 Q 50 66 58 58" fill="none" stroke="#1F2937" stroke-width="3" stroke-linecap="round"/>
                <!-- Chef Hat -->
                <path d="M 30 38 Q 30 20 42 20 Q 50 12 58 20 Q 70 20 70 38 Z" fill="#FFFFFF"/>
                <rect x="32" y="34" width="36" height="8" rx="2" fill="#E0E7FF"/>
                <path d="M 48 20 L 48 34 M 54 20 L 54 34" stroke="#CBD5E1" stroke-width="1.5"/>
                <!-- Mustache -->
                <path d="M 40 54 Q 45 52 50 55 Q 55 52 60 54 Q 55 58 50 56 Q 45 58 40 54 Z" fill="#374151"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_astronaut",
        name: "Cosmic Astronaut",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#0F172A"/>
                <!-- Helmet background -->
                <circle cx="50" cy="50" r="36" fill="#E2E8F0"/>
                <!-- Visor -->
                <ellipse cx="50" cy="48" rx="28" ry="20" fill="#38BDF8"/>
                <ellipse cx="50" cy="48" rx="25" ry="17" fill="#0284C7"/>
                <!-- Visor Reflection -->
                <path d="M 32 40 Q 50 32 68 40 Q 55 36 38 42 Z" fill="#FFFFFF" opacity="0.7"/>
                <!-- Suit collar -->
                <path d="M 30 76 Q 50 86 70 76 L 75 100 L 25 100 Z" fill="#94A3B8"/>
                <rect x="42" y="78" width="16" height="8" rx="3" fill="#EF4444"/>
                <circle cx="46" cy="82" r="1.5" fill="#FFFFFF"/>
                <circle cx="54" cy="82" r="1.5" fill="#FFFFFF"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_ninja",
        name: "Shadow Ninja",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#18181B"/>
                <!-- Hood -->
                <circle cx="50" cy="50" r="38" fill="#27272A"/>
                <!-- Face Cutout -->
                <ellipse cx="50" cy="46" rx="24" ry="12" fill="#FFD1B3"/>
                <!-- Eyes -->
                <ellipse cx="40" cy="46" rx="4" ry="5" fill="#09090B"/>
                <ellipse cx="60" cy="46" rx="4" ry="5" fill="#09090B"/>
                <circle cx="41.5" cy="44" r="1.5" fill="#FFFFFF"/>
                <circle cx="61.5" cy="44" r="1.5" fill="#FFFFFF"/>
                <!-- Eyebrows (Determined look) -->
                <path d="M 34 40 L 46 43" stroke="#09090B" stroke-width="2.5" stroke-linecap="round"/>
                <path d="M 66 40 L 54 43" stroke="#09090B" stroke-width="2.5" stroke-linecap="round"/>
                <!-- Headband -->
                <rect x="20" y="28" width="60" height="10" rx="2" fill="#DC2626"/>
                <circle cx="50" cy="33" r="3" fill="#FEF08A"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_cat",
        name: "Cool Cat",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#F97316"/>
                <!-- Ears -->
                <polygon points="22,18 36,40 16,42" fill="#EA580C"/>
                <polygon points="25,24 33,38 20,40" fill="#F472B6"/>
                <polygon points="78,18 64,40 84,42" fill="#EA580C"/>
                <polygon points="75,24 67,38 80,40" fill="#F472B6"/>
                <!-- Head -->
                <circle cx="50" cy="52" r="32" fill="#FDBA74"/>
                <!-- Snout area -->
                <ellipse cx="50" cy="60" rx="14" ry="10" fill="#FFFFFF"/>
                <!-- Nose -->
                <polygon points="46,55 54,55 50,60" fill="#F472B6" rx="1"/>
                <!-- Whiskers -->
                <line x1="20" y1="58" x2="36" y2="59" stroke="#7C2D12" stroke-width="2"/>
                <line x1="18" y1="64" x2="35" y2="63" stroke="#7C2D12" stroke-width="2"/>
                <line x1="80" y1="58" x2="64" y2="59" stroke="#7C2D12" stroke-width="2"/>
                <line x1="82" y1="64" x2="65" y2="63" stroke="#7C2D12" stroke-width="2"/>
                <!-- Sunglasses -->
                <rect x="28" y="44" width="20" height="12" rx="4" fill="#1E293B"/>
                <rect x="52" y="44" width="20" height="12" rx="4" fill="#1E293B"/>
                <line x1="48" y1="48" x2="52" y2="48" stroke="#1E293B" stroke-width="3"/>
                <path d="M 30 46 L 42 54" stroke="#94A3B8" stroke-width="1.5" opacity="0.6"/>
                <path d="M 54 46 L 66 54" stroke="#94A3B8" stroke-width="1.5" opacity="0.6"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_panda",
        name: "Friendly Panda",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#10B981"/>
                <!-- Ears -->
                <circle cx="26" cy="28" r="12" fill="#1F2937"/>
                <circle cx="74" cy="28" r="12" fill="#1F2937"/>
                <!-- Head -->
                <circle cx="50" cy="52" r="32" fill="#FFFFFF"/>
                <!-- Eye Patches -->
                <ellipse cx="38" cy="48" rx="9" ry="11" transform="rotate(-15 38 48)" fill="#1F2937"/>
                <ellipse cx="62" cy="48" rx="9" ry="11" transform="rotate(15 62 48)" fill="#1F2937"/>
                <!-- Eyes -->
                <circle cx="39" cy="47" r="3.5" fill="#FFFFFF"/>
                <circle cx="61" cy="47" r="3.5" fill="#FFFFFF"/>
                <circle cx="40" cy="47" r="2" fill="#1F2937"/>
                <circle cx="60" cy="47" r="2" fill="#1F2937"/>
                <!-- Nose -->
                <ellipse cx="50" cy="58" rx="5" ry="3.5" fill="#1F2937"/>
                <!-- Mouth -->
                <path d="M 45 63 Q 50 67 55 63" fill="none" stroke="#1F2937" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_robot",
        name: "Cyber Bot",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#6366F1"/>
                <!-- Antenna -->
                <line x1="50" y1="12" x2="50" y2="24" stroke="#93C5FD" stroke-width="4"/>
                <circle cx="50" cy="10" r="5" fill="#EF4444"/>
                <!-- Head -->
                <rect x="22" y="24" width="56" height="48" rx="12" fill="#CBD5E1"/>
                <rect x="26" y="28" width="48" height="40" rx="8" fill="#475569"/>
                <!-- Screen/Eyes -->
                <rect x="32" y="36" width="36" height="16" rx="6" fill="#0F172A"/>
                <circle cx="42" cy="44" r="4" fill="#22C55E"/>
                <circle cx="58" cy="44" r="4" fill="#22C55E"/>
                <circle cx="43" cy="43" r="1.5" fill="#FFFFFF"/>
                <circle cx="59" cy="43" r="1.5" fill="#FFFFFF"/>
                <!-- Mouth -->
                <rect x="38" y="58" width="24" height="4" rx="2" fill="#22C55E"/>
                <line x1="44" y1="58" x2="44" y2="62" stroke="#0F172A" stroke-width="1.5"/>
                <line x1="50" y1="58" x2="50" y2="62" stroke="#0F172A" stroke-width="1.5"/>
                <line x1="56" y1="58" x2="56" y2="62" stroke="#0F172A" stroke-width="1.5"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_hero",
        name: "Super Hero",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#DC2626"/>
                <!-- Hair -->
                <path d="M 28 40 Q 30 18 50 18 Q 70 18 72 40 Z" fill="#1E1B4B"/>
                <!-- Head -->
                <circle cx="50" cy="52" r="30" fill="#FFD1B3"/>
                <!-- Mask -->
                <path d="M 24 44 Q 50 48 76 44 L 74 54 Q 50 60 26 54 Z" fill="#2563EB"/>
                <!-- Mask eye holes -->
                <ellipse cx="40" cy="49" rx="6" ry="4" fill="#FFFFFF"/>
                <ellipse cx="60" cy="49" rx="6" ry="4" fill="#FFFFFF"/>
                <circle cx="40" cy="49" r="2.5" fill="#1E2937"/>
                <circle cx="60" cy="49" r="2.5" fill="#1E2937"/>
                <!-- Smile -->
                <path d="M 43 64 Q 50 70 57 64" fill="none" stroke="#1F2937" stroke-width="2.5" stroke-linecap="round"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_fox",
        name: "Clever Fox",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#0284C7"/>
                <!-- Ears -->
                <polygon points="18,16 40,36 12,46" fill="#E11D48"/>
                <polygon points="22,22 36,36 16,42" fill="#FFFFFF"/>
                <polygon points="82,16 60,36 88,46" fill="#E11D48"/>
                <polygon points="78,22 64,36 84,42" fill="#FFFFFF"/>
                <!-- Head -->
                <polygon points="50,82 18,44 82,44" fill="#F43F5E"/>
                <!-- White Cheeks -->
                <polygon points="50,82 18,44 36,54" fill="#FFFFFF"/>
                <polygon points="50,82 82,44 64,54" fill="#FFFFFF"/>
                <!-- Eyes -->
                <ellipse cx="36" cy="46" rx="4" ry="6" fill="#1F2937"/>
                <ellipse cx="64" cy="46" rx="4" ry="6" fill="#1F2937"/>
                <circle cx="37" cy="44" r="1.5" fill="#FFFFFF"/>
                <circle cx="65" cy="44" r="1.5" fill="#FFFFFF"/>
                <!-- Nose -->
                <circle cx="50" cy="80" r="4.5" fill="#1F2937"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_wizard",
        name: "Magic Wizard",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#7C3AED"/>
                <!-- Face -->
                <circle cx="50" cy="54" r="28" fill="#FFD1B3"/>
                <!-- Beard -->
                <path d="M 26 56 Q 20 86 50 94 Q 80 86 74 56 Z" fill="#F1F5F9"/>
                <!-- Eyes -->
                <circle cx="41" cy="48" r="3.5" fill="#1E2937"/>
                <circle cx="59" cy="48" r="3.5" fill="#1E2937"/>
                <!-- Wizard Hat -->
                <path d="M 16 38 Q 50 34 84 38 L 50 4 Z" fill="#4C1D95"/>
                <ellipse cx="50" cy="38" rx="34" ry="6" fill="#5B21B6"/>
                <!-- Stars on hat -->
                <polygon points="50,14 52,18 56,18 53,21 54,25 50,22 46,25 47,21 44,18 48,18" fill="#FACC15"/>
            </svg>
        `)}`
    },
    {
        id: "cartoon_gamer",
        name: "Pro Gamer",
        url: `data:image/svg+xml;utf8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="50" fill="#EC4899"/>
                <!-- Head -->
                <circle cx="50" cy="52" r="30" fill="#FFD1B3"/>
                <!-- Hair -->
                <path d="M 22 46 Q 24 16 50 16 Q 76 16 78 46 Q 66 32 50 34 Q 34 32 22 46 Z" fill="#06B6D4"/>
                <!-- Headphones band -->
                <path d="M 20 50 Q 20 20 50 20 Q 80 20 80 50" fill="none" stroke="#1E293B" stroke-width="6"/>
                <!-- Earcups -->
                <rect x="14" y="44" width="12" height="20" rx="5" fill="#3B82F6"/>
                <rect x="74" y="44" width="12" height="20" rx="5" fill="#3B82F6"/>
                <!-- Eyes -->
                <circle cx="40" cy="50" r="4" fill="#1E293B"/>
                <circle cx="60" cy="50" r="4" fill="#1E293B"/>
                <circle cx="41.5" cy="48.5" r="1.5" fill="#FFFFFF"/>
                <circle cx="61.5" cy="48.5" r="1.5" fill="#FFFFFF"/>
                <!-- Mic -->
                <path d="M 22 58 Q 28 68 40 66" fill="none" stroke="#1E293B" stroke-width="3" stroke-linecap="round"/>
                <circle cx="41" cy="66" r="3" fill="#EF4444"/>
            </svg>
        `)}`
    }
];

export const DEFAULT_CARTOON_AVATAR = CARTOON_AVATARS[0].url;
