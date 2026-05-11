import { useState, useRef, useCallback } from "react";
import {
  Upload, ZoomIn, ZoomOut, Maximize2, RotateCcw, X,
  FileText, Image as ImageIcon, ChevronLeft, ChevronRight,
} from "lucide-react";

type DrawingFile = { file: File; url: string; type: "pdf" | "image" };

const BLUE = "#1D8FFF";
const TOOLBAR_BG = "#161B22";
const VIEWER_BG = "#0D1117";
const BORDER = "#30363D";
const MUTED = "#8B949E";
const FG = "#E6EDF3";

function ToolBtn({
  icon, onClick, title, danger,
}: { icon: React.ReactNode; onClick: () => void; title: string; danger?: boolean }) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      className="w-7 h-7 flex items-center justify-center rounded transition-colors shrink-0"
      style={{ color: hov ? (danger ? "#f87171" : FG) : MUTED }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {icon}
    </button>
  );
}

export function DrawingViewer() {
  const [drawing, setDrawing] = useState<DrawingFile | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

  const handleFile = useCallback((file: File) => {
    if (drawing) URL.revokeObjectURL(drawing.url);
    const url = URL.createObjectURL(file);
    const type = file.type === "application/pdf" ? "pdf" : "image";
    setDrawing({ file, url, type });
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [drawing]);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.type === "application/pdf" || file.type.startsWith("image/"))) {
      handleFile(file);
    }
  };

  const zoomIn  = () => setZoom(z => Math.min(z + 0.25, 6));
  const zoomOut = () => setZoom(z => Math.max(z - 0.25, 0.1));
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };

  const handleWheel = (e: React.WheelEvent) => {
    if (drawing?.type !== "image") return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom(z => Math.max(0.1, Math.min(6, z * factor)));
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    if (drawing?.type !== "image") return;
    setIsPanning(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y });
  };
  const handleMouseUp = () => setIsPanning(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      lastTouchDist.current = Math.hypot(dx, dy);
    }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2 && lastTouchDist.current !== null && drawing?.type === "image") {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / lastTouchDist.current;
      setZoom(z => Math.max(0.1, Math.min(6, z * factor)));
      lastTouchDist.current = dist;
    }
  };
  const handleTouchEnd = () => { lastTouchDist.current = null; };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  };

  const clearDrawing = () => {
    if (drawing) URL.revokeObjectURL(drawing.url);
    setDrawing(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full select-none"
      style={{ background: VIEWER_BG }}
    >
      {/* Toolbar */}
      <div
        className="flex items-center gap-1 px-2 py-1.5 shrink-0"
        style={{ background: TOOLBAR_BG, borderBottom: `1px solid ${BORDER}`, minHeight: 40 }}
      >
        {/* File info */}
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {drawing ? (
            <>
              {drawing.type === "pdf"
                ? <FileText className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} />
                : <ImageIcon className="w-3.5 h-3.5 shrink-0" style={{ color: BLUE }} />
              }
              <span className="text-xs font-mono truncate" style={{ color: FG }}>{drawing.file.name}</span>
            </>
          ) : (
            <span className="text-xs" style={{ color: MUTED }}>Drawing workspace</span>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          {drawing && drawing.type === "image" && (
            <>
              <ToolBtn icon={<ZoomOut className="w-3.5 h-3.5" />} onClick={zoomOut} title="Zoom out (scroll wheel)" />
              <span className="text-xs font-mono w-10 text-center tabular-nums" style={{ color: MUTED }}>
                {Math.round(zoom * 100)}%
              </span>
              <ToolBtn icon={<ZoomIn className="w-3.5 h-3.5" />} onClick={zoomIn} title="Zoom in" />
              <ToolBtn icon={<RotateCcw className="w-3.5 h-3.5" />} onClick={resetView} title="Reset view" />
            </>
          )}
          {drawing && (
            <>
              <ToolBtn icon={<Maximize2 className="w-3.5 h-3.5" />} onClick={handleFullscreen} title="Fullscreen" />
              <ToolBtn icon={<X className="w-3.5 h-3.5" />} onClick={clearDrawing} title="Remove drawing" danger />
            </>
          )}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1 ml-1 px-2.5 py-1 rounded text-xs font-semibold transition-opacity hover:opacity-90"
            style={{ background: BLUE, color: "#fff", minHeight: 26 }}
          >
            <Upload className="w-3 h-3" />
            {drawing ? "Replace" : "Upload"}
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg,.tiff,.tif,.bmp,.webp"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
            e.target.value = "";
          }}
        />
      </div>

      {/* Viewer */}
      <div
        className="flex-1 relative overflow-hidden"
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={{
          cursor: drawing?.type === "image" ? (isPanning ? "grabbing" : "grab") : "default",
        }}
      >
        {!drawing ? (
          <DropZone isDragOver={isDragOver} onBrowse={() => fileInputRef.current?.click()} />
        ) : drawing.type === "pdf" ? (
          <iframe
            src={`${drawing.url}#toolbar=1&navpanes=0&scrollbar=1`}
            title="Drawing"
            className="absolute inset-0 border-0"
            style={{ width: "100%", height: "100%" }}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center overflow-hidden">
            <img
              src={drawing.url}
              alt="Drawing"
              draggable={false}
              style={{
                transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                transformOrigin: "center",
                maxWidth: "none",
                pointerEvents: "none",
                userSelect: "none",
              }}
            />
          </div>
        )}

        {/* Drag-over overlay when a drawing is loaded */}
        {isDragOver && drawing && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{ background: "rgba(29,143,255,0.1)", border: `2px dashed ${BLUE}` }}
          >
            <span className="text-sm font-semibold" style={{ color: BLUE }}>Drop to replace</span>
          </div>
        )}
      </div>
    </div>
  );
}

function DropZone({ isDragOver, onBrowse }: { isDragOver: boolean; onBrowse: () => void }) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 transition-colors"
      style={{ background: isDragOver ? "#10161E" : VIEWER_BG }}
    >
      {/* Icon */}
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center transition-colors"
        style={{
          background: "#131920",
          border: `2px dashed ${isDragOver ? BLUE : BORDER}`,
        }}
      >
        <Upload className="w-8 h-8 transition-colors" style={{ color: isDragOver ? BLUE : MUTED }} />
      </div>

      {/* Labels */}
      <div className="text-center space-y-1.5">
        <div className="text-sm font-semibold" style={{ color: FG }}>Drop your drawing here</div>
        <div className="text-xs" style={{ color: MUTED }}>PDF, PNG, JPG, TIFF supported</div>
      </div>

      <button
        type="button"
        onClick={onBrowse}
        className="px-5 py-2 text-sm font-semibold rounded transition-opacity hover:opacity-90"
        style={{ background: BLUE, color: "#fff", minHeight: 40 }}
      >
        Browse files
      </button>

      {/* Explainer */}
      <div className="mt-2 max-w-[260px] text-center space-y-1">
        <div className="text-xs" style={{ color: "#484F58" }}>
          The drawing stays visible while you build the quote — no tab switching required.
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          {[
            { icon: <FileText className="w-3 h-3" />, label: "PDF" },
            { icon: <ImageIcon className="w-3 h-3" />, label: "Image" },
          ].map(({ icon, label }) => (
            <span key={label} className="flex items-center gap-1 text-xs" style={{ color: "#484F58" }}>
              {icon} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
