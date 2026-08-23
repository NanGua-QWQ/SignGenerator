import {
  type ReactNode,
} from 'react'

import {
  PreviewToolbar,
} from './PreviewToolbar'
import {
  SignPreview,
} from './SignPreview'
import {
  FontsProvider,
} from './fonts/FontsProvider'

export default function WorkspacePage(props: {
  children: ReactNode
}) {
  return (
    <main style={{
      height: '100vh',
    }} className="grid min-h-0 flex-1 grid-cols-[75vw_1fr] max-lg:grid-cols-[70vh_1fr] max-md:grid-cols-1 max-md:grid-rows-[50vh_1fr]">
      <FontsProvider>
        <SignPreview />
      </FontsProvider>
      <aside className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none h-full overflow-y-auto border-l bg-background max-lg:border-l-0 max-lg:border-t">
        <PreviewToolbar />
        {props.children}
      </aside>
    </main>
  )
}
