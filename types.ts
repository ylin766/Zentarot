
export enum CardOrientation {
  UPRIGHT = 'Upright',
  REVERSED = 'Reversed'
}

export interface TarotCardData {
  id: number;
  name: string;
  image: string;
  meaning_up: string;
  meaning_rev: string;
}

export interface HistoryItem {
  timestamp: number;
  card: TarotCardData;
  orientation: CardOrientation;
}

export enum GestureType {
  NONE = 'NONE',
  OPEN = 'OPEN',
  PINCH = 'PINCH',
  FIST = 'FIST',
  POINT = 'POINT'
}

export interface HandData {
  gesture: GestureType;
  x: number; // 0-1
  y: number; // 0-1
  z: number;
}
