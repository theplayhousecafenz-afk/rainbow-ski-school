import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'
import { sendEnquiryToAdmin } from '@/lib/email'

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, message } = body

  if (!name?.trim() || !email?.trim() || !message?.trim()) {
    return NextResponse.json({ error: 'name, email, and message are required' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data: enquiry, error } = await supabase
    .from('enquiries')
    .insert({ name: name.trim(), email: email.trim(), message: message.trim() })
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  await sendEnquiryToAdmin(enquiry)

  await supabase
    .from('enquiries')
    .update({ auto_reply_sent: true })
    .eq('id', enquiry.id)

  return NextResponse.json({ success: true })
}
