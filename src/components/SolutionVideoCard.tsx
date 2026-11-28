import { useState } from 'react';
import { ExternalLink } from 'lucide-react';
import type { TranslationContent } from '../i18n/translations.ts';

interface SolutionVideoCardProps {
  t: TranslationContent;
}

export function SolutionVideoCard({ t }: SolutionVideoCardProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const videos = t.video.items;
  const activeVideo = videos[selectedIndex] ?? videos[0];

  return (
    <article className="bg-white border border-slate-200 rounded-xl overflow-hidden">
      <div className="p-5 pb-4">
        <p className="text-xs font-semibold text-[#1E40AF] mb-1.5">
          {t.video.eyebrow}
        </p>
        <h3 className="font-display text-lg sm:text-xl font-bold text-[#0F2547] text-balance mb-1.5">
          {t.video.title}
        </h3>
        <p className="text-sm text-slate-600 leading-relaxed mb-4">
          {t.video.description}
        </p>

        <div
          role="group"
          aria-label={t.video.eyebrow}
          className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-lg"
        >
          {videos.map((video, idx) => {
            const isActive = idx === selectedIndex;
            return (
              <button
                key={video.youtubeId}
                type="button"
                onClick={() => setSelectedIndex(idx)}
                aria-pressed={isActive}
                className={`px-2.5 py-1.5 text-xs font-semibold rounded-md transition-colors duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] ${
                  isActive
                    ? 'bg-white text-[#0F2547] shadow-sm'
                    : 'text-slate-600 hover:text-[#0F2547]'
                }`}
              >
                {video.tabLabel}
              </button>
            );
          })}
        </div>
      </div>

      <div className="aspect-video w-full bg-slate-900 border-y border-slate-200">
        <iframe
          key={activeVideo.youtubeId}
          src={`https://www.youtube.com/embed/${activeVideo.youtubeId}?rel=0`}
          title={activeVideo.title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
          loading="lazy"
          className="w-full h-full border-0"
        />
      </div>

      <div className="px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 bg-slate-50/70">
        <div className="min-w-0 text-xs text-slate-600 flex items-center gap-2 truncate">
          <span className="font-medium text-[#0F2547] truncate">{activeVideo.title}</span>
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{activeVideo.source}</span>
        </div>
        <a
          href={`https://www.youtube.com/watch?v=${activeVideo.youtubeId}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E40AF] hover:underline underline-offset-4 whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1E40AF] rounded"
        >
          <span>{t.video.watchOnYoutube}</span>
          <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" />
        </a>
      </div>
    </article>
  );
}
