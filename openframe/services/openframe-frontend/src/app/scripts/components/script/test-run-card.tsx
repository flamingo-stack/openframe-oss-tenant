'use client';

import { Button } from '@flamingo-stack/openframe-frontend-core/components/ui';
import { Monitor, Square, X } from 'lucide-react';
import { useEffect, useRef } from 'react';

export interface TestRunData {
  id: string;
  deviceName: string;
  agentToolId: string;
  startedAt: string;
  startTime: number;
  status: 'running' | 'completed' | 'error' | 'aborted';
  output: string[];
  elapsedSeconds: number;
}

interface TestRunCardProps {
  run: TestRunData;
  onStop: () => void;
  onTestAgain: () => void;
  onClose: () => void;
}

function formatDuration(totalSeconds: number): string {
  const hours = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
  const minutes = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${hours}:${minutes}:${seconds}`;
}

function getStatusLabel(status: TestRunData['status']): string {
  switch (status) {
    case 'running':
      return 'In Progress';
    case 'completed':
      return 'Success';
    case 'aborted':
      return 'Aborted';
    case 'error':
      return 'Failed';
  }
}

function getStatusColor(status: TestRunData['status']): string {
  switch (status) {
    case 'running':
      return 'text-ods-accent';
    case 'completed':
      return 'text-[#5ea62e]';
    case 'aborted':
    case 'error':
      return 'text-ods-error';
  }
}

export function TestRunCard({ run, onStop, onTestAgain, onClose }: TestRunCardProps) {
  const logRef = useRef<HTMLDivElement>(null);

  // biome-ignore lint/correctness/useExhaustiveDependencies: intentional trigger to auto-scroll on new output
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [run.output.length]);

  return (
    <div className="bg-ods-card border border-ods-border rounded-[6px] overflow-clip">
      <div className="flex gap-4 items-center px-4 py-3 border-b border-ods-border">
        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <div className="flex gap-1 items-center">
            <Monitor className="size-4 text-ods-text-secondary flex-shrink-0" />
            <span className="text-lg font-medium text-ods-text-primary truncate">{run.deviceName}</span>
          </div>
          <span className="text-sm font-medium text-ods-text-secondary truncate">Device</span>
        </div>

        <div className="flex-1 flex flex-col justify-center overflow-hidden">
          <span className="text-lg font-medium text-ods-text-primary truncate">{run.startedAt}</span>
          <span className="text-sm font-medium text-ods-text-secondary">Started</span>
        </div>

        <div className="flex-1 flex flex-col justify-center overflow-hidden md:hidden lg:flex">
          <span className="text-lg font-medium text-ods-text-primary tabular-nums">
            {formatDuration(run.elapsedSeconds)}
          </span>
          <span className="text-sm font-medium text-ods-text-secondary">Duration</span>
        </div>

        <div className="hidden lg:flex flex-1 items-center gap-4">
          <div className="flex-1 flex flex-col justify-center overflow-hidden">
            <span className={`text-lg font-medium ${getStatusColor(run.status)} truncate`}>
              {getStatusLabel(run.status)}
            </span>
            <span className="text-sm font-medium text-ods-text-secondary">Status</span>
          </div>

          {run.status === 'running' ? (
            <Button
              variant="outline"
              onClick={onStop}
              leftIcon={<Square className="size-6" />}
              className="flex-shrink-0 gap-2"
            >
              Stop Testing
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onTestAgain} className="flex-shrink-0">
                Test Again
              </Button>
              <Button variant="outline" size={'iconLg'} onClick={onClose} className="flex-shrink-0 p-3">
                <X className="size-6" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="flex lg:hidden gap-4 items-center px-4 py-3 border-b border-ods-border">
        <div className="hidden md:flex flex-1 flex-col justify-center overflow-hidden">
          <span className="text-lg font-medium text-ods-text-primary tabular-nums">
            {formatDuration(run.elapsedSeconds)}
          </span>
          <span className="text-sm font-medium text-ods-text-secondary">Duration</span>
        </div>

        <div className="flex-1 flex items-center gap-4">
          <div className="flex-1 flex flex-col justify-center">
            <span className={`text-lg font-medium ${getStatusColor(run.status)}`}>{getStatusLabel(run.status)}</span>
            <span className="text-sm font-medium text-ods-text-secondary">Status</span>
          </div>

          {run.status === 'running' ? (
            <Button variant="outline" onClick={onStop} leftIcon={<Square className="size-6" />}>
              Stop Testing
            </Button>
          ) : (
            <>
              <Button variant="outline" onClick={onTestAgain} className="flex-shrink-0">
                Test Again
              </Button>
              <Button variant="outline" size={'iconLg'} onClick={onClose} className="flex-shrink-0 p-3">
                <X className="size-6" />
              </Button>
            </>
          )}
        </div>
      </div>

      <div ref={logRef} className="h-[240px] overflow-y-auto p-4 border-b border-ods-border">
        <div className="font-medium text-sm leading-5 text-ods-text-secondary whitespace-pre-wrap">
          {run.output.map((line, i) => {
            const isError = line.toLowerCase().startsWith('error');
            const isSuccess =
              line.toLowerCase().includes('success') ||
              line.toLowerCase().includes('passed') ||
              line.toLowerCase().includes('completed');
            return (
              <div key={i} className={isError ? 'text-ods-error' : isSuccess ? 'text-[#5ea62e]' : ''}>
                {line}
              </div>
            );
          })}
          {run.status === 'running' && <div className="text-ods-accent animate-pulse">Waiting for response...</div>}
        </div>
      </div>
    </div>
  );
}
