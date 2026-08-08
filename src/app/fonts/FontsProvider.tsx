import {
  FontProvider,
} from './FontContext'
import {
  loadFontBuffers,
} from './loadFontBuffers'

export async function FontsProvider({
  children,
}: { children: React.ReactNode }) {
  const buffers = await loadFontBuffers()
  return (
    <FontProvider buffers={buffers}>
      {children}
    </FontProvider>
  )
}
