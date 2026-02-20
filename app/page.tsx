'use client'

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { callAIAgent } from '@/lib/aiAgent'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import { HiPlus, HiBars3, HiPaperAirplane, HiChatBubbleLeftRight, HiArrowPath, HiXMark } from 'react-icons/hi2'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------
const AGENT_ID = '69980ceb5c2b0725089691c2'
const AGENT_NAME = 'Chat Agent'

const SUGGESTED_STARTERS = [
  'What can you help me with?',
  'Tell me something interesting',
  'Help me brainstorm ideas',
]

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  error?: boolean
}

interface Conversation {
  id: string
  title: string
  messages: Message[]
  createdAt: number
  sessionId: string
}

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------
function buildSampleConversations(): Conversation[] {
  const now = Date.now()
  return [
    {
      id: 'sample-1',
      title: 'What can you help me with?',
      sessionId: 'sample-session-1',
      createdAt: now - 3600000,
      messages: [
        { id: 's1-m1', role: 'user', content: 'What can you help me with?', timestamp: now - 3600000 },
        {
          id: 's1-m2',
          role: 'assistant',
          content:
            "I can assist you with a wide range of tasks. Here are some things I can help with:\n\n- **Research and Analysis** -- Summarize articles, compare options, and break down complex topics.\n- **Writing and Editing** -- Draft emails, blog posts, or documents, and refine your writing.\n- **Brainstorming** -- Generate ideas for projects, campaigns, or creative endeavors.\n- **Problem Solving** -- Work through technical questions, troubleshooting, or strategic decisions.\n- **Learning** -- Explain concepts, provide step-by-step instructions, or quiz you on topics.\n\nFeel free to ask me anything and I will do my best to help.",
          timestamp: now - 3599000,
        },
      ],
    },
    {
      id: 'sample-2',
      title: 'Help me brainstorm ideas',
      sessionId: 'sample-session-2',
      createdAt: now - 7200000,
      messages: [
        { id: 's2-m1', role: 'user', content: 'Help me brainstorm ideas for a new mobile app.', timestamp: now - 7200000 },
        {
          id: 's2-m2',
          role: 'assistant',
          content:
            "Here are some mobile app ideas you could explore:\n\n1. **Habit Tracker with Social Accountability** -- Users commit to daily habits and share progress with a small group of friends.\n2. **Local Events Discovery** -- Aggregate neighborhood events, pop-ups, and community happenings in one feed.\n3. **Skill Swap Marketplace** -- People offer skills they have (e.g., guitar lessons) in exchange for skills they want (e.g., cooking classes).\n4. **Mindful Micro-Breaks** -- Sends short guided breathing or stretching exercises throughout the workday.\n5. **Grocery Receipt Scanner** -- Photograph receipts to automatically track spending, flag price changes, and suggest budgets.\n\nWould you like me to dive deeper into any of these?",
          timestamp: now - 7199000,
        },
        { id: 's2-m3', role: 'user', content: 'Tell me more about the Skill Swap Marketplace idea.', timestamp: now - 7100000 },
        {
          id: 's2-m4',
          role: 'assistant',
          content:
            "### Skill Swap Marketplace -- Deep Dive\n\n**Core Concept:** A peer-to-peer platform where users trade skills instead of money. Each user creates a profile listing what they can teach and what they want to learn.\n\n**Key Features:**\n- **Skill Profiles** -- Each user lists skills offered and skills wanted with proficiency levels.\n- **Matching Algorithm** -- Automatically pairs users with complementary skill sets.\n- **In-App Scheduling** -- Book sessions directly, with calendar integration.\n- **Ratings and Reviews** -- Build trust through verified reviews after each session.\n- **Credit System** -- Earn credits by teaching; spend credits to learn. Keeps exchanges balanced even without a direct swap.\n\n**Monetization:**\n- Premium tier for priority matching and unlimited sessions.\n- Featured skill listings for professionals.\n- Small transaction fee on credit purchases.\n\nThis model works well in urban areas with diverse skill populations. Would you like to explore the technical architecture or go-to-market strategy?",
          timestamp: now - 7099000,
        },
      ],
    },
    {
      id: 'sample-3',
      title: 'Tell me something interesting',
      sessionId: 'sample-session-3',
      createdAt: now - 86400000,
      messages: [
        { id: 's3-m1', role: 'user', content: 'Tell me something interesting', timestamp: now - 86400000 },
        {
          id: 's3-m2',
          role: 'assistant',
          content:
            "Here is a fascinating fact: **Octopuses have three hearts and blue blood.**\n\nTwo of their hearts pump blood to the gills, while the third pumps it to the rest of the body. Their blood is blue because it uses copper-based hemocyanin instead of iron-based hemoglobin to transport oxygen, which is more efficient in cold, low-oxygen environments like the deep ocean.\n\nEven more remarkable, when an octopus swims, the heart that delivers blood to the body actually stops beating -- which is why they prefer crawling to swimming, as it is less exhausting.\n\nWould you like to learn more about marine biology, or shall we explore a different topic?",
          timestamp: now - 86399000,
        },
      ],
    },
  ]
}

