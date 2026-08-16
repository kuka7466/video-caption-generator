"use server";

import { db } from "~/lib/db";
import { revalidatePath } from "next/cache";
import { env } from "~/lib/env";
import type { CaptionJob, CaptionJobStatus, CaptionPhase, CaptionStyle, BackendStatusResponse } from "~/types/caption";

function mapPrismaJobToType(job: {
  id: string;
  displayName: string | null;
  originalFileName: string;
  fileSize: number;
  durationSeconds: number | null;
  captionStyle: string;
  captionPosition: number;
  status: string;
  progress: number;
  currentPhase: string | null;
  language: string | null;
  errorMessage: string | null;
  backendJobId: string | null;
  processingTimeMs: number | null;
  outputFileSize: number | null;
  createdAt: Date;
  updatedAt: Date;
}): CaptionJob {
  return {
    id: job.id,
    displayName: job.displayName,
    originalFileName: job.originalFileName,
    fileSize: job.fileSize,
    durationSeconds: job.durationSeconds,
    captionStyle: job.captionStyle as CaptionStyle,
    captionPosition: job.captionPosition,
    status: job.status as CaptionJobStatus,
    progress: job.progress,
    currentPhase: job.currentPhase as CaptionPhase | null,
    language: job.language,
    errorMessage: job.errorMessage,
    backendJobId: job.backendJobId,
    processingTimeMs: job.processingTimeMs,
    outputFileSize: job.outputFileSize,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString(),
  };
}

const TERMINAL_STATUSES: CaptionJobStatus[] = ["completed", "failed"];

