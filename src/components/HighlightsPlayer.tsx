import { useState } from 'react';

interface HighlightsPlayerProps {
  isOpen: boolean;
  title: string;
  videoUrl: string | null;
  onClose: () => void;
}

export function HighlightsPlayer({ isOpen, title, videoUrl, onClose }: HighlightsPlayerProps) {
  const [shareMessage, setShareMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleShare = async () => {
    if (!videoUrl) return;
    try {
      if (navigator.share) {
        await navigator.share({ title, url: videoUrl });
      } else if (navigator.clipboard) {
        await navigator.clipboard.writeText(videoUrl);
        setShareMessage('Link copied to clipboard');
        setTimeout(() => setShareMessage(null), 2000);
      }
    } catch {
      setShareMessage('Unable to share highlights');
      setTimeout(() => setShareMessage(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl bg-gray-900 border border-gray-700 rounded-xl overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-white font-bold">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-300 hover:text-white text-sm font-semibold"
          >
            Close
          </button>
        </div>

        <div className="p-4">
          {videoUrl ? (
            <video
              src={videoUrl}
              controls
              autoPlay
              playsInline
              className="w-full max-h-[70vh] bg-black rounded-lg"
            />
          ) : (
            <div className="text-center text-gray-400 py-12">
              Highlights video is not available.
            </div>
          )}

          <div className="mt-4 flex items-center gap-3">
            <a
              href={videoUrl || '#'}
              download
              className={`px-4 py-2 rounded-lg font-semibold ${
                videoUrl
                  ? 'bg-green-500 hover:bg-green-600 text-black'
                  : 'bg-gray-700 text-gray-400 pointer-events-none'
              }`}
            >
              Download
            </a>
            <button
              onClick={() => void handleShare()}
              disabled={!videoUrl}
              className="px-4 py-2 rounded-lg font-semibold bg-blue-500 hover:bg-blue-600 text-black disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Share
            </button>
            {shareMessage && <span className="text-xs text-gray-400">{shareMessage}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}
