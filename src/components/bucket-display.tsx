import ActivePanel from './active-panel'
import NestedPanel from './nested-panel'
import { ViewPanel } from './view-panel'

export default async function BucketDisplay() {
  // TODO: https://github.com/bvaughn/react-resizable-panels/tree/main
  return (
    <div>
      <div className="bg-pink-600">Navigation (Back & Forward)</div>
      <div className="grid grid-cols-3">
        {/* (Bucket contents － files/folders) */}
        <ViewPanel />
        {/* (Displays ) */}
        <NestedPanel />
        {/* Selected Panel */}
        <ActivePanel />
      </div>
    </div>
  )
}
