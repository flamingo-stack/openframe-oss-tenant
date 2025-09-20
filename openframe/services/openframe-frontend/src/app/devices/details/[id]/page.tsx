import { AppLayout } from '../../../components/app-layout'
import { DeviceDetailsView } from '../../components/device-details-view'

interface DeviceDetailsPageProps {
  params: Promise<{
    id: string
  }>
}

export async function generateStaticParams() {
  // Return empty array for static export - pages will be generated on demand
  return []
}

export default async function DeviceDetailsPage({ params }: DeviceDetailsPageProps) {
  const { id } = await params
  return (
    <AppLayout>
      <DeviceDetailsView deviceId={id} />
    </AppLayout>
  )
}