"use client";

import { useState } from "react";
import {
  Palette,
  Sparkles,
  Globe,
  Cpu,
  Languages,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  Type,
  Maximize2,
  WrapText,
  CaseSensitive,
  Pipette,
  Layers,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { VideoDropzone } from "~/components/video-dropzone";
import { CaptionStylePicker } from "~/components/caption-style-picker";
import { CaptionPreview } from "~/components/caption-preview";
import { ProcessingView } from "~/components/processing-view";
import { submitCaptionJob } from "~/actions/captions";
import {
  CAPTION_STYLE_CONFIGS,
  DEFAULT_CAPTION_STYLE,
  DEFAULT_CAPTION_POSITION,
} from "~/lib/caption-styles";
import type { CaptionStyle, AspectRatio } from "~/types/caption";

type ViewState = "idle" | "uploading" | "processing" | "complete";

const trustIndicators = [
  { icon: Palette, text: "11 Creator Styles" },
  { icon: Sparkles, text: "Word-Level Sync" },
  { icon: Globe, text: "100+ Languages" },
  { icon: Maximize2, text: "Desktop 16:9 & Mobile 9:16" },
];

const POPULAR_LANGUAGES = [
  { code: "auto", label: "Auto Detect" },
  { code: "en", label: "English" },
  { code: "es", label: "Spanish" },
  { code: "fr", label: "French" },
  { code: "de", label: "German" },
  { code: "pt", label: "Portuguese" },
  { code: "it", label: "Italian" },
  { code: "hi", label: "Hindi" },
  { code: "ja", label: "Japanese" },
  { code: "zh", label: "Chinese" },
  { code: "ko", label: "Korean" },
  { code: "ar", label: "Arabic" },
  { code: "ru", label: "Russian" },
];

const MODEL_OPTIONS = [
  { size: "tiny", label: "Tiny (Fastest)" },
  { size: "base", label: "Base (Balanced)" },
  { size: "small", label: "Small (Higher Quality)" },
  { size: "medium", label: "Medium (Most Accurate)" },
];

const FONT_OPTIONS = [
  { id: "default", label: "Style Default" },
  { id: "Montserrat", label: "Montserrat (Clean & Bold)" },
  { id: "Bebas Neue", label: "Bebas Neue (Tall Condensed)" },
  { id: "Impact", label: "Impact (Bold Attention)" },
  { id: "Anton", label: "Anton (High Contrast)" },
  { id: "Outfit", label: "Outfit (Modern Geometric)" },
  { id: "Inter", label: "Inter (Neutral Pro)" },
  { id: "Poppins", label: "Poppins (Rounded Sans)" },
  { id: "Cinzel", label: "Cinzel (Cinematic Serif)" },
  { id: "Bangers", label: "Bangers (Comic Energy)" },
];

const WORDS_PER_BLOCK_OPTIONS = [
  { value: "auto", label: "Auto (Balanced by Style)" },
  { value: "1", label: "1 Word (Punchy Hook / Fast-Paced)" },
  { value: "2", label: "2-3 Words (TikTok / Reels Standard)" },
  { value: "5", label: "4-6 Words (YouTube / Desktop Sentence)" },
  { value: "8", label: "7-10 Words (Extended Reading)" },
];

const FONT_SIZE_OPTIONS = [
  { value: 0.75, label: "Small (75%)" },
  { value: 1.0, label: "Medium (100%)" },
  { value: 1.25, label: "Large (125%)" },
  { value: 1.5, label: "Extra Large (150%)" },
];

const OUTLINE_SIZE_OPTIONS = [
  { value: "default", label: "Style Default" },
  { value: "2", label: "Thin (2px)" },
  { value: "5", label: "Medium (5px)" },
  { value: "8", label: "Thick (8px)" },
  { value: "12", label: "Heavy (12px)" },
];

const ANIMATION_OPTIONS = [
  { value: "default", label: "Style Default" },
  { value: "stretch", label: "Kinetic Stretch & Snap (Jitter)" },
  { value: "glitch", label: "Glitch RGB Aberration (Jitter)" },
  { value: "slide", label: "Smooth Slide Reveal (Apple Keynote)" },
  { value: "blur", label: "Motion Blur Focus (Jitter)" },
  { value: "bounce", label: "Spring Bounce (Jitter)" },
  { value: "scale", label: "Scale Pop" },
  { value: "highlight", label: "Word Highlight" },
  { value: "karaoke", label: "Karaoke Color Fill" },
];

const TEXT_CASE_OPTIONS = [
  { value: "uppercase", label: "UPPERCASE (ALL CAPS)" },
  { value: "titlecase", label: "Title Case" },
  { value: "lowercase", label: "lowercase" },
  { value: "original", label: "Original Transcription" },
];

export function HeroSection() {
  const router = useRouter();

  const [viewState, setViewState] = useState<ViewState>("idle");
  const [file, setFile] = useState<File | null>(null);
  const [fileDuration, setFileDuration] = useState<number>(0);
  const [selectedStyle, setSelectedStyle] =
    useState<CaptionStyle>(DEFAULT_CAPTION_STYLE);
  const [captionPosition, setCaptionPosition] = useState(
    DEFAULT_CAPTION_POSITION,
  );
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>("landscape");
  const [selectedLanguage, setSelectedLanguage] = useState<string>("auto");
  const [selectedModel, setSelectedModel] = useState<string>("base");

  // Advanced Granular Settings
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [wordsPerSegment, setWordsPerSegment] = useState<string>("auto");
  const [maxLines, setMaxLines] = useState<string>("2");
  const [selectedFont, setSelectedFont] = useState<string>("default");
  const [fontSizeScale, setFontSizeScale] = useState<number>(1.0);
  const [textTransform, setTextTransform] = useState<string>("uppercase");
  const [customPrimaryColor, setCustomPrimaryColor] = useState<string>("");
  const [customHighlightColor, setCustomHighlightColor] = useState<string>("");

  // Outline controls
  const [outlineEnabled, setOutlineEnabled] = useState<boolean>(true);
  const [customOutlineColor, setCustomOutlineColor] = useState<string>("");
  const [outlineSize, setOutlineSize] = useState<string>("default");
  const [selectedAnimation, setSelectedAnimation] = useState<string>("default");

  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFileSelect = (selectedFile: File, duration: number) => {
    setFile(selectedFile);
    setFileDuration(duration);
    setError(null);

    // Auto-detect aspect ratio from video dimensions
    const video = document.createElement("video");
    video.preload = "metadata";
    video.src = URL.createObjectURL(selectedFile);
    video.onloadedmetadata = () => {
      URL.revokeObjectURL(video.src);
      if (video.videoWidth > video.videoHeight) {
        setAspectRatio("landscape");
      } else if (Math.abs(video.videoWidth - video.videoHeight) < 50) {
        setAspectRatio("square");
      } else {
        setAspectRatio("vertical");
      }
    };
  };

  const handleFileClear = () => {
    setFile(null);
    setFileDuration(0);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!file) return;

    setViewState("uploading");
    setUploadProgress(0);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("captionStyle", selectedStyle);
    formData.append("captionPosition", String(captionPosition));
    formData.append("durationSeconds", String(fileDuration));
    if (selectedLanguage !== "auto") {
      formData.append("language", selectedLanguage);
    }
    formData.append("modelSize", selectedModel);

    // Advanced formatting options
    if (wordsPerSegment !== "auto") {
      formData.append("wordsPerSegment", wordsPerSegment);
    }
    formData.append("maxLines", maxLines);
    if (selectedFont !== "default") {
      formData.append("fontFamily", selectedFont);
    }
    formData.append("fontSizeScale", String(fontSizeScale));
    formData.append("textTransform", textTransform);
    if (customPrimaryColor) {
      formData.append("primaryColor", customPrimaryColor);
    }
    if (customHighlightColor) {
      formData.append("highlightColor", customHighlightColor);
    }

    // Outline options
    formData.append("outlineEnabled", String(outlineEnabled));
    if (customOutlineColor) {
      formData.append("outlineColor", customOutlineColor);
    }
    if (outlineSize !== "default") {
      formData.append("outlineSize", outlineSize);
    }
    if (selectedAnimation !== "default") {
      formData.append("animationType", selectedAnimation);
    }

    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev === null || prev >= 90) return prev;
        return prev + 10;
      });
    }, 300);

    const result = await submitCaptionJob(formData);
    clearInterval(progressInterval);

    if ("error" in result) {
      setError(result.error);
      setViewState("idle");
      setUploadProgress(null);
      return;
    }

    setUploadProgress(100);
    setJobId(result.jobId);
    setViewState("processing");
    setUploadProgress(null);
  };

  const handleProcessingComplete = (completedJobId: string) => {
    setViewState("complete");
    router.push(`/captions/${completedJobId}`);
  };

  const handleProcessingError = (errorMessage: string) => {
    setError(errorMessage);
    setViewState("idle");
    setFile(null);
    setFileDuration(0);
    setUploadProgress(null);
    setJobId(null);
  };

  const isUploading = viewState === "uploading";
  const isProcessing = viewState === "processing";
  const styleConfig = CAPTION_STYLE_CONFIGS[selectedStyle];

  const parsedWordsPerSegment = wordsPerSegment === "auto" ? 2 : parseInt(wordsPerSegment, 10);
  const parsedOutlineSize = outlineSize === "default" ? null : parseFloat(outlineSize);

  return (
    <section className="relative min-h-[85vh] overflow-hidden bg-white pt-24 dark:bg-black">
      {/* Subtle gradient background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#459F94]/5 via-white to-white dark:from-[#459F94]/10 dark:via-black dark:to-black" />

      {/* Grid pattern */}
      <div className="bg-grid-dots absolute inset-0 opacity-[0.03] dark:opacity-[0.05]" />

      <div className="container relative mx-auto px-6 py-10">
        {/* Top Hero Header: Badge, Headline, Subheadline */}
        <div className="mb-10 max-w-3xl">
          {/* Badge */}
          <div className="animate-fade-up stagger-1 mb-5 inline-flex items-center gap-2 rounded-full border border-[#459F94]/30 bg-[#459F94]/10 px-4 py-1.5 text-sm font-medium text-[#459F94] dark:bg-[#459F94]/20">
            <Sparkles className="h-4 w-4" />
            <span>100% Free &amp; Open Source Standalone App</span>
          </div>

          {/* Headline */}
          <h1 className="animate-fade-up stagger-2 mb-4 text-4xl font-bold tracking-tight text-gray-900 sm:text-5xl lg:text-6xl dark:text-white">
            AI-Powered{" "}
            <span className="bg-gradient-to-r from-[#459F94] to-[#EDB118] bg-clip-text text-transparent">
              Animated Captions
            </span>{" "}
            for Desktop &amp; Mobile
          </h1>

          {/* Subheadline */}
          <p className="animate-fade-up stagger-3 text-lg text-gray-600 sm:text-xl dark:text-gray-400">
            Add viral word-level animated subtitles in 11 creator styles.
            Full support for 16:9 Desktop videos, 9:16 Shorts, customizable word
            timing, fonts, and multi-format exports.
          </p>
        </div>

        {/* 2-Column Work Area: Left (Interactive Form) & Right (Live Preview aligned) */}
        <div className="flex flex-col gap-10 lg:flex-row lg:items-start lg:gap-12">
          {/* Left Column - Main Interactive Card */}
          <div className="flex-1 min-w-0">
            <div className="animate-fade-up stagger-4 rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl backdrop-blur-sm sm:p-8 dark:border-gray-800 dark:bg-gray-900/80">
              {/* Processing View */}
              {isProcessing && jobId && (
                <ProcessingView
                  jobId={jobId}
                  onComplete={handleProcessingComplete}
                  onError={handleProcessingError}
                />
              )}

              {/* Upload Form View */}
              {!isProcessing && (
                <div className="space-y-6">
                  {/* Dropzone */}
                  <VideoDropzone
                    file={file}
                    onFileSelect={handleFileSelect}
                    onFileClear={handleFileClear}
                    uploadProgress={uploadProgress}
                    disabled={isUploading}
                  />

                  {/* Style Picker */}
                  <div>
                    <label className="mb-2 block text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                      Choose Caption Style (11 Creator Styles)
                    </label>
                    <CaptionStylePicker
                      selectedStyle={selectedStyle}
                      onStyleChange={setSelectedStyle}
                    />
                  </div>

                  {/* Primary Options row: Language & Model */}
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    {/* Language Selection */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Languages className="h-3.5 w-3.5 text-[#459F94]" />
                        Language
                      </label>
                      <select
                        value={selectedLanguage}
                        onChange={(e) => setSelectedLanguage(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                      >
                        {POPULAR_LANGUAGES.map((lang) => (
                          <option key={lang.code} value={lang.code}>
                            {lang.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Model Size Selection */}
                    <div>
                      <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        <Cpu className="h-3.5 w-3.5 text-[#459F94]" />
                        Whisper Model
                      </label>
                      <select
                        value={selectedModel}
                        onChange={(e) => setSelectedModel(e.target.value)}
                        disabled={isUploading}
                        className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                      >
                        {MODEL_OPTIONS.map((opt) => (
                          <option key={opt.size} value={opt.size}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Collapsible Advanced Settings Accordion */}
                  <div className="rounded-xl border border-border/70 bg-muted/20 overflow-hidden">
                    <button
                      type="button"
                      onClick={() => setShowAdvanced(!showAdvanced)}
                      className="flex w-full cursor-pointer items-center justify-between px-4 py-3 text-left text-sm font-semibold text-foreground transition-colors hover:bg-muted/40"
                    >
                      <div className="flex items-center gap-2">
                        <SlidersHorizontal className="h-4 w-4 text-[#459F94]" />
                        <span>Advanced Caption &amp; Typography Controls</span>
                      </div>
                      {showAdvanced ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {showAdvanced && (
                      <div className="space-y-4 border-t border-border/70 p-4">
                        {/* Words per subtitle block + Max lines */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <WrapText className="h-3.5 w-3.5 text-[#459F94]" />
                              Words Per Caption Block
                            </label>
                            <select
                              value={wordsPerSegment}
                              onChange={(e) => setWordsPerSegment(e.target.value)}
                              disabled={isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                            >
                              {WORDS_PER_BLOCK_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <WrapText className="h-3.5 w-3.5 text-[#459F94]" />
                              Max Lines
                            </label>
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={() => setMaxLines("1")}
                                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                                  maxLines === "1"
                                    ? "border-[#459F94] bg-[#459F94]/10 text-[#459F94]"
                                    : "border-border text-muted-foreground hover:border-[#459F94]/50"
                                }`}
                              >
                                Single Line (1)
                              </button>
                              <button
                                type="button"
                                onClick={() => setMaxLines("2")}
                                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                                  maxLines === "2"
                                    ? "border-[#459F94] bg-[#459F94]/10 text-[#459F94]"
                                    : "border-border text-muted-foreground hover:border-[#459F94]/50"
                                }`}
                              >
                                Two Lines (2)
                              </button>
                            </div>
                          </div>
                        </div>

                        {/* Font Family + Font Size */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Type className="h-3.5 w-3.5 text-[#459F94]" />
                              Font Family
                            </label>
                            <select
                              value={selectedFont}
                              onChange={(e) => setSelectedFont(e.target.value)}
                              disabled={isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                            >
                              {FONT_OPTIONS.map((opt) => (
                                <option key={opt.id} value={opt.id}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Type className="h-3.5 w-3.5 text-[#459F94]" />
                              Font Size Scaling
                            </label>
                            <select
                              value={fontSizeScale}
                              onChange={(e) => setFontSizeScale(parseFloat(e.target.value))}
                              disabled={isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                            >
                              {FONT_SIZE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Outline Controls (Toggle, Color & Thickness) */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Layers className="h-3.5 w-3.5 text-[#459F94]" />
                              Subtitle Outline
                            </label>
                            <div className="flex gap-1.5">
                              <button
                                type="button"
                                onClick={() => setOutlineEnabled(true)}
                                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                                  outlineEnabled
                                    ? "border-[#459F94] bg-[#459F94]/10 text-[#459F94]"
                                    : "border-border text-muted-foreground hover:border-[#459F94]/50"
                                }`}
                              >
                                Outline On
                              </button>
                              <button
                                type="button"
                                onClick={() => setOutlineEnabled(false)}
                                className={`flex-1 cursor-pointer rounded-lg border py-2 text-xs font-medium transition-colors ${
                                  !outlineEnabled
                                    ? "border-[#459F94] bg-[#459F94]/10 text-[#459F94]"
                                    : "border-border text-muted-foreground hover:border-[#459F94]/50"
                                }`}
                              >
                                Outline Off
                              </button>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Pipette className="h-3.5 w-3.5 text-[#459F94]" />
                              Outline Color
                            </label>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-2.5 py-1.5">
                              <input
                                type="color"
                                value={customOutlineColor || styleConfig.outlineColor}
                                onChange={(e) => setCustomOutlineColor(e.target.value)}
                                onInput={(e) => setCustomOutlineColor((e.target as HTMLInputElement).value)}
                                disabled={!outlineEnabled}
                                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent disabled:opacity-40"
                              />
                              <span className="text-xs text-muted-foreground">
                                {outlineEnabled ? (customOutlineColor || "Default") : "Disabled"}
                              </span>
                            </div>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Layers className="h-3.5 w-3.5 text-[#459F94]" />
                              Outline Thickness
                            </label>
                            <select
                              value={outlineSize}
                              onChange={(e) => setOutlineSize(e.target.value)}
                              disabled={!outlineEnabled || isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none disabled:opacity-40"
                            >
                              {OUTLINE_SIZE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Motion Animation & Text Case */}
                        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <Sparkles className="h-3.5 w-3.5 text-[#459F94]" />
                              Motion Graphics Animation
                            </label>
                            <select
                              value={selectedAnimation}
                              onChange={(e) => setSelectedAnimation(e.target.value)}
                              disabled={isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                            >
                              {ANIMATION_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>

                          <div>
                            <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                              <CaseSensitive className="h-3.5 w-3.5 text-[#459F94]" />
                              Text Transform
                            </label>
                            <select
                              value={textTransform}
                              onChange={(e) => setTextTransform(e.target.value)}
                              disabled={isUploading}
                              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:border-[#459F94] focus:outline-none"
                            >
                              {TEXT_CASE_OPTIONS.map((opt) => (
                                <option key={opt.value} value={opt.value}>
                                  {opt.label}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        {/* Custom Brand Colors */}
                        <div>
                          <label className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                            <Pipette className="h-3.5 w-3.5 text-[#459F94]" />
                            Custom Brand Text &amp; Highlight Colors
                          </label>
                          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                              <input
                                type="color"
                                value={customPrimaryColor || styleConfig.primaryColor}
                                onChange={(e) => setCustomPrimaryColor(e.target.value)}
                                onInput={(e) => setCustomPrimaryColor((e.target as HTMLInputElement).value)}
                                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                              />
                              <span className="text-xs text-muted-foreground">Main Text Color: {customPrimaryColor || styleConfig.primaryColor}</span>
                            </div>
                            <div className="flex items-center gap-2 rounded-lg border border-border bg-background px-3 py-2">
                              <input
                                type="color"
                                value={customHighlightColor || styleConfig.highlightColor}
                                onChange={(e) => setCustomHighlightColor(e.target.value)}
                                onInput={(e) => setCustomHighlightColor((e.target as HTMLInputElement).value)}
                                className="h-6 w-6 cursor-pointer rounded border-0 bg-transparent"
                              />
                              <span className="text-xs text-muted-foreground">Active Highlight Color: {customHighlightColor || styleConfig.highlightColor}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Error Alert */}
                  {error && (
                    <div className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {error}
                    </div>
                  )}

                  {/* Generate Button */}
                  <button
                    type="button"
                    onClick={() => void handleSubmit()}
                    disabled={!file || isUploading}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#459F94] to-[#367d74] px-6 py-3.5 text-base font-semibold text-white shadow-lg shadow-[#459F94]/25 transition-all hover:opacity-95 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {isUploading ? (
                      <>
                        <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                        <span>Uploading...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-5 w-5" />
                        <span>Generate Captions</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Trust Indicators */}
            <div className="animate-fade-up stagger-6 mt-6 flex flex-wrap items-center justify-center gap-6 sm:justify-start">
              {trustIndicators.map((item) => (
                <div
                  key={item.text}
                  className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400"
                >
                  <item.icon className="h-4 w-4 text-[#459F94]" />
                  <span>{item.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right Column - Live Phone & Desktop Preview (Perfectly aligned with options card!) */}
          <div className="hidden shrink-0 flex-col items-center lg:flex lg:w-[460px] lg:sticky lg:top-28">
            <div className="w-full rounded-2xl border border-gray-200 bg-white/80 p-6 shadow-xl backdrop-blur-sm dark:border-gray-800 dark:bg-gray-900/80">
              <div className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Live Aspect Ratio &amp; Style Preview
              </div>
              <CaptionPreview
                style={styleConfig}
                position={captionPosition}
                onPositionChange={setCaptionPosition}
                aspectRatio={aspectRatio}
                onAspectRatioChange={setAspectRatio}
                wordsPerSegment={parsedWordsPerSegment}
                fontFamily={selectedFont}
                fontSizeScale={fontSizeScale}
                textTransform={textTransform}
                primaryColorOverride={customPrimaryColor || null}
                highlightColorOverride={customHighlightColor || null}
                maxLines={parseInt(maxLines, 10) || 2}
                outlineEnabled={outlineEnabled}
                outlineColorOverride={customOutlineColor || null}
                outlineSizeOverride={parsedOutlineSize}
                animationTypeOverride={selectedAnimation}
                videoFile={file}
              />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
