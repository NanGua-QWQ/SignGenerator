'use client'

import {
  useSignWorkspace,
} from '@/state/use-sign-workspace'

import {
  SignList,
} from './SignList'
import {
  SignPreview,
} from './SignPreview'
import {
  SignSettings,
} from './SignSettings'

export default function WorkspacePage() {
  const workspace = useSignWorkspace()

  return (
    <main className="grid min-h-0 flex-1 grid-cols-[14rem_minmax(0,1fr)_20rem] max-lg:grid-cols-[12rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(0,1.2fr)_minmax(16rem,0.8fr)]">
      <div>
        <SignList
          title={workspace.signListTitle}
          signs={workspace.visibleSigns}
          selectedId={workspace.selectedId}
          onSelect={workspace.selectSign}
          onAdd={workspace.addSign}
          onReorder={workspace.reorderSign}
        />
      </div>
      <SignPreview sign={workspace.selectedSign} />
      <div className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:max-h-none">
        <SignSettings
          sign={workspace.selectedSign}
          onChange={workspace.updateSign}
          onDelete={workspace.deleteSign}
          expresswaySignList={workspace.expresswaySignList}
        />
      </div>
    </main>
  )
}
