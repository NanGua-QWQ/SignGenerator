'use client'
import {
  useParams
  ,
  redirect,
} from 'next/navigation'

import {
  SignList,
} from '@/[tab]/SignList'
import {
  SignPreview,
} from '@/[tab]/SignPreview'
import {
  SignSettings,
} from '@/[tab]/SignSettings'
import {
  useSignWorkspace,
} from '@/state/use-sign-workspace'

import {
  Header, type WorkspaceTab,
} from './Header'

const VALID_TABS: ReadonlySet<string> = new Set<WorkspaceTab>([
  'signs',
  'interchange-guidance',
  'entrance-exit-guidance',
])

export default function TabPage() {
  const params = useParams<{ tab: string }>()
  const tabParam = params.tab
  if (typeof tabParam !== 'string' || !VALID_TABS.has(tabParam)) {
    redirect('/signs')
  }

  const workspace = useSignWorkspace(tabParam as WorkspaceTab)

  return (
    <>
      <Header activeTab={tabParam as WorkspaceTab} />
      <main className="grid min-h-0 flex-1 grid-cols-[14rem_minmax(0,1fr)_20rem] max-lg:grid-cols-[12rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
        <div>
          <SignList
            title={workspace.signListTitle}
            signs={workspace.visibleSigns}
            selectedId={workspace.selectedId}
            onSelect={workspace.selectSign}
            onAdd={workspace.addSign}
            addChoices={workspace.addChoices}
            onDelete={workspace.deleteSign}
            onReorder={workspace.reorderSign}
            onUpdate={workspace.updateSignById}
          />
        </div>
        <SignPreview sign={workspace.selectedSign} />
        <div className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none">
          <SignSettings
            sign={workspace.selectedSign}
            onChange={workspace.updateSign}
            expresswaySignList={workspace.expresswaySignList}
          />
        </div>
      </main>
    </>
  )
}
