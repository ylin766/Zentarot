// 程序化音效服务 - 使用 Web Audio API 生成音效，无需外部音频文件

class SoundService {
    private audioContext: AudioContext | null = null;
    private enabled: boolean = true;
    private volume: number = 0.4;

    private getAudioContext(): AudioContext {
        if (!this.audioContext) {
            this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        }
        return this.audioContext;
    }

    // 创建增益节点
    private createGain(ctx: AudioContext, volume: number = this.volume): GainNode {
        const gain = ctx.createGain();
        gain.gain.value = volume;
        gain.connect(ctx.destination);
        return gain;
    }

    // 卡片滚动音 - 轻柔的滑动声
    playCardScroll() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        const gain = this.createGain(ctx, this.volume * 0.3);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(400, ctx.currentTime + 0.05);

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.value = 2000;

        osc.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    }

    // 抓取卡片音 - 捏合/抓取音效
    playCardGrab() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        const gain = this.createGain(ctx, this.volume * 0.5);

        // 低频冲击
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(150, ctx.currentTime);
        osc1.frequency.exponentialRampToValueAtTime(80, ctx.currentTime + 0.1);

        // 高频点缀
        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(600, ctx.currentTime);
        osc2.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

        const gain2 = this.createGain(ctx, this.volume * 0.2);

        osc1.connect(gain);
        osc2.connect(gain2);

        gain.gain.setValueAtTime(this.volume * 0.4, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.15);

        gain2.gain.setValueAtTime(this.volume * 0.2, ctx.currentTime);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1);

        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.15);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 0.1);
    }

    // 灰烬燃烧音效 - 持续的噼啪声
    playAshBurn() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();

        // 使用噪声模拟燃烧声
        const bufferSize = ctx.sampleRate * 0.8;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // 模拟噼啪声
            data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (ctx.sampleRate * 0.3));
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 3000;
        filter.Q.value = 1;

        const gain = this.createGain(ctx, this.volume * 0.25);

        source.connect(filter);
        filter.connect(gain);

        gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);

        source.start(ctx.currentTime);
    }

    // 结果揭示音 - 神秘的钟声/共鸣
    playResultReveal() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();

        // 多层和声
        const frequencies = [523.25, 659.25, 783.99]; // C5, E5, G5 和弦

        frequencies.forEach((freq, i) => {
            const osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = freq;

            const gain = this.createGain(ctx, this.volume * 0.15);
            osc.connect(gain);

            const startTime = ctx.currentTime + i * 0.05;
            gain.gain.setValueAtTime(0, startTime);
            gain.gain.linearRampToValueAtTime(this.volume * 0.2, startTime + 0.1);
            gain.gain.exponentialRampToValueAtTime(0.001, startTime + 1.5);

            osc.start(startTime);
            osc.stop(startTime + 1.5);
        });
    }

    // 按钮点击音 - 轻柔的点击
    playButtonClick() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();
        const gain = this.createGain(ctx, this.volume * 0.3);

        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1000, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);

        osc.connect(gain);

        gain.gain.setValueAtTime(this.volume * 0.3, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 0.08);
    }

    // 冥想开始音 - 平和的开始音
    playMeditationStart() {
        if (!this.enabled) return;
        const ctx = this.getAudioContext();

        // 低沉的钟声
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = 220; // A3

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = 330; // E4 (五度)

        const gain = this.createGain(ctx, this.volume * 0.25);
        const gain2 = this.createGain(ctx, this.volume * 0.15);

        osc.connect(gain);
        osc2.connect(gain2);

        gain.gain.setValueAtTime(0, ctx.currentTime);
        gain.gain.linearRampToValueAtTime(this.volume * 0.3, ctx.currentTime + 0.2);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

        gain2.gain.setValueAtTime(0, ctx.currentTime);
        gain2.gain.linearRampToValueAtTime(this.volume * 0.2, ctx.currentTime + 0.3);
        gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 2);

        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + 2);
        osc2.start(ctx.currentTime);
        osc2.stop(ctx.currentTime + 2);
    }

    // 通用播放方法
    play(soundType: string) {
        switch (soundType) {
            case 'cardScroll':
                this.playCardScroll();
                break;
            case 'cardGrab':
                this.playCardGrab();
                break;
            case 'ashBurn':
                this.playAshBurn();
                break;
            case 'resultReveal':
                this.playResultReveal();
                break;
            case 'buttonClick':
                this.playButtonClick();
                break;
            case 'meditationStart':
                this.playMeditationStart();
                break;
        }
    }

    setEnabled(enabled: boolean) {
        this.enabled = enabled;
    }

    isEnabled(): boolean {
        return this.enabled;
    }

    setVolume(volume: number) {
        this.volume = Math.max(0, Math.min(1, volume));
    }

    // 初始化音频上下文（需要用户交互后调用）
    init() {
        this.getAudioContext();
    }
}

// 单例导出
export const soundService = new SoundService();

// 音效名称常量
export const SoundType = {
    CARD_SCROLL: 'cardScroll',
    CARD_GRAB: 'cardGrab',
    ASH_BURN: 'ashBurn',
    RESULT_REVEAL: 'resultReveal',
    BUTTON_CLICK: 'buttonClick',
    MEDITATION_START: 'meditationStart',
} as const;
