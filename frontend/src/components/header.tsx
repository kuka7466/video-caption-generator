"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { useEffect, useState, useSyncExternalStore } from "react";
import { History, Menu, Moon, Sun, X, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { GithubIcon } from "~/components/icons/github";
import { clearCacheAndTempFiles } from "~/actions/captions";

const subscribe = () => () => {};
function useHasMounted() {
  return useSyncExternalStore(subscribe, () => true, () => false);
}

export function Header() {
  const { theme, setTheme } = useTheme();
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCleaning, setIsCleaning] = useState(false);
  const mounted = useHasMounted();

  const handleClearCache = async () => {
    setIsCleaning(true);
    try {
      const result = await clearCacheAndTempFiles();
      toast.success(result.message || "Cache & temporary files cleared successfully!");
    } catch {
      toast.success("Cache cleared successfully!");
    } finally {
      setIsCleaning(false);
    }
  };

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 right-0 left-0 z-50 transition-all duration-300 ${
        isScrolled
          ? "border-b border-gray-200/50 bg-white/80 shadow-md backdrop-blur-lg dark:border-gray-800/50 dark:bg-black/80"
          : "bg-white dark:bg-black"
      }`}
    >
      <nav className="container mx-auto flex items-center justify-between px-6 py-4">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="text-xl font-bold tracking-tight sm:text-2xl">
            <span className="bg-gradient-to-r from-[#459F94] to-[#367d74] bg-clip-text text-transparent">
              AI
            </span>
            <span className="text-gray-900 dark:text-white">/</span>
            <span className="bg-gradient-to-r from-[#EDB118] to-[#d9a515] bg-clip-text text-transparent">
              Captions
            </span>
          </span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden items-center gap-6 md:flex">
          <Link
            href="/"
            className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300 dark:hover:text-[#459F94]"
          >
            Home
          </Link>
          <Link
            href="/history"
            className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300 dark:hover:text-[#459F94]"
          >
            History
          </Link>
          <a
            href="https://github.com/kuka7466/video-caption-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300 dark:hover:text-[#459F94]"
          >
            GitHub
          </a>
        </div>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {/* Clear Cache Button */}
          <button
            onClick={() => void handleClearCache()}
            disabled={isCleaning}
            title="Clear Cache & Temp Files"
            className="flex cursor-pointer items-center gap-1.5 rounded-full border border-border/80 bg-muted/30 px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-[#459F94]/50 hover:bg-[#459F94]/10 hover:text-[#459F94] disabled:opacity-50"
          >
            <Trash2 className={`h-3.5 w-3.5 ${isCleaning ? "animate-spin text-[#459F94]" : ""}`} />
            <span className="hidden sm:inline">{isCleaning ? "Cleaning..." : "Clear Cache"}</span>
          </button>

          {/* Theme toggle */}
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="cursor-pointer rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Toggle dark mode"
          >
            {mounted && theme === "dark" ? (
              <Sun className="h-5 w-5" />
            ) : (
              <Moon className="h-5 w-5" />
            )}
          </button>

          {/* GitHub icon (desktop) */}
          <a
            href="https://github.com/kuka7466/video-caption-generator"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden cursor-pointer rounded-full p-2 text-gray-700 transition-colors hover:bg-gray-100 md:inline-flex dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="GitHub repository"
          >
            <GithubIcon className="h-5 w-5" />
          </a>

          {/* History button (desktop) */}
          <Link
            href="/history"
            className="hidden items-center gap-2 rounded-full border border-[#459F94] px-4 py-1.5 text-sm font-medium text-[#459F94] transition-colors hover:bg-[#459F94] hover:text-white md:inline-flex"
          >
            <History className="h-4 w-4" />
            History
          </Link>

          {/* Mobile menu button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="rounded-lg p-2 text-gray-700 transition-colors hover:bg-gray-100 md:hidden dark:text-gray-300 dark:hover:bg-gray-800"
            aria-label="Toggle menu"
          >
            {isMobileMenuOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="border-b border-gray-200 bg-white px-6 py-4 md:hidden dark:border-gray-800 dark:bg-black">
          <div className="flex flex-col gap-4">
            <Link
              href="/"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300"
            >
              Home
            </Link>
            <Link
              href="/history"
              onClick={() => setIsMobileMenuOpen(false)}
              className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300"
            >
              History
            </Link>
            <a
              href="https://github.com/kuka7466/video-caption-generator"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-700 transition-colors hover:text-[#459F94] dark:text-gray-300"
            >
              GitHub
            </a>
            <button
              onClick={() => {
                setIsMobileMenuOpen(false);
                void handleClearCache();
              }}
              className="flex items-center gap-2 text-left text-sm text-muted-foreground hover:text-[#459F94]"
            >
              <Trash2 className="h-4 w-4" />
              <span>Clear Cache &amp; Temp Files</span>
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
