import React, { useState, useEffect } from 'react';

interface GestureGuideProps {
    onComplete: () => void;
    language: 'en' | 'zh';
}

const GestureGuide: React.FC<GestureGuideProps> = ({ onComplete, language }) => {
    const [step, setStep] = useState(0);
    const [isVisible, setIsVisible] = useState(true);

    const steps = language === 'zh' ? [
        {
            icon: '🖐️',
            title: '张开手掌',
            description: '张开手掌浏览卡牌，左右移动选择',
            animation: 'animate-pulse'
        },
        {
            icon: '🤏',
            title: '捏合抓取',
            description: '捏合手指抓住想要的卡牌',
            animation: 'animate-bounce'
        },
        {
            icon: '⬆️',
            title: '向上抽取',
            description: '保持捏合并向上提起抽出卡牌',
            animation: 'animate-float'
        }
    ] : [
        {
            icon: '🖐️',
            title: 'Open Palm',
            description: 'Open your hand to browse cards, move left/right to select',
            animation: 'animate-pulse'
        },
        {
            icon: '🤏',
            title: 'Pinch to Grab',
            description: 'Pinch your fingers to grab the card you want',
            animation: 'animate-bounce'
        },
        {
            icon: '⬆️',
            title: 'Lift to Draw',
            description: 'Keep pinching and lift up to draw the card',
            animation: 'animate-float'
        }
    ];

    useEffect(() => {
        // 自动播放步骤
        if (step < steps.length - 1) {
            const timer = setTimeout(() => {
                setStep(prev => prev + 1);
            }, 2500);
            return () => clearTimeout(timer);
        }
    }, [step, steps.length]);

    const handleSkip = () => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
    };

    const handleStart = () => {
        setIsVisible(false);
        setTimeout(onComplete, 300);
    };

    if (!isVisible) return null;

    const currentStep = steps[step];

    return (
        <div className={`fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md transition-opacity duration-300 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            <div className="max-w-md w-full mx-4 text-center">
                {/* 标题 */}
                <h2 className="text-2xl font-bold text-gold mb-8">
                    {language === 'zh' ? '手势指南' : 'Gesture Guide'}
                </h2>

                {/* 步骤指示器 */}
                <div className="flex justify-center gap-2 mb-8">
                    {steps.map((_, i) => (
                        <div
                            key={i}
                            className={`w-2 h-2 rounded-full transition-all duration-300 ${i === step ? 'bg-gold w-6' : i < step ? 'bg-gold/60' : 'bg-white/30'
                                }`}
                        />
                    ))}
                </div>

                {/* 动画图标 */}
                <div className={`text-8xl mb-6 ${currentStep.animation}`}>
                    {currentStep.icon}
                </div>

                {/* 步骤标题 */}
                <h3 className="text-xl font-semibold text-white mb-3">
                    {currentStep.title}
                </h3>

                {/* 步骤描述 */}
                <p className="text-white/70 mb-12 px-4">
                    {currentStep.description}
                </p>

                {/* 按钮 */}
                <div className="flex justify-center gap-4">
                    <button
                        onClick={handleSkip}
                        className="px-6 py-2 text-white/60 hover:text-white transition-colors"
                    >
                        {language === 'zh' ? '跳过' : 'Skip'}
                    </button>
                    {step === steps.length - 1 && (
                        <button
                            onClick={handleStart}
                            className="px-8 py-3 bg-gradient-to-r from-purple-600 to-gold rounded-full text-white font-semibold hover:scale-105 transition-transform"
                        >
                            {language === 'zh' ? '开始抽卡' : 'Start Drawing'}
                        </button>
                    )}
                </div>
            </div>

            {/* 自定义动画 */}
            <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
        .animate-float {
          animation: float 1.5s ease-in-out infinite;
        }
      `}</style>
        </div>
    );
};

export default GestureGuide;
