import { useState, useRef, useCallback, useEffect } from "react";
import {
  Upload,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RotateCcw,
  X,
  FileText,
  Image as ImageIcon,
  Check,
  CloudOff,
  Loader,
  ScanLine,
} from "lucide-react";
import { useScanContext } from "@/contexts/scan-context";
import { useExperimentalFeatures } from "@/hooks/use-experimental-features";

type DrawingFile = {
  file?: File;
  url: string;
  type: "pdf" | "image";
  filename: string;
  persistedId?: number;
};

type PersistedMeta = {
  id: number;
  objectPath: string;
  filename: string;
  contentType: string;
};

const BLUE = "#1D8FFF";
const TOOLBAR_BG = "#161B22";
const VIEWER_BG = "#FFFFFF";
const BORDER = "#30363D";
const MUTED = "#8B949E";
const FG = "#E6EDF3";

function ToolBtn({
  icon,
  onClick,
  title,
  danger,
}: {
  icon: React.ReactNode;
  onClick: () => void;
  title: string;
  danger?: boolean;
}) {
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

function objectServeUrl(objectPath: string) {
  return "/api" + objectPath.replace(/^\/objects/, "/storage/objects");
}

const MAX_SCAN_BYTES = 10 * 1024 * 1024; // 10 MB

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(",")[1]);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

