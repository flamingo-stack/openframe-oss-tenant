'use client';

import {
  type NavigationImpl,
  registerDynamic,
  registerImage,
  registerLink,
  registerNavigation,
} from '@flamingo-stack/openframe-frontend-core/embed-shims';
import nextDynamic from 'next/dynamic';
import NextImage from 'next/image';
import NextLink from 'next/link';
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
  registerLink(NextLink);
  registerImage(NextImage);
  registerDynamic(nextDynamic);
}

registerEmbedShims();
