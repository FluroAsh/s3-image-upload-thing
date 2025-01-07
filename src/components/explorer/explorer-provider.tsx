'use client'

import { createContext, useContext, useReducer } from 'react'

type ExplorerState = {
  activeFile: string
}

type Action = {
  type: string
  payload: string
}

type ExplorerActions = {
  setActiveFile: (name: string) => void
  resetState: () => void
}

const initialState = {
  activeFile: ''
} satisfies ExplorerState

const reducer = (state: ExplorerState, action: Action): ExplorerState => {
  switch (action.type) {
    case 'SET_ACTIVE_FILE':
      return { ...state, activeFile: action.payload }
    case 'RESET_STATE':
      return initialState
    default:
      return state
  }
}

const ExplorerContext = createContext<{ state: ExplorerState; actions: ExplorerActions } | undefined>(undefined)

export const ExplorerProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, dispatch] = useReducer(reducer, initialState)

  const actions: ExplorerActions = {
    setActiveFile: (S3FilePath: string) => dispatch({ type: 'SET_ACTIVE_FILE', payload: S3FilePath }),
    resetState: () => dispatch({ type: 'RESET_STATE', payload: '' })
    // ... More actions
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
