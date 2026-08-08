import TAB_TITLES from './tab-meta.json'
import TabPage from './TabPage'

import type {
  Metadata,
} from 'next'

interface TabPageProps {
    params: Promise<{ tab: string }>;
}

export async function generateMetadata({
  params,
}: TabPageProps): Promise<Metadata> {
  const {
    tab,
  } = await params
  return {
    title: TAB_TITLES[tab as keyof typeof TAB_TITLES],
  }
}

export default function Page() {
  return <TabPage />
}
