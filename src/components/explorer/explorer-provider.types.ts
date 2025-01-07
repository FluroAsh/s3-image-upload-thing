export type ExplorerState = {
  searchTerm: string
  activeFile: {
    remoteURL: string
    fileName: string
  }
}

export type Action =
  | {
      type: 'SET_ACTIVE_FILE'
      payload: { remoteURL: string; fileName: string }
    }
  | {
      type: 'UPDATE_SEARCH_TERM'
      payload: string
    }

export type ExplorerActions = {
  setActiveFile: ({ remoteURL, fileName }: { remoteURL: string; fileName: string }) => void
  updateSearchTerm: (searchTerm: string) => void
}
