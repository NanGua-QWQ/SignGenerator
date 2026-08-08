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
}: TabPageProps) {
  const {
    tab,
  } = await params
  return {
    title: TAB_TITLES[tab as keyof typeof TAB_TITLES],
  } satisfies Metadata
}

export default function Page() {
  return <TabPage />
}
