import { createContext, useContext, useReducer } from 'react'

import { type TreeNode } from '@/services/s3'

export type State = {
  bucketName: string
  searchTerm: string
  activeFile: {
    remoteURL: string
    fileName: string
    variants?: TreeNode[]
  }
}

export type Action =
  | {
      type: 'SET_ACTIVE_FILE'
      payload: { remoteURL: string; fileName: string; variants?: TreeNode[] }
    }
  | {
      type: 'UPDATE_SEARCH_TERM'
      payload: string
    }

const initialState: State = {
  bucketName: '',
  searchTerm: '',
  activeFile: {
    remoteURL: '',
    fileName: '',
    variants: []
  }
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFile: action.payload }
    case 'UPDATE_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }
    default:
      return state
  }
}

const ExplorerContext = createContext<{ state: State; actions: Actions } | undefined>(undefined)

export type Actions = {
  setActiveFile: ({
    remoteURL,
    fileName,
    variants
  }: {
    remoteURL: string
    fileName: string
    variants?: TreeNode[]
  }) => void
  resetActiveState: () => void
  updateSearchTerm: (searchTerm: string) => void
}

export const ExplorerProvider = ({ bucketName, children }: { bucketName: string; children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const resetActiveState = () => {
    dispatch({ type: 'SET_ACTIVE_FILE', payload: { remoteURL: '', fileName: '', variants: [] } })
  }

  const actions: Actions = {
    setActiveFile: ({ remoteURL, fileName, variants }) =>
      dispatch({ type: 'SET_ACTIVE_FILE', payload: { remoteURL, fileName, variants: variants ? variants : [] } }),
    resetActiveState,
    updateSearchTerm: (searchTerm: string) => dispatch({ type: 'UPDATE_SEARCH_TERM', payload: searchTerm })
  }

  return (
    <ExplorerContext.Provider value={{ state: { ...state, bucketName }, actions }}>{children}</ExplorerContext.Provider>
  )
}

export const useExplorer = () => {
  const context = useContext(ExplorerContext)

  if (!context) {
    throw new Error('useExplorer must be used within an ExplorerProvider')
  }

  return context
}
