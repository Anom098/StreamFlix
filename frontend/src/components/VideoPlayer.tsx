import React, { useRef } from 'react';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
}

/**
 * Detects if a URL is a Google Drive link and extracts the file ID.
 * Supports formats:
 *   - https://drive.google.com/file/d/FILE_ID/view
 *   - https://drive.google.com/file/d/FILE_ID/preview
 *   - https://docs.google.com/uc?export=download&id=FILE_ID
 *   - https://drive.google.com/open?id=FILE_ID
 */
function getGoogleDriveFileId(url: string): string | null {
  if (!url) return null;

  // Match /file/d/FILE_ID/
  const fileMatch = url.match(/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // Match id= parameter
  const idMatch = url.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  return null;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ src, poster }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if the source is a Google Drive link
  const driveFileId = getGoogleDriveFileId(src);
  const isDriveVideo = driveFileId !== null;
  const driveEmbedUrl = isDriveVideo ? `https://drive.google.com/file/d/${driveFileId}/preview` : '';

  // ===================== GOOGLE DRIVE EMBED =====================
  if (isDriveVideo) {
    return (
      <div ref={containerRef} className="video-player-container">
        <iframe
          src={driveEmbedUrl}
          style={{
            width: '100%',
            height: '100%',
            border: 'none',
            display: 'block',
          }}
          allow="autoplay; encrypted-media; fullscreen"
          allowFullScreen
          // @ts-ignore
          webkitallowfullscreen="true"
          mozallowfullscreen="true"
        />
      </div>
    );
  }

  // ===================== STANDARD VIDEO PLAYER =====================
  return (
    <div ref={containerRef} className="video-player-container">
      <video
        src={src}
        poster={poster}
        controls
        playsInline
        preload="auto"
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'contain'
        }}
      />
    </div>
  );
};