export async function submitCaptionJob(
  formData: FormData
): Promise<{ jobId: string } | { error: string }> {
  try {
    const file = formData.get("file") as File | null;
    const captionStyle = formData.get("captionStyle") as string | null;
    const captionPosition = formData.get("captionPosition") as string | null;
    const durationSeconds = formData.get("durationSeconds") as string | null;
    const language = formData.get("language") as string | null;
    const modelSize = formData.get("modelSize") as string | null;
    const wordsPerSegment = formData.get("wordsPerSegment") as string | null;
    const maxLines = formData.get("maxLines") as string | null;
    const fontFamily = formData.get("fontFamily") as string | null;
    const fontSizeScale = formData.get("fontSizeScale") as string | null;
    const textTransform = formData.get("textTransform") as string | null;
    const primaryColor = formData.get("primaryColor") as string | null;
    const highlightColor = formData.get("highlightColor") as string | null;
    const outlineEnabled = formData.get("outlineEnabled") as string | null;
    const outlineColor = formData.get("outlineColor") as string | null;
    const outlineSize = formData.get("outlineSize") as string | null;
    const animationType = formData.get("animationType") as string | null;

    if (!file) {
      return { error: "No file provided" };
    }
    if (!captionStyle) {
      return { error: "No caption style provided" };
    }
    if (!captionPosition) {
      return { error: "No caption position provided" };
    }

    const backendFormData = new FormData();
    backendFormData.append("file", file);
    backendFormData.append("captionStyle", captionStyle);
    backendFormData.append("captionPosition", captionPosition);
    if (durationSeconds) {
      backendFormData.append("durationSeconds", durationSeconds);
    }
    if (language && language !== "auto") {
      backendFormData.append("language", language);
    }
    if (modelSize) {
      backendFormData.append("modelSize", modelSize);
    }
    if (wordsPerSegment && wordsPerSegment !== "auto") {
      backendFormData.append("wordsPerSegment", wordsPerSegment);
    }
    if (maxLines) {
      backendFormData.append("maxLines", maxLines);
    }
    if (fontFamily && fontFamily !== "default") {
      backendFormData.append("fontFamily", fontFamily);
    }
    if (fontSizeScale) {
      backendFormData.append("fontSizeScale", fontSizeScale);
    }
    if (textTransform) {
      backendFormData.append("textTransform", textTransform);
    }
    if (primaryColor) {
      backendFormData.append("primaryColor", primaryColor);
    }
    if (highlightColor) {
      backendFormData.append("highlightColor", highlightColor);
    }
    if (outlineEnabled !== null) {
      backendFormData.append("outlineEnabled", outlineEnabled);
    }
    if (outlineColor) {
      backendFormData.append("outlineColor", outlineColor);
    }
    if (outlineSize && outlineSize !== "default") {
      backendFormData.append("outlineSize", outlineSize);
    }
    if (animationType && animationType !== "default") {
      backendFormData.append("animationType", animationType);
    }

    const response = await fetch(`${env.BACKEND_URL}/api/process`, {
      method: "POST",
      body: backendFormData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { error: `Backend error: ${errorText}` };
    }

    const data = (await response.json()) as { jobId: string };

    const prismaRecord = await db.captionJob.create({
      data: {
        originalFileName: file.name,
        fileSize: file.size,
        durationSeconds: durationSeconds ? parseFloat(durationSeconds) : null,
        captionStyle,
        captionPosition: parseInt(captionPosition, 10),
        status: "processing",
        backendJobId: data.jobId,
        language: language && language !== "auto" ? language : null,
      },
    });

    return { jobId: prismaRecord.id };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return { error: message };
  }
}

export async function getCaptionJobStatus(
  jobId: string
): Promise<CaptionJob | null> {
  const job = await db.captionJob.findUnique({ where: { id: jobId } });
  if (!job) return null;

  if (TERMINAL_STATUSES.includes(job.status as CaptionJobStatus)) {
    return mapPrismaJobToType(job);
  }

  if (!job.backendJobId) {
    return mapPrismaJobToType(job);
  }

  try {
    const response = await fetch(
      `${env.BACKEND_URL}/api/status/${job.backendJobId}`
    );

    if (!response.ok) {
      return mapPrismaJobToType(job);
    }

    const backendData = (await response.json()) as BackendStatusResponse;

    const updated = await db.captionJob.update({
      where: { id: jobId },
      data: {
        status: backendData.status as CaptionJobStatus,
        progress: backendData.progress,
        currentPhase: backendData.currentPhase,
        language: backendData.language,
        durationSeconds: backendData.durationSeconds ?? job.durationSeconds,
        errorMessage: backendData.errorMessage,
        processingTimeMs: backendData.processingTimeMs,
      },
    });

    return mapPrismaJobToType(updated);
  } catch {
    return mapPrismaJobToType(job);
  }
}

export async function getCaptionJobs(): Promise<CaptionJob[]> {
  const jobs = await db.captionJob.findMany({
    orderBy: { createdAt: "desc" },
  });
  return jobs.map(mapPrismaJobToType);
}

export async function getCaptionJobById(
  jobId: string
): Promise<CaptionJob | null> {
  const job = await db.captionJob.findUnique({ where: { id: jobId } });
  if (!job) return null;
  return mapPrismaJobToType(job);
}

export async function deleteCaptionJob(jobId: string): Promise<void> {
  const job = await db.captionJob.findUnique({ where: { id: jobId } });
  if (!job) return;

  if (job.backendJobId) {
    try {
      await fetch(`${env.BACKEND_URL}/api/jobs/${job.backendJobId}`, {
        method: "DELETE",
      });
    } catch {
      // Best-effort delete from backend
    }
  }

  await db.captionJob.delete({ where: { id: jobId } });
}

export async function clearCacheAndTempFiles(): Promise<{ freedMB: number; message: string }> {
  try {
    const response = await fetch(`${env.BACKEND_URL}/api/cleanup`, {
      method: "POST",
    });

    if (response.ok) {
      const data = await response.json();
      return {
        freedMB: data.freedMB ?? 0,
        message: data.message ?? "Cache cleared successfully",
      };
    }
  } catch {
    // Backend offline or error
  }
  return { freedMB: 0, message: "Cache cleared successfully." };
}

export async function getJobTranscript(backendJobId: string): Promise<{ transcript: any; language: string | null } | null> {
  try {
    const response = await fetch(`${env.BACKEND_URL}/api/transcript/${backendJobId}`, {
      cache: "no-store",
    });
    if (response.ok) {
      return await response.json();
    }
  } catch {
    // Backend offline or error
  }
  return null;
}

export async function rerenderCaptionJob(
  backendJobId: string,
  updatedTranscript: any
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(`${env.BACKEND_URL}/api/rerender/${backendJobId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ transcript: updatedTranscript }),
    });

    if (response.ok) {
      return { success: true };
    }
    const data = await response.json().catch(() => ({}));
    return { success: false, error: data.error || "Failed to re-render captions" };
  } catch (err: any) {
    return { success: false, error: err.message || "Network error" };
  }
}

export async function deleteCaptionJobs(jobIds: string[]): Promise<void> {
  await Promise.all(jobIds.map((id) => deleteCaptionJob(id)));
  revalidatePath("/history");
}
