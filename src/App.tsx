import { Header } from '@/components/layout/Header'
import { SignList } from '@/features/sign-generator/components/SignList'
import { SignPreview } from '@/features/sign-generator/components/SignPreview'
import { SignSettings } from '@/features/sign-generator/components/SignSettings'
import { useSignWorkspace } from '@/features/sign-generator/state/use-sign-workspace'

export default function App() {
  const workspace = useSignWorkspace()

  return (
    <div className="flex h-dvh flex-col bg-background">
      <Header activeTab={workspace.activeTab} onTabChange={workspace.changeTab} />
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
          <SignSettings sign={workspace.selectedSign} onChange={workspace.updateSign} expresswaySignList={workspace.expresswaySignList} />
        </div>
      </main>
    </div>
  )
}
