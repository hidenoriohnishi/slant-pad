// CharBoxの型定義
export interface CharBox {
  x: number;
  y: number;
  w: number;
  h: number;
  idx: number;
}

// ScrollOffsetの型定義
export interface ScrollOffset {
  x: number;
  y: number;
}

// テキスト表示の寸法
export interface TextDimensions {
  width: number;
  height: number;
}

// ウィンドウサイズ
export interface WindowSize {
  width: number;
  height: number;
} 