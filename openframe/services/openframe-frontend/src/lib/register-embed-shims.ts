'use client';

import { type NavigationImpl, registerNavigation } from '@flamingo-stack/openframe-frontend-core/embed-shims';
import {
  notFound,
  permanentRedirect,
  redirect,
  useParams,
  usePathname,
  useRouter,
  useSearchParams,
} from 'next/navigation';

let registered = false;

export function registerEmbedShims() {
  if (registered) return;
  registered = true;
  registerNavigation({
    useRouter,
    usePathname,
    useSearchParams,
    useParams,
    redirect,
    permanentRedirect,
    notFound,
  } as NavigationImpl);
}

registerEmbedShims();
