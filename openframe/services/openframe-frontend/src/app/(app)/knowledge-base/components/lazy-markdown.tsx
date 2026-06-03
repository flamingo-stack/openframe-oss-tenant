'use client';

import type {
  MarkdownEditor as MarkdownEditorType,
  SimpleMarkdownRenderer as SimpleMarkdownRendererType,
} from '@flamingo-stack/openframe-frontend-core';
import dynamic from 'next/dynamic';
import type { ComponentProps } from 'react';

type SimpleMarkdownRendererProps = ComponentProps<typeof SimpleMarkdownRendererType>;
type MarkdownEditorProps = ComponentProps<typeof MarkdownEditorType>;

export const SimpleMarkdownRenderer = dynamic<SimpleMarkdownRendererProps>(
  () => import('@flamingo-stack/openframe-frontend-core').then(m => m.SimpleMarkdownRenderer),
  { ssr: false, loading: () => null },
);

export const MarkdownEditor = dynamic<MarkdownEditorProps>(
  () => import('@flamingo-stack/openframe-frontend-core/components/ui').then(m => m.MarkdownEditor),
  { ssr: false, loading: () => null },
);
