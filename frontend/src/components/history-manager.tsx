"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Film,
  Trash2,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  Sparkles,
  ExternalLink,
  Play,
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
import { deleteCaptionJobs, deleteCaptionJob } from "~/actions/captions";
import { CAPTION_STYLE_CONFIGS } from "~/lib/caption-styles";
import { clientEnv } from "~/lib/env";
import { formatDuration, formatBytes, cn } from "~/lib/utils";
import type { CaptionJob } from "~/types/caption";

interface HistoryManagerProps {
  initialJobs: CaptionJob[];
}

function getStatusIndicator(status: CaptionJob["status"]) {
  switch (status) {
    case "completed":
      return { color: "bg-green-500", label: "Completed" };
    case "processing":
    case "uploading":
      return { color: "bg-yellow-500", label: "Processing" };
    case "failed":
      return { color: "bg-red-500", label: "Failed" };
    default:
      return { color: "bg-gray-400", label: "Pending" };
  }
}

function formatRelativeDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSeconds = Math.floor(diffMs / 1000);
  const diffMinutes = Math.floor(diffSeconds / 60);
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSeconds < 60) return "just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

export function HistoryManager({ initialJobs }: HistoryManagerProps) {
  const router = useRouter();
  const [jobs, setJobs] = useState<CaptionJob[]>(initialJobs);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);

  const backendBaseUrl = clientEnv.NEXT_PUBLIC_BACKEND_URL;

  const isAllSelected = jobs.length > 0 && selectedIds.size === jobs.length;

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(jobs.map((j) => j.id)));
    }
  };

  const toggleSelectJob = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleBatchDelete = async () => {
    if (selectedIds.size === 0) return;
    setIsDeleting(true);
    const idsToDelete = Array.from(selectedIds);
    try {
      await deleteCaptionJobs(idsToDelete);
      setJobs((prev) => prev.filter((j) => !selectedIds.has(j.id)));
      setSelectedIds(new Set());
      toast.success(`Deleted ${idsToDelete.length} video${idsToDelete.length > 1 ? "s" : ""}`);
      router.refresh();
    } catch {
      toast.error("Failed to delete selected videos");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSingleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await deleteCaptionJob(id);
      setJobs((prev) => prev.filter((j) => j.id !== id));
      const next = new Set(selectedIds);
      next.delete(id);
      setSelectedIds(next);
      toast.success("Video deleted");
      router.refresh();
    } catch {
      toast.error("Failed to delete video");
    }
  };

  if (jobs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 py-24 text-center dark:border-gray-800">
        <div className="rounded-full bg-gray-100 p-4 dark:bg-gray-800">
          <Film className="h-8 w-8 text-gray-400 dark:text-gray-500" />
        </div>
        <div>
          <p className="text-base font-semibold text-gray-700 dark:text-gray-300">
            No captions yet
          </p>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Upload a video to generate animated viral captions
          </p>
        </div>
        <Link
          href="/"
          className="mt-2 rounded-full bg-[#459F94] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#367d74]"
        >
          Upload a video
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Control Bar: Select All, Selected Count, and Batch Delete */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-white p-4 shadow-sm dark:bg-gray-900">
        <div className="flex items-center gap-3">
          <button
            onClick={toggleSelectAll}
            className="flex cursor-pointer items-center gap-2 rounded-xl border border-border bg-background px-3.5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-[#459F94] hover:text-[#459F94]"
          >
            {isAllSelected ? (
              <CheckSquare className="h-4 w-4 text-[#459F94]" />
            ) : (
              <Square className="h-4 w-4 text-muted-foreground" />
            )}
            <span>{isAllSelected ? "Deselect All" : "Select All"}</span>
          </button>

          {selectedIds.size > 0 && (
            <span className="text-xs font-medium text-muted-foreground">
              {selectedIds.size} of {jobs.length} selected
            </span>
          )}
        </div>

        {/* Batch Delete Button */}
        {selectedIds.size > 0 && (
          <AlertDialog>
            <AlertDialogTrigger
              disabled={isDeleting}
              className="flex cursor-pointer items-center gap-2 rounded-xl bg-red-500 px-4 py-2 text-xs font-semibold text-white shadow-sm transition-all hover:bg-red-600 disabled:opacity-50"
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="h-3.5 w-3.5" />
              )}
              <span>Delete Selected ({selectedIds.size})</span>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete {selectedIds.size} video{selectedIds.size > 1 ? "s" : ""}?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete the selected {selectedIds.size} captioned video{selectedIds.size > 1 ? "s" : ""} and their subtitle files from local storage.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => void handleBatchDelete()}
                  className="bg-red-500 hover:bg-red-600"
                >
                  Delete Selected
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
      </div>

      {/* Video Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {jobs.map((job) => {
          const isSelected = selectedIds.has(job.id);
          const styleConfig = CAPTION_STYLE_CONFIGS[job.captionStyle] || {
            name: job.captionStyle || "Custom",
          };
          const statusIndicator = getStatusIndicator(job.status);
          const dotClass = `style-dot-${job.captionStyle}`;
          const videoDownloadUrl = job.backendJobId
            ? `${backendBaseUrl}/api/download/${job.backendJobId}`
            : null;

          return (
            <div
              key={job.id}
              onClick={() => router.push(`/captions/${job.id}`)}
              className={cn(
                "group relative cursor-pointer overflow-hidden rounded-2xl border bg-white p-4 shadow-sm transition-all hover:shadow-xl dark:bg-gray-900",
                isSelected
                  ? "border-[#459F94] ring-2 ring-[#459F94]/30"
                  : "border-border hover:border-[#459F94]/40"
              )}
            >
              {/* Real Video Thumbnail Container */}
              <div className="relative mb-3 overflow-hidden rounded-xl bg-black">
                {videoDownloadUrl && job.status === "completed" ? (
                  <div className="relative aspect-video w-full overflow-hidden">
                    <video
                      src={`${videoDownloadUrl}#t=0.5`}
                      preload="metadata"
                      muted
                      playsInline
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 transition-opacity group-hover:bg-black/0" />
                  </div>
                ) : (
                  <div className="flex aspect-video items-center justify-center bg-gray-900">
                    <Film className="h-10 w-10 text-gray-600" />
                  </div>
                )}

                {/* Selection Checkbox Overlay */}
                <button
                  type="button"
                  onClick={(e) => toggleSelectJob(job.id, e)}
                  className="absolute top-2.5 left-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 backdrop-blur-md transition-colors hover:bg-[#459F94]"
                >
                  {isSelected ? (
                    <CheckSquare className="h-4 w-4 text-white" />
                  ) : (
                    <Square className="h-4 w-4 text-white/80" />
                  )}
                </button>

                {/* Single Delete Button Overlay */}
                <button
                  type="button"
                  onClick={(e) => void handleSingleDelete(job.id, e)}
                  title="Delete Video"
                  className="absolute top-2.5 right-2.5 z-10 flex h-7 w-7 items-center justify-center rounded-lg bg-black/60 text-red-400 opacity-0 backdrop-blur-md transition-all hover:bg-red-500 hover:text-white group-hover:opacity-100"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>

                {/* Duration Badge */}
                {job.durationSeconds !== null && (
                  <div className="absolute right-2.5 bottom-2.5 rounded-md bg-black/70 px-2 py-0.5 text-[11px] font-semibold text-white backdrop-blur-sm">
                    {formatDuration(job.durationSeconds)}
                  </div>
                )}
              </div>

              {/* Title / File name */}
              <p
                className="mb-2 truncate text-sm font-semibold text-gray-900 dark:text-white"
                title={job.originalFileName}
              >
                {job.originalFileName}
              </p>

              {/* Style & Language Row */}
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-xs font-medium text-foreground">
                  <span className={cn("h-2.5 w-2.5 flex-shrink-0 rounded-full ring-1 ring-black/20", dotClass)} />
                  {styleConfig.name}
                </span>

                {job.language && (
                  <span className="rounded-full bg-[#459F94]/10 px-2 py-0.5 text-[10px] font-bold text-[#459F94]">
                    {job.language.toUpperCase()}
                  </span>
                )}
              </div>

              {/* Status and Date Footer */}
              <div className="flex items-center justify-between border-t border-border/50 pt-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 flex-shrink-0 rounded-full", statusIndicator.color)} />
                  <span>{statusIndicator.label}</span>
                </div>
                <span>{formatRelativeDate(job.createdAt)}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
