'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core';
import { Refresh02VrIcon, TrashIcon } from '@flamingo-stack/openframe-frontend-core/components/icons-v2';
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks';
import { Image as ImageIcon, Loader2 } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';

interface ImageUploaderProps {
  /** Current image URL if one already exists */
  imageUrl?: string;
  /** Callback fired with new image URL (or undefined if removed) */
  onChange: (url: string | undefined) => void;
  /** Upload endpoint (required) */
  uploadEndpoint: string;
  /** Height of drop-zone. Number treated as pixels, string passed directly (e.g. '100%') */
  height?: number | string;
  /** Image object-fit, defaults to cover */
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  /** Show a replace/upload button overlay in addition to remove (default true) */
  showReplaceButton?: boolean;
  /** If true, skip the actual upload and just return a base64 data URL preview (the caller uploads later). */
  deferUpload?: boolean;
  /** Optional custom upload handler for authenticated uploads. Used instead of the default fetch. */
  onUpload?: (file: File) => Promise<string>;
  /** Optional custom delete handler for authenticated deletion. Used instead of just clearing the image. */
  onDelete?: () => Promise<void>;
}

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

/**
 * Dashed hero-style image uploader. Mirrors the core `HeroImageUploader` behavior
 * (client-side validation, upload, deferred preview & removal) but renders the hover
 * actions as square ODS icon buttons using {@link Refresh02VrIcon} / {@link TrashIcon},
 * matching the Settings design.
 */
export function ImageUploader({
  imageUrl,
  onChange,
  uploadEndpoint,
  height = 300,
  objectFit = 'cover',
  showReplaceButton = true,
  deferUpload = false,
  onUpload,
  onDelete,
}: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [uploading, setUploading] = useState(false);

  const openDialog = () => inputRef.current?.click();

  async function handleFile(file?: File) {
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      toast({ title: 'Invalid file', description: 'Upload JPEG, PNG, WebP, or GIF', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({ title: 'File too large', description: 'Max 5MB', variant: 'destructive' });
      return;
    }

    if (deferUpload) {
      // Immediately convert to a data URL for preview and postpone the real upload.
      setUploading(true);
      const reader = new FileReader();
      reader.onload = () => {
        onChange(reader.result as string);
        setUploading(false);
      };
      reader.onerror = () => {
        toast({ title: 'File error', description: 'Failed to read image file', variant: 'destructive' });
        setUploading(false);
      };
      reader.readAsDataURL(file);
      if (inputRef.current) inputRef.current.value = '';
      return;
    }

    setUploading(true);
    try {
      let uploadedUrl: string;
      if (onUpload) {
        uploadedUrl = await onUpload(file);
      } else {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch(uploadEndpoint, { method: 'POST', body: fd });
        if (!res.ok) throw new Error('Upload failed');
        const json = await res.json();
        uploadedUrl = json.data?.url || json.url || json.file_url;
        if (!uploadedUrl) throw new Error('Invalid upload response');
      }
      onChange(uploadedUrl);
    } catch (err) {
      toast({
        title: 'Upload error',
        description: err instanceof Error ? err.message : 'Failed to upload',
        variant: 'destructive',
      });
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const handleSelect = (e: ChangeEvent<HTMLInputElement>) => {
    handleFile(e.target.files?.[0]);
  };

  const handleRemove = async () => {
    if (onDelete) {
      try {
        await onDelete();
      } catch {
        // onDelete handler reports its own error.
        return;
      }
    }
    onChange(undefined);
  };

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  return (
    <div className="w-full h-full max-h-full space-y-2 min-h-[300px]">
      {imageUrl ? (
        <div
          className="relative group w-full aspect-square md:aspect-auto h-auto md:h-full flex items-center justify-center overflow-hidden rounded-md"
          style={{ height: heightStyle }}
        >
          <img src={imageUrl} className={`absolute inset-0 w-full h-full object-${objectFit}`} alt="Cover" />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center gap-[var(--spacing-system-m)] transition-opacity rounded-md">
            {showReplaceButton && (
              <Button
                variant="outline"
                size="icon"
                onClick={openDialog}
                aria-label="Replace image"
                className="w-12 h-12 rounded-md border-0 bg-[var(--ods-system-greys-white)] text-[var(--ods-system-greys-black)] hover:bg-[var(--ods-system-greys-white-hover)]"
              >
                <Refresh02VrIcon size={24} />
              </Button>
            )}
            <Button
              variant="outline"
              size="icon"
              onClick={() => handleRemove()}
              aria-label="Remove image"
              className="w-12 h-12 rounded-md border-0 bg-[var(--ods-system-greys-white)] text-[var(--ods-system-greys-black)] hover:bg-[var(--ods-system-greys-white-hover)]"
            >
              <TrashIcon size={24} />
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className={`w-full h-full border-2 border-dashed ${uploading ? 'border-ods-accent' : 'border-ods-border hover:border-ods-accent'} rounded-md flex flex-col items-center justify-center cursor-pointer bg-ods-bg`}
          style={{ height: heightStyle }}
          onClick={openDialog}
        >
          {uploading ? (
            <Loader2 className="h-8 w-8 animate-spin text-ods-accent" />
          ) : (
            <>
              <ImageIcon className="h-12 w-12 text-ods-text-secondary" />
              <span className="text-ods-text-primary text-[16px] font-medium mt-2">Upload cover image</span>
              <span className="text-ods-text-secondary text-[14px] mt-1">Click to upload or drag and drop</span>
              <span className="text-ods-text-secondary text-[12px]">PNG, JPEG, WebP, GIF up to 5MB</span>
            </>
          )}
        </button>
      )}

      <input ref={inputRef} type="file" accept="image/*" onChange={handleSelect} className="hidden" />
    </div>
  );
}
