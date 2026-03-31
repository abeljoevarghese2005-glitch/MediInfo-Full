import { useState, useRef, useEffect } from 'react'
import Navbar from '../components/Navbar'
import { askAI } from '../api/index'

function AIChat() {
  const [messages, setMessages] = useState([
    {
      role: 'ai',
      text: "Hello! I'm MediInfo AI 🤖 Ask me anything about medicines — side effects, dosage, interactions, pregnancy safety, and more!",
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
    setMessages(prev => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const res = await askAI(input, medicineNames)
      const aiMessage = { role: 'ai', text: res.data.answer }
      setMessages(prev => [...prev, aiMessage])
    } catch (err) {
      const errorMsg = err.response?.data?.detail || 'Something went wrong. Please try again.'
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
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <Navbar />

      <div className="max-w-3xl mx-auto w-full flex flex-col flex-1 p-4 gap-4">

        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 bg-cyan-500 rounded-full flex items-center justify-center text-white text-lg">
            🤖
          </div>
          <div>
            <h1 className="font-bold text-gray-800 text-lg">MediInfo AI</h1>
            <p className="text-gray-500 text-sm">Powered by Gemini · Ask about any medicine</p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-3 flex items-center gap-2">
          <span className="text-gray-500 text-sm whitespace-nowrap">💊 Medicine(s):</span>
          <input
            type="text"
            value={medicineInput}
            onChange={e => setMedicineInput(e.target.value)}
            placeholder="e.g. Paracetamol, Ibuprofen (optional)"
            className="flex-1 text-sm outline-none text-gray-700 placeholder-gray-400"
          />
        </div>

        <div className="flex-1 bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-4 overflow-y-auto min-h-[400px] max-h-[500px]">
          {messages.map((msg, i) => (
            <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'ai' && (
                <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm mr-2 mt-1 flex-shrink-0">
                  🤖
                </div>
              )}
              <div
                className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-cyan-500 text-white rounded-tr-none'
                    : 'bg-gray-100 text-gray-800 rounded-tl-none'
                }`}
                dangerouslySetInnerHTML={{ __html: formatText(msg.text) }}
              />
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div className="w-8 h-8 bg-cyan-500 rounded-full flex items-center justify-center text-white text-sm mr-2 flex-shrink-0">
                🤖
              </div>
              <div className="bg-gray-100 px-4 py-3 rounded-2xl rounded-tl-none">
                <div className="flex gap-1 items-center h-5">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-3 flex items-end gap-3">
          <textarea
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask about side effects, dosage, interactions..."
            rows={2}
            className="flex-1 outline-none text-gray-700 placeholder-gray-400 resize-none text-sm pt-1"
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="bg-cyan-500 hover:bg-cyan-600 disabled:bg-gray-300 text-white px-4 py-2 rounded-xl font-medium text-sm transition-colors"
          >
            Send
          </button>
        </div>

        <p className="text-center text-xs text-gray-400">
          ⚠️ MediInfo AI is for informational purposes only. Always consult a doctor.
        </p>
      </div>
    </div>
  )
}

export default AIChat