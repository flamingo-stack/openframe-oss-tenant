'use client'

import React, { useEffect, useMemo, useState } from 'react'
import { ServiceCard, Skeleton } from '@flamingo-stack/openframe-frontend-core'
import { SearchBar } from '@flamingo-stack/openframe-frontend-core/components/ui'
import { useIntegratedTools } from '../../hooks/use-integrated-tools'

export function ArchitectureTab() {
  const { tools, isLoading, fetchIntegratedTools } = useIntegratedTools()
  const [searchTerm, setSearchTerm] = useState('')

  useEffect(() => {
    fetchIntegratedTools({ enabled: true, category: null }).catch(() => {})
  }, [fetchIntegratedTools])

  const filteredTools = useMemo(() => {
    const term = searchTerm.trim().toLowerCase()
    if (!term) return tools
    return tools.filter((t) => {
      const name = t.name?.toLowerCase() || ''
      const description = t.description?.toLowerCase() || ''
      const category = (t.category as unknown as string)?.toLowerCase?.() || ''
      const layer = (t.layer as unknown as string)?.toLowerCase?.() || ''
      const urls = (t.toolUrls || []).map(u => (u?.url || '').toLowerCase())
      return (
        name.includes(term) ||
        description.includes(term) ||
        category.includes(term) ||
        layer.includes(term) ||
        urls.some(u => u.includes(term))
      )
    })
  }, [tools, searchTerm])

  // Group by layer (after filtering)
  const grouped = filteredTools.reduce<Record<string, typeof tools>>((acc, t) => {
    const layer = (t.layer as unknown as string) || 'Other'
    if (!acc[layer]) acc[layer] = []
    acc[layer].push(t)
    return acc
  }, {})

  const layerOrder = Object.keys(grouped).sort((a, b) => a.localeCompare(b))

  return (
    <div className="pt-6 space-y-6">
      <div>
        <SearchBar
          placeholder="Search for Tools..."
          onSubmit={setSearchTerm}
          value={searchTerm}
          className="w-full"
        />
      </div>
      {isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="bg-ods-card border border-ods-border rounded-lg p-6">
              <div className="flex items-center gap-4 mb-4">
                <Skeleton className="w-12 h-12 rounded-md" />
                <div className="flex-1">
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              </div>
              <Skeleton className="h-12 w-full" />
            </div>
          ))}
        </div>
      )}

      {layerOrder.map((layer) => (
        <div key={layer} className="space-y-4">
          <div className="text-ods-text-primary font-bold text-2xl">{layer}</div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {grouped[layer].map((tool) => {
              const rows: Array<{ label?: string; value: string; href?: string; isSecret?: boolean; actions?: any }> = []
              const urls = tool.toolUrls || []
              urls.forEach(u => {
                if (!u?.url) return
                const formattedType = (u.type || 'Link')
                  .replace(/_/g, ' ')
                  .replace(/\b\w/g, (c) => c.toUpperCase())

                // Concatenate port to URL if port exists
                const fullUrl = u.port ? `${u.url}:${u.port}` : u.url

                rows.push({ label: formattedType, value: fullUrl, href: fullUrl, actions: { copy: true, open: true } })

                // Display port as a separate row if it exists
                if (u.port) {
                  rows.push({ label: 'Port', value: String(u.port), actions: { copy: true } })
                }
              })
        if (tool.credentials?.username) rows.push({ label: 'User', value: tool.credentials.username, actions: { copy: true } })
        if (tool.credentials?.password) rows.push({ label: 'Pass', value: tool.credentials.password, isSecret: true, actions: { reveal: true, copy: true } })
        if (tool.credentials?.apiKey?.key) rows.push({ label: tool.credentials.apiKey.keyName || 'API Key', value: tool.credentials.apiKey.key, isSecret: true, actions: { reveal: true, copy: true } })

              return (
                <ServiceCard
                  key={tool.id}
                  title={tool.name}
                  subtitle={tool.description || ''}
                  tag={tool.category ? { label: tool.category } : undefined}
                  rows={rows}
                />
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}


