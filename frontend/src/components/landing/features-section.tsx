"use client";

import {
  Palette,
  Sparkles,
  Monitor,
  Type,
  Mic,
  Download,
} from "lucide-react";
import { useIntersectionObserver } from "~/hooks/use-intersection-observer";

const features = [
  {
    icon: Palette,
    title: "11 Creator Caption Styles",
    description:
      "Hormozi, MrBeast, Cyberpunk, Clean Pastel, Cinematic, Spotlight, Retro Wave, Karaoke, Minimal, Bounce, and Classic. Trending aesthetic styles inspired by top creators.",
  },
  {
    icon: Sparkles,
    title: "Motion Graphics Animations",
    description:
      "Jitter-inspired Kinetic Stretch & Snap, Glitch RGB Aberration, Apple-style Slide Reveal, Motion Blur In, Spring Bounce, Scale Pop, Karaoke sweeps, and Word Highlights.",
  },
  {
    icon: Monitor,
    title: "Desktop 16:9 & Multi-Ratio",
    description:
      "Full support for 16:9 Desktop/Landscape videos (YouTube, TV, podcasts), 9:16 Vertical Shorts/Reels, 1:1 Square, and 4:5 Feed with instant auto-detection.",
  },
  {
    icon: Type,
    title: "Granular Typography & Outline",
    description:
      "Customize words per block (1 to 10), max lines (1 or 2), creator fonts (Montserrat, Bebas Neue, Anton, Bangers, Cinzel), text scaling, outline toggle on/off, and brand color pickers.",
  },
  {
    icon: Mic,
    title: "AI Word-Level Sync",
    description:
      "Powered by faster-whisper. Automatic speech-to-text with word-level timestamps, automatic CUDA GPU acceleration, and CPU fallback across 100+ languages.",
  },
  {
    icon: Download,
    title: "Multi-Format Export",
    description:
      "Burn subtitles directly into high-definition MP4 videos (CRF 18 quality) or export standalone .srt and styled .ass subtitle files for Premiere, CapCut, and DaVinci Resolve.",
  },
];

const staggerClasses = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];

export function FeaturesSection() {
  const { ref, isInView } = useIntersectionObserver({ margin: "-100px" });

  return (
    <section
      id="features"
      ref={ref}
      className="relative bg-gray-50 py-20 dark:bg-gray-900"
    >
      <div className="container mx-auto px-6">
        <div className={`reveal ${isInView ? "in-view" : ""}`}>
          <h2 className="mb-4 text-center text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
            Everything You{" "}
            <span className="bg-gradient-to-r from-[#459F94] to-[#EDB118] bg-clip-text text-transparent">
              Need
            </span>
          </h2>
          <p className="mx-auto mb-12 max-w-2xl text-center text-lg text-gray-600 dark:text-gray-400">
            A complete studio-grade toolkit for adding stunning animated captions to desktop and mobile videos.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature, index) => (
            <div
              key={feature.title}
              className={`reveal group rounded-2xl bg-white p-6 shadow-sm transition-all hover:shadow-lg dark:bg-gray-800 ${staggerClasses[index % 6]} ${isInView ? "in-view" : ""}`}
            >
              <div className="mb-4 inline-flex rounded-xl bg-[#459F94]/10 p-3 text-[#459F94] transition-colors group-hover:bg-[#459F94] group-hover:text-white">
                <feature.icon className="h-6 w-6" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-gray-900 dark:text-white">
                {feature.title}
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Background Pattern */}
      <div className="bg-grid-dots absolute inset-0 -z-10 opacity-5" />
    </section>
  );
}
