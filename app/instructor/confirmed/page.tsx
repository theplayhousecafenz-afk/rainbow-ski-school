import Nav from '@/components/nav'

export default function InstructorConfirmedPage() {
  return (
    <>
      <Nav />
      <main className="flex-1 flex items-center justify-center bg-slate-50 py-24 px-4">
        <div className="max-w-md text-center">
          <div className="text-6xl mb-4">✓</div>
          <h1 className="text-2xl font-bold text-green-700 mb-3">You&apos;re confirmed!</h1>
          <p className="text-slate-600">
            Thanks for confirming your availability. You&apos;re rostered for the lesson. We&apos;ll send you
            a reminder the evening before with the full student list.
          </p>
        </div>
      </main>
    </>
  )
}
