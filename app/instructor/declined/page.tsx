import Nav from '@/components/nav'

export default function InstructorDeclinedPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 flex items-center justify-center bg-slate-50 py-24 px-4">
        <div className="max-w-md text-center">
          <div className="text-5xl mb-4">👍</div>
          <h1 className="text-2xl font-bold text-slate-700 mb-3">Got it — no worries!</h1>
          <p className="text-slate-500">
            Your decline has been recorded. We&apos;ll reach out to another instructor. Thanks for letting us know!
          </p>
        </div>
      </main>
    </>
  )
}
