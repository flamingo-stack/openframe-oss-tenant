'use client';

import { useEffect } from 'react';
import { captureRedditClickIdFromUrl } from '@/lib/reddit-click-id';

export function RedditClickIdCapture() {
  useEffect(() => {
    captureRedditClickIdFromUrl();
  }, []);

  return null;
}
