import { createContext, useContext } from 'react'

export type StreamStatus = 'connecting' | 'connected' | 'offline'

export interface ContingencyNotice {
  id: number
  message: string
}

export const EventContext = createContext<{ status: StreamStatus; contingency: ContingencyNotice | null; acknowledge: () => Promise<void> }>({
  status: 'offline',
  contingency: null,
  acknowledge: async () => undefined,
})

export function useEvents() {
  return useContext(EventContext)
}
