'use client';

import {
  ChatContent,
  ChatFooter,
  ChatHeader,
  ChatMessageList,
  ChatTypingIndicator,
  ModelDisplay,
} from '@flamingo-stack/openframe-frontend-core/components/chat';

import type { CSSProperties } from 'react';
import { useMemo } from 'react';
import { useTenantInfo } from '../../../hooks/use-tenant-info';
import { buildFaeChatPreviewMessages } from './fae-chat-preview-messages';

interface FaeChatPreviewProps {
  assistantName: string;
  avatarUrl?: string;
  accentColor: string;
  mspName?: string;
  providerName?: string;
  modelDisplayName?: string;
}

export function FaeChatPreview({
  assistantName,
  avatarUrl,
  accentColor,
  mspName = 'TechFlow Solutions',
  providerName = 'google',
  modelDisplayName = 'Google Gemini 3.5',
}: FaeChatPreviewProps) {
  const messages = useMemo(() => buildFaeChatPreviewMessages(assistantName, avatarUrl), [assistantName, avatarUrl]);

  // Header shows the MSP company name (from tenant info) in place of the tenant
  // domain; falls back to the sample name so the preview still reads well.
  const { data: tenantInfo } = useTenantInfo();
  const mspCompanyName = tenantInfo?.name || mspName;

  return (
    <div className="fae-chat-preview grid h-[250px] w-full place-items-center overflow-hidden rounded-md border border-ods-border bg-ods-bg md:h-[296px] lg:h-[380px] [--preview-scale:0.225] md:[--preview-scale:0.266] lg:[--preview-scale:0.342]">
      {/* 1:1 content in a 1112px slot, transform-scaled (not zoom) to the per-breakpoint card
          height. zoom mis-renders text in Safari, so we scale via transform instead; the
          wrapper reserves the post-scale footprint so the card still centers the content. */}
      <div style={{ width: 'calc(650px * var(--preview-scale))', height: 'calc(1112px * var(--preview-scale))' }}>
        <div
          // accent re-points flamingo-pink so the lib's Fae name follows it.
          style={{ '--ods-flamingo-pink-base': accentColor, transform: 'scale(var(--preview-scale))' } as CSSProperties}
          className="flex h-[1112px] w-[650px] max-w-none origin-top-left flex-col p-[var(--spacing-system-m)]"
        >
          <ChatHeader
            fullWidth
            userName={assistantName}
            userAvatar={avatarUrl}
            serverUrl={mspCompanyName}
            connectionStatus="connected"
            ticketInfo={{
              title: 'Slow Laptop',
              meta: '1002 • Hardware Issue • 8 hours',
              status: 'TECH_REQUIRED',
            }}
          />

          <ChatContent className="mt-[var(--spacing-system-s)]">
            <ChatMessageList fullWidth messages={messages} assistantType="fae" autoScroll={false} />
          </ChatContent>

          <div className="mt-[var(--spacing-system-s)] flex items-center justify-center gap-[var(--spacing-system-s)] rounded-md border border-ods-border bg-ods-card px-[var(--spacing-system-m)] py-[var(--spacing-system-s)]">
            <ChatTypingIndicator size="sm" dotClassName="bg-ods-text-secondary" />
            <span className="text-h6 text-ods-text-secondary">Waiting for Technician Response</span>
          </div>

          <ChatFooter fullWidth>
            <ModelDisplay provider={providerName} displayName={modelDisplayName} />
          </ChatFooter>
        </div>
      </div>
    </div>
  );
}
