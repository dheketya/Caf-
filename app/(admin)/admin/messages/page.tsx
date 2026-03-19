'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { Send, Store } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface ShopThread {
  id: string
  name: string
  lastMessage?: string
  unread: number
}

interface Message {
  id: string
  content: string
  imageUrl: string | null
  sender: { name: string; role: string }
  senderId: string
  createdAt: string
}

export default function AdminMessagesPage() {
  const { data: session } = useSession()
  const [threads, setThreads] = useState<ShopThread[]>([])
  const [activeShopId, setActiveShopId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const { t, bilingual, lang } = useI18n()

  useEffect(() => {
    loadThreads()
  }, [])

  useEffect(() => {
    if (activeShopId) {
      loadMessages(activeShopId)
      const interval = setInterval(() => loadMessages(activeShopId), 5000)
      return () => clearInterval(interval)
    }
  }, [activeShopId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadThreads() {
    // Get all shops that have chat messages
    const shops = await fetch('/api/admin/shops').then((r) => r.json())
    const shopThreads = await Promise.all(
      (shops as any[]).map(async (shop: any) => {
        const msgs = await fetch(`/api/chat?shopId=${shop.id}`).then((r) => r.json())
        const unread = Array.isArray(msgs) ? msgs.filter((m: any) => !m.isRead && m.sender?.role !== 'PLATFORM_OWNER').length : 0
        const last = Array.isArray(msgs) && msgs.length > 0 ? msgs[msgs.length - 1].content : undefined
        return { id: shop.id, name: shop.name, lastMessage: last, unread }
      })
    )
    setThreads(shopThreads.filter((t) => t.lastMessage))
  }

  async function loadMessages(shopId: string) {
    const data = await fetch(`/api/chat?shopId=${shopId}`).then((r) => r.json())
    if (Array.isArray(data)) setMessages(data)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || !activeShopId) return
    setSending(true)
    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input, shopId: activeShopId }),
    })
    setInput('')
    await loadMessages(activeShopId)
    setSending(false)
  }

  const [mainTitle, subTitle] = bilingual('adminMsg.title')

  return (
    <div className="flex gap-6 h-[calc(100vh-7rem)]">
      {/* Thread List */}
      <div className="w-72 shrink-0 bg-white rounded-xl border border-gray-200 flex flex-col">
        <div className="px-4 py-3 border-b border-gray-100">
          <h2 className={cn('font-semibold text-gray-900', lang === 'km' && 'font-khmer')}>
            {mainTitle}
            <span className={cn('block text-xs opacity-60 font-normal', lang === 'km' ? '' : 'font-khmer')}>{subTitle}</span>
          </h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {threads.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-8">{t('adminMsg.noConversations')}</p>
          ) : (
            threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setActiveShopId(thread.id)}
                className={cn(
                  'w-full text-left px-4 py-3 border-b border-gray-50 hover:bg-gray-50',
                  activeShopId === thread.id && 'bg-brand-50'
                )}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Store className="h-4 w-4 text-gray-400" />
                    <span className="text-sm font-medium text-gray-900">{thread.name}</span>
                  </div>
                  {thread.unread > 0 && (
                    <Badge variant="danger" className="text-xs">{thread.unread}</Badge>
                  )}
                </div>
                {thread.lastMessage && (
                  <p className="text-xs text-gray-500 mt-1 truncate">{thread.lastMessage}</p>
                )}
              </button>
            ))
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-white rounded-xl border border-gray-200">
        {!activeShopId ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            {t('adminMsg.selectConversation')}
          </div>
        ) : (
          <>
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === session?.user?.id
                return (
                  <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                    <div className={cn('max-w-[70%] rounded-2xl px-4 py-2.5', isMe ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900')}>
                      {!isMe && <p className="text-xs font-medium mb-1 opacity-70">{msg.sender.name}</p>}
                      <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                      {msg.imageUrl && <img src={msg.imageUrl} alt="" className="mt-2 rounded-lg max-w-full" />}
                      <p className={cn('text-xs mt-1', isMe ? 'text-white/60' : 'text-gray-400')}>
                        {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>
                    </div>
                  </div>
                )
              })}
              <div ref={bottomRef} />
            </div>
            <form onSubmit={handleSend} className="flex gap-2 p-4 border-t border-gray-200">
              <Input placeholder={t('chat.typeMessage')} value={input} onChange={(e) => setInput(e.target.value)} className="flex-1" />
              <Button type="submit" disabled={sending || !input.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
