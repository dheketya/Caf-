import { Coffee } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50 flex flex-col items-center justify-center p-4 sm:p-6">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center h-14 w-14 rounded-2xl bg-brand-600 shadow-lg shadow-brand-600/20 mb-4">
            <Coffee className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">CaféOS</h1>
          <p className="text-sm text-gray-500 mt-1">POS for Coffee Shops</p>
        </div>
        {children}
      </div>
    </div>
  )
}
