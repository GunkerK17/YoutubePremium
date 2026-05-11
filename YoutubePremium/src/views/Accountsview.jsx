// src/views/AccountsView.jsx
export default function AccountsView({ toast, navigate }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto mb-3">
          <span className="text-red-400 text-xl">🚧</span>
        </div>
        <p className="text-white font-medium">AccountsView</p>
        <p className="text-zinc-500 text-sm mt-1">Đang xây dựng...</p>
      </div>
    </div>
  )
}