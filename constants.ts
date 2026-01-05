
import { TarotCardData } from './types';

// Using jsDelivr for faster and more reliable CDN access to GitHub assets
export const CARD_BACK_URL = '/IMG_7910.PNG';

const getCardUrl = (id: number) => `/cards/m${id.toString().padStart(2, '0')}.jpg`;

export const TAROT_DECK: TarotCardData[] = [
  { id: 0, name: "The Fool", image: getCardUrl(0), meaning_up: "Beginnings, innocence, spontaneity.", meaning_rev: "Recklessness, risk-taking, inconsideration." },
  { id: 1, name: "The Magician", image: getCardUrl(1), meaning_up: "Manifestation, resourcefulness, power.", meaning_rev: "Manipulation, poor planning, untapped talents." },
  { id: 2, name: "The High Priestess", image: getCardUrl(2), meaning_up: "Intuition, sacred knowledge, subconscious.", meaning_rev: "Secrets, disconnected from intuition, withdrawal." },
  { id: 3, name: "The Empress", image: getCardUrl(3), meaning_up: "Femininity, beauty, nature, abundance.", meaning_rev: "Creative block, dependence on others." },
  { id: 4, name: "The Emperor", image: getCardUrl(4), meaning_up: "Authority, structure, a father figure.", meaning_rev: "Domination, excessive control, rigidity." },
  { id: 5, name: "The Hierophant", image: getCardUrl(5), meaning_up: "Spiritual wisdom, religious beliefs, tradition.", meaning_rev: "Personal beliefs, freedom, challenging the status quo." },
  { id: 6, name: "The Lovers", image: getCardUrl(6), meaning_up: "Love, harmony, relationships, choices.", meaning_rev: "Self-love, disharmony, imbalance, misalignment." },
  { id: 7, name: "The Chariot", image: getCardUrl(7), meaning_up: "Control, willpower, success, action.", meaning_rev: "Self-discipline, opposition, lack of direction." },
  { id: 8, name: "Strength", image: getCardUrl(8), meaning_up: "Strength, courage, persuasion, influence.", meaning_rev: "Inner strength, self-doubt, low energy, raw emotion." },
  { id: 9, name: "The Hermit", image: getCardUrl(9), meaning_up: "Soul-searching, introspection, solitude.", meaning_rev: "Isolation, loneliness, withdrawal." },
  { id: 10, name: "Wheel of Fortune", image: getCardUrl(10), meaning_up: "Good luck, karma, life cycles, destiny.", meaning_rev: "Bad luck, resistance to change, breaking cycles." },
  { id: 11, name: "Justice", image: getCardUrl(11), meaning_up: "Justice, fairness, truth, cause and effect.", meaning_rev: "Unfairness, lack of accountability, dishonesty." },
  { id: 12, name: "The Hanged Man", image: getCardUrl(12), meaning_up: "Pause, surrender, letting go, new perspectives.", meaning_rev: "Delays, resistance, stalling, indecision." },
  { id: 13, name: "Death", image: getCardUrl(13), meaning_up: "Endings, change, transformation, transition.", meaning_rev: "Resistance to change, personal transformation, inner purging." },
  { id: 14, name: "Temperance", image: getCardUrl(14), meaning_up: "Balance, moderation, patience, purpose.", meaning_rev: "Imbalance, excess, self-healing, re-alignment." },
  { id: 15, name: "The Devil", image: getCardUrl(15), meaning_up: "Shadow self, attachment, addiction, restriction.", meaning_rev: "Releasing limiting beliefs, exploring dark thoughts, detachment." },
  { id: 16, name: "The Tower", image: getCardUrl(16), meaning_up: "Sudden change, upheaval, chaos, revelation.", meaning_rev: "Personal transformation, fear of change, averting disaster." },
  { id: 17, name: "The Star", image: getCardUrl(17), meaning_up: "Hope, faith, purpose, renewal, spirituality.", meaning_rev: "Lack of faith, despair, self-trust, disconnection." },
  { id: 18, name: "The Moon", image: getCardUrl(18), meaning_up: "Illusion, fear, anxiety, subconscious, intuition.", meaning_rev: "Release of fear, repressed emotion, inner confusion." },
  { id: 19, name: "The Sun", image: getCardUrl(19), meaning_up: "Positivity, fun, warmth, success, vitality.", meaning_rev: "Inner child, feeling down, overly optimistic." },
  { id: 20, name: "Judgement", image: getCardUrl(20), meaning_up: "Judgement, rebirth, inner calling, absolution.", meaning_rev: "Self-doubt, inner critic, ignoring the call." },
  { id: 21, name: "The World", image: getCardUrl(21), meaning_up: "Completion, integration, accomplishment, travel.", meaning_rev: "Seeking personal closure, short-cuts, delays." },
];
