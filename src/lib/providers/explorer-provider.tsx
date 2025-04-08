import { createContext, useContext, useReducer } from 'react'
import type { Action, ExplorerActions, ExplorerState } from './explorer-provider.types'

const initialState = {
  searchTerm: '',
  activeFile: {
    remoteURL: '',
    fileName: ''
  }
} satisfies ExplorerState

const reducer = (state: ExplorerState, action: Action): ExplorerState => {
  switch (action.type) {
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFile: action.payload }
    case 'UPDATE_SEARCH_TERM':
      return { ...state, searchTerm: action.payload }
    default:
      return state
  }
}

const ExplorerContext = createContext<{ state: ExplorerState; actions: ExplorerActions } | undefined>(undefined)

export const ExplorerProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions: ExplorerActions = {
    setActiveFile: ({ remoteURL, fileName }) => dispatch({ type: 'SET_ACTIVE_FILE', payload: { remoteURL, fileName } }),
    updateSearchTerm: (searchTerm: string) => dispatch({ type: 'UPDATE_SEARCH_TERM', payload: searchTerm })
  }

  return <ExplorerContext.Provider value={{ state, actions }}>{children}</ExplorerContext.Provider>
}

export const useExplorer = () => {
  const context = useContext(ExplorerContext)

  if (!context) {
    throw new Error('useExplorer must be used within an ExplorerProvider')
  }

  return context
}
