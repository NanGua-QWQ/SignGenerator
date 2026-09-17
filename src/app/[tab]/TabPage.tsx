'use client'
import {
  useParams
  ,
  redirect,
} from 'next/navigation'

import {
  CrossroadsSettings,
} from '@/[tab]/CrossroadsSettings'
import {
  DestinationDistanceSettings,
} from '@/[tab]/DestinationDistanceSettings'
import {
  FreeModeSettings,
} from '@/[tab]/FreeModeSettings'
import {
  IntersectionSettings,
} from '@/[tab]/IntersectionSettings'
import {
  RoundaboutSettings,
} from '@/[tab]/RoundaboutSettings'
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
  'intersection-guidance',
  'destination-distance',
  'interchange-guidance',
  'entrance-exit-guidance',
  'free-mode',
])

interface TabPageProps {
  defaultTab?: WorkspaceTab
}

export default function TabPage({
  defaultTab,
}: TabPageProps) {
  const params = useParams<{ tab: string }>()
  const tabParam = defaultTab ?? params.tab
  if (typeof tabParam !== 'string' || !VALID_TABS.has(tabParam)) {
    redirect('/signs')
  }

  const workspace = useSignWorkspace(tabParam as WorkspaceTab)

  return (
    <>
      <Header activeTab={tabParam as WorkspaceTab} />
      <main className="grid min-h-0 flex-1 grid-cols-[14rem_minmax(0,1fr)_20rem] max-lg:grid-cols-[12rem_minmax(0,1fr)] max-md:grid-cols-1 max-md:grid-rows-[auto_minmax(17rem,42vh)_minmax(0,1fr)] max-md:overflow-hidden">
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
        <SignPreview
          sign={workspace.selectedSign}
          roadSignList={workspace.ordinaryExitRoadSignList}
        />
        <div className="max-lg:col-span-2 max-lg:max-h-72 max-md:col-span-1 max-md:min-h-0 max-md:max-h-none max-md:overflow-hidden">
          {tabParam === 'free-mode' ? <FreeModeSettings
            sign={workspace.selectedSign}
            roadSignList={workspace.ordinaryExitRoadSignList}
            onChange={workspace.updateSign}
          /> : tabParam === 'destination-distance' ? <DestinationDistanceSettings
            sign={workspace.selectedSign}
            roadSignList={workspace.ordinaryExitRoadSignList}
            onChange={workspace.updateSign}
          /> : tabParam === 'intersection-guidance'
            && workspace.selectedSign.template === 'roundabout-guidance' ? <RoundaboutSettings
              sign={workspace.selectedSign}
              roadSignList={workspace.ordinaryExitRoadSignList}
              onChange={workspace.updateSign}
            /> : tabParam === 'intersection-guidance'
            && workspace.selectedSign.template === 'crossroads-guidance' ? <CrossroadsSettings
                sign={workspace.selectedSign}
                roadSignList={workspace.ordinaryExitRoadSignList}
                onChange={workspace.updateSign}
              /> : tabParam === 'intersection-guidance' ? <IntersectionSettings
                sign={workspace.selectedSign}
                roadSignList={workspace.ordinaryExitRoadSignList}
                onChange={workspace.updateSign}
              /> : <SignSettings
                sign={workspace.selectedSign}
                onChange={workspace.updateSign}
                expresswaySignList={workspace.expresswaySignList}
                ordinaryExitRoadSignList={workspace.ordinaryExitRoadSignList}
              />}
        </div>
      </main>
    </>
  )
}
