import type {
  Metadata,
} from 'next'

import WorkspacePage from './WorkspacePage'

export const metadata: Metadata = {
  title: '标志生成器',
}

export default function Page() {
  return <WorkspacePage />
}
