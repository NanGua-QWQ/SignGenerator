'use client'

import {
  type ReactNode,
} from 'react'

import {
  useSignWorkspace,
} from '@/state/use-sign-workspace'

import {
  PreviewToolbar,
} from './PreviewToolbar'
import {
  SignPreview,
} from './SignPreview'

export default function WorkspacePage(props: {
  children: ReactNode
}) {
  const workspace = useSignWorkspace()

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[75vw_1fr] max-lg:grid-cols-[70vh_1fr] max-md:grid-cols-1 max-md:grid-rows-[50vh_1fr]">
      <SignPreview sign={workspace.selectedSign} />
      <aside className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
        <PreviewToolbar sign={workspace.selectedSign} />
        {props.children}
      </aside>
    </main>
  )
}
