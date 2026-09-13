import type { AppState } from './lib/types'

declare global {
  interface Window {
    lifeGame?: {
      loadState: () => Promise<unknown>
      saveState: (state: AppState) => Promise<boolean>
      exportBackup: (state: AppState) => Promise<{ canceled: boolean; filePath?: string }>
      importBackup: () => Promise<{ canceled: boolean; state?: unknown; filePath?: string }>
      getStorageInfo: () => Promise<{ databasePath: string; offline: boolean }>
      onBeforeClose: (flush: () => Promise<boolean>) => () => void
    }
  }
}

export {}
