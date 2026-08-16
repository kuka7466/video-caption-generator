"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  fontFamily?: string | null;
  fontSizeScale?: number;
  textTransform?: string;
  primaryColorOverride?: string | null;
  highlightColorOverride?: string | null;
  outlineEnabled?: boolean;
  outlineColorOverride?: string | null;
  outlineSizeOverride?: number | null;
  animationTypeOverride?: string | null;
}

const POSITION_PRESETS = [
  { label: "Top", value: 45 },
  { label: "Middle", value: 28 },
  { label: "Bottom", value: 10 },
] as const;

const RATIO_OPTIONS: { id: AspectRatio; label: string; icon: React.ReactNode }[] = [
  { id: "landscape", label: "16:9 Desktop", icon: <Monitor className="h-3.5 w-3.5" /> },
  { id: "vertical", label: "9:16 Mobile", icon: <Smartphone className="h-3.5 w-3.5" /> },
  { id: "square", label: "1:1 Square", icon: <Square className="h-3.5 w-3.5" /> },
  { id: "portrait", label: "4:5 Feed", icon: <PhonePortrait className="h-3.5 w-3.5" /> },
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
  fontFamily,
  fontSizeScale = 1.0,
  textTransform = "uppercase",
  primaryColorOverride,
  highlightColorOverride,
  outlineEnabled = true,
  outlineColorOverride,
  outlineSizeOverride,
  animationTypeOverride,
}: CaptionPreviewProps) {
  const screenRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const isDraggingRef = useRef(false);

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

  const sampleWords = ["VIRAL", "ANIMATED", "CAPTIONS", "PREVIEW"].slice(
    0,
    wordsPerSegment ? Math.max(1, Math.min(4, wordsPerSegment)) : 2,
  );

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
          <div className="absolute top-3 left-1/2 z-10 h-5 w-20 -translate-x-1/2 rounded-full bg-black ring-1 ring-gray-800" />
        )}
        {isLandscape && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 border-b border-gray-800">
            <div className="h-2 w-2 rounded-full bg-red-500/80" />
            <div className="h-2 w-2 rounded-full bg-yellow-500/80" />
            <div className="h-2 w-2 rounded-full bg-green-500/80" />
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
            className="relative h-full w-full"
          >
            {/* Background Gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-gray-900 via-gray-950 to-black" />

            {/* Draggable Caption Overlay */}
            <div
              className={cn(
                "absolute inset-x-0 flex justify-center px-4 transition-[bottom] duration-100",
                "touch-none select-none",
                isDragging ? "cursor-grabbing" : "cursor-grab",
              )}
              style={{ bottom: `${position}%` }}
              onMouseDown={handleDragStart}
              onTouchStart={handleDragStart}
            >
              <span
                className="pointer-events-none text-center leading-tight tracking-wider"
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
                {sampleWords.map((word, i) => {
                  const displayWord = transformText(word, textTransform);
                  return (
                    <span key={word}>
                      {i > 0 && " "}
                      <span
                        className={animationClass}
                        style={{
                          ["--delay" as string]: `${i * 0.5}s`,
                        }}
                      >
                        {displayWord}
                      </span>
                    </span>
                  );
                })}
              </span>
            </div>

            {/* Drag hint */}
            {!isDragging && (
              <div
                className="absolute inset-x-0 text-center text-[9px] text-gray-500"
                style={{ bottom: `calc(${position}% - 18px)` }}
              >
                Drag to reposition
              </div>
            )}

            {/* Home indicator for mobile */}
            {!isLandscape && (
              <div className="absolute bottom-1.5 left-1/2 h-1 w-24 -translate-x-1/2 rounded-full bg-gray-600" />
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
              "rounded-full px-3 py-1 text-xs font-medium transition-all duration-150",
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