async function urlToBase64(
  url: string,
): Promise<{ base64: string; mimeType: string }> {
  const resp = await fetch(url);
  if (!resp.ok) throw new Error("Failed to fetch drawing");
  const blob = await resp.blob();
  const mimeType = blob.type || "application/octet-stream";
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve({ base64: result.split(",")[1], mimeType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function DrawingViewer({ quoteId }: { quoteId?: number }) {
  const [drawing, setDrawing] = useState<DrawingFile | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [isDragOver, setIsDragOver] = useState(false);
  const [uploadState, setUploadState] = useState<
    "idle" | "uploading" | "saved" | "error"
  >("idle");
  const [scanState, setScanState] = useState<"idle" | "scanning" | "error">(
    "idle",
  );
  const [scanError, setScanError] = useState<string | null>(null);
  const { setScanResult } = useScanContext();
  const { features } = useExperimentalFeatures();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const lastTouchDist = useRef<number | null>(null);

  useEffect(() => {
    if (!quoteId) return;
    fetch(`/api/quotes/${quoteId}/drawings`)
      .then((r) => (r.ok ? r.json() : []))
      .then((drawings: PersistedMeta[]) => {
        if (drawings.length > 0) {
          const first = drawings[drawings.length - 1];
          const url = objectServeUrl(first.objectPath);
          const type =
            first.contentType === "application/pdf" ? "pdf" : "image";
          setDrawing({
            url,
            type,
            filename: first.filename,
            persistedId: first.id,
          });
        }
      })
      .catch(() => {});
  }, [quoteId]);

  const persistFile = useCallback(
    async (file: File): Promise<number | undefined> => {
      if (!quoteId) return undefined;
      setUploadState("uploading");
      try {
        const urlResp = await fetch("/api/storage/uploads/request-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: file.name,
            size: file.size,
            contentType: file.type,
          }),
        });
        if (!urlResp.ok) throw new Error("Failed to get upload URL");
        const { uploadURL, objectPath } = (await urlResp.json()) as {
          uploadURL: string;
          objectPath: string;
        };

        await fetch(uploadURL, {
          method: "PUT",
          headers: { "Content-Type": file.type },
          body: file,
        });

        const metaResp = await fetch(`/api/quotes/${quoteId}/drawings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            objectPath,
            filename: file.name,
            contentType: file.type,
          }),
        });
        if (!metaResp.ok) throw new Error("Failed to save metadata");
        const saved = (await metaResp.json()) as PersistedMeta;
        setUploadState("saved");
        setTimeout(() => setUploadState("idle"), 3000);
        return saved.id;
      } catch {
        setUploadState("error");
        setTimeout(() => setUploadState("idle"), 3000);
        return undefined;
      }
    },
    [quoteId],
  );

  const handleFile = useCallback(
    async (file: File) => {
      if (drawing?.file) URL.revokeObjectURL(drawing.url);
      const url = URL.createObjectURL(file);
      const type = file.type === "application/pdf" ? "pdf" : "image";
      setDrawing({ file, url, type, filename: file.name });
      setZoom(1);
      setPan({ x: 0, y: 0 });

      const persistedId = await persistFile(file);
      if (persistedId !== undefined) {
        setDrawing((prev) => (prev ? { ...prev, persistedId } : prev));
      }
    },
    [drawing, persistFile],
  );

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (
      file &&
      (file.type === "application/pdf" || file.type.startsWith("image/"))
    ) {
      handleFile(file);
    }
  };

  const zoomIn = () => setZoom((z) => Math.min(z + 0.25, 6));
  const zoomOut = () => setZoom((z) => Math.max(z - 0.25, 0.1));
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (drawing?.type !== "image") return;
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    setZoom((z) => Math.max(0.1, Math.min(6, z * factor)));
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
    if (
      e.touches.length === 2 &&
      lastTouchDist.current !== null &&
      drawing?.type === "image"
    ) {
      e.preventDefault();
      const dx = e.touches[0].clientX - e.touches[1].clientX;
      const dy = e.touches[0].clientY - e.touches[1].clientY;
      const dist = Math.hypot(dx, dy);
      const factor = dist / lastTouchDist.current;
      setZoom((z) => Math.max(0.1, Math.min(6, z * factor)));
      lastTouchDist.current = dist;
    }
  };
  const handleTouchEnd = () => {
    lastTouchDist.current = null;
  };

  const handleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen?.();
    }
  };

  const handleScan = useCallback(async () => {
    if (!drawing || scanState === "scanning") return;
    setScanState("scanning");
    setScanError(null);
    setScanResult(null);
    try {
      let base64: string;
      let mimeType: string;

      console.log("[ScanAssist] Starting scan, type:", drawing.type);

      if (drawing.type === "pdf") {
        throw new Error(
          "PDF scanning is not supported. Please upload a JPG or PNG screenshot of the drawing instead.",
        );
      } else {
        if (drawing.file) {
          if (drawing.file.size > MAX_SCAN_BYTES) {
            throw new Error(
              `Image too large (${(drawing.file.size / 1024 / 1024).toFixed(1)} MB). Please upload an image under 10 MB.`,
            );
          }
          base64 = await fileToBase64(drawing.file);
          mimeType = drawing.file.type || "image/png";
        } else {
          const fetched = await urlToBase64(drawing.url);
          base64 = fetched.base64;
          mimeType = fetched.mimeType || "image/png";
        }
        console.log(
          "[ScanAssist] Image loaded. mimeType:",
          mimeType,
          "base64 length:",
          base64.length,
        );
      }

      console.log("[ScanAssist] Sending to /api/ai/scan-drawing…");
      const resp = await fetch("/api/ai/scan-drawing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageData: base64, mimeType }),
      });

      console.log("[ScanAssist] Response status:", resp.status);

      if (!resp.ok) {
        const body = await resp.text();
        console.error("[ScanAssist] API error body:", body);
        let msg = `Scan failed — HTTP ${resp.status}`;
        try {
          const parsed = JSON.parse(body) as { error?: string };
          if (parsed.error) msg = parsed.error;
        } catch {
          /* raw text */
        }
        throw new Error(msg);
      }

      const result = (await resp.json()) as Record<string, unknown>;
      console.log("[ScanAssist] Result:", result);
      setScanResult(result as Parameters<typeof setScanResult>[0]);
      setScanState("idle");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Scan failed";
      console.error("[ScanAssist] Error:", msg);
      setScanError(msg);
      setScanState("error");
      setTimeout(() => {
        setScanState("idle");
        setScanError(null);
      }, 10_000);
    }
  }, [drawing, scanState, setScanResult]);

  const clearDrawing = async () => {
    if (drawing?.file) URL.revokeObjectURL(drawing.url);
    if (drawing?.persistedId && quoteId) {
      await fetch(`/api/quotes/${quoteId}/drawings/${drawing.persistedId}`, {
        method: "DELETE",
      });
    }
    setScanResult(null);
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
        style={{
          background: TOOLBAR_BG,
          borderBottom: `1px solid ${BORDER}`,
          minHeight: 40,
        }}
      >
        <div className="flex items-center gap-1.5 flex-1 min-w-0 overflow-hidden">
          {drawing ? (
            <>
              {drawing.type === "pdf" ? (
                <FileText
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: BLUE }}
                />
              ) : (
                <ImageIcon
                  className="w-3.5 h-3.5 shrink-0"
                  style={{ color: BLUE }}
                />
              )}
              <span
                className="text-xs font-mono truncate"
                style={{ color: FG }}
              >
                {drawing.filename}
              </span>
              {quoteId && (
                <span className="shrink-0 ml-1">
                  {uploadState === "uploading" && (
                    <Loader
                      className="w-3 h-3 animate-spin"
                      style={{ color: MUTED }}
                    />
                  )}
                  {uploadState === "saved" && (
                    <Check className="w-3 h-3" style={{ color: "#3fb950" }} />
                  )}
                  {uploadState === "error" && (
                    <CloudOff
                      className="w-3 h-3"
                      style={{ color: "#f87171" }}
                    />
                  )}
                  {uploadState === "idle" && drawing.persistedId && (
                    <Check className="w-3 h-3" style={{ color: MUTED }} />
                  )}
                </span>
              )}
            </>
          ) : (
            <span className="text-xs" style={{ color: MUTED }}>
              Drawing workspace
            </span>
          )}
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          {drawing && drawing.type === "image" && (
            <>
              <ToolBtn
                icon={<ZoomOut className="w-3.5 h-3.5" />}
                onClick={zoomOut}
                title="Zoom out (scroll wheel)"
              />
              <span
                className="text-xs font-mono w-10 text-center tabular-nums"
                style={{ color: MUTED }}
              >
                {Math.round(zoom * 100)}%
              </span>
              <ToolBtn
                icon={<ZoomIn className="w-3.5 h-3.5" />}
                onClick={zoomIn}
                title="Zoom in"
              />
              <ToolBtn
                icon={<RotateCcw className="w-3.5 h-3.5" />}
                onClick={resetView}
                title="Reset view"
              />
            </>
          )}
          {drawing && features.enableScanAssist && drawing.type === "image" && (
            <ToolBtn
              icon={
                scanState === "scanning" ? (
                  <Loader className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <ScanLine className="w-3.5 h-3.5" />
                )
              }
              onClick={handleScan}
              title={
                scanState === "scanning"
                  ? "Scanning…"
                  : "Scan Assist — extract fields from drawing (experimental)"
              }
            />
          )}
          {drawing && (
            <>
              <ToolBtn
                icon={<Maximize2 className="w-3.5 h-3.5" />}
                onClick={handleFullscreen}
                title="Fullscreen"
              />
              <ToolBtn
                icon={<X className="w-3.5 h-3.5" />}
                onClick={clearDrawing}
                title="Remove drawing"
                danger
              />
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

      {/* Scan error banner */}
      {scanState === "error" && scanError && (
        <div
          className="flex items-start gap-2 px-3 py-2 text-xs"
          style={{
            background: "rgba(239,68,68,0.07)",
            borderBottom: "1px solid rgba(239,68,68,0.2)",
            color: "#b91c1c",
          }}
        >
          <X className="w-3 h-3 mt-0.5 shrink-0" />
          <span className="flex-1">{scanError}</span>
          <button
            type="button"
            onClick={() => {
              setScanState("idle");
              setScanError(null);
            }}
            className="ml-1 shrink-0 opacity-60 hover:opacity-100"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Viewer */}
      <div
        className="flex-1 relative overflow-hidden"
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
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
          cursor:
            drawing?.type === "image"
              ? isPanning
                ? "grabbing"
                : "grab"
              : "default",
        }}
      >
        {!drawing ? (
          <DropZone
            isDragOver={isDragOver}
            onBrowse={() => fileInputRef.current?.click()}
            showPersistHint={!!quoteId}
          />
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

        {isDragOver && drawing && (
          <div
            className="absolute inset-0 flex items-center justify-center z-10"
            style={{
              background: "rgba(29,143,255,0.1)",
              border: `2px dashed ${BLUE}`,
            }}
          >
            <span className="text-sm font-semibold" style={{ color: BLUE }}>
              Drop to replace
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function DropZone({
  isDragOver,
  onBrowse,
  showPersistHint,
}: {
  isDragOver: boolean;
  onBrowse: () => void;
  showPersistHint: boolean;
}) {
  return (
    <div
      className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-6 transition-colors"
      style={{ background: isDragOver ? "#EEF5FF" : VIEWER_BG }}
    >
      <div
        className="w-20 h-20 rounded-2xl flex items-center justify-center transition-colors"
        style={{
          background: isDragOver ? "#DDEEFF" : "#F4F6F8",
          border: `2px dashed ${isDragOver ? BLUE : "#CBD5E0"}`,
        }}
      >
        <Upload
          className="w-8 h-8 transition-colors"
          style={{ color: isDragOver ? BLUE : "#94A3B8" }}
        />
      </div>

      <div className="text-center space-y-1.5">
        <div className="text-sm font-semibold" style={{ color: "#1E293B" }}>
          Drop your drawing here
        </div>
        <div className="text-xs" style={{ color: "#64748B" }}>
          PDF, PNG, JPG, TIFF supported
        </div>
      </div>

      <button
        type="button"
        onClick={onBrowse}
        className="px-5 py-2 text-sm font-semibold rounded transition-opacity hover:opacity-90"
        style={{ background: BLUE, color: "#fff", minHeight: 40 }}
      >
        Browse files
      </button>

      <div className="mt-2 max-w-[260px] text-center space-y-1">
        <div className="text-xs" style={{ color: "#94A3B8" }}>
          {showPersistHint
            ? "Drawing uploads are saved to this quote automatically."
            : "The drawing stays visible while you build the quote. No tab switching required."}
        </div>
        <div className="flex items-center justify-center gap-3 mt-3 flex-wrap">
          {[
            { icon: <FileText className="w-3 h-3" />, label: "PDF" },
            { icon: <ImageIcon className="w-3 h-3" />, label: "Image" },
          ].map(({ icon, label }) => (
            <span
              key={label}
              className="flex items-center gap-1 text-xs"
              style={{ color: "#94A3B8" }}
            >
              {icon} {label}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
