import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { requirePlatformOwner } from '@/lib/tenant'

export async function GET() {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const settings = await prisma.platformSettings.findFirst()
  return NextResponse.json(settings || {})
}

export async function PATCH(request: NextRequest) {
  const auth = await requirePlatformOwner()
  if ('error' in auth) return auth.error

  const body = await request.json()
  const { telegramUsername, telegramGroupLink, khqrImage } = body

  const settings = await prisma.platformSettings.upsert({
    where: { id: 'default' },
    update: {
      ...(telegramUsername !== undefined && { telegramUsername }),
      ...(telegramGroupLink !== undefined && { telegramGroupLink }),
      ...(khqrImage !== undefined && { khqrImage }),
    },
    create: {
      id: 'default',
      telegramUsername,
      telegramGroupLink,
      khqrImage,
    },
  })

  return NextResponse.json(settings)
}