// ---------------------------------------------------------------------------
// Markdown Renderer
// ---------------------------------------------------------------------------
function formatInline(text: string): React.ReactNode {
  const boldParts = text.split(/\*\*(.*?)\*\*/g)
  if (boldParts.length === 1) {
    const codeParts = text.split(/`([^`]+)`/g)
    if (codeParts.length === 1) return text
    return (
      <>
        {codeParts.map((part, i) =>
          i % 2 === 1 ? (
            <code key={i} className="px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
              {part}
            </code>
          ) : (
            <React.Fragment key={i}>{part}</React.Fragment>
          )
        )}
      </>
    )
  }
  return (
    <>
      {boldParts.map((part, i) =>
        i % 2 === 1 ? (
          <strong key={i} className="font-semibold">
            {part}
          </strong>
        ) : (
          <React.Fragment key={i}>{formatInline(part)}</React.Fragment>
        )
      )}
    </>
  )
}

function renderMarkdown(text: string) {
  if (!text) return null
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let codeBlock = false
  let codeLines: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]

    if (line.startsWith('```')) {
      if (codeBlock) {
        elements.push(
          <pre key={`code-${i}`} className="bg-muted/60 rounded-lg p-3 overflow-x-auto text-xs font-mono my-2">
            <code>{codeLines.join('\n')}</code>
          </pre>
        )
        codeLines = []
        codeBlock = false
      } else {
        codeBlock = true
      }
      continue
    }

    if (codeBlock) {
      codeLines.push(line)
      continue
    }

    if (line.startsWith('### '))
      elements.push(
        <h4 key={i} className="font-semibold text-sm mt-3 mb-1">
          {formatInline(line.slice(4))}
        </h4>
      )
    else if (line.startsWith('## '))
      elements.push(
        <h3 key={i} className="font-semibold text-base mt-3 mb-1">
          {formatInline(line.slice(3))}
        </h3>
      )
    else if (line.startsWith('# '))
      elements.push(
        <h2 key={i} className="font-bold text-lg mt-4 mb-2">
          {formatInline(line.slice(2))}
        </h2>
      )
    else if (line.startsWith('- ') || line.startsWith('* '))
      elements.push(
        <li key={i} className="ml-4 list-disc text-sm leading-relaxed">
          {formatInline(line.slice(2))}
        </li>
      )
    else if (/^\d+\.\s/.test(line))
      elements.push(
        <li key={i} className="ml-4 list-decimal text-sm leading-relaxed">
          {formatInline(line.replace(/^\d+\.\s/, ''))}
        </li>
      )
    else if (!line.trim()) elements.push(<div key={i} className="h-1.5" />)
    else
      elements.push(
        <p key={i} className="text-sm leading-relaxed">
          {formatInline(line)}
        </p>
      )
  }

  return <div className="space-y-1">{elements}</div>
}

