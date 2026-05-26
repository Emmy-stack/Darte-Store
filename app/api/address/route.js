import { NextResponse } from 'next/server'
import prisma from '@/lib/prisma'
import { getAuth } from '@clerk/nextjs/server'

export async function GET(request) {
  try {
    const { userId } = getAuth(request)
    if (!userId) return NextResponse.json({ addresses: [] })

    const addresses = await prisma.address.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } })
    return NextResponse.json({ addresses })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Failed to fetch addresses' }, { status: 400 })
  }
}

export async function POST(request) {
  try {
    const { userId } = getAuth(request)
    if (!userId) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

    const body = await request.json()
    const { name, email, street, city, state, zip, country, phone } = body

    const address = await prisma.address.create({ data: {
      userId,
      name,
      email,
      street,
      city,
      state,
      zip,
      country,
      phone,
    }})

    return NextResponse.json({ address })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: err.message || 'Failed to create address' }, { status: 400 })
  }
}
