interface ChatPreviewLogoProps {
  className?: string;
}

/** MSP logo — static SVG via <img> so the accent color doesn't tint it. */
export function ChatPreviewLogo({ className }: ChatPreviewLogoProps) {
  return <img src="/assets/ai-settings/chat-preview-logo.svg" alt="" className={className} />;
}
