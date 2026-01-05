import React from 'react';

interface SoundToggleProps {
    enabled: boolean;
    onToggle: () => void;
}

const SoundToggle: React.FC<SoundToggleProps> = ({ enabled, onToggle }) => {
    return (
        <button
            onClick={onToggle}
            className="w-10 h-10 rounded-full bg-black/40 backdrop-blur-sm border border-white/20 flex items-center justify-center hover:bg-black/60 hover:border-gold/50 transition-all group"
            title={enabled ? '关闭音效' : '开启音效'}
        >
            {enabled ? (
                // 音效开启图标
                <svg
                    className="w-5 h-5 text-gold group-hover:scale-110 transition-transform"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M15.536 8.464a5 5 0 010 7.072M18.364 5.636a9 9 0 010 12.728M11 5L6 9H2v6h4l5 4V5z"
                    />
                </svg>
            ) : (
                // 音效关闭图标
                <svg
                    className="w-5 h-5 text-white/50 group-hover:text-white/80 group-hover:scale-110 transition-all"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                    />
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                    />
                </svg>
            )}
        </button>
    );
};

export default SoundToggle;
