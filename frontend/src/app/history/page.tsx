import Link from "next/link";
import { getCaptionJobs } from "~/actions/captions";
import { HistoryManager } from "~/components/history-manager";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const jobs = await getCaptionJobs();

  return (
    <section className="min-h-screen bg-gray-50 px-6 pt-24 pb-20 dark:bg-gray-950">
      <div className="mx-auto max-w-6xl">
        {/* Page heading */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Caption History
            </h1>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Manage, preview, and batch delete your captioned videos.
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl bg-[#459F94] px-4 py-2 text-xs font-semibold text-white shadow-sm transition-colors hover:bg-[#367d74]"
          >
            + Create New Captions
          </Link>
        </div>

        <HistoryManager initialJobs={jobs} />
      </div>
    </section>
  );
}
