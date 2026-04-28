import Nav from '@/components/nav'

export default function InvalidTokenPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 flex items-center justify-center bg-slate-50 py-24 px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">⚠️</div>
          <h1 className="text-2xl font-bold text-slate-700 mb-3">Invalid link</h1>
          <p className="text-slate-500">
            This availability link is invalid or has expired. Please contact the school if you
            believe this is a mistake.
          </p>
        </div>
      </main>
    </>
  )
}
