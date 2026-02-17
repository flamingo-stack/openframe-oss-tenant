'use client'

import {
  Button,
  Modal,
  ModalContent,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from '@flamingo-stack/openframe-frontend-core/components/ui'

interface ExecutionStartedModalProps {
  isOpen: boolean
  onClose: () => void
  scriptName: string
  onViewLogs: () => void
}

export function ExecutionStartedModal({
  isOpen,
  onClose,
  scriptName,
  onViewLogs,
}: ExecutionStartedModalProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} className="max-w-[600px]">
      <ModalHeader>
        <ModalTitle>Execution Started</ModalTitle>
      </ModalHeader>
      <ModalContent className="px-6 py-4">
        <p className="font-['DM_Sans'] font-medium text-lg text-ods-text-primary leading-6">
          Script{' '}
          <span className="text-ods-accent">{scriptName}</span>{' '}
          has been accepted for execution. You can track the progress and view
          the results in the activity logs section.
        </p>
      </ModalContent>
      <ModalFooter className="gap-6">
        <Button variant="outline" onClick={onClose} className="flex-1">
          Close
        </Button>
        <Button onClick={onViewLogs} className="flex-1">
          View Logs
        </Button>
      </ModalFooter>
    </Modal>
  )
}
