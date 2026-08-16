"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Monitor, Smartphone, Square, Smartphone as PhonePortrait } from "lucide-react";
import { cn } from "~/lib/utils";
import { CAPTION_POSITION_MIN, CAPTION_POSITION_MAX } from "~/lib/caption-styles";
import type { CaptionStyleConfig, AspectRatio } from "~/types/caption";

interface CaptionPreviewProps {
  style: CaptionStyleConfig;
  position: number;
  onPositionChange: (position: number) => void;
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  wordsPerSegment?: number | null;
  maxLines?: number;
  fontFamily?: string | null;
  fontSizeScale?: number;
  textTransform?: string;
  primaryColorOverride?: string | null;
  highlightColorOverride?: string | null;
  outlineEnabled?: boolean;
  outlineColorOverride?: string | null;
  outlineSizeOverride?: number | null;
  animationTypeOverride?: string | null;
  videoFile?: File | null;
}

const POSITION_PRESETS = [
  { label: "Top", value: 80 },
  { label: "Middle", value: 48 },
  { label: "Bottom", value: 12 },
] as const;

const RATIO_OPTIONS: { id: AspectRatio; label: string; icon: React.ReactNode }[] = [
  { id: "landscape", label: "16:9 Desktop", icon: <Monitor className="h-3.5 w-3.5" /> },
  { id: "vertical", label: "9:16 Mobile", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { id: "square", label: "1:1 Square", icon: <Square className="h-3.5 w-3.5" /> },
  { id: "portrait", label: "4:5 Feed", icon: <PhonePortrait className="h-3.5 w-3.5" /> },
];

const ALL_SAMPLE_WORDS = [
  "SAMPLE",
  "TEXT",
  "CAPTIONS",
  "FOR",
  "YOUR",
  "PREVIEW",
  "VIDEO",
  "DEMO",
];

function getAnimationClass(animationType: string): string {
  switch (animationType) {
    case "stretch":
      return "animate-caption-stretch";
    case "glitch":
      return "animate-caption-glitch";
    case "slide":
      return "animate-caption-slide";
    case "blur":
      return "animate-caption-blur";
    case "karaoke":
      return "animate-caption-karaoke";
    case "scale":
      return "animate-caption-scale";
    case "bounce":
      return "animate-caption-bounce";
    case "highlight":
    default:
      return "animate-caption-highlight";
  }
}

function buildTextShadow(
  outlineEnabled: boolean,
  outlineColor: string,
  outlineSize: number,
  shadowDepth: number,
): string {
  if (!outlineEnabled || outlineSize <= 0) {
    return `0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0,0,0,0.6)`;
  }
  return [
    `${outlineSize}px ${outlineSize}px 0 ${outlineColor}`,
    `-${outlineSize}px -${outlineSize}px 0 ${outlineColor}`,
    `${outlineSize}px -${outlineSize}px 0 ${outlineColor}`,
    `-${outlineSize}px ${outlineSize}px 0 ${outlineColor}`,
    `0 ${shadowDepth}px ${shadowDepth * 2}px rgba(0,0,0,0.6)`,
  ].join(", ");
}

function transformText(text: string, transform: string): string {
  if (transform === "titlecase") {
    return text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();
  }
  if (transform === "lowercase") {
    return text.toLowerCase();
  }
  if (transform === "original") {
    return text;
  }
  return text.toUpperCase();
}

export function CaptionPreview({
  style,
  position,
  onPositionChange,
  aspectRatio,
  onAspectRatioChange,
  wordsPerSegment = 2,
  maxLines = 1,
  fontFamily,
  fontSizeScale = 1.0,
  textTransform = "uppercase",
  primaryColorOverride,
  highlightColorOverride,
  outlineEnabled = false,
  outlineColorOverride,
  outlineSizeOverride,
  animationTypeOverride,
  videoFile,
}: CaptionPreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);
  const [safeZone, setSafeZone] = useState<"none" | "tiktok" | "reels" | "shorts">("none");

  const videoUrl = useMemo(() => {
    if (!videoFile) return null;
    return URL.createObjectURL(videoFile);
  }, [videoFile]);

  useEffect(() => {
    return () => {
      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
      }
    };
  }, [videoUrl]);

  const activeRatio = aspectRatio === "auto" ? "landscape" : aspectRatio;
  const isLandscape = activeRatio === "landscape";
  const isSquare = activeRatio === "square";
  const isPortrait = activeRatio === "portrait";

  const effectiveAnim = animationTypeOverride && animationTypeOverride !== "default" ? animationTypeOverride : style.animationType;
  const animationClass = getAnimationClass(effectiveAnim);
  const effectivePrimaryColor = primaryColorOverride || style.primaryColor;
  const effectiveHighlightColor = highlightColorOverride || style.highlightColor;
  const effectiveOutlineColor = outlineColorOverride || style.outlineColor;
  const effectiveOutlineSize =
    outlineSizeOverride !== undefined && outlineSizeOverride !== null
      ? Math.round(outlineSizeOverride * 0.25 * 10) / 10
      : style.previewOutlineSize;

  const effectiveFont = fontFamily && fontFamily !== "default" ? fontFamily : style.fontName;

  const previewBaseSize = isLandscape ? style.previewFontSize * 1.25 : style.previewFontSize;
  const computedFontSize = Math.round(previewBaseSize * fontSizeScale);

  const textShadow = buildTextShadow(
    outlineEnabled,
    effectiveOutlineColor,
    effectiveOutlineSize,
    style.previewShadowDepth,
  );

  const wordCount = wordsPerSegment ? Math.max(1, Math.min(8, wordsPerSegment)) : 2;
  const sampleWords = ALL_SAMPLE_WORDS.slice(0, wordCount);

  // Instant layout split based on maxLines
  const lines: string[][] = useMemo(() => {
    if (maxLines === 1 || sampleWords.length <= 2) {
      return [sampleWords];
    }
    const mid = Math.ceil(sampleWords.length / 2);
    return [sampleWords.slice(0, mid), sampleWords.slice(mid)];
  }, [sampleWords, maxLines]);

  const clientYToPosition = useCallback(
    (clientY: number) => {
      if (!screenRef.current) return position;

      const rect = screenRef.current.getBoundingClientRect();
      const relativeY = rect.bottom - clientY;
      const percentage = (relativeY / rect.height) * 100;

      return Math.round(
        Math.max(CAPTION_POSITION_MIN, Math.min(CAPTION_POSITION_MAX, percentage)),
      );
    },
    [position],
  );

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    isDraggingRef.current = true;
  }, []);

  useEffect(() => {
    const handleDragMove = (e: MouseEvent | TouchEvent) => {
      if (!isDraggingRef.current) return;

      const clientY =
        "touches" in e
          ? (e.touches[0]?.clientY ?? 0)
          : e.clientY;

      onPositionChange(clientYToPosition(clientY));
    };

    const handleDragEnd = () => {
      if (!isDraggingRef.current) return;
      isDraggingRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener("mousemove", handleDragMove);
    window.addEventListener("mouseup", handleDragEnd);
    window.addEventListener("touchmove", handleDragMove);
    window.addEventListener("touchend", handleDragEnd);

    return () => {
      window.removeEventListener("mousemove", handleDragMove);
      window.removeEventListener("mouseup", handleDragEnd);
      window.removeEventListener("touchmove", handleDragMove);
      window.removeEventListener("touchend", handleDragEnd);
    };
  }, [clientYToPosition, onPositionChange]);

  // Unique state key for instant animation restart on any change
  const stateKey = `${style.id}-${effectiveAnim}-${effectiveFont}-${fontSizeScale}-${textTransform}-${wordCount}-${maxLines}-${outlineEnabled}-${effectiveOutlineSize}-${effectiveOutlineColor}-${effectivePrimaryColor}-${effectiveHighlightColor}`;

  return (
    <div className="flex w-full flex-col items-center gap-3">
      {/* Ratio Selector Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 rounded-xl border border-border bg-muted/40 p-1">
        {RATIO_OPTIONS.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => onAspectRatioChange(opt.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-150",
              "cursor-pointer",
              activeRatio === opt.id
                ? "bg-white text-gray-900 shadow-xs dark:bg-gray-800 dark:text-white"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {opt.icon}
            <span>{opt.label}</span>
          </button>
        ))}
      </div>

      {/* Frame Container */}
      <div
        className={cn(
          "relative mx-auto rounded-[1.8rem] bg-gray-900 p-1.5 shadow-2xl ring-1 ring-gray-700 transition-all duration-300",
          isLandscape && "desktop-mockup-frame",
          !isLandscape && !isSquare && !isPortrait && "phone-mockup-frame",
          isSquare && "square-mockup-frame",
          isPortrait && "portrait-mockup-frame",
        )}
      >
        {/* Notch / Bar */}
        {!isLandscape && (
          <div className="absolute top-3 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-lg bg-black ring-1 ring-gray-800" />
        )}
        {isLandscape && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800">
            <div className="h-2 w-2 rounded-lg bg-red-500/80" />
            <div className="h-2 w-2 rounded-lg bg-yellow-500/80" />
            <div className="h-2 w-2 rounded-lg bg-green-500/80" />
            <span className="ml-2 text-[10px] text-gray-500">Desktop Video Player (16:9)</span>
          </div>
        )}

        {/* Inner Screen */}
        <div
          className={cn(
            "relative overflow-hidden rounded-[1.4rem] bg-black transition-all duration-300",
            isLandscape && "desktop-mockup-screen",
            !isLandscape && !isSquare && !isPortrait && "phone-mockup-screen",
            isSquare && "square-mockup-screen",
            isPortrait && "portrait-mockup-screen",
          )}
        >
          <div
            ref={screenRef}
            className="relative h-full w-full overflow-hidden"
          >
            {/* Video or Ambient Background */}
            {videoUrl ? (
              <video
                src={videoUrl}
                autoPlay
                loop
                muted
                playsInline
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <>
                <div className="absolute inset-0 overflow-hidden">
                  {/* Cinematic Ambient Blurred Background Scene */}
                  <div className="absolute -inset-4 bg-gradient-to-br from-indigo-900/60 via-purple-950/80 to-slate-950 filter blur-sm scale-110" />
                  <div className="absolute top-1/4 left-1/3 h-28 w-28 rounded-lg bg-[#459F94]/30 filter blur-xl animate-pulse" />
                  <div className="absolute bottom-1/3 right-1/4 h-32 w-32 rounded-lg bg-[#EDB118]/25 filter blur-xl" />
                  <div className="absolute inset-0 bg-radial from-transparent via-black/40 to-black/80" />
                </div>
                {/* Dark Vignette Overlay for Readability when no video */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />
              </>
            )}

            {/* Draggable Caption Overlay */}
            <div
              className={cn(
                "absolute inset-x-0 flex flex-col items-center justify-center px-4 transition-[bottom] duration-75",
                "touch-none select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              style={{ bottom: `${position}%` }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <div
                key={stateKey}
                className="pointer-events-none flex flex-col items-center text-center leading-tight tracking-wider"
                style={{
                  color: effectivePrimaryColor,
                  fontWeight: style.bold ? 700 : 400,
                  fontStyle: style.italic ? "italic" : "normal",
                  fontSize: `${computedFontSize}px`,
                  fontFamily: `${effectiveFont}, -apple-system, sans-serif`,
                  textShadow,
                  ["--caption-primary" as string]: effectivePrimaryColor,
                  ["--caption-highlight" as string]: effectiveHighlightColor,
                }}
              >
                {lines.map((lineWords, lineIdx) => {
                  let wordOffset = 0;
                  if (lineIdx > 0 && lines[0]) {
                    wordOffset = lines[0].length;
                  }
                  return (
                    <div key={lineIdx} className="flex flex-wrap justify-center gap-x-1.5">
                      {lineWords.map((word, i) => {
                        const globalIdx = wordOffset + i;
                        const displayWord = transformText(word, textTransform);
                        return (
                          <span
                            key={`${word}-${globalIdx}`}
                            className={animationClass}
                            style={{
                              ["--delay" as string]: `${globalIdx * 0.45}s`,
                            }}
                          >
                            {displayWord}
                          </span>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Social Media Safe Zone Overlay */}
            {safeZone !== "none" && (
              <div className="pointer-events-none absolute inset-0 z-20 flex flex-col justify-between p-3">
                {/* Top header safe boundary */}
                <div className="rounded border border-dashed border-red-500/40 bg-red-500/10 px-2 py-1 text-center text-[8px] font-bold tracking-wider text-red-300">
                  {safeZone === "tiktok" ? "TIKTOK TOP BAR & SEARCH" : safeZone === "reels" ? "REELS HEADER & AUDIO" : "SHORTS TOP SEARCH"}
                </div>

                {/* Center safe area */}
                <div className="flex flex-1 items-center justify-end pr-2">
                  <div className="rounded border border-dashed border-red-500/40 bg-red-500/10 p-1 text-[7px] font-bold text-red-300 text-right">
                    {safeZone === "tiktok" ? "LIKE / COMMENT / SHARE" : safeZone === "reels" ? "REELS ACTIONS" : "SHORTS ACTIONS"}
                  </div>
                </div>

                {/* Bottom caption safe boundary */}
                <div className="rounded border border-dashed border-red-500/40 bg-red-500/10 px-2 py-1 text-center text-[8px] font-bold tracking-wider text-red-300">
                  {safeZone === "tiktok" ? "TIKTOK USERNAME & SOUND CAPTION" : safeZone === "reels" ? "REELS DESCRIPTION & AUDIO" : "SHORTS TITLE & CHANNEL"}
                </div>
              </div>
            )}

            {/* Drag hint */}
            {!isDragging && (
              <div
                className="absolute inset-x-0 text-center text-[9px] font-medium text-white/70 drop-shadow-md pointer-events-none"
                style={{ bottom: position > 75 ? `calc(${position}% - 22px)` : position < 18 ? `calc(${position}% + 26px)` : `calc(${position}% - 18px)` }}
              >
                Drag to reposition
              </div>
            )}

            {/* Home indicator for mobile */}
            {!isLandscape && (
              <div className="absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-lg bg-white/40" />
            )}
          </div>
        </div>
      </div>

      {/* Position Presets */}
      <div className="flex gap-2">
        {POSITION_PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() => onPositionChange(preset.value)}
            className={cn(
              "rounded-lg px-3 py-1 text-xs font-medium transition-all duration-150",
              "border cursor-pointer",
              position === preset.value
                ? "border-[#459F94] bg-[#459F94]/10 text-[#459F94]"
                : "border-border text-muted-foreground hover:border-[#459F94]/50",
            )}
          >
            {preset.label}
          </button>
        ))}
      </div>
    </div>
  );
}
