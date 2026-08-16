"use client";

import { ChevronDown } from "lucide-react";
import { useState } from "react";
import { useIntersectionObserver } from "~/hooks/use-intersection-observer";

const faqs = [
  {
    question: "Do you support 16:9 Desktop and Landscape videos?",
    answer:
      "Yes! The app features full multi-aspect ratio support for 16:9 Desktop/Landscape (YouTube, presentations, TV), 9:16 Mobile (Shorts, Reels, TikTok), 1:1 Square, and 4:5 Feed. It automatically detects the ratio when you upload a video.",
  },
  {
    question: "What motion animations and styles are available?",
    answer:
      "We offer 11 creator styles (Hormozi, MrBeast, Cyberpunk, Ali Abdaal, Cinematic, Spotlight, Retro Wave, Karaoke, Minimal, Bounce, Classic) plus motion graphics animations (Kinetic Stretch & Snap, Glitch RGB Aberration, Slide Reveal, Motion Blur, Spring Bounce, Scale Pop, Karaoke Sweeps, and Word Highlights).",
  },
  {
    question: "Can I customize fonts, text outline, and brand colors?",
    answer:
      "Yes! You can choose from creator fonts (Montserrat, Bebas Neue, Anton, Bangers, Cinzel, Outfit, Inter, Poppins), toggle text outlines On/Off, customize outline thickness/color, scale font size from 75% to 150%, and set custom text & highlight brand colors.",
  },
  {
    question: "Can I control how many words or lines appear on screen?",
    answer:
      "Yes! The Words Per Subtitle Block selector allows you to choose 1-word punchy hooks, 2–3 words standard timing, 4–6 words sentence flow, or 7–10 words extended reading, with Single Line (1) or Two Lines (2) layout limits.",
  },
  {
    question: "Can I download SRT or ASS subtitles separately?",
    answer:
      "Yes! In addition to the fully burned MP4 video, you can download raw .srt subtitles for video editors (CapCut, Premiere, DaVinci Resolve) and styled .ass subtitle files directly.",
  },
  {
    question: "Is this standalone and private?",
    answer:
      "Yes! It runs 100% locally on your machine with zero cloud uploads, zero telemetry, and zero accounts. It includes an automated 1-click launcher (start.bat) that sets up dependencies automatically.",
  },
];

const staggerClasses = ["stagger-1", "stagger-2", "stagger-3", "stagger-4", "stagger-5", "stagger-6"];

export function FAQSection() {
  const { ref, isInView } = useIntersectionObserver({ margin: "-100px" });
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section
      id="faq"
      ref={ref}
      className="relative bg-gray-50 py-20 dark:bg-gray-900"
    >
      <div className="relative z-10 container mx-auto px-6">
        {/* Header */}
        <div
          className={`reveal mb-12 text-center ${isInView ? "in-view" : ""}`}
        >
          <h2 className="mb-4 text-4xl font-bold text-gray-900 md:text-5xl dark:text-white">
            Frequently Asked{" "}
            <span className="bg-gradient-to-r from-[#459F94] to-[#EDB118] bg-clip-text text-transparent">
              Questions
            </span>
          </h2>
          <p className="mx-auto max-w-2xl text-lg text-gray-600 dark:text-gray-400">
            Everything you need to know about AI Video Captions.
          </p>
        </div>

        {/* FAQ Grid */}
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
          {faqs.map((faq, index) => (
            <div
              key={index}
              className={`reveal rounded-2xl bg-white p-6 shadow-sm transition-all dark:bg-gray-800 ${
                index >= 4 ? "md:col-span-2" : ""
              } ${staggerClasses[index % 6]} ${isInView ? "in-view" : ""}`}
            >
              <button
                onClick={() =>
                  setOpenIndex(openIndex === index ? null : index)
                }
                aria-expanded={openIndex === index}
                className="flex w-full cursor-pointer items-start justify-between gap-4 text-left"
              >
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {faq.question}
                </h3>
                <ChevronDown
                  className={`h-5 w-5 flex-shrink-0 text-[#459F94] transition-transform ${
                    openIndex === index ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-300 ${
                  openIndex === index
                    ? "mt-4 max-h-96 opacity-100"
                    : "max-h-0 opacity-0"
                }`}
              >
                <p className="text-gray-600 dark:text-gray-400">{faq.answer}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
