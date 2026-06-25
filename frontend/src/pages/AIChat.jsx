import { useState, useRef, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import TopBar from '../components/TopBar'
import Sidebar from '../components/Sidebar'
import { SidebarProvider } from '../components/SidebarContext'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

function AIChat() {
  const { t } = useTranslation()
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: t('aiChat.greeting'),
    }
  ])
  const [input, setInput] = useState('')
  const [medicineInput, setMedicineInput] = useState('')
  const [loading, setLoading] = useState(false)

  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const handleSend = async () => {
    if (!input.trim()) return

    const medicineNames = medicineInput
      .split(',')
      .map(m => m.trim())
      .filter(m => m.length > 0)

    const userMessage = { role: 'user', text: input }
    const updatedMessages = [...messages, userMessage]
    setMessages(updatedMessages)
    setInput('')
    setLoading(true)

    try {
      const conversationHistory = updatedMessages.map(msg => ({
        role: msg.role === 'ai' ? 'assistant' : 'user',
        content: msg.text,
      }))

      const res = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          query: input,
          medicines: medicineNames,
          conversation_history: conversationHistory,
        }),
      })

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}))
        throw new Error(errData.error || `Server error: ${res.status}`)
      }

      const data = await res.json()
      const aiMessage = { role: 'ai', text: data.answer }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      const errorMsg = err.message || t('aiChat.errorFallback')
      setMessages(prev => [...prev, { role: 'ai', text: `❌ ${errorMsg}` }])
    } finally {
      setLoading(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const formatText = (text) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br/>')
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-green-50 flex overflow-x-hidden">
        <Sidebar />
        <div className="lg:ml-56 flex-1 flex flex-col min-w-0">
          <TopBar />

          {/* ── Gradient Hero Banner ── */}
          <div className="bg-gradient-to-br from-teal-500 via-cyan-500 to-emerald-400 px-4 sm:px-8 pt-8 pb-10 rounded-b-3xl mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center text-white text-lg shrink-0">
                🤖
              </div>
              <div className="min-w-0">
                <h1 className="font-semibold tracking-tight text-white text-2xl">{t('aiChat.header.title')}</h1>
                <p className="text-cyan-100 text-sm">{t('aiChat.header.subtitle')}</p>
              </div>
            </div>
          </div>

          <div className="flex-1 flex flex-col px-4 sm:px-8 pb-4 gap-4 max-w-3xl w-full mx-auto">

            {/* ── Medicine input ── */}
            <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2 transition-colors hover:shadow-md">
              <span className="text-gray-500 text-sm whitespace-nowrap font-medium">💊 {t('aiChat.medicineInput.label')}</span>
              <input
                type="text"
                value={medicineInput}
                onChange={e => setMedicineInput(e.target.value)}
                placeholder={t('aiChat.medicineInput.placeholder')}
                className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400 min-w-0"
              />
            </div>

            {/* ── Chat window ── */}
            <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4 overflow-y-auto min-h-[400px] max-h-[500px]">
              {messages.map((msg, i) => (
                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  {msg.role === 'ai' && (
                    <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm mr-2 mt-1 flex-shrink-0">
                      🤖
                    </div>
                  )}
                  <div
                    className={`max-w-[75vw] sm:max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed break-words overflow-hidden ${
                      msg.role === 'user'
                        ? 'bg-emerald-700 text-white rounded-tr-none'
                        : 'bg-gray-100 text-gray-800 rounded-tl-none'
                    }`}
                    dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
                  />
                </div>
              ))}

              {loading && (
                <div className="flex justify-start">
                  <div className="w-8 h-8 bg-emerald-600 rounded-full flex items-center justify-center text-white text-sm mr-2 flex-shrink-0">
                    🤖
                  </div>
                  <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none">
                    <div className="flex gap-1 items-center h-5">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* ── Input bar ── */}
            <div className="bg-white rounded-2xl shadow-sm p-3 flex items-end gap-3 transition-colors hover:shadow-md">
              <textarea
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t('aiChat.inputPlaceholder')}
                rows={2}
                className="flex-1 outline-none text-gray-700 placeholder-gray-400 resize-none text-sm pt-1 min-w-0"
              />
              <button
                onClick={handleSend}
                disabled={loading || !input.trim()}
                className="bg-emerald-700 hover:bg-emerald-500 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-bold tracking-tight text-sm transition-colors shrink-0"
              >
                {t('aiChat.send')}
              </button>
            </div>

            <p className="text-center text-xs text-gray-400">
              ⚠️ {t('aiChat.disclaimer')}
            </p>

          </div>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default AIChat