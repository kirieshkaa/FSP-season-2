import type { ReactElement } from 'react'
import type { PackTask } from './data.js'
import { IconX } from './icons.jsx'

interface Props {
  tasks: PackTask[]
  onStart: () => void
  onBack: () => void
  onClose: () => void
}

export default function PackingModal({ tasks, onStart, onBack, onClose }: Props): ReactElement {
  function plural(n: number): string {
    const m10 = n % 10
    const m100 = n % 100
    if (m10 === 1 && m100 !== 11) return 'товар'
    if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'товара'
    return 'товаров'
  }

  return (
    <div className="modal-wrap">
      <div className="modal-scrim" onClick={onClose} />
      <div className="modal">
        <div className="modal-head">
          <div>
            <h3 className="modal-title">Подтверждение упаковки</h3>
            <p className="pack-sub">Тара подобрана автоматически системой подбора</p>
          </div>
          <button className="icon-btn modal-close" title="Закрыть" onClick={onClose}>
            <IconX />
          </button>
        </div>

        <div className="pack-summary-row">
          <span className="pack-summary-num">{tasks.length}</span>
          <span>{plural(tasks.length)} передано в упаковку</span>
        </div>

        <div className="pack-list pack-list-confirm">
          {tasks.map((t) => (
            <div key={t.product.sku} className="pack-item pack-item-static">
              <span className={`box-tag box-${t.box.id.toLowerCase()}`}>{t.box.id}</span>
              <span className="pack-main">
                <span className="pack-tit">{t.product.name}</span>
                <span className="pack-sub">{t.product.sku} · {t.box.name}</span>
              </span>
              <span className="pack-meta">
                {t.product.weight} г<br />{t.product.g}
              </span>
            </div>
          ))}
        </div>

        <div className="pack-foot">
          <button className="btn-secondary" onClick={onBack}>Изменить выбор</button>
          <button className="btn-primary btn-sm" onClick={onStart}>Начать упаковку</button>
        </div>
      </div>
    </div>
  )
}