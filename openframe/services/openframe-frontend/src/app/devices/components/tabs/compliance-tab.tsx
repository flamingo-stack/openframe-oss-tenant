'use client';

import {
  InfoCard,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@flamingo-stack/openframe-frontend-core';
import { Info as InfoIcon } from 'lucide-react';
import React from 'react';

interface ComplianceTabProps {
  device: any;
}

export function ComplianceTab({ device }: ComplianceTabProps) {
  if (!device) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-ods-text-secondary text-lg">No device data available</div>
      </div>
    );
  }

  const winupdatepolicy = device.winupdatepolicy?.[0] || {};
  const checks = device.checks || {};
  const appliedPolicies = device.applied_policies || {};
  const issues = device.issues || {};
  const labels = device.labels || [];

  // Format schedule days
  const formatScheduleDays = (days: number[]) => {
    if (!days || days.length === 0) return 'Not set';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    return days.map(d => dayNames[d]).join(', ');
  };

  return (
    <TooltipProvider delayDuration={0}>
      <div className="mt-6">
        {/* Patch Management Section */}
        <div>
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            PATCH MANAGEMENT
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <InfoCard
              data={{
                title: 'Patch Status',
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>
                        Operating system patches and security updates from Tactical RMM. Includes critical OS updates,
                        security patches, and system hotfixes.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                  {
                    label: 'Last Installed',
                    value: device.patches_last_installed
                      ? new Date(device.patches_last_installed).toLocaleDateString()
                      : 'Never',
                  },
                  {
                    label: 'Pending Patches',
                    value: device.has_patches_pending ? 'Yes' : 'No',
                  },
                  {
                    label: 'Status',
                    value: device.has_patches_pending ? 'Pending' : 'Up to Date',
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Windows Update Policy Section */}
        {Object.keys(winupdatepolicy).length > 0 && (
          <div className="pt-6">
            <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
              WINDOWS UPDATE POLICY
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <InfoCard
                data={{
                  title: 'Update Severity Policies',
                  icon: (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] min-w-[400px]">
                        <p>
                          Windows update installation policies by severity level. Controls which types of updates are
                          automatically installed on this device.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                  items: [
                    { label: 'Critical', value: winupdatepolicy.critical || 'inherit' },
                    { label: 'Important', value: winupdatepolicy.important || 'inherit' },
                    { label: 'Moderate', value: winupdatepolicy.moderate || 'inherit' },
                    { label: 'Low', value: winupdatepolicy.low || 'inherit' },
                    { label: 'Other', value: winupdatepolicy.other || 'inherit' },
                  ],
                }}
              />

              <InfoCard
                data={{
                  title: 'Update Schedule',
                  icon: (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] min-w-[400px]">
                        <p>
                          Automated update installation schedule. Defines when updates are installed and whether the
                          device will automatically reboot.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                  items: [
                    {
                      label: 'Schedule Days',
                      value: formatScheduleDays(winupdatepolicy.run_time_days),
                    },
                    {
                      label: 'Run Time',
                      value:
                        winupdatepolicy.run_time_hour !== undefined ? `${winupdatepolicy.run_time_hour}:00` : 'Not set',
                    },
                    {
                      label: 'Frequency',
                      value: winupdatepolicy.run_time_frequency || 'inherit',
                    },
                    {
                      label: 'Reboot After Install',
                      value: winupdatepolicy.reboot_after_install || 'inherit',
                    },
                    {
                      label: 'Email on Failure',
                      value: winupdatepolicy.email_if_fail ? 'Yes' : 'No',
                    },
                  ],
                }}
              />
            </div>
          </div>
        )}

        {/* Policy Compliance Section */}
        <div className="pt-6">
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            POLICY COMPLIANCE
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <InfoCard
              data={{
                title: 'Applied Policies',
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>
                        Policy hierarchy from Tactical RMM. Policies can be applied at agent, site, client, or default
                        levels with inheritance.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                  { label: 'Agent Policy', value: appliedPolicies.agent_policy || 'None' },
                  { label: 'Site Policy', value: appliedPolicies.site_policy || 'None' },
                  { label: 'Client Policy', value: appliedPolicies.client_policy || 'None' },
                  { label: 'Default Policy', value: appliedPolicies.default_policy || 'None' },
                ],
              }}
            />

            <InfoCard
              data={{
                title: 'Policy Configuration',
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>
                        Policy inheritance settings. When enabled, policies cascade from higher levels. When blocked,
                        only device-specific policies apply.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                  {
                    label: 'Policy Inheritance',
                    value: device.block_policy_inheritance ? 'Blocked' : 'Enabled',
                  },
                ],
              }}
            />
          </div>
        </div>

        {/* Compliance Checks Section */}
        <div className="pt-6">
          <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
            COMPLIANCE CHECKS
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <InfoCard
              data={{
                title: 'Total Checks',
                subtitle: checks.total?.toString() || '0',
                icon: (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-[500px] min-w-[400px]">
                      <p>
                        Automated compliance checks from Tactical RMM. Monitors system health, security configurations,
                        and compliance requirements.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                ),
                items: [
                  { label: 'Passing', value: checks.passing?.toString() || '0' },
                  { label: 'Failing', value: checks.failing?.toString() || '0' },
                  { label: 'Warnings', value: checks.warning?.toString() || '0' },
                  { label: 'Info', value: checks.info?.toString() || '0' },
                ],
              }}
            />
          </div>
        </div>

        {/* Fleet Issues Section */}
        {issues && Object.keys(issues).length > 0 && (
          <div className="pt-6">
            <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
              FLEET POLICIES
            </h3>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <InfoCard
                data={{
                  title: 'Fleet Policy Status',
                  icon: (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <InfoIcon className="w-4 h-4 text-ods-text-secondary cursor-help" />
                      </TooltipTrigger>
                      <TooltipContent className="max-w-[500px] min-w-[400px]">
                        <p>
                          Fleet MDM policy compliance status. Shows failing policies and total security issues detected
                          by Fleet.
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  ),
                  items: [
                    {
                      label: 'Failing Policies',
                      value: issues.failing_policies_count?.toString() || '0',
                    },
                    {
                      label: 'Total Issues',
                      value: issues.total_issues_count?.toString() || '0',
                    },
                  ],
                }}
              />
            </div>
          </div>
        )}

        {/* Fleet Labels Section */}
        {labels.length > 0 && (
          <div className="pt-6">
            <h3 className="font-['Azeret_Mono'] font-medium text-[14px] leading-[20px] tracking-[-0.28px] uppercase text-ods-text-secondary mb-4">
              FLEET LABELS
            </h3>

            <div className="flex flex-wrap gap-2">
              {labels.map((label: any, index: number) => (
                <span
                  key={index}
                  className="inline-flex items-center px-2.5 py-0.5 rounded-[6px] text-xs font-medium uppercase bg-info/20 text-info"
                >
                  {label.name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}
