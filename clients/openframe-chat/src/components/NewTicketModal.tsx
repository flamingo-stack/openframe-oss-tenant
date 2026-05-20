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
import { useCreateTicket } from '../hooks/useCreateTicket';

interface NewTicketModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function NewTicketModal({ isOpen, onClose }: NewTicketModalProps) {
  const { form, setField, isSubmitting, handleSubmit, resetForm } = useCreateTicket(onClose);

  const handleClose = () => {
    resetForm();
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} className="max-w-ods-content-narrow w-full">
      <ModalHeader className="flex items-center gap-[var(--spacing-system-mf)] border-b-0 px-[var(--spacing-system-xlf)] pt-[var(--spacing-system-xlf)] pb-0">
        <ModalTitle className="flex-1 text-h2">New Ticket</ModalTitle>
      </ModalHeader>

      <ModalContent className="px-[var(--spacing-system-xlf)] py-[var(--spacing-system-lf)]">
        <div className="flex flex-col gap-[var(--spacing-system-lf)]">
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
            acceptWindowDrops
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

      <ModalFooter className="px-[var(--spacing-system-xlf)] pb-[var(--spacing-system-xlf)] pt-0 border-t-0 gap-[var(--spacing-system-lf)]">
        <Button variant="outline" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="accent" onClick={handleSubmit} loading={isSubmitting}>
          Create Ticket
        </Button>
      </ModalFooter>
    </Modal>
  );
}
