import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

// Public endpoint — returns KHQR image for registration page
export async function GET() {
  const settings = await prisma.platformSettings.findFirst()
  return NextResponse.json({ khqrImage: settings?.khqrImage || null })
}
