'use client'

import {
  type ReactNode,
} from 'react'

import {
  useAtomValue,
} from 'jotai'

import {
  selectedSignAtom,
  useWorkspacePersistence,
} from '@/state/sign-workspace-store'

import {
  PreviewToolbar,
} from './PreviewToolbar'
import {
  SignPreview,
} from './SignPreview'

export default function WorkspacePage(props: {
  children: ReactNode
}) {
  useWorkspacePersistence()
  const sign = useAtomValue(selectedSignAtom)

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[75vw_1fr] max-lg:grid-cols-[70vh_1fr] max-md:grid-cols-1 max-md:grid-rows-[50vh_1fr]">
      <SignPreview sign={sign} />
      <aside className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
        <PreviewToolbar sign={sign} />
        {props.children}
      </aside>
    </main>
  )
}
