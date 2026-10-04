import { Database, Download, Upload } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { Modal } from './Ui'

export function DataModal({ onClose }: { onClose: () => void }) {
  const { exportBackup, importBackup } = useStore()
  const [storagePath, setStoragePath] = useState('Локальное хранилище приложения')
  const [backupBusy, setBackupBusy] = useState(false)
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null)

  useEffect(() => {
    window.lifeGame?.getStorageInfo().then((info) => setStoragePath(info.databasePath)).catch(() => undefined)
  }, [])

  const runBackup = async (operation: 'export' | 'import') => {
    if (backupBusy) return
    if (operation === 'import' && !window.confirm('Текущие данные будут заменены содержимым резервной копии. Продолжить?')) return
    setBackupBusy(true)
    setMessage(null)
    try {
      if (operation === 'export') {
        if (await exportBackup()) setMessage({ text: 'Резервная копия сохранена', error: false })
      } else if (await importBackup()) {
        setMessage({ text: 'Данные восстановлены', error: false })
      }
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Не удалось обработать резервную копию', error: true })
    } finally {
      setBackupBusy(false)
    }
  }

  return (
    <Modal title="Данные приложения" subtitle="Локальное хранение и резервные копии" onClose={onClose}>
      <div className="data-modal">
        <div className="data-modal__heading"><Database size={19} aria-hidden="true" /><h3>Локальная база</h3></div>
        <code className="data-modal__path" title={storagePath}>{storagePath}</code>
        <p>Резервная копия содержит профиль, квесты, прогресс и награды.</p>
        <div className="data-modal__actions">
          <button className="button button--secondary" type="button" disabled={backupBusy} onClick={() => void runBackup('export')}><Download size={16} /> Экспорт</button>
          <button className="button button--ghost" type="button" disabled={backupBusy || !window.lifeGame} onClick={() => void runBackup('import')}><Upload size={16} /> Импорт</button>
        </div>
        {message && <p className={`data-modal__message${message.error ? ' is-error' : ''}`} role={message.error ? 'alert' : 'status'}>{message.text}</p>}
      </div>
    </Modal>
  )
}
