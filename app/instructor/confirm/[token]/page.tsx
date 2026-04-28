import { redirect } from 'next/navigation'

export default function InstructorConfirmPage({ params }: { params: { token: string } }) {
  redirect(`/api/instructor/respond/${params.token}?action=confirm`)
}
