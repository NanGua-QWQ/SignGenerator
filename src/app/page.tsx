import TabPage from './[tab]/TabPage'

export default function Home() {
  // Static hosts such as GitHub Pages cannot perform a server redirect from /.
  // Render the default workspace directly so the shared site URL works.
  return <TabPage defaultTab="signs" />
}
