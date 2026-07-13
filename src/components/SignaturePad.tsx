import { useRef, useState, useEffect, useCallback, useImperativeHandle, forwardRef } from 'react';

export interface SignaturePadHandle {
  clear: () => void;
  toDataURL: () => string | null;
  isEmpty: () => boolean;
  getDimensions: () => { width: number; height: number } | null;
}

interface SignaturePadProps {
  onChange?: (isEmpty: boolean) => void;
  width?: number;
  height?: number;
  className?: string;
}

const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(
  ({ onChange, width = 500, height = 200, className }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
    const isDrawingRef = useRef(false);
    const lastPointRef = useRef<{ x: number; y: number } | null>(null);
    const [hasContent, setHasContent] = useState(false);
    const hasContentRef = useRef(false);

    // High-DPI canvas scaling
    const setupCanvas = useCallback(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = rect.width || width;
      const h = rect.height || height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(dpr, dpr);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 2.2;
      ctx.strokeStyle = '#052F48';
      ctxRef.current = ctx;
    }, [width, height]);

    useEffect(() => {
      setupCanvas();
    }, [setupCanvas]);

    // Keep ref in sync so the resize handler can read the latest value
    // without re-subscribing the event listener on every stroke.
    useEffect(() => {
      hasContentRef.current = hasContent;
    }, [hasContent]);

    // Re-setup on resize
    useEffect(() => {
      const handleResize = () => {
        // Preserve content across resize by saving and restoring
        const canvas = canvasRef.current;
        const ctx = ctxRef.current;
        if (!canvas || !ctx) return;
        const snapshot = canvas.toDataURL();
        const wasEmpty = !hasContentRef.current;
        setupCanvas();
        if (!wasEmpty) {
          const img = new Image();
          img.onload = () => {
            const rect = canvas.getBoundingClientRect();
            ctx.drawImage(img, 0, 0, rect.width, rect.height);
          };
          img.src = snapshot;
        }
      };
      window.addEventListener('resize', handleResize);
      return () => window.removeEventListener('resize', handleResize);
    }, [setupCanvas]);

    const getPos = (e: React.PointerEvent): { x: number; y: number } => {
      const canvas = canvasRef.current!;
      const rect = canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const startDrawing = (e: React.PointerEvent) => {
      e.preventDefault();
      const ctx = ctxRef.current;
      const canvas = canvasRef.current;
      if (!ctx || !canvas) return;
      canvas.setPointerCapture(e.pointerId);
      isDrawingRef.current = true;
      const pos = getPos(e);
      lastPointRef.current = pos;
      // Draw a dot for single taps
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 1.1, 0, Math.PI * 2);
      ctx.fillStyle = '#052F48';
      ctx.fill();
      if (!hasContent) {
        setHasContent(true);
        onChange?.(false);
      }
    };

    const draw = (e: React.PointerEvent) => {
      if (!isDrawingRef.current) return;
      e.preventDefault();
      const ctx = ctxRef.current;
      if (!ctx || !lastPointRef.current) return;
      const pos = getPos(e);
      ctx.beginPath();
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPointRef.current = pos;
    };

    const stopDrawing = (e: React.PointerEvent) => {
      e.preventDefault();
      const canvas = canvasRef.current;
      if (canvas && e.pointerId !== undefined) {
        try { canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
      }
      isDrawingRef.current = false;
      lastPointRef.current = null;
    };

    const clear = useCallback(() => {
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      if (!canvas || !ctx) return;
      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      setHasContent(false);
      onChange?.(true);
    }, [onChange]);

    const toDataURL = useCallback((): string | null => {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return null;
      return canvas.toDataURL('image/png');
    }, [hasContent]);

    const isEmpty = useCallback(() => !hasContent, [hasContent]);

    const getDimensions = useCallback((): { width: number; height: number } | null => {
      const canvas = canvasRef.current;
      if (!canvas || !hasContent) return null;
      const rect = canvas.getBoundingClientRect();
      return { width: rect.width, height: rect.height };
    }, [hasContent]);

    useImperativeHandle(ref, () => ({ clear, toDataURL, isEmpty, getDimensions }), [clear, toDataURL, isEmpty, getDimensions]);

    return (
      <div className={`signature-pad-wrapper ${className ?? ''}`}>
        <canvas
          ref={canvasRef}
          className="signature-pad-canvas"
          style={{ width: '100%', height: `${height}px`, touchAction: 'none' }}
          onPointerDown={startDrawing}
          onPointerMove={draw}
          onPointerUp={stopDrawing}
          onPointerLeave={stopDrawing}
          onPointerCancel={stopDrawing}
          aria-label="Signature drawing area — draw your signature inside this box"
          role="img"
        />
        {!hasContent && (
          <span className="signature-pad-placeholder" aria-hidden>
            ✍️ Draw your signature here
          </span>
        )}
        <button
          type="button"
          className="btn btn-secondary signature-pad-clear"
          onClick={clear}
          disabled={!hasContent}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
          </svg>
          Clear
        </button>
      </div>
    );
  },
);

SignaturePad.displayName = 'SignaturePad';
export default SignaturePad;
