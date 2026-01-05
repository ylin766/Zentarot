import * as THREE from 'three';

export interface OrbColors {
    deep: string;
    mid: string;
    light: string;
    highlight: string;
    rim: string;
}

// Default "Galaxy" Palette
export const DEFAULT_ORB_COLORS: OrbColors = {
    deep: '#0f172a', // Deep Navy
    mid: '#4338ca',  // Indigo
    light: '#a855f7', // Purple
    highlight: '#e0e7ff', // Starlight White
    rim: '#818cf8',  // Soft Indigo
};

// Map Major Arcana ID (0-21) to specific palettes
const CARD_PALETTES: Record<number, OrbColors> = {
    // 0. The Fool (Air) - Yellow/White/Sky Blue
    0: { deep: '#0c4a6e', mid: '#0ea5e9', light: '#fcd34d', highlight: '#ffffff', rim: '#bae6fd' },

    // 1. The Magician (Merc) - Red/Gold/White
    1: { deep: '#450a0a', mid: '#dc2626', light: '#fbbf24', highlight: '#fef3c7', rim: '#fca5a5' },

    // 2. High Priestess (Moon) - Blue/Silver
    2: { deep: '#020617', mid: '#1e3a8a', light: '#94a3b8', highlight: '#e2e8f0', rim: '#cbd5e1' },

    // 3. The Empress (Venus) - Green/Pink/Gold
    3: { deep: '#064e3b', mid: '#10b981', light: '#f472b6', highlight: '#fef08a', rim: '#a7f3d0' },

    // 4. The Emperor (Aries) - Red/Orange
    4: { deep: '#450a0a', mid: '#b91c1c', light: '#fb923c', highlight: '#feb2b2', rim: '#f87171' },

    // 5. The Hierophant (Taurus) - Red-Orange/Green
    5: { deep: '#3f2c22', mid: '#ea580c', light: '#16a34a', highlight: '#fde047', rim: '#fdba74' },

    // 6. The Lovers (Gemini) - Pink/Orange/Air
    6: { deep: '#4c0519', mid: '#db2777', light: '#fbbf24', highlight: '#fff1f2', rim: '#fbcfe8' },

    // 7. The Chariot (Cancer) - Cyan/Silver/Gold
    7: { deep: '#083344', mid: '#0891b2', light: '#cbd5e1', highlight: '#fde047', rim: '#67e8f9' },

    // 8. Strength (Leo) - Gold/Orange/Red
    8: { deep: '#431407', mid: '#ea580c', light: '#facc15', highlight: '#fff7ed', rim: '#fdba74' },

    // 9. The Hermit (Virgo) - Indigo/Gold Lantern
    9: { deep: '#1e1b4b', mid: '#312e81', light: '#fde047', highlight: '#ffffff', rim: '#818cf8' },

    // 10. Wheel of Fortune (Jupiter) - Purple/Blue/Gold
    10: { deep: '#2e1065', mid: '#7c3aed', light: '#3b82f6', highlight: '#fbbf24', rim: '#a78bfa' },

    // 11. Justice (Libra) - Blue/White/Silver
    11: { deep: '#172554', mid: '#2563eb', light: '#e2e8f0', highlight: '#ffffff', rim: '#60a5fa' },

    // 12. Hanged Man (Water) - Sea Green/Blue
    12: { deep: '#0f172a', mid: '#0d9488', light: '#38bdf8', highlight: '#ccfbf1', rim: '#99f6e4' },

    // 13. Death (Scorpio) - Black/Dark Blue/White
    13: { deep: '#000000', mid: '#1e293b', light: '#0f172a', highlight: '#f8fafc', rim: '#94a3b8' },

    // 14. Temperance (Sag) - Purple/Red/Water
    14: { deep: '#4a044e', mid: '#c026d3', light: '#60a5fa', highlight: '#e0e7ff', rim: '#e879f9' },

    // 15. The Devil (Capricorn) - Black/Red/Orange
    15: { deep: '#450a0a', mid: '#000000', light: '#dc2626', highlight: '#fb923c', rim: '#fca5a5' },

    // 16. The Tower (Mars) - Dark/Lightning/Fire
    16: { deep: '#171717', mid: '#b91c1c', light: '#facc15', highlight: '#ffffff', rim: '#fca5a5' },

    // 17. The Star (Aquarius) - Deep Blue/Starry White
    17: { deep: '#020617', mid: '#3b82f6', light: '#60a5fa', highlight: '#ffffff', rim: '#bfdbfe' },

    // 18. The Moon (Pisces) - Indigo/Silver/Pearl
    18: { deep: '#1e1b4b', mid: '#4f46e5', light: '#e2e8f0', highlight: '#f1f5f9', rim: '#a5b4fc' },

    // 19. The Sun (Sun) - Gold/Yellow/Orange
    19: { deep: '#7c2d12', mid: '#f59e0b', light: '#fef08a', highlight: '#ffffff', rim: '#fcd34d' },

    // 20. Judgement (Fire) - Red/Blue/Angel
    20: { deep: '#312e81', mid: '#dc2626', light: '#93c5fd', highlight: '#ffffff', rim: '#a5b4fc' },

    // 21. The World (Saturn) - Green/Blue/Purple/All
    21: { deep: '#0f172a', mid: '#10b981', light: '#8b5cf6', highlight: '#fde047', rim: '#c4b5fd' },
};

export const getCardColors = (cardId: number): OrbColors => {
    return CARD_PALETTES[cardId] || DEFAULT_ORB_COLORS;
};
