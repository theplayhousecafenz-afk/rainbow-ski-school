import Nav from '@/components/nav'

export default function AlreadyRespondedPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 flex items-center justify-center bg-slate-50 py-24 px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">ℹ️</div>
          <h1 className="text-2xl font-bold text-slate-700 mb-3">Already responded</h1>
          <p className="text-slate-500">
            You&apos;ve already responded to this availability request. No further action needed.
          </p>
        </div>
      </main>
    </>
  )
}
