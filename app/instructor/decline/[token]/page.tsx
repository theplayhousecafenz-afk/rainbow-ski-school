import { redirect } from 'next/navigation'

export default function InstructorDeclinePage({ params }: { params: { token: string } }) {
  redirect(`/api/instructor/respond/${params.token}?action=decline`)
}
