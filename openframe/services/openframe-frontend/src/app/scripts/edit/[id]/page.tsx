import { AppLayout } from '../../../components/app-layout'
import { EditScriptPage } from '../../components/edit-script-page'
import { FormLoader } from '@flamingo/ui-kit'

interface EditScriptPageProps {
  params: Promise<{
    id?: string
  }>
}

export async function generateStaticParams() {
  // Return empty array for static export - pages will be generated on demand
  return []
}

export default async function EditScriptPageWrapper({ params }: EditScriptPageProps) {
  const { id } = await params
  return (
    <AppLayout>
      <EditScriptPage scriptId={id || null} />
    </AppLayout>
  )
}

