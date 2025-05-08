import { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { CharBox, ScrollOffset, TextDimensions } from '../types/diagonalEditor';
import { LINE_GAP, getLetterSpacing, getCanvasDimensions } from '../utils/diagonalEditorUtils';
import { HORIZONTAL_TO_VERTICAL_CHAR_MAP, VERTICAL_TO_HORIZONTAL_CHAR_MAP } from '../utils/characterMappings';
import { useWindowSize } from './useWindowSize';

const STORAGE_KEY = 'diagonal-editor-content';
const STORAGE_SCROLL_KEY = 'diagonal-editor-scroll';
const VERTICAL_MODE_THRESHOLD = 60;
const CARET_UPDATE_DELAY = 10;

export function useDiagonalEditor(fontFamily: string = 'Xiaolai, sans-serif', fontSize: number = 16, angle: number = 8) {
  const [text, setText] = useState<string>('');
  const [scrollOffset, setScrollOffset] = useState<ScrollOffset>({ x: 0, y: 0 });
  const [textDimensions, setTextDimensions] = useState<TextDimensions>({ width: 0, height: 0 });
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const windowSize = useWindowSize();
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const charBoxesRef = useRef<CharBox[]>([]);
  const lastMousePosRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });

  // 垂直モードかどうかをメモ化
  const isVerticalMode = useMemo(() => angle > VERTICAL_MODE_THRESHOLD, [angle]);

  // 角度に応じて文字を変換する関数
  const transformCharForDisplay = useCallback((char: string, isVertical: boolean) => {
    try {
      if (isVertical) {
        return HORIZONTAL_TO_VERTICAL_CHAR_MAP[char] || char;
      } else {
        return VERTICAL_TO_HORIZONTAL_CHAR_MAP[char] || char;
      }
    } catch (err) {
      console.error('文字変換エラー:', err);
      return char;
    }
  }, []);

  // ローカルストレージからデータを読み込む
  useEffect(() => {
    const savedText = localStorage.getItem(STORAGE_KEY);
    const savedScrollOffset = localStorage.getItem(STORAGE_SCROLL_KEY);
    
    if (savedText) {
      setText(savedText);
    }
    
    if (savedScrollOffset) {
      try {
        setScrollOffset(JSON.parse(savedScrollOffset));
      } catch (e) {
        console.error('Failed to parse saved scroll offset', e);
      }
    }
  }, []);

  // テキスト変更時にローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, text);
  }, [text]);

  // スクロールオフセット変更時にローカルストレージに保存
  useEffect(() => {
    localStorage.setItem(STORAGE_SCROLL_KEY, JSON.stringify(scrollOffset));
  }, [scrollOffset]);

  // クリア機能
  const clearText = useCallback(() => {
    setText('');
    setScrollOffset({ x: 0, y: 0 });
    if (textareaRef.current) {
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(0, 0);
    }
  }, []);

  // ファイルをロードする機能
  const loadFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      if (content) {
        setText(content);
        setScrollOffset({ x: 0, y: 0 });
        if (textareaRef.current) {
          textareaRef.current.focus();
          textareaRef.current.setSelectionRange(0, 0);
        }
      }
    };
    reader.readAsText(file);
  }, []);

  // ファイルを保存する機能
  const saveFile = useCallback(() => {
    if (!text) return;
    
    // 現在の日時を取得してファイル名を生成
    const now = new Date();
    const dateStr = now.toISOString().replace(/[:.]/g, '-').replace('T', '_').substring(0, 19);
    const fileName = `slant_pad_${dateStr}.txt`;
    
    // Blobを作成
    const blob = new Blob([text], { type: 'text/plain' });
    
    // ダウンロードリンクを作成してクリック
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    
    // クリーンアップ
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 100);
  }, [text]);

  // キャンバスの幅と高さを計算
  const getDimensions = useCallback(() => {
    return getCanvasDimensions(windowSize.width, windowSize.height);
  }, [windowSize]);

  // キャンバスの描画処理
  const drawCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const textarea = textareaRef.current;
    if (!canvas || !textarea) return;

    const { width, height } = getDimensions();
    canvas.width = width;
    canvas.height = height;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    ctx.clearRect(0, 0, width, height);
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.textBaseline = 'top';
    
    const theta = (angle * Math.PI) / 180;
    const letterSpacing = getLetterSpacing(angle, fontSize);
    const lines = text.split(/\n/);
    
    // 最大オフセットの計算
    const maxOffset = Math.sin(theta) * (fontSize + LINE_GAP) * (lines.length - 1);
    let baseX = fontSize + Math.max(0, maxOffset) - scrollOffset.x;
    let baseY = fontSize - scrollOffset.y;
    
    // 行方向の移動ベクトル
    const perpX = -Math.sin(theta) * (fontSize + LINE_GAP);
    const perpY = Math.cos(theta) * (fontSize + LINE_GAP);
    
    let globalCharIndex = 0;
    let caretX = baseX, caretY = baseY;
    const caretPos = textarea.selectionStart || 0;
    const selStart = textarea.selectionStart ?? 0;
    const selEnd = textarea.selectionEnd ?? 0;
    const charBoxes: CharBox[] = [];
    
    // テキスト全体の寸法を計算するための変数
    let maxTextWidth = 0;
    let maxTextHeight = 0;
    
    // 各行のテキスト描画
    for (let lineIdx = 0; lineIdx < lines.length; ++lineIdx) {
      let x = baseX + perpX * lineIdx;
      let y = baseY + perpY * lineIdx;
      const line = lines[lineIdx];
      let lineWidth = 0;
      
      // 各文字の描画
      for (let i = 0; i < line.length; ++i, ++globalCharIndex) {
        try {
          const originalChar = line[i];
          const displayChar = transformCharForDisplay(originalChar, isVerticalMode);
          
          // 実際に使用する文字の幅を測定
          const w = ctx.measureText(displayChar).width + letterSpacing;
          
          // 描画範囲内かどうかをチェック
          if (x >= -w && x <= width && y >= -fontSize && y <= height) {
            // 選択範囲の背景色描画
            if (globalCharIndex >= Math.min(selStart, selEnd) && globalCharIndex < Math.max(selStart, selEnd)) {
              ctx.save();
              ctx.fillStyle = 'rgba(0, 192, 255, 0.3)';
              ctx.fillRect(x, y, w, fontSize);
              ctx.restore();
            }
            
            // 文字の描画
            ctx.save();
            ctx.translate(x, y);
            ctx.rotate(0);
            ctx.fillText(displayChar, 0, 0);
            ctx.restore();
          }
          
          // 文字のバウンディングボックスを保存（オリジナルの文字インデックスを記録）
          charBoxes.push({ 
            x: x + scrollOffset.x, 
            y: y + scrollOffset.y, 
            w, 
            h: fontSize, 
            idx: globalCharIndex 
          });
          
          // 次の文字位置の計算
          x += Math.cos(theta) * w;
          y += Math.sin(theta) * w;
          lineWidth += w;
          
          if (globalCharIndex + 1 === caretPos) {
            caretX = x;
            caretY = y;
          }
        } catch (err) {
          console.error(`文字描画中にエラー (行=${lineIdx}, 文字位置=${i}):`, err);
        }
      }
      
      if (globalCharIndex === caretPos) {
        caretX = x;
        caretY = y;
      }
      ++globalCharIndex;
      charBoxes.push({ x: x + scrollOffset.x, y: y + scrollOffset.y, w: fontSize, h: fontSize, idx: globalCharIndex - 1 });
      
      // テキスト全体の寸法を更新
      maxTextWidth = Math.max(maxTextWidth, lineWidth);
      maxTextHeight = Math.max(maxTextHeight, y + fontSize);
    }
    
    // テキスト全体の寸法を更新
    setTextDimensions({
      width: maxTextWidth + fontSize * 2,
      height: maxTextHeight + fontSize * 2
    });
    
    charBoxesRef.current = charBoxes;
    
    // カーソル位置の描画
    if (caretX >= 0 && caretX <= width && caretY >= 0 && caretY <= height) {
      ctx.save();
      ctx.strokeStyle = '#00C0C0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(caretX, caretY);
      ctx.lineTo(caretX, caretY + fontSize);
      ctx.stroke();
      ctx.restore();
    }
  }, [text, angle, getDimensions, scrollOffset, fontFamily, fontSize, transformCharForDisplay, isVerticalMode]);

  // キーボードイベントハンドラを追加
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // 縦書きモードの場合だけ矢印キーの機能を入れ替え
    if (isVerticalMode && (e.key === 'ArrowUp' || e.key === 'ArrowDown' || e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      
      const textarea = textareaRef.current;
      if (!textarea) return;
      
      const caretPos = textarea.selectionStart;
      const value = textarea.value;
      
      // 行とその境界を計算
      const lines = value.split('\n');
      
      // 各行の終了位置（改行含む）を計算
      const lineEndPositions = [];
      let position = 0;
      
      for (let i = 0; i < lines.length; i++) {
        position += lines[i].length;
        lineEndPositions.push(position);
        if (i < lines.length - 1) {
          position += 1; // 改行文字の分
        }
      }
      
      // 現在の行番号を特定
      let currentLineIndex = 0;
      while (currentLineIndex < lineEndPositions.length && caretPos > lineEndPositions[currentLineIndex]) {
        currentLineIndex++;
      }
      
      // 現在の行の開始位置を計算
      const currentLineStart = currentLineIndex === 0 ? 0 : lineEndPositions[currentLineIndex - 1] + 1;
      
      // 列位置（行内での位置）を計算
      const currentColumn = caretPos - currentLineStart;
      
      let newCaretPos = caretPos;
      
      switch (e.key) {
        case 'ArrowUp': // 上 → 左 (前の文字に移動)
          if (caretPos > 0) {
            newCaretPos = caretPos - 1;
          }
          break;
          
        case 'ArrowDown': // 下 → 右 (次の文字に移動)
          if (caretPos < value.length) {
            newCaretPos = caretPos + 1;
          }
          break;
          
        case 'ArrowRight': // 右 → 上 (前の行の同じ列)
          if (currentLineIndex > 0) {
            // 前の行の開始位置
            const prevLineStart = currentLineIndex === 1 ? 0 : lineEndPositions[currentLineIndex - 2] + 1;
            
            // 前の行の長さ
            const prevLineLength = lines[currentLineIndex - 1].length;
            
            // 前の行の同じ列（または行の最大長まで）
            const targetColumn = Math.min(currentColumn, prevLineLength);
            
            newCaretPos = prevLineStart + targetColumn;
          }
          break;
          
        case 'ArrowLeft': // 左 → 下 (次の行の同じ列)
          if (currentLineIndex < lines.length - 1) {
            // 次の行の開始位置
            const nextLineStart = lineEndPositions[currentLineIndex] + 1;
            
            // 次の行の長さ
            const nextLineLength = lines[currentLineIndex + 1].length;
            
            // 次の行の同じ列（または行の最大長まで）
            const targetColumn = Math.min(currentColumn, nextLineLength);
            
            newCaretPos = nextLineStart + targetColumn;
          }
          break;
      }
      
      // カーソル位置を更新（ただし、フォーカスはとらない）
      textarea.setSelectionRange(newCaretPos, newCaretPos);
      
      // 状態を更新して再描画
      setTimeout(() => {
        drawCanvas();
      }, CARET_UPDATE_DELAY);
    }
  }, [isVerticalMode, drawCanvas]);

  // スクロールオフセットを更新する共通関数
  const updateScrollOffset = useCallback((dx: number, dy: number) => {
    setScrollOffset(prev => ({
      x: prev.x - dx,
      y: prev.y - dy
    }));
  }, []);

  // スクロールハンドラー
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    
    const scrollFactor = 1.0;
    const deltaBase = e.deltaY * scrollFactor;
    
    // 90度（縦書き）の場合は特別処理
    if (angle === 90) {
      // 縦書きの場合は水平方向にのみスクロール
      setScrollOffset(prev => ({
        x: prev.x + deltaBase,
        y: prev.y
      }));
    } else {
      // 角度に応じたスクロール処理
      const theta = (angle * Math.PI) / 180;
      
      // 移動距離を計算（角度によらず一定になるように正規化）
      const magnitude = Math.sqrt(1 + Math.tan(theta) * Math.tan(theta));
      const normalizeFactor = 1 / magnitude;
      
      // 垂直と水平の両方向に移動（正規化された距離で）
      const deltaY = deltaBase * normalizeFactor;
      const deltaX = -Math.tan(theta) * deltaY;
      
      setScrollOffset(prev => ({
        x: prev.x + deltaX,
        y: prev.y + deltaY
      }));
    }
  }, [angle]);

  // キャンバスをクリックしたときのイベント
  const handleCanvasClick = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    const textarea = textareaRef.current;
    if (!canvas || !textarea) return;

    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;
    
    let closestDist = Infinity;
    let closestIndex = -1;
    
    // 最も近い文字を見つける
    for (const box of charBoxesRef.current) {
      const charX = box.x - scrollOffset.x + box.w / 2;
      const charY = box.y - scrollOffset.y + box.h / 2;
      
      const dx = clickX - charX;
      const dy = clickY - charY;
      const dist = dx * dx + dy * dy;
      
      if (dist < closestDist) {
        closestDist = dist;
        closestIndex = box.idx;
      }
    }
    
    if (closestIndex >= 0) {
      textarea.focus();
      textarea.setSelectionRange(closestIndex, closestIndex);
      drawCanvas();
    }
  }, [scrollOffset, drawCanvas]);

  // マウス移動の処理（共通ロジック）
  const handleMouseDrag = useCallback((clientX: number, clientY: number) => {
    if (!isDragging) return;
    
    const dx = clientX - lastMousePosRef.current.x;
    const dy = clientY - lastMousePosRef.current.y;
    
    updateScrollOffset(dx, dy);
    lastMousePosRef.current = { x: clientX, y: clientY };
  }, [isDragging, updateScrollOffset]);

  // マウスのドラッグを開始
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // 左クリック、中ボタン（ホイール）、または右ボタンでドラッグを開始
    if (e.button === 0 || e.button === 1 || e.button === 2) {
      e.preventDefault();
      setIsDragging(true);
      lastMousePosRef.current = { x: e.clientX, y: e.clientY };
      
      // 全体のマウスイベントを監視
      document.addEventListener('mousemove', handleGlobalMouseMove);
      document.addEventListener('mouseup', handleGlobalMouseUp);
    }
  }, []);

  // マウスの移動
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    handleMouseDrag(e.clientX, e.clientY);
  }, [handleMouseDrag]);

  // マウスを離した時
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    
    // 全体のマウスイベントリスナーを削除
    document.removeEventListener('mousemove', handleGlobalMouseMove);
    document.removeEventListener('mouseup', handleGlobalMouseUp);
  }, []);
  
  // グローバルなマウスイベントを処理する
  const handleGlobalMouseUp = useCallback((e: MouseEvent) => {
    if (isDragging) {
      setIsDragging(false);
      
      document.removeEventListener('mousemove', handleGlobalMouseMove);
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    }
  }, [isDragging]);
  
  // グローバルマウス移動
  const handleGlobalMouseMove = useCallback((e: MouseEvent) => {
    handleMouseDrag(e.clientX, e.clientY);
  }, [handleMouseDrag]);

  // キャレット位置の更新
  const handleCaretUpdate = useCallback(() => {
    drawCanvas();
  }, [drawCanvas]);

  return {
    text,
    setText,
    scrollOffset,
    setScrollOffset,
    textDimensions,
    isDragging,
    textareaRef,
    canvasRef,
    charBoxesRef,
    lastMousePosRef,
    getDimensions,
    drawCanvas,
    handleWheel,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCaretUpdate,
    clearText,
    loadFile,
    saveFile,
    handleKeyDown
  };
} 