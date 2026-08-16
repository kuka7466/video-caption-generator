"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Download,
  Trash2,
  Loader2,
  FileText,
  Subtitles,
  Video,
  Sparkles,
  CheckCircle2,
  Edit3,
  RefreshCw,
  Clock,
  Type,
} from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "~/components/ui/alert-dialog";
import { deleteCaptionJob, getJobTranscript, rerenderCaptionJob } from "~/actions/captions";
import { CAPTION_STYLE_CONFIGS } from "~/lib/caption-styles";
import { clientEnv } from "~/lib/env";
import { formatDuration, formatBytes, cn } from "~/lib/utils";
import type { CaptionJob } from "~/types/caption";

interface CaptionResultViewerProps {
  job: CaptionJob;
}

interface TranscriptWord {
  word: string;
  start: number;
  end: number;
}

interface TranscriptSegment {
  start: number;
  end: number;
  text: string;
  words: TranscriptWord[];
}

interface TranscriptData {
  language: string;
  segments: TranscriptSegment[];
}

function formatProcessingTime(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s`;
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = (seconds % 60).toFixed(2);
  return `${mins.toString().padStart(2, "0")}:${secs.padStart(5, "0")}`;
}

export function CaptionResultViewer({ job }: CaptionResultViewerProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isRerendering, setIsRerendering] = useState(false);
  const [transcript, setTranscript] = useState<TranscriptData | null>(null);
  const [videoTimestamp, setVideoTimestamp] = useState<number>(Date.now());
  const [activeTab, setActiveTab] = useState<"transcript" | "export">("transcript");
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState<number>(0);
  const [activeSegIndex, setActiveSegIndex] = useState<number>(-1);
  const [selectedWordTag, setSelectedWordTag] = useState<string>("gold");

  const styleConfig = CAPTION_STYLE_CONFIGS[job.captionStyle] || {
    name: job.captionStyle || "Custom Style",
  };
  const backendBaseUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL;
  const baseDownloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}`
    : null;
  const downloadUrl = baseDownloadUrl ? `${baseDownloadUrl}?v=${videoTimestamp}` : null;
  const srtDownloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}?format=srt&v=${videoTimestamp}`
    : null;
  const assDownloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}?format=ass&v=${videoTimestamp}`
    : null;

  // Fetch detected transcript on mount
  useEffect(() => {
    if (job.backendJobId) {
      void getJobTranscript(job.backendJobId).then((data) => {
        if (data?.transcript) {
          setTranscript(data.transcript);
        }
      });
    }
  }, [job.backendJobId]);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteCaptionJob(job.id);
      router.push("/history");
    } catch {
      setIsDeleting(false);
    }
  };

  const handleDownload = (url: string | null, filename?: string) => {
    if (!url) return;
    const a = document.createElement("a");
    a.href = url;
    if (filename) a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };


  // Click-to-seek video sync
  const seekToTime = (seconds: number) => {
    const videoEl = document.getElementById("caption-result-video") as HTMLVideoElement | null;
    if (videoEl) {
      videoEl.currentTime = seconds;
      videoEl.play().catch(() => {});
    }
  };

  // Track playback time to highlight active segment
  const handleTimeUpdate = (e: React.SyntheticEvent<HTMLVideoElement>) => {
    const time = e.currentTarget.currentTime;
    setCurrentPlaybackTime(time);
    if (transcript?.segments) {
      const idx = transcript.segments.findIndex((s) => time >= s.start && time <= s.end);
      setActiveSegIndex(idx);
    }
  };

  // Keyboard shortcut: Ctrl+Enter / Cmd+Enter to re-render
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        void handleSaveAndRerender();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [transcript, job.backendJobId]);


  // Cycle word emphasis color: none -> <gold> -> <cyan> -> <pink> -> <green> -> none
  const cycleWordEmphasis = (segIdx: number, wordIdx: number) => {
    if (!transcript) return;
    const newSegments = [...transcript.segments];
    const targetSeg = { ...newSegments[segIdx] };
    const targetWords = [...targetSeg.words];
    const currentWord = targetWords[wordIdx].word;

    const tags = ["<gold>", "<cyan>", "<pink>", "<green>", "<red>"];
    let rawWord = currentWord;
    let currentTag = "";

    for (const tag of tags) {
      const closeTag = tag.replace("<", "</");
      if (rawWord.includes(tag)) {
        currentTag = tag;
        rawWord = rawWord.replace(tag, "").replace(closeTag, "");
        break;
      }
    }

    let nextWord = rawWord;
    if (currentTag === "") {
      nextWord = `<gold>${rawWord}</gold>`;
    } else if (currentTag === "<gold>") {
      nextWord = `<cyan>${rawWord}</cyan>`;
    } else if (currentTag === "<cyan>") {
      nextWord = `<pink>${rawWord}</pink>`;
    } else if (currentTag === "<pink>") {
      nextWord = `<green>${rawWord}</green>`;
    } else {
      nextWord = rawWord; // reset to plain
    }

    targetWords[wordIdx] = {
      ...targetWords[wordIdx],
      word: nextWord,
    };
    targetSeg.words = targetWords;
    targetSeg.text = targetWords.map((w) => w.word).join(" ");
    newSegments[segIdx] = targetSeg;

    setTranscript({
      ...transcript,
      segments: newSegments,
    });
    toast.success("Toggled keyword emphasis color!");
  };

  const handleWordChange = (segIdx: number, wordIdx: number, newWordValue: string) => {
    if (!transcript) return;
    const newSegments = [...transcript.segments];
    const targetSeg = { ...newSegments[segIdx] };
    const targetWords = [...targetSeg.words];

    targetWords[wordIdx] = {
      ...targetWords[wordIdx],
      word: newWordValue,
    };

    targetSeg.words = targetWords;
    targetSeg.text = targetWords.map((w) => w.word).join(" ");
    newSegments[segIdx] = targetSeg;

    setTranscript({
      ...transcript,
      segments: newSegments,
    });
  };

  const handleSegmentTextChange = (segIdx: number, newText: string) => {
    if (!transcript) return;
    const newSegments = [...transcript.segments];
    const targetSeg = { ...newSegments[segIdx] };
    targetSeg.text = newText;

    // Distribute words across existing timestamp slots
    const wordsList = newText.trim().split(/\s+/);
    const existingWords = targetSeg.words || [];
    const updatedWords: TranscriptWord[] = [];

    const segStart = targetSeg.start;
    const segEnd = targetSeg.end;
    const wordDur = wordsList.length > 0 ? (segEnd - segStart) / wordsList.length : 0;

    wordsList.forEach((w, i) => {
      if (i < existingWords.length) {
        updatedWords.push({
          ...existingWords[i],
          word: w,
        });
      } else {
        updatedWords.push({
          word: w,
          start: segStart + i * wordDur,
          end: segStart + (i + 1) * wordDur,
        });
      }
    });

    targetSeg.words = updatedWords;
    newSegments[segIdx] = targetSeg;

    setTranscript({
      ...transcript,
      segments: newSegments,
    });
  };

  const handleSaveAndRerender = async () => {
    if (!job.backendJobId || !transcript) return;
    setIsRerendering(true);
    try {
      const res = await rerenderCaptionJob(job.backendJobId, transcript);
      if (res.success) {
        toast.success("Captions updated and re-burned into video successfully!");
        setVideoTimestamp(Date.now());
      } else {
        toast.error(res.error || "Failed to update video captions");
      }
    } catch {
      toast.error("Failed to re-render captions");
    } finally {
      setIsRerendering(false);
    }
  };

  // Still processing state
  if (job.status === "processing" || job.status === "uploading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 dark:bg-gray-950">
        <Loader2 className="h-8 w-8 animate-spin text-[#459F94]" />
        <p className="text-base font-medium text-gray-700 dark:text-gray-300">
          Generating animated captions...
        </p>
        <Link
          href="/"
          className="text-sm text-[#459F94] underline-offset-4 hover:underline"
        >
          Go back home
        </Link>
      </div>
    );
  }

  // Failed state
  if (job.status === "failed") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-gray-50 p-6 dark:bg-gray-950">
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-6 py-8 text-center">
          <p className="mb-2 text-base font-semibold text-red-400">
            Processing failed
          </p>
          <p className="text-sm text-red-300">
            {job.errorMessage ?? "An unknown error occurred."}
          </p>
        </div>
        <Link
          href="/history"
          className="text-sm text-[#459F94] underline-offset-4 hover:underline"
        >
          Back to history
        </Link>
      </div>
    );
  }

  const dotClass = `style-dot-${job.captionStyle}`;

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl px-6">
        {/* Navigation Bar */}
        <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/history"
            className="flex items-center gap-1.5 rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-[#459F94]/50 hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4 text-[#459F94]" />
            Back to History
          </Link>

          <div className="flex items-center gap-2">
            <AlertDialog>
              <AlertDialogTrigger
                disabled={isDeleting}
                className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-500/20 disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Delete Job
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete this caption job?</AlertDialogTitle>
                  <AlertDialogDescription>
                    This will permanently delete the job and the processed
                    video from your local storage.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => void handleDelete()}
                    className="bg-red-500 hover:bg-red-600"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>

        {/* Main 2-Column Grid */}
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start">
          {/* Left Column: Video Player & Transcript Editor */}
          <div className="flex-1 space-y-6">
            {/* Video Player Box */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-xl dark:border-gray-800">
              {downloadUrl ? (
                <video
                  id="caption-result-video"
                  key={videoTimestamp}
                  controls
                  autoPlay
                  onTimeUpdate={handleTimeUpdate}
                  className="max-h-[520px] w-full object-contain"
                >
                  <source src={downloadUrl} type="video/mp4" />
                  Your browser does not support the video tag.
                </video>
              ) : (
                <div className="flex aspect-video w-full items-center justify-center text-sm text-gray-500">
                  Video not available
                </div>
              )}
            </div>

            {/* Quick Download Buttons Row */}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              {downloadUrl && (
                <button
                  onClick={() => handleDownload(downloadUrl, `captioned_${job.originalFileName}`)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#459F94] to-[#367d74] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#459F94]/20 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Video className="h-4 w-4" />
                  <span>Download MP4</span>
                </button>
              )}
              {srtDownloadUrl && (
                <button
                  onClick={() => handleDownload(srtDownloadUrl, `subtitles_${job.originalFileName.replace(/\.[^/.]+$/, "")}.srt`)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-[#459F94] hover:bg-[#459F94]/10 hover:text-[#459F94]"
                >
                  <FileText className="h-4 w-4 text-[#459F94]" />
                  <span>Download (.SRT)</span>
                </button>
              )}
              {assDownloadUrl && (
                <button
                  onClick={() => handleDownload(assDownloadUrl, `subtitles_${job.originalFileName.replace(/\.[^/.]+$/, "")}.ass`)}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-[#EDB118] hover:bg-[#EDB118]/10 hover:text-[#EDB118]"
                >
                  <Subtitles className="h-4 w-4 text-[#EDB118]" />
                  <span>Styled (.ASS)</span>
                </button>
              )}
            </div>

            {/* Interactive Transcript & Word Editor Card */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#459F94]/10 text-[#459F94]">
                    <Edit3 className="h-4 w-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Detected Script &amp; Word Editor
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Click any word or line to edit mistakes, typos, or Hinglish spelling, then click Re-render.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => void handleSaveAndRerender()}
                  disabled={isRerendering || !transcript}
                  className="flex cursor-pointer items-center gap-2 rounded-xl bg-[#459F94] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-[#367d74] disabled:opacity-50"
                >
                  <RefreshCw className={cn("h-3.5 w-3.5", isRerendering && "animate-spin")} />
                  <span>{isRerendering ? "Re-rendering..." : "Update & Re-render Video (Ctrl+Enter)"}</span>
                </button>
              </div>

              {/* Segments List */}
              {transcript && transcript.segments && transcript.segments.length > 0 ? (
                <div className="space-y-4 max-h-[480px] overflow-y-auto pr-2">
                  {transcript.segments.map((seg, segIdx) => (
                    <div
                      key={segIdx}
                      className={cn(
                        "rounded-xl border p-4 transition-all",
                        activeSegIndex === segIdx
                          ? "border-[#459F94] bg-[#459F94]/5 ring-1 ring-[#459F94]/30 shadow-xs"
                          : "border-border/80 bg-muted/20 hover:border-[#459F94]/40"
                      )}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <button
                          type="button"
                          onClick={() => seekToTime(seg.start)}
                          title="Click to jump video to this segment"
                          className="flex cursor-pointer items-center gap-1.5 rounded-lg bg-background px-2 py-0.5 text-xs font-semibold text-[#459F94] shadow-2xs transition-colors hover:bg-[#459F94] hover:text-white"
                        >
                          <Clock className="h-3 w-3" />
                          <span>{formatSeconds(seg.start)} &rarr; {formatSeconds(seg.end)} (Play)</span>
                        </button>
                        <span className="text-[10px] uppercase tracking-wider text-muted-foreground/70">
                          Segment #{segIdx + 1}
                        </span>
                      </div>

                      {/* Full line text editable */}
                      <input
                        type="text"
                        value={seg.text}
                        onChange={(e) => handleSegmentTextChange(segIdx, e.target.value)}
                        className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-medium text-foreground transition-colors focus:border-[#459F94] focus:outline-none"
                        placeholder="Edit caption line..."
                      />

                      {/* Word Pills Editor */}
                      {seg.words && seg.words.length > 0 && (
                        <div className="mt-3 flex flex-wrap items-center gap-1.5 pt-2 border-t border-border/40">
                          {seg.words.map((w, wIdx) => (
                            <div
                              key={wIdx}
                              className={cn(
                                "flex items-center gap-1 rounded-md border bg-background px-2 py-0.5 text-xs shadow-2xs transition-colors hover:border-[#459F94]",
                                w.word.includes("<gold>") && "border-amber-400/80 bg-amber-400/10 text-amber-300",
                                w.word.includes("<cyan>") && "border-cyan-400/80 bg-cyan-400/10 text-cyan-300",
                                w.word.includes("<pink>") && "border-pink-400/80 bg-pink-400/10 text-pink-300",
                                w.word.includes("<green>") && "border-emerald-400/80 bg-emerald-400/10 text-emerald-300",
                                !w.word.includes("<") && "border-border"
                              )}
                            >
                              <button
                                type="button"
                                onClick={() => cycleWordEmphasis(segIdx, wIdx)}
                                title="Click to cycle keyword highlight color (Gold/Cyan/Pink/Green)"
                                className="h-2.5 w-2.5 flex-shrink-0 cursor-pointer rounded-full bg-current opacity-70 hover:opacity-100 ring-1 ring-black/20"
                              />
                              <input
                                type="text"
                                value={w.word.replace(/<\/?[a-z]+>/g, "")}
                                onChange={(e) => handleWordChange(segIdx, wIdx, e.target.value)}
                                className="w-16 bg-transparent text-xs font-medium focus:outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => seekToTime(w.start)}
                                title="Play word in video"
                                className="cursor-pointer text-[9px] font-semibold opacity-60 hover:opacity-100"
                              >
                                {w.start.toFixed(1)}s
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="py-8 text-center text-xs text-muted-foreground">
                  Loading detected script timeline...
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Metadata Sidebar Card */}
          <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-gray-900 lg:w-80 lg:flex-shrink-0">
            <h2 className="mb-5 text-sm font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
              Details
            </h2>

            <dl className="space-y-4">
              {job.durationSeconds !== null && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    Duration
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {formatDuration(job.durationSeconds)}
                  </dd>
                </div>
              )}

              {job.language && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    Language detected
                  </dt>
                  <dd className="mt-0.5 flex items-center gap-1.5">
                    <span className="rounded-md bg-[#459F94]/10 px-2 py-0.5 text-xs font-semibold text-[#459F94]">
                      {job.language.toUpperCase()}
                    </span>
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Caption style
                </dt>
                <dd className="mt-0.5 flex items-center gap-1.5">
                  <span className={cn("h-3.5 w-3.5 flex-shrink-0 rounded-full ring-1 ring-black/20", dotClass)} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">
                    {styleConfig.name}
                  </span>
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Caption position
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                  {job.captionPosition}%
                </dd>
              </div>

              {job.processingTimeMs !== null && (
                <div>
                  <dt className="text-xs text-gray-500 dark:text-gray-400">
                    Processing time
                  </dt>
                  <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {formatProcessingTime(job.processingTimeMs)}
                  </dd>
                </div>
              )}

              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  File size
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                  {formatBytes(job.fileSize)}
                </dd>
              </div>

              <div>
                <dt className="text-xs text-gray-500 dark:text-gray-400">
                  Created
                </dt>
                <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                  {formatDate(job.createdAt)}
                </dd>
              </div>
            </dl>

            {/* Quick Export in Sidebar */}
            {downloadUrl && (
              <div className="mt-6 border-t border-border pt-5">
                <button
                  onClick={() => handleDownload(downloadUrl, `captioned_${job.originalFileName}`)}
                  className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-[#459F94] px-4 py-2.5 text-xs font-semibold text-white transition-colors hover:bg-[#367d74]"
                >
                  <Download className="h-3.5 w-3.5" />
                  <span>Download Video (.MP4)</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
