"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Trash2, Loader2, FileText, Subtitles, Video, Sparkles, CheckCircle2 } from "lucide-react";
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
import { deleteCaptionJob } from "~/actions/captions";
import { CAPTION_STYLE_CONFIGS } from "~/lib/caption-styles";
import { clientEnv } from "~/lib/env";
import { formatDuration, formatBytes, cn } from "~/lib/utils";
import type { CaptionJob } from "~/types/caption";

interface CaptionResultViewerProps {
  job: CaptionJob;
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

export function CaptionResultViewer({ job }: CaptionResultViewerProps) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);

  const styleConfig = CAPTION_STYLE_CONFIGS[job.captionStyle] || {
    name: job.captionStyle || "Custom Style",
  };
  const backendBaseUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL;
  const downloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}`
    : null;
  const srtDownloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}?format=srt`
    : null;
  const assDownloadUrl = job.backendJobId
    ? `${backendBaseUrl}/api/download/${job.backendJobId}?format=ass`
    : null;

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
      {/* Container */}
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
          {/* Left Column: Video Player & Prominent Download Action Cards */}
          <div className="flex-1 space-y-6">
            {/* Video Player Box */}
            <div className="overflow-hidden rounded-2xl border border-gray-200 bg-black shadow-xl dark:border-gray-800">
              {downloadUrl ? (
                <video
                  controls
                  autoPlay
                  className="max-h-[560px] w-full object-contain"
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

            {/* Prominent Download Hub */}
            <div className="rounded-2xl border border-border bg-white p-6 shadow-sm dark:bg-gray-900">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#459F94]/10 text-[#459F94]">
                    <CheckCircle2 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      Captioned Video Ready for Export
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Full HD MP4 with burned-in animated subtitles + raw subtitle files.
                    </p>
                  </div>
                </div>
              </div>

              {/* Primary & Secondary Download Buttons Grid */}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {/* 1. Video Download Button */}
                {downloadUrl && (
                  <button
                    onClick={() => handleDownload(downloadUrl, `captioned_${job.originalFileName}`)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#459F94] to-[#367d74] px-4 py-3 text-sm font-semibold text-white shadow-md shadow-[#459F94]/20 transition-all hover:scale-[1.02] hover:shadow-lg active:scale-[0.98]"
                  >
                    <Video className="h-4 w-4" />
                    <span>Download MP4 Video</span>
                  </button>
                )}

                {/* 2. SRT Subtitles Button */}
                {srtDownloadUrl && (
                  <button
                    onClick={() => handleDownload(srtDownloadUrl, `subtitles_${job.originalFileName.replace(/\.[^/.]+$/, "")}.srt`)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-[#459F94] hover:bg-[#459F94]/10 hover:text-[#459F94]"
                  >
                    <FileText className="h-4 w-4 text-[#459F94]" />
                    <span>Download Subtitles (.SRT)</span>
                  </button>
                )}

                {/* 3. ASS Subtitles Button */}
                {assDownloadUrl && (
                  <button
                    onClick={() => handleDownload(assDownloadUrl, `subtitles_${job.originalFileName.replace(/\.[^/.]+$/, "")}.ass`)}
                    className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-3 text-sm font-semibold text-foreground transition-all hover:border-[#EDB118] hover:bg-[#EDB118]/10 hover:text-[#EDB118]"
                  >
                    <Subtitles className="h-4 w-4 text-[#EDB118]" />
                    <span>Styled Subtitles (.ASS)</span>
                  </button>
                )}
              </div>
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
                  <dd className="mt-0.5 text-sm font-medium text-gray-900 dark:text-white">
                    {job.language.toUpperCase()}
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
