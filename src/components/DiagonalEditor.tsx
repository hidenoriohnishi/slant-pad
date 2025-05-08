import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { MARGIN, BORDER_WIDTH, TOP_MARGIN, TOP_MARGIN_VALUE } from '../utils/diagonalEditorUtils';
import { useDiagonalEditor } from '../hooks/useDiagonalEditor';
import { useFontSettings, FontType } from '../hooks/useFontSettings';
import { FiTrash2, FiUpload, FiDownload } from 'react-icons/fi';

export const DiagonalEditor: React.FC = () => {
  const { fontType, setFontType, fontFamily, fontSize, setFontSize, angle, setAngle } = useFontSettings();

  const {
    text,
    setText,
    scrollOffset,
    textDimensions,
    isDragging,
    textareaRef,
    canvasRef,
    getDimensions,
    drawCanvas,
    handleWheel,
    handleCanvasClick,
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleCaretUpdate,
    setScrollOffset,
    clearText,
    loadFile,
    saveFile,
    handleKeyDown
  } = useDiagonalEditor(fontFamily, fontSize, angle);

  // ファイル入力用のref
  const fileInputRef = useRef<HTMLInputElement>(null);

  // キャンバス描画の実行
  useLayoutEffect(() => {
    drawCanvas();
  }, [drawCanvas]);

  // ドラッグ中にカーソルを適切なスタイルに変更
  useEffect(() => {
    if (isDragging) {
      document.body.style.cursor = 'grabbing';
    } else {
      document.body.style.cursor = 'auto';
    }
    
    return () => {
      document.body.style.cursor = 'auto';
    };
  }, [isDragging]);

  // 初期フォーカス
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const { width, height } = getDimensions();

  // スクロールバーの表示判定と位置計算
  // 90度の場合は水平スクロールバーを表示
  const isVertical = angle === 90;
  const showVerticalScrollbar = !isVertical && textDimensions.height > height;
  const showHorizontalScrollbar = isVertical && textDimensions.height > width;
  
  const scrollbarWidth = 12;
  
  // テキストの斜め方向の総移動距離を計算
  const totalTextHeight = textDimensions.height;
  const totalTextWidth = textDimensions.width + Math.tan((angle * Math.PI) / 180) * totalTextHeight;
  
  const verticalScrollThumbHeight = Math.max(30, (height / totalTextHeight) * height);
  const verticalScrollThumbTop = (scrollOffset.y / (totalTextHeight - height)) * (height - verticalScrollThumbHeight);
  
  const horizontalScrollThumbWidth = Math.max(30, (width / totalTextHeight) * width);
  const horizontalScrollThumbLeft = (scrollOffset.x / (totalTextHeight - width)) * (width - horizontalScrollThumbWidth);

  // ファイルロード処理
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type === 'text/plain' || file.type === 'text/markdown' || file.name.endsWith('.txt') || file.name.endsWith('.md')) {
        loadFile(file);
      } else {
        alert('Please select a .txt or .md file');
      }
      // ファイル選択をリセット
      e.target.value = '';
    }
  };

  // フォントサイズのオプション
  const fontSizeOptions = [8, 10, 12, 14, 16, 18, 20, 24, 28, 32];

  return (
    <div style={{ position: 'fixed', left: 0, top: 0, width: '100vw', height: '100vh', background: '#fff' }}>
      <div style={{ 
        position: 'absolute', 
        left: MARGIN, 
        top: TOP_MARGIN_VALUE, 
        right: MARGIN, 
        height: 40,
        zIndex: 3, 
        display: 'flex', 
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        padding: '10px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <img 
            src="/logo.svg" 
            alt="Slant Pad Logo" 
            style={{ 
              height: '28px', 
              marginRight: '16px',
              marginLeft: '-6px'
            }} 
          />
          <select
            value={fontType}
            onChange={(e) => setFontType(e.target.value as FontType)}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          >
            <option value="default">Default Font</option>
            <option value="handwriting">Handwriting Font</option>
          </select>

          <select
            value={fontSize}
            onChange={(e) => setFontSize(Number(e.target.value))}
            style={{
              padding: '4px 8px',
              borderRadius: 4,
              border: '1px solid #ccc'
            }}
          >
            {fontSizeOptions.map(size => (
              <option key={size} value={size}>{size}px</option>
            ))}
          </select>

          <div style={{ 
            display: 'flex', 
            gap: 8,
            marginLeft: 12,
            paddingLeft: 17,
            borderLeft: '1px solid #ddd' 
          }}>
            <button
              onClick={clearText}
              title="Clear Text"
              style={{
                padding: '6px',
                borderRadius: 4,
                border: '1px solid #ccc',
                background: '#f4f4f4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiTrash2 size={18} />
            </button>
            
            <input
              type="file"
              ref={fileInputRef}
              accept=".txt,.md,text/plain,text/markdown"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Load File"
              style={{
                padding: '6px',
                borderRadius: 4,
                border: '1px solid #ccc',
                background: '#f4f4f4',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiUpload size={18} />
            </button>
            
            <button
              onClick={saveFile}
              disabled={!text}
              title="Save File"
              style={{
                padding: '6px',
                borderRadius: 4,
                border: '1px solid #ccc',
                background: text ? '#f4f4f4' : '#e0e0e0',
                cursor: text ? 'pointer' : 'not-allowed',
                opacity: text ? 1 : 0.6,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FiDownload size={18} />
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <span style={{ marginRight: 8 }}>{angle}°</span>
            <input
              type="range"
              min={0}
              max={90}
              value={angle}
              onChange={(e) => setAngle(Number(e.target.value))}
              style={{ verticalAlign: 'middle' }}
            />
          </div>
          
          <a 
            href="https://github.com/hidenoriohnishi/slant-pad"
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              marginLeft: '8px'
            }}
            title="View on GitHub"
          >
            <img 
              src="/github-logo.svg" 
              alt="GitHub" 
              width="28" 
              height="28" 
            />
          </a>
        </div>
      </div>
      <div style={{ 
        position: 'absolute', 
        left: MARGIN, 
        top: TOP_MARGIN, 
        right: MARGIN, 
        bottom: MARGIN, 
        overflow: 'hidden' 
      }}>
        <canvas
          ref={canvasRef}
          width={width}
          height={height}
          onClick={handleCanvasClick}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          style={{ 
            border: `${BORDER_WIDTH}px solid #ccc`, 
            borderRadius: 8, 
            background: '#fff', 
            display: 'block', 
            width: width, 
            height: height, 
            position: 'absolute', 
            left: 0, 
            top: 0, 
            zIndex: 1,
            cursor: isDragging ? 'grabbing' : 'default'
          }}
        />
        <textarea
          ref={textareaRef}
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyUp={handleCaretUpdate}
          onClick={handleCaretUpdate}
          onKeyDown={handleKeyDown}
          tabIndex={0}
          style={{
            position: 'absolute',
            left: 0, 
            top: 0,
            width: width,
            height: height,
            opacity: 0.001,
            fontSize: fontSize,
            caretColor: 'black',
            resize: 'none',
            zIndex: 2,
            pointerEvents: 'none',
          }}
        />
        {showVerticalScrollbar && (
          <div 
            style={{
              position: 'absolute',
              right: 0,
              top: 0,
              width: scrollbarWidth,
              height: height,
              background: '#f0f0f0',
              borderRadius: 6,
              zIndex: 3
            }}
          >
            <div 
              style={{
                position: 'absolute',
                top: verticalScrollThumbTop,
                width: scrollbarWidth,
                height: verticalScrollThumbHeight,
                background: '#aaa',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              onMouseDown={(e) => {
                const startY = e.clientY;
                const startOffset = scrollOffset.y;
                const startOffsetX = scrollOffset.x;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaY = moveEvent.clientY - startY;
                  const ratio = deltaY / (height - verticalScrollThumbHeight);
                  const newOffsetY = startOffset + ratio * (totalTextHeight - height);
                  
                  // y方向のスクロールに合わせてx方向も斜めにスクロール
                  const theta = (angle * Math.PI) / 180;
                  // 符号を反転
                  const deltaX = -Math.tan(theta) * (newOffsetY - startOffset);
                  const newOffsetX = startOffsetX + deltaX;
                  
                  // スクロールオフセットを設定
                  setScrollOffset({
                    x: newOffsetX,
                    y: scrollOffset.y
                  });
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
        )}
        {showHorizontalScrollbar && (
          <div 
            style={{
              position: 'absolute',
              left: 0,
              bottom: 0,
              width: width,
              height: scrollbarWidth,
              background: '#f0f0f0',
              borderRadius: 6,
              zIndex: 3
            }}
          >
            <div 
              style={{
                position: 'absolute',
                left: horizontalScrollThumbLeft,
                width: horizontalScrollThumbWidth,
                height: scrollbarWidth,
                background: '#aaa',
                borderRadius: 6,
                cursor: 'pointer'
              }}
              onMouseDown={(e) => {
                const startX = e.clientX;
                const startOffset = scrollOffset.x;
                
                const handleMouseMove = (moveEvent: MouseEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const ratio = deltaX / (width - horizontalScrollThumbWidth);
                  const newOffsetX = startOffset - ratio * (totalTextHeight - width);
                  
                  // スクロールオフセットを設定
                  setScrollOffset({
                    x: newOffsetX,
                    y: scrollOffset.y
                  });
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default DiagonalEditor; 