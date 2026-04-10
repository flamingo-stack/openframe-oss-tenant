import {
  Button,
  FileUpload,
  Input,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
  Textarea,
} from '@flamingo-stack/openframe-frontend-core/components/ui';
import { open } from '@tauri-apps/plugin-dialog';
import { readFile } from '@tauri-apps/plugin-fs';
import { useCreateTicket } from '../hooks/useCreateTicket';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

function getMimeType(ext: string): string {
  const map: Record<string, string> = {
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    gif: 'image/gif',
    webp: 'image/webp',
    svg: 'image/svg+xml',
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    txt: 'text/plain',
    csv: 'text/csv',
    zip: 'application/zip',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}

export function NewTicketModal({ isOpen, onClose }: NewTicketModalProps) {
  const { form, setField, isSubmitting, handleSubmit, resetForm } = useCreateTicket(onClose);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleOpenFilePicker = async (): Promise<File[] | undefined> => {
    const selected = await open({ multiple: true });
    if (!selected) return undefined;

    const paths = Array.isArray(selected) ? selected : [selected];
    if (paths.length === 0) return undefined;

    const files = await Promise.all(
      paths.map(async (filePath) => {
        const bytes = await readFile(filePath);
        const name = filePath.split(/[\\/]/).pop() || 'file';
        const ext = name.split('.').pop() || '';
        return new File([bytes], name, { type: getMimeType(ext) });
      }),
    );
    return files;
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-[600px] w-full">
      <ModalHeader className="flex items-center gap-4 border-b-0 px-10 pt-10 pb-0">
        <ModalTitle className="flex-1 font-['Azeret_Mono'] text-[32px] leading-10 tracking-[-0.64px]">
          New Ticket
        </ModalTitle>
      </ModalHeader>

      <ModalContent className="px-10 py-6">
        <div className="flex flex-col gap-6">
          <Input
            label="Subject"
            placeholder="Ticket Subject"
            value={form.subject}
            onChange={e => setField('subject', e.target.value)}
            disabled={isSubmitting}
          />

          <FileUpload
            value={form.attachments.length > 0 ? form.attachments : undefined}
            onChange={files => setField('attachments', files ? (Array.isArray(files) ? files : [files]) : [])}
            multiple
            maxFiles={10}
            disabled={isSubmitting}
            maxListHeight={200}
            onOpenFilePicker={handleOpenFilePicker}
          />

          <Textarea
            label="Describe your Problem"
            placeholder="Enter text here..."
            value={form.description}
            onChange={e => setField('description', e.target.value)}
            disabled={isSubmitting}
            rows={5}
          />
        </div>
      </ModalContent>

      <ModalFooter className="px-10 pb-10 pt-0 border-t-0 gap-6">
        <Button variant="flamingo-secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="flamingo-primary" onClick={handleSubmit} loading={isSubmitting}>
          Create Ticket
        </Button>
      </ModalFooter>
    </Modal>
  );
}
