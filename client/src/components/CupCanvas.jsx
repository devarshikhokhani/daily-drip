import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Paintbrush, Eraser, RotateCcw, Trash2, Send, CheckCircle, Sparkles } from 'lucide-react';

export default function CupCanvas({ onSaveDesign, initialData = null }) {
  const canvasRef = useRef(null);
  const onSaveDesignRef = useRef(onSaveDesign);
  const isDrawingRef = useRef(false);
  const lastCoordsRef = useRef({ x: 0, y: 0 });
  const hasInitializedRef = useRef(false);

  const [color, setColor] = useState('#d97706'); // Warm Caramel
  const [brushSize, setBrushSize] = useState(5);
  const [tool, setTool] = useState('brush'); // 'brush' or 'eraser'
  const [history, setHistory] = useState([]);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  // Keep latest onSaveDesign callback reference without causing re-renders/resets
  useEffect(() => {
    onSaveDesignRef.current = onSaveDesign;
  }, [onSaveDesign]);

  const colors = [
    { name: 'Warm Caramel', hex: '#d97706' },
    { name: 'Dark Espresso', hex: '#2b170c' },
    { name: 'Pure Cream', hex: '#faf5ed' },
    { name: 'Terracotta', hex: '#c2410c' },
    { name: 'Matcha Green', hex: '#4d6344' },
    { name: 'Glacier Blue', hex: '#0284c7' },
    { name: 'Midnight Berry', hex: '#701a75' }
  ];

  // Helper to draw the base cup sleeve template
  const drawBaseSleeve = (ctx, width, height) => {
    // Cup sleeve craft background
    ctx.fillStyle = '#261912';
    ctx.fillRect(0, 0, width, height);

    // Warm stitch / border line
    ctx.strokeStyle = '#422c20';
    ctx.lineWidth = 2;
    ctx.strokeRect(8, 8, width - 16, height - 16);

    // Subtle brand watermark
    ctx.font = 'bold 9px monospace';
    ctx.fillStyle = '#5c4031';
    ctx.fillText('DAILY DRIP CRAFT CUP', 16, 24);
  };

  // Initialize canvas only once on mount
  useEffect(() => {
    if (hasInitializedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    hasInitializedRef.current = true;
    canvas.width = 340;
    canvas.height = 220;

    const ctx = canvas.getContext('2d');
    drawBaseSleeve(ctx, canvas.width, canvas.height);

    if (initialData) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0);
        setHistory([canvas.toDataURL('image/png')]);
      };
      img.src = initialData;
    } else {
      setHistory([canvas.toDataURL('image/png')]);
    }
  }, [initialData]);

  // Compute exact coordinates relative to canvas internal resolution
  const getCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY
    };
  };

  // Pointer event handlers for unified touch, stylus, and mouse support
  const handlePointerDown = (e) => {
    if (e.button !== undefined && e.button !== 0) return; // Only primary button / touch
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Capture pointer to track movements even if finger moves slightly outside canvas
    try {
      canvas.setPointerCapture(e.pointerId);
    } catch (_) {}

    isDrawingRef.current = true;
    setHasDrawn(true);
    const coords = getCoords(e);
    lastCoordsRef.current = coords;

    const ctx = canvas.getContext('2d');
    ctx.beginPath();
    ctx.arc(coords.x, coords.y, brushSize / 2, 0, Math.PI * 2);
    ctx.fillStyle = tool === 'eraser' ? '#261912' : color;
    ctx.fill();
  };

  const handlePointerMove = (e) => {
    if (!isDrawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const coords = getCoords(e);
    const ctx = canvas.getContext('2d');

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = tool === 'eraser' ? '#261912' : color;

    ctx.beginPath();
    ctx.moveTo(lastCoordsRef.current.x, lastCoordsRef.current.y);
    ctx.lineTo(coords.x, coords.y);
    ctx.stroke();

    lastCoordsRef.current = coords;
  };

  const finishDrawing = (e) => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      if (e && e.pointerId && canvas.hasPointerCapture(e.pointerId)) {
        canvas.releasePointerCapture(e.pointerId);
      }
    } catch (_) {}

    // Save snapshot to undo history
    const dataUrl = canvas.toDataURL('image/png');
    setHistory(prev => [...prev.slice(-15), dataUrl]);

    // Silently notify parent of draft design so it's ready on order submission
    if (onSaveDesignRef.current) {
      onSaveDesignRef.current(dataUrl, false /* isManualSend = false */);
    }
  };

  const handleUndo = () => {
    if (history.length <= 1) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const newHistory = [...history];
    newHistory.pop();
    const previousState = newHistory[newHistory.length - 1];

    const img = new Image();
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      setHistory(newHistory);
      if (onSaveDesignRef.current) {
        onSaveDesignRef.current(previousState, false);
      }
    };
    img.src = previousState;
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    drawBaseSleeve(ctx, canvas.width, canvas.height);
    const emptyState = canvas.toDataURL('image/png');
    setHistory([emptyState]);
    setHasDrawn(false);
    if (onSaveDesignRef.current) {
      onSaveDesignRef.current(emptyState, false);
    }
  };

  // Explicit Send button sends the artwork directly to the live café world screen
  const handleSend = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    if (onSaveDesignRef.current) {
      onSaveDesignRef.current(dataUrl, true /* isManualSend = true */);
    }
    setSentSuccess(true);
    setTimeout(() => setSentSuccess(false), 3000);
  };

  return (
    <div className="bg-[#fcfaf7] border border-[#e8dfd5] rounded-3xl p-4 sm:p-5 shadow-sm max-w-md mx-auto select-none">
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-sm font-bold text-[#23150d] flex items-center gap-1.5 font-display">
            <Paintbrush className="w-4 h-4 text-amber-700" />
            Draw Your Cup Art
          </h4>
          <p className="text-[11px] text-[#735644]">
            Draw with your finger or stylus. Tap <strong>Send Design</strong> to beam it to the café screen!
          </p>
        </div>
        {sentSuccess && (
          <span className="flex items-center gap-1 text-xs text-emerald-700 font-bold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 animate-pulse">
            <CheckCircle className="w-3.5 h-3.5" />
            Sent to Café!
          </span>
        )}
      </div>

      {/* Canvas Wrap with native touch-none */}
      <div className="relative rounded-2xl overflow-hidden border-2 border-[#5c4031] shadow-inner bg-[#261912] flex justify-center">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishDrawing}
          onPointerCancel={finishDrawing}
          style={{ touchAction: 'none' }}
          className="cursor-crosshair w-full max-w-[340px] h-[200px]"
        />
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-stone-500/60 text-xs font-mono">
            ✨ Tap & draw your design here
          </div>
        )}
        <div className="absolute bottom-2 right-3 text-[9px] text-[#825e4c] font-mono pointer-events-none uppercase">
          Touch & Draw
        </div>
      </div>

      {/* Palette & Controls */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {colors.map((c) => (
            <button
              key={c.hex}
              type="button"
              onClick={() => {
                setColor(c.hex);
                setTool('brush');
              }}
              style={{ backgroundColor: c.hex }}
              className={`w-6 h-6 rounded-full border transition transform ${
                tool === 'brush' && color === c.hex ? 'scale-125 border-stone-900 ring-2 ring-amber-600' : 'border-stone-400 opacity-80 hover:opacity-100'
              }`}
              title={c.name}
            />
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-[#644a38]">
          <span>Size:</span>
          <input
            type="range"
            min="2"
            max="18"
            value={brushSize}
            onChange={(e) => setBrushSize(parseInt(e.target.value, 10))}
            className="w-16 accent-amber-700 cursor-pointer"
          />
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 pt-3 border-t border-[#e8dfd5] flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => setTool('brush')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              tool === 'brush' ? 'bg-[#2b170c] text-white shadow-sm' : 'bg-[#f3ede4] text-[#422c20] hover:bg-[#eadecb]'
            }`}
            title="Brush Tool"
          >
            <Paintbrush className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => setTool('eraser')}
            className={`p-2 rounded-xl text-xs font-semibold flex items-center gap-1 transition ${
              tool === 'eraser' ? 'bg-[#2b170c] text-white shadow-sm' : 'bg-[#f3ede4] text-[#422c20] hover:bg-[#eadecb]'
            }`}
            title="Eraser Tool"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleUndo}
            disabled={history.length <= 1}
            className="p-2 rounded-xl text-xs font-semibold bg-[#f3ede4] text-[#422c20] hover:bg-[#eadecb] disabled:opacity-40 transition"
            title="Undo Last Stroke"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={handleClear}
            className="p-2 rounded-xl text-xs font-semibold bg-[#f3ede4] text-red-700 hover:bg-red-100 transition"
            title="Clear Canvas"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          type="button"
          onClick={handleSend}
          className="px-4 py-2 rounded-xl text-xs font-bold bg-[#b45309] hover:bg-[#92400e] text-white flex items-center gap-1.5 shadow-sm transition transform active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          SEND DESIGN
        </button>
      </div>
    </div>
  );
}
