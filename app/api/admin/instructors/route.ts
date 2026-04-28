import { NextRequest, NextResponse } from 'next/server'
import { createServerSupabase } from '@/lib/supabase'

export async function GET() {
  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('instructors')
    .select('*')
    .order('discipline')
    .order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instructors: data })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  const { name, email, phone, discipline, qualifications } = body

  if (!name || !email || !discipline || !['ski', 'snowboard'].includes(discipline)) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('instructors')
    .insert({ name, email, phone: phone ?? '', discipline, qualifications: qualifications ?? null, active: true })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instructor: data }, { status: 201 })
}

export async function PATCH(request: NextRequest) {
  const body = await request.json()
  const { id, ...updates } = body
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const allowed = ['name', 'email', 'phone', 'discipline', 'qualifications', 'active']
  const patch = Object.fromEntries(Object.entries(updates).filter(([k]) => allowed.includes(k)))

  const supabase = createServerSupabase()
  const { data, error } = await supabase
    .from('instructors')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ instructor: data })
}

export async function DELETE(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const id = searchParams.get('id')
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 })

  const supabase = createServerSupabase()
  const { error } = await supabase.from('instructors').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
