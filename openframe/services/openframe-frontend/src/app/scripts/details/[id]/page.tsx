import { AppLayout } from '../../../components/app-layout'
import { ScriptDetailsView } from '../../components/script-details-view'

interface ScriptDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateStaticParams() {
  // Return empty array for static export - pages will be generated on demand
  return []
}

export default async function ScriptDetailsPage({ params }: ScriptDetailsPageProps) {
  const { id } = await params
  return (
    <AppLayout>
      <ScriptDetailsView scriptId={id} />
    </AppLayout>
  )
}
