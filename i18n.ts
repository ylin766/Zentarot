import { Language } from './services/geminiService';

export const i18n: Record<Language, any> = {
    zh: {
        // Loading
        loading: '正在召唤神秘力量',

        // 开始页面
        title: '塔罗',
        beginReading: '开启占卜',
        drawHint: '抽取三张牌揭示你的命运',

        // 手势模式
        gestureMode: '手势模式',
        mouseMode: '鼠标模式',
        hints: {
            open: '张开手: 浏览',
            pinch: '捏合: 抓取',
            lift: '向上提: 抽牌',
            waiting: '等待手势...'
        },

        // 抽牌进度
        cardsDrawn: '已抽取',
        of: '/',
        cards: '张',

        // 分析中
        analyzing: '与星辰交流中...',

        // 结果页面
        theReading: '神谕解读',
        startOver: '重新开始',

        // 挑战卡牌冥想
        challengeEnergy: '您的牌阵中出现了挑战性能量',
        startMeditation: '开始净化冥想',
        seconds: '秒',
        pause: '暂停',
        resume: '继续',
        skip: '跳过',
        meditationHint: '深呼吸，释放负面能量...',

        // 历史抽屉
        chronicles: '占卜记录',
        sessionReading: '本次解读可查看',
        momentInTime: '时光印记...',

        // 摄像头
        cameraAccess: '请允许摄像头访问',

        // 错误页面
        cosmicError: '星际干扰已检测',
        reconnect: '重新连接',

        // 卡牌方向
        upright: '正位',
        reversed: '逆位',
    },
    en: {
        // Loading
        loading: 'SUMMONING ARCANA',

        // Start page
        title: 'TAROT',
        beginReading: 'BEGIN READING',
        drawHint: 'Draw 3 cards to reveal your destiny',

        // Gesture Mode
        gestureMode: 'Gesture Mode',
        mouseMode: 'Mouse Mode',
        hints: {
            open: 'Open hand: Browse',
            pinch: 'Pinch: Grab',
            lift: 'Lift up: Draw',
            waiting: 'Waiting for gesture...'
        },

        // Drawing progress
        cardsDrawn: 'CARDS DRAWN',
        of: '/',
        cards: '',

        // Analyzing
        analyzing: 'COMMUNING WITH THE STARS...',

        // Result page
        theReading: 'THE READING',
        startOver: 'Start Over',

        // Challenge card meditation
        challengeEnergy: 'Challenging energy detected in your spread',
        startMeditation: 'Begin Purification Meditation',
        seconds: 's',
        pause: 'Pause',
        resume: 'Resume',
        skip: 'Skip',
        meditationHint: 'Breathe deeply, release negative energy...',

        // History drawer
        chronicles: 'Chronicles',
        sessionReading: 'Session Reading Available',
        momentInTime: 'A moment in time...',

        // Camera
        cameraAccess: 'Please allow camera access',

        // Error page
        cosmicError: 'Cosmic Interference Detected',
        reconnect: 'Reconnect',

        // Card orientation
        upright: 'Upright',
        reversed: 'Reversed',
    }
};

export const t = (lang: Language) => i18n[lang];
