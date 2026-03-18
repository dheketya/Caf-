import { Coffee } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-orange-50 to-amber-50 flex flex-col items-center justify-center p-3 sm:p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center h-10 w-10 rounded-xl bg-brand-600 shadow-lg shadow-brand-600/20 mb-2">
            <Coffee className="h-5 w-5 text-white" />
          </div>
          <h1 className="text-lg font-bold text-gray-900">CaféOS</h1>
        </div>
        {children}
      </div>
    </div>
  )
}
