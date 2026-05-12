// src/views/OrdersView.jsx
import { Construction } from 'lucide-react'

export default function OrdersView() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
          <Construction size={22} className="text-red-400" />
        </div>
        <p className="text-white font-medium">Đơn hàng</p>
        <p className="text-zinc-500 text-sm mt-1">Đang xây dựng...</p>
      </div>
    </div>
  )
}
