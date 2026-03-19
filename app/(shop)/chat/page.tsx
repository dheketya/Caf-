'use client'

import { useState, useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Send, ImageIcon } from 'lucide-react'
import { useI18n } from '@/lib/i18n'

interface Message {
  id: string
  content: string
  imageUrl: string | null
  sender: { name: string; role: string }
  senderId: string
  createdAt: string
}

export default function ChatPage() {
  const { t, bilingual, lang } = useI18n()
  const { data: session } = useSession()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [sending, setSending] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    loadMessages()
    const interval = setInterval(loadMessages, 5000) // Poll every 5s
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  async function loadMessages() {
    const data = await fetch('/api/chat').then((r) => r.json())
    if (Array.isArray(data)) setMessages(data)
  }

  async function handleSend(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setSending(true)

    await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: input }),
    })

    setInput('')
    await loadMessages()
    setSending(false)
  }

  const [titleMain, titleSub] = bilingual('chat.title')

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)]">
      <div className="mb-4">
        <h1 className={cn('text-2xl font-bold text-gray-900', lang === 'km' && 'font-khmer')}>{titleMain}
          <span className={cn('block text-sm opacity-60', lang === 'km' ? '' : 'font-khmer')}>{titleSub}</span>
        </h1>
        <p className="text-sm text-gray-500">{t('chat.contactSupport')}</p>
      </div>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl border border-gray-200 p-4 space-y-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-400 py-8">
            {t('chat.startConversation')}
          </p>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === session?.user?.id
            return (
              <div key={msg.id} className={cn('flex', isMe ? 'justify-end' : 'justify-start')}>
                <div className={cn('max-w-[70%] rounded-2xl px-4 py-2.5', isMe ? 'bg-brand-600 text-white' : 'bg-gray-100 text-gray-900')}>
                  {!isMe && (
                    <p className="text-xs font-medium mb-1 opacity-70">{msg.sender.name}</p>
                  )}
                  <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                  {msg.imageUrl && (
                    <img src={msg.imageUrl} alt="" className="mt-2 rounded-lg max-w-full" />
                  )}
                  <p className={cn('text-xs mt-1', isMe ? 'text-white/60' : 'text-gray-400')}>
                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            )
          })
        )}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex gap-2 mt-4">
        <Input
          placeholder={t('chat.typeMessage')}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="flex-1"
        />
        <Button type="submit" disabled={sending || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  )
}
