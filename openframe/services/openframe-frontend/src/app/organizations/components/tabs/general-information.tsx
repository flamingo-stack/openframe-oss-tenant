'use client'

import React from 'react'
import { Input, Label, Textarea, Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { HeroImageUploader } from '@flamingo-stack/openframe-frontend-core/components'
import { useAuthenticatedImage } from '@lib/use-authenticated-image'
import { uploadWithAuth, deleteWithAuth } from '@lib/upload-with-auth'
import { useToast } from '@flamingo-stack/openframe-frontend-core/hooks'
import { runtimeEnv } from '@lib/runtime-config'
import { featureFlags } from '@lib/feature-flags'

export type GeneralInfoState = {
  name: string
  category: string
  employees: string
  serviceTier: 'Basic' | 'Premium' | 'Enterprise'
  sla: 'Low' | 'Medium' | 'High' | 'Critical'
  mrr: string
  website: string
  contractStart: string
  contractEnd: string
  notes: string
  logoUrl?: string
  imageUrl?: string
  imageVersion?: number
}

interface GeneralInformationTabProps {
  value: GeneralInfoState
  onChange: (next: GeneralInfoState) => void
  organizationId?: string
}

export function GeneralInformationTab({ value, onChange, organizationId }: GeneralInformationTabProps) {
  const set = (partial: Partial<GeneralInfoState>) => onChange({ ...value, ...partial })
  const { toast } = useToast()
  const isSaasTenant = runtimeEnv.appMode() === 'saas-tenant'
  const { imageUrl: fetchedImageUrl } = useAuthenticatedImage(value.imageUrl, value.imageVersion)
  const displayImageUrl = fetchedImageUrl || value.logoUrl

  const handleAuthenticatedUpload = async (file: File): Promise<string> => {
    try {
      const uploadedUrl = await uploadWithAuth(`/api/organizations/${organizationId}/image`, file)
      toast({ 
        title: 'Upload successful', 
        description: 'Organization image has been updated',
        variant: 'success'
      })
      return uploadedUrl
    } catch (error) {
      throw error
    }
  }

  const handleAuthenticatedDelete = async (): Promise<void> => {
    if (!organizationId) return

    try {
      await deleteWithAuth(`/api/organizations/${organizationId}/image`)

      set({ 
        imageUrl: undefined,
        logoUrl: undefined,
        imageVersion: Date.now()
      })

      toast({ 
        title: 'Delete successful', 
        description: 'Organization image has been deleted',
        variant: 'success'
      })
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to delete image'
      toast({
        title: 'Delete failed',
        description: errorMessage,
        variant: 'destructive'
      })
      throw error
    }
  }


  return (
    <div className="pt-6 flex flex-col gap-6">
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Organization Name */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-name">Organization Name</Label>
              <Input
                id="org-name"
                placeholder="Company Name"
                value={value.name}
                onChange={(e) => set({ name: e.target.value })}
                className="bg-ods-card border border-ods-border"
              />
            </div>

            {/* Category */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-category">Category</Label>
              <Input
                id="org-category"
                placeholder="Category"
                value={value.category}
                onChange={(e) => set({ category: e.target.value })}
                className="bg-ods-card border border-ods-border"
              />
            </div>

            {/* Number of Employees */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-employees">Number of Employees</Label>
              <Input
                id="org-employees"
                type="number"
                placeholder="0"
                value={value.employees}
                onChange={(e) => set({ employees: e.target.value })}
                className="bg-ods-card border border-ods-border"
              />
            </div>

            {/* Service Tier */}
            <div className="flex flex-col gap-2">
              <Label>Service Tier</Label>
              <Select value={value.serviceTier} onValueChange={(v) => set({ serviceTier: v as any })}>
                <SelectTrigger className="bg-ods-card border border-ods-border">
                  <SelectValue placeholder="Select Tier" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Basic">Basic</SelectItem>
                  <SelectItem value="Premium">Premium</SelectItem>
                  <SelectItem value="Enterprise">Enterprise</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SLA Thresholds */}
            <div className="flex flex-col gap-2">
              <Label>SLA Thresholds</Label>
              <Select value={value.sla} onValueChange={(v) => set({ sla: v as any })}>
                <SelectTrigger className="bg-ods-card border border-ods-border">
                  <SelectValue placeholder="Select SLA" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Low">Low (3 days)</SelectItem>
                  <SelectItem value="Medium">Medium (1 day)</SelectItem>
                  <SelectItem value="High">High (8 hours)</SelectItem>
                  <SelectItem value="Critical">Critical (1 hour)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Website */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="org-website">Website URL</Label>
              <Input
                id="org-website"
                placeholder="https://www.website.com"
                value={value.website}
                onChange={(e) => set({ website: e.target.value })}
                className="bg-ods-card border border-ods-border"
              />
            </div>
          </div>
        </div>

        {/* Image Uploader */}
        {isSaasTenant && featureFlags.organizationImages.uploadEnabled() && (
          <div className="w-full lg:w-80 shrink-0 self-start">
            <div className="flex flex-col gap-2">
              <Label>Organization Logo</Label>
              <div style={{ maxHeight: '200px' }}>
                {organizationId ? (
                  <HeroImageUploader
                    imageUrl={displayImageUrl}
                    onChange={(url) => {
                      if (url && url.startsWith('/images/')) {
                        set({ 
                          imageUrl: url, 
                          logoUrl: undefined,
                          imageVersion: Date.now()
                        });
                      } else {
                        set({ 
                          logoUrl: url, 
                          imageUrl: undefined,
                          imageVersion: Date.now()
                        });
                      }
                    }}
                    uploadEndpoint={`/api/organizations/${organizationId}/image`}
                    onUpload={handleAuthenticatedUpload}
                    onDelete={handleAuthenticatedDelete}
                    height={185}
                    objectFit="contain"
                    showReplaceButton={true}
                    deferUpload={false}
                  />
                ) : (
                  // New organization - defer upload until after creation
                  <HeroImageUploader
                    imageUrl={displayImageUrl}
                    onChange={(url) => set({ logoUrl: url })}
                    uploadEndpoint="/api/organizations/placeholder/image" // Won't be used with deferUpload
                    onDelete={async () => {
                      set({ logoUrl: undefined, imageVersion: Date.now() })
                    }}
                    height={185}
                    objectFit="contain"
                    showReplaceButton={true}
                    deferUpload={true}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* MRR */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-mrr">Monthly Recurring Revenue</Label>
          <Input
            id="org-mrr"
            type="number"
            placeholder="0"
            value={value.mrr}
            onChange={(e) => set({ mrr: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>

        {/* Contract Start */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-contract-start" className="whitespace-nowrap">Contract Start Date</Label>
          <Input
            id="org-contract-start"
            type="date"
            value={value.contractStart}
            onChange={(e) => set({ contractStart: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>

        {/* Contract End */}
        <div className="flex flex-col gap-2">
          <Label htmlFor="org-contract-end" className="whitespace-nowrap">Contract End Date</Label>
          <Input
            id="org-contract-end"
            type="date"
            value={value.contractEnd}
            onChange={(e) => set({ contractEnd: e.target.value })}
            className="bg-ods-card border border-ods-border"
          />
        </div>
      </div>

      {/* Notes */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="org-notes">Notes</Label>
        <Textarea
          id="org-notes"
          rows={6}
          placeholder="Your notes here..."
          value={value.notes}
          onChange={(e) => set({ notes: e.target.value })}
          className="bg-ods-card border border-ods-border"
        />
      </div>
    </div>
  )
}
