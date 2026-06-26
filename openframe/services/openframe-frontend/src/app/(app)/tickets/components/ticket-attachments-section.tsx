'use client';

import { Button, TicketAttachmentsList } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Upload } from 'lucide-react';
import { type ChangeEvent, useRef, useState } from 'react';
import { ConfirmDialog } from '@/app/components/shared/confirm-dialog';
import { formatFileSize } from '../../devices/utils/file-manager-utils';
import { useDownloadTicketAttachment } from '../hooks/use-ticket-attachments';
import { useAddTicketAttachments, useDeleteTicketAttachment } from '../hooks/use-ticket-detail-mutations';
import type { Dialog } from '../types/dialog.types';

interface TicketAttachmentsSectionProps {
  ticketId: string;
  attachments: NonNullable<Dialog['attachments']>;
}

export function TicketAttachmentsSection({ ticketId, attachments }: TicketAttachmentsSectionProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string; fileName: string } | null>(null);
  const { download } = useDownloadTicketAttachment();
  const addAttachments = useAddTicketAttachments(ticketId);
  const deleteAttachment = useDeleteTicketAttachment(ticketId);

  const uiAttachments = attachments.map(att => ({
    id: att.id,
    fileName: att.fileName,
    fileSize: att.fileSize ? formatFileSize(att.fileSize) : '',
    onDownload: () => download(att.id, att.fileName),
    onDelete: () => setPendingDelete({ id: att.id, fileName: att.fileName }),
  }));

  const handleFilesSelected = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length > 0) addAttachments.mutate(files);
    e.target.value = '';
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    deleteAttachment.mutate(pendingDelete.id, { onSuccess: () => setPendingDelete(null) });
  };

  return (
    <section className="flex flex-col gap-[var(--spacing-system-xxs)]">
      <p className="text-h5 text-ods-text-secondary">Attachments</p>
      {uiAttachments.length > 0 && <TicketAttachmentsList attachments={uiAttachments} />}
      <input ref={fileInputRef} type="file" multiple className="hidden" onChange={handleFilesSelected} />
      <Button
        variant="outline"
        size="small"
        className="w-fit"
        leftIcon={<Upload />}
        onClick={() => fileInputRef.current?.click()}
        disabled={addAttachments.isPending}
      >
        {addAttachments.isPending ? 'Uploading...' : 'Add Files'}
      </Button>

      <ConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={open => {
          if (!open) setPendingDelete(null);
        }}
        title="Delete Attachment"
        description={`Are you sure you want to delete "${pendingDelete?.fileName ?? ''}"? This action cannot be undone.`}
        confirmLabel="Delete"
        pendingLabel="Deleting..."
        variant="destructive"
        isPending={deleteAttachment.isPending}
        onConfirm={confirmDelete}
      />
    </section>
  );
}
