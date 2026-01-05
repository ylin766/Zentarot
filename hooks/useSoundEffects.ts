import { useCallback, useRef, useMemo } from 'react';

// Web Audio API 音效生成器
export const useSoundEffects = (enabled: boolean) => {
    const audioContextRef = useRef<AudioContext | null>(null);

    // 获取或创建 AudioContext
    const getAudioContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return audioContextRef.current;
    }, []);

    // 卡牌滑动音效 - 轻柔的"嗖"声
    const playSlideSound = useCallback(() => {
        if (!enabled) return;

        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            // 使用白噪声的感觉模拟滑动
            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(800, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 0.1);

            gainNode.gain.setValueAtTime(0.03, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.1);
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }, [enabled, getAudioContext]);

    // 卡牌抓取音效 - 低沉的"咚"
    const playGrabSound = useCallback(() => {
        if (!enabled) return;

        try {
            const ctx = getAudioContext();
            const oscillator = ctx.createOscillator();
            const gainNode = ctx.createGain();

            oscillator.connect(gainNode);
            gainNode.connect(ctx.destination);

            oscillator.type = 'sine';
            oscillator.frequency.setValueAtTime(150, ctx.currentTime);
            oscillator.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.15);

            gainNode.gain.setValueAtTime(0.08, ctx.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

            oscillator.start(ctx.currentTime);
            oscillator.stop(ctx.currentTime + 0.15);
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }, [enabled, getAudioContext]);

    // 抽牌成功音效 - 神秘的上升音调
    const playDrawSound = useCallback(() => {
        if (!enabled) return;

        try {
            const ctx = getAudioContext();

            // 主音调
            const osc1 = ctx.createOscillator();
            const gain1 = ctx.createGain();
            osc1.connect(gain1);
            gain1.connect(ctx.destination);

            osc1.type = 'sine';
            osc1.frequency.setValueAtTime(220, ctx.currentTime);
            osc1.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.3);

            gain1.gain.setValueAtTime(0.1, ctx.currentTime);
            gain1.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);

            osc1.start(ctx.currentTime);
            osc1.stop(ctx.currentTime + 0.4);

            // 和声
            const osc2 = ctx.createOscillator();
            const gain2 = ctx.createGain();
            osc2.connect(gain2);
            gain2.connect(ctx.destination);

            osc2.type = 'sine';
            osc2.frequency.setValueAtTime(330, ctx.currentTime + 0.05);
            osc2.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.35);

            gain2.gain.setValueAtTime(0.05, ctx.currentTime + 0.05);
            gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);

            osc2.start(ctx.currentTime + 0.05);
            osc2.stop(ctx.currentTime + 0.45);
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }, [enabled, getAudioContext]);

    // 翻牌音效 - 纸张翻动的感觉
    const playFlipSound = useCallback(() => {
        if (!enabled) return;

        try {
            const ctx = getAudioContext();

            // 使用多个短促的高频音模拟翻页
            for (let i = 0; i < 3; i++) {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();

                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);

                osc.type = 'sawtooth';
                filter.type = 'lowpass';
                filter.frequency.value = 2000;

                const startTime = ctx.currentTime + i * 0.05;
                osc.frequency.setValueAtTime(1500 - i * 200, startTime);

                gain.gain.setValueAtTime(0.02, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.05);

                osc.start(startTime);
                osc.stop(startTime + 0.05);
            }
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }, [enabled, getAudioContext]);

    // 燃烧成灰烬音效 - 火焰燃烧的声音
    const playBurnSound = useCallback(() => {
        if (!enabled) return;

        try {
            const ctx = getAudioContext();

            // 创建噪声源模拟火焰
            const bufferSize = ctx.sampleRate * 1.5; // 1.5秒
            const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
            const output = noiseBuffer.getChannelData(0);

            for (let i = 0; i < bufferSize; i++) {
                output[i] = Math.random() * 2 - 1;
            }

            const noise = ctx.createBufferSource();
            noise.buffer = noiseBuffer;

            // 低通滤波器让声音更像火焰
            const filter = ctx.createBiquadFilter();
            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(800, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(200, ctx.currentTime + 1.5);

            const gain = ctx.createGain();
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.15, ctx.currentTime + 0.2); // 快速升起
            gain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.8);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5); // 渐隐

            noise.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            noise.start(ctx.currentTime);
            noise.stop(ctx.currentTime + 1.5);

            // 添加一个低沉的隆隆声
            const rumble = ctx.createOscillator();
            const rumbleGain = ctx.createGain();
            rumble.type = 'sine';
            rumble.frequency.setValueAtTime(60, ctx.currentTime);
            rumble.frequency.exponentialRampToValueAtTime(30, ctx.currentTime + 1.5);

            rumbleGain.gain.setValueAtTime(0, ctx.currentTime);
            rumbleGain.gain.linearRampToValueAtTime(0.1, ctx.currentTime + 0.3);
            rumbleGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.5);

            rumble.connect(rumbleGain);
            rumbleGain.connect(ctx.destination);

            rumble.start(ctx.currentTime);
            rumble.stop(ctx.currentTime + 1.5);
        } catch (e) {
            console.warn('Sound effect failed:', e);
        }
    }, [enabled, getAudioContext]);

    return useMemo(() => ({
        playSlideSound,
        playGrabSound,
        playDrawSound,
        playFlipSound,
        playBurnSound
    }), [playSlideSound, playGrabSound, playDrawSound, playFlipSound, playBurnSound]);
};