// ---------------------------------------------------------------------------
// Utility: generate unique IDs
// ---------------------------------------------------------------------------
function generateId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return Math.random().toString(36).substring(2) + Date.now().toString(36)
}

// ---------------------------------------------------------------------------
// Typing indicator
// ---------------------------------------------------------------------------
function TypingIndicator() {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/80 backdrop-blur-[16px] border border-border/30 flex items-center justify-center shadow-sm">
        <HiChatBubbleLeftRight className="w-4 h-4 text-muted-foreground" />
      </div>
      <div className="bg-secondary/80 backdrop-blur-[16px] border border-border/30 rounded-2xl rounded-tl-sm px-4 py-3 shadow-sm">
        <div className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Timestamp formatter
// ---------------------------------------------------------------------------
function formatTime(ts: number): string {
  const d = new Date(ts)
  const now = new Date()
  const diffMs = now.getTime() - d.getTime()
  const diffDays = Math.floor(diffMs / 86400000)

  if (diffDays === 0) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diffDays === 1) return 'Yesterday'
  if (diffDays < 7) return d.toLocaleDateString([], { weekday: 'short' })
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}

// ---------------------------------------------------------------------------
// ErrorBoundary
// ---------------------------------------------------------------------------
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: string }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props)
    this.state = { hasError: false, error: '' }
  }
  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error: error.message }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
          <div className="text-center p-8 max-w-md">
            <h2 className="text-xl font-semibold mb-2">Something went wrong</h2>
            <p className="text-muted-foreground mb-4 text-sm">{this.state.error}</p>
            <button
              onClick={() => this.setState({ hasError: false, error: '' })}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md text-sm"
            >
              Try again
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------
export default function Page() {
  // --- State ---
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [sampleData, setSampleData] = useState(false)
  const [activeAgentId, setActiveAgentId] = useState<string | null>(null)
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // --- Derived ---
  const activeConversation = conversations.find((c) => c.id === activeConversationId) ?? null
  const messages = activeConversation?.messages ?? []

  // --- Sample data toggle ---
  useEffect(() => {
    if (sampleData) {
      const samples = buildSampleConversations()
      setConversations(samples)
      setActiveConversationId(samples[0].id)
    } else {
      setConversations([])
      setActiveConversationId(null)
    }
  }, [sampleData])

  // --- Auto-scroll ---
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, isLoading])

  // --- Auto-resize textarea ---
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto'
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 160) + 'px'
    }
  }, [inputValue])

  // --- Create new conversation ---
  const createNewConversation = useCallback(() => {
    const newConv: Conversation = {
      id: generateId(),
      title: 'New conversation',
      messages: [],
      createdAt: Date.now(),
      sessionId: generateId(),
    }
    setConversations((prev) => [newConv, ...prev])
    setActiveConversationId(newConv.id)
    setInputValue('')
    setMobileSidebarOpen(false)
  }, [])

  // --- Send message ---
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim() || isLoading) return

      let currentConvId = activeConversationId
      let currentSessionId = ''

      // If no active conversation, create one
      if (!currentConvId) {
        const newSessionId = generateId()
        const newConv: Conversation = {
          id: generateId(),
          title: content.trim().slice(0, 30) + (content.trim().length > 30 ? '...' : ''),
          messages: [],
          createdAt: Date.now(),
          sessionId: newSessionId,
        }
        setConversations((prev) => [newConv, ...prev])
        setActiveConversationId(newConv.id)
        currentConvId = newConv.id
        currentSessionId = newSessionId
      } else {
        const conv = conversations.find((c) => c.id === currentConvId)
        currentSessionId = conv?.sessionId ?? currentConvId
      }

      const userMsg: Message = {
        id: generateId(),
        role: 'user',
        content: content.trim(),
        timestamp: Date.now(),
      }

      // Add user message and update title if first message
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== currentConvId) return c
          const isFirst = c.messages.length === 0
          return {
            ...c,
            title: isFirst ? content.trim().slice(0, 30) + (content.trim().length > 30 ? '...' : '') : c.title,
            messages: [...c.messages, userMsg],
          }
        })
      )

      setInputValue('')
      setIsLoading(true)
      setActiveAgentId(AGENT_ID)

      try {
        const result = await callAIAgent(content.trim(), AGENT_ID, {
          session_id: currentSessionId,
        })

        let responseText = ''
        if (result.success) {
          responseText =
            result.response?.result?.response_text ||
            result.response?.message ||
            result.response?.result?.text ||
            result.response?.result?.message ||
            (typeof result.response?.result === 'string' ? result.response.result : '') ||
            'No response received'
        } else {
          responseText = result.error || result.response?.message || 'An error occurred. Please try again.'
        }

        const assistantMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: responseText,
          timestamp: Date.now(),
          error: !result.success,
        }

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, messages: [...c.messages, assistantMsg] } : c
          )
        )
      } catch {
        const errorMsg: Message = {
          id: generateId(),
          role: 'assistant',
          content: 'Failed to get a response. Please check your connection and try again.',
          timestamp: Date.now(),
          error: true,
        }
        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentConvId ? { ...c, messages: [...c.messages, errorMsg] } : c
          )
        )
      } finally {
        setIsLoading(false)
        setActiveAgentId(null)
      }
    },
    [activeConversationId, conversations, isLoading]
  )

  // --- Retry failed message ---
  const retryMessage = useCallback(
    (failedMsgId: string) => {
      if (!activeConversation) return
      const failedIdx = activeConversation.messages.findIndex((m) => m.id === failedMsgId)
      if (failedIdx < 0) return

      // Find the user message before this failed assistant message
      let userContent = ''
      for (let i = failedIdx - 1; i >= 0; i--) {
        if (activeConversation.messages[i].role === 'user') {
          userContent = activeConversation.messages[i].content
          break
        }
      }

      // Remove the failed message
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeConversationId
            ? { ...c, messages: c.messages.filter((m) => m.id !== failedMsgId) }
            : c
        )
      )

      if (userContent) {
        setTimeout(() => sendMessage(userContent), 50)
      }
    },
    [activeConversation, activeConversationId, sendMessage]
  )

  // --- Delete conversation ---
  const deleteConversation = useCallback(
    (convId: string, e: React.MouseEvent) => {
      e.stopPropagation()
      setConversations((prev) => prev.filter((c) => c.id !== convId))
      if (activeConversationId === convId) {
        setActiveConversationId(null)
      }
    },
    [activeConversationId]
  )

  // --- Keyboard handler ---
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault()
        sendMessage(inputValue)
      }
    },
    [inputValue, sendMessage]
  )

  return (
    <ErrorBoundary>
      <div className="min-h-screen h-screen flex bg-background text-foreground overflow-hidden" style={{ background: 'linear-gradient(135deg, hsl(0 0% 99%) 0%, hsl(210 10% 98%) 35%, hsl(0 0% 98%) 70%, hsl(220 8% 99%) 100%)' }}>
        {/* ---------------------------------------------------------------- */}
        {/* Mobile sidebar overlay */}
        {/* ---------------------------------------------------------------- */}
        {mobileSidebarOpen && (
          <div
            className="fixed inset-0 bg-black/20 backdrop-blur-sm z-40 md:hidden"
            onClick={() => setMobileSidebarOpen(false)}
          />
        )}

        {/* ---------------------------------------------------------------- */}
        {/* Sidebar */}
        {/* ---------------------------------------------------------------- */}
        <aside
          className={cn(
            'flex flex-col h-full border-r border-sidebar-border transition-all duration-300 ease-in-out z-50',
            'fixed md:relative',
            'bg-sidebar-background',
            mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
            sidebarOpen ? 'w-[280px] min-w-[280px]' : 'w-0 min-w-0 md:w-0 md:min-w-0 md:border-r-0 md:overflow-hidden'
          )}
        >
          {/* Sidebar header */}
          <div className="flex items-center justify-between p-4 flex-shrink-0">
            <h2 className="text-sm font-semibold tracking-tight text-sidebar-foreground">Conversations</h2>
            <button
              onClick={() => {
                setMobileSidebarOpen(false)
                setSidebarOpen(false)
              }}
              className="md:hidden p-1.5 rounded-lg hover:bg-sidebar-accent transition-colors"
              aria-label="Close sidebar"
            >
              <HiXMark className="w-4 h-4 text-sidebar-foreground" />
            </button>
          </div>

          {/* New Chat button */}
          <div className="px-3 pb-3 flex-shrink-0">
            <Button
              onClick={createNewConversation}
              className="w-full justify-start gap-2 rounded-[0.875rem] font-medium text-sm"
              variant="outline"
            >
              <HiPlus className="w-4 h-4" />
              New Chat
            </Button>
          </div>

          <Separator className="bg-sidebar-border" />

          {/* Conversation list */}
          <ScrollArea className="flex-1 px-2 py-2">
            {conversations.length === 0 ? (
              <div className="px-3 py-10 text-center">
                <p className="text-xs text-muted-foreground leading-relaxed">No conversations yet.</p>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">Start a new chat to begin.</p>
              </div>
            ) : (
              <div className="space-y-0.5">
                {conversations.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveConversationId(conv.id)
                      setMobileSidebarOpen(false)
                    }}
                    className={cn(
                      'w-full text-left px-3 py-2.5 rounded-[0.875rem] group transition-all duration-200 relative',
                      activeConversationId === conv.id
                        ? 'bg-sidebar-accent text-sidebar-accent-foreground'
                        : 'hover:bg-sidebar-accent/50 text-sidebar-foreground'
                    )}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-medium truncate block flex-1 tracking-tight">{conv.title}</span>
                      <button
                        onClick={(e) => deleteConversation(conv.id, e)}
                        className="opacity-0 group-hover:opacity-100 transition-opacity p-0.5 rounded hover:bg-muted flex-shrink-0"
                        aria-label="Delete conversation"
                      >
                        <HiXMark className="w-3.5 h-3.5 text-muted-foreground" />
                      </button>
                    </div>
                    <span className="text-[11px] text-muted-foreground mt-0.5 block">
                      {formatTime(conv.createdAt)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Agent status footer */}
          <div className="p-3 border-t border-sidebar-border flex-shrink-0">
            <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-[0.875rem] bg-sidebar-accent/50">
              <div className={cn('w-2 h-2 rounded-full flex-shrink-0 transition-colors', activeAgentId ? 'bg-green-500 animate-pulse' : 'bg-muted-foreground/30')} />
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-sidebar-foreground truncate tracking-tight">{AGENT_NAME}</p>
                <p className="text-[10px] text-muted-foreground truncate">{activeAgentId ? 'Processing...' : 'Ready'}</p>
              </div>
            </div>
          </div>
        </aside>

        {/* ---------------------------------------------------------------- */}
        {/* Main chat area */}
        {/* ---------------------------------------------------------------- */}
        <main className="flex-1 flex flex-col h-full min-w-0">
          {/* Header */}
          <header className="flex items-center justify-between px-4 md:px-6 h-14 border-b border-border bg-background/75 backdrop-blur-[16px] flex-shrink-0">
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (typeof window !== 'undefined' && window.innerWidth < 768) {
                    setMobileSidebarOpen(!mobileSidebarOpen)
                  } else {
                    setSidebarOpen(!sidebarOpen)
                  }
                }}
                className="p-2 rounded-[0.875rem] hover:bg-accent transition-colors"
                aria-label="Toggle sidebar"
              >
                <HiBars3 className="w-5 h-5 text-foreground" />
              </button>
              <h1 className="text-base font-semibold tracking-tight text-foreground">Chat</h1>
            </div>

            <div className="flex items-center gap-2.5">
              <label htmlFor="sample-toggle" className="text-xs text-muted-foreground font-medium select-none cursor-pointer hidden sm:inline">
                Sample Data
              </label>
              <Switch
                id="sample-toggle"
                checked={sampleData}
                onCheckedChange={setSampleData}
              />
            </div>
          </header>

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto w-full py-6 px-4 md:px-6">
              {messages.length === 0 && !isLoading ? (
                /* ---- Empty state ---- */
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
                  <div className="w-16 h-16 rounded-2xl bg-secondary/80 backdrop-blur-[16px] border border-border/40 flex items-center justify-center mb-6 shadow-md">
                    <HiChatBubbleLeftRight className="w-8 h-8 text-muted-foreground" />
                  </div>
                  <h2 className="text-xl font-semibold tracking-tight mb-2 text-foreground">How can I help you?</h2>
                  <p className="text-sm text-muted-foreground max-w-sm leading-relaxed mb-8">
                    Start a conversation below or choose one of the suggestions to get started.
                  </p>
                  <div className="flex flex-wrap justify-center gap-2.5">
                    {SUGGESTED_STARTERS.map((starter) => (
                      <button
                        key={starter}
                        onClick={() => sendMessage(starter)}
                        disabled={isLoading}
                        className="px-4 py-2.5 text-sm font-medium rounded-[0.875rem] bg-secondary/80 backdrop-blur-[16px] border border-border/40 text-foreground hover:bg-accent transition-all duration-200 shadow-sm hover:shadow-md"
                      >
                        {starter}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                /* ---- Message stream ---- */
                <div className="space-y-5">
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={cn(
                        'flex items-start gap-3',
                        msg.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      {/* Assistant avatar */}
                      {msg.role === 'assistant' && (
                        <div className="flex-shrink-0 w-8 h-8 rounded-full bg-secondary/80 backdrop-blur-[16px] border border-border/30 flex items-center justify-center shadow-sm mt-0.5">
                          <HiChatBubbleLeftRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}

                      {/* Message bubble */}
                      <div
                        className={cn(
                          'max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-3 shadow-sm',
                          msg.role === 'user'
                            ? 'bg-primary text-primary-foreground rounded-tr-sm'
                            : msg.error
                            ? 'bg-destructive/10 border border-destructive/20 text-foreground rounded-tl-sm'
                            : 'bg-secondary/80 backdrop-blur-[16px] border border-border/30 text-foreground rounded-tl-sm'
                        )}
                      >
                        {msg.role === 'user' ? (
                          <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                        ) : (
                          <div>
                            {renderMarkdown(msg.content)}
                            {msg.error && (
                              <button
                                onClick={() => retryMessage(msg.id)}
                                className="flex items-center gap-1.5 mt-3 text-xs font-medium text-destructive hover:text-destructive/80 transition-colors"
                              >
                                <HiArrowPath className="w-3.5 h-3.5" />
                                Retry
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {/* Typing indicator */}
                  {isLoading && <TypingIndicator />}

                  {/* Scroll anchor */}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* ---- Input bar ---- */}
          <div className="flex-shrink-0 border-t border-border bg-background/75 backdrop-blur-[16px] px-4 md:px-6 py-3">
            <div className="max-w-3xl mx-auto w-full">
              <div className="flex items-end gap-2 bg-secondary/60 backdrop-blur-[16px] border border-border/40 rounded-2xl px-4 py-2.5 shadow-sm transition-shadow focus-within:shadow-md focus-within:border-border">
                <textarea
                  ref={textareaRef}
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a message..."
                  disabled={isLoading}
                  rows={1}
                  className="flex-1 bg-transparent border-0 outline-none resize-none text-sm leading-relaxed text-foreground placeholder:text-muted-foreground disabled:opacity-50 py-1 max-h-[160px]"
                />
                <Button
                  size="sm"
                  onClick={() => sendMessage(inputValue)}
                  disabled={!inputValue.trim() || isLoading}
                  className="rounded-xl h-9 w-9 p-0 flex-shrink-0"
                >
                  <HiPaperAirplane className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-[10px] text-muted-foreground text-center mt-2 tracking-tight">
                Press Enter to send, Shift+Enter for a new line
              </p>
            </div>
          </div>
        </main>
      </div>
    </ErrorBoundary>
  )
}
