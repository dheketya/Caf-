import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
      <h2 className="text-4xl font-bold text-gray-900">404</h2>
      <p className="text-sm text-gray-500">Page not found</p>
      <Link
        href="/"
        className="px-4 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700"
      >
        Go home
      </Link>
    </div>
  )
}
