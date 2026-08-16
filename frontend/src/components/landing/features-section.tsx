"use client";

import { Mic, Palette, Sparkles, Globe, Shield, Download } from "lucide-react";
import { useIntersectionObserver } from "~/hooks/use-intersection-observer";

const features = [
  {
    icon: Mic,
    title: "AI Transcription",
    description:
      "Powered by faster-whisper. Automatic speech-to-text with word-level timestamps for precise caption timing.",
  },
  {
    icon: Palette,
    title: "6 Caption Styles",
    description:
      "Hormozi, MrBeast, Karaoke, Minimal, Bounce, Classic. Trending styles from top creators.",
  },
  {
    icon: Sparkles,
    title: "Word-Level Animation",
    description:
      "Each word animates individually — highlights, karaoke wipes, bounces, and scale effects.",
  },
  {
    icon: Globe,
    title: "Multi-Language",
    description:
      "Automatically detects 100+ languages. Script-aware font selection for Latin, CJK, Cyrillic, Arabic, and more.",
  },
  {
    icon: Shield,
    title: "Self-Hosted & Private",
    description:
      "Run on your own infrastructure. No accounts, no tracking, no data collection.",
  },
  {
    icon: Download,
    title: "Multi-Format Export",
    description:
      "Download captioned video in full HD (CRF 18) or export standalone .srt and .ass subtitles.",
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
            A complete toolkit for adding stunning animated captions to any
            video.
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
