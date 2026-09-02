import type { AppState } from './lib/types'

declare global {
  interface Window {
    lifeGame?: {
      loadState: () => Promise<AppState | null>
      saveState: (state: AppState) => Promise<boolean>
      exportBackup: (state: AppState) => Promise<{ canceled: boolean; filePath?: string }>
      importBackup: () => Promise<{ canceled: boolean; state?: AppState; filePath?: string }>
      getStorageInfo: () => Promise<{ databasePath: string; offline: boolean }>
    }
  }
}

export {}
