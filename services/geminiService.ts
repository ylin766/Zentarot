import { GoogleGenAI } from "@google/genai";
import { TarotCardData, CardOrientation } from "../types";

// 定义挑战性卡牌（需要净化/冥想的牌）
const CHALLENGING_CARDS = [
  "Death",
  "The Tower",
  "The Devil",
  "The Moon",
  "The Hanged Man",
  "Wheel of Fortune" // 逆位时也具有挑战性
];

export interface TarotReadingResult {
  interpretation: string;
  hasChallengeCard: boolean;
  challengeCards: string[];
  energyFlow: "harmonious" | "conflicting" | "transformative";
}

export type Language = "zh" | "en";

export async function interpretTarot(
  cards: { card: TarotCardData, orientation: CardOrientation }[],
  language: Language = "zh"
): Promise<TarotReadingResult> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

  // 检测挑战性卡牌
  const challengeCards = cards
    .filter(c => CHALLENGING_CARDS.includes(c.card.name) || c.orientation === CardOrientation.REVERSED)
    .map(c => `${c.card.name} (${c.orientation})`);
  const hasChallengeCard = challengeCards.length > 0;

  if (!apiKey) {
    console.error("Gemini API Key is missing");
    return {
      interpretation: "The stars are cloudy... (Missing API Key)",
      hasChallengeCard,
      challengeCards,
      energyFlow: "harmonious"
    };
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    // 构建详细的卡牌描述，包含正逆位含义
    const cardDescriptions = cards.map((c, i) => {
      const positionZh = i === 0 ? "过去" : i === 1 ? "现在" : "未来";
      const positionEn = i === 0 ? "Past" : i === 1 ? "Present" : "Future";
      const orientationZh = c.orientation === CardOrientation.UPRIGHT ? "正位" : "逆位";
      const orientationEn = c.orientation === CardOrientation.UPRIGHT ? "Upright" : "Reversed";
      const meaning = c.orientation === CardOrientation.UPRIGHT ? c.card.meaning_up : c.card.meaning_rev;

      if (language === "zh") {
        return `${positionZh}: ${c.card.name} (${orientationZh}) - ${meaning}`;
      } else {
        return `${positionEn}: ${c.card.name} (${orientationEn}) - ${meaning}`;
      }
    }).join('\n');

    const promptZh = `
你是一位神秘且富有洞察力的塔罗占卜师。请为求问者解读以下三张牌阵。

【牌阵】
${cardDescriptions}

【解读要求】
1. **牌组化学反应**：不要孤立解读每张牌，请分析三张牌之间的能量流动、呼应或矛盾关系。
2. **过去→现在→未来**：以时间线串联三张牌，揭示因果关系和发展轨迹。
3. **核心洞见**：找出这个牌阵想要传达的核心信息或警示。
4. **行动建议**：基于牌阵给出一条具体、可执行的建议。

【格式要求】
- 使用神秘、平和的语言风格
- 控制在200字以内
- 用中文回答
- 不要使用 markdown 格式（如粗体、标题等）
- 可以使用换行分段
`;

    const promptEn = `
You are a mystical and insightful Tarot Reader. Interpret the following three-card spread for the seeker.

【The Spread】
${cardDescriptions}

【Reading Guidelines】
1. **Card Synergy**: Don't interpret each card in isolation. Analyze the energy flow, resonance, or tensions between the three cards.
2. **Past → Present → Future**: Connect the cards as a timeline, revealing cause-and-effect and developmental trajectory.
3. **Core Insight**: Identify the central message or warning this spread conveys.
4. **Actionable Advice**: Provide one specific, actionable suggestion based on the spread.

【Format Requirements】
- Use a mystical yet peaceful tone
- Keep it under 150 words
- Do not use markdown formatting (bold, headers, etc.)
- You may use paragraph breaks
`;

    const prompt = language === "zh" ? promptZh : promptEn;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-lite',
      contents: prompt,
    });

    // 判断能量流动类型
    let energyFlow: "harmonious" | "conflicting" | "transformative" = "harmonious";
    if (hasChallengeCard && challengeCards.length >= 2) {
      energyFlow = "conflicting";
    } else if (hasChallengeCard) {
      energyFlow = "transformative";
    }

    return {
      interpretation: response.text || "The cosmos remains silent.",
      hasChallengeCard,
      challengeCards,
      energyFlow
    };
  } catch (error: any) {
    console.error("=== Gemini API Error Details ===");
    console.error("Error:", error);
    console.error("Error message:", error?.message);
    console.error("Full error object:", JSON.stringify(error, null, 2));
    console.error("================================");
    return {
      interpretation: `API Error: ${error?.message || error || "Unknown error"}`,
      hasChallengeCard,
      challengeCards,
      energyFlow: "harmonious"
    };
  }
}
