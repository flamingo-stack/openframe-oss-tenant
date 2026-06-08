'use client';

import Image from 'next/image';
import { useState } from 'react';
import { getFullImageUrl } from '@/lib/image-url';

interface OrgAvatarProps {
  imageUrl?: string | null;
  hash?: string | null;
  name: string;
}

export function OrgAvatar({ imageUrl, hash, name }: OrgAvatarProps) {
  const initials = name.substring(0, 2).toUpperCase() || '??';
  const fullUrl = getFullImageUrl(imageUrl, hash);
  const [failedUrl, setFailedUrl] = useState<string | undefined>(undefined);

  const showImage = Boolean(fullUrl) && failedUrl !== fullUrl;

  return (
    <div className="size-5 rounded-full flex-shrink-0 relative flex items-center justify-center overflow-hidden bg-[#161616] border border-ods-border">
      {!showImage && <span className="text-[10px] font-medium text-ods-text-secondary">{initials}</span>}
      {showImage && fullUrl && (
        <Image
          src={fullUrl}
          alt={initials}
          width={20}
          height={20}
          className="absolute inset-0 size-full object-cover"
          onError={() => setFailedUrl(fullUrl)}
        />
      )}
    </div>
  );
}
