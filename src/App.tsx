/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useRef, useEffect } from 'react';
import { Auth } from './components/Auth';
import { ErrorBoundary } from './components/ErrorBoundary';
import { logOut, db } from './firebase';
import { runSupervisor, AgentStep } from './agents/supervisor';
import { Content } from '@google/genai';
import Markdown from 'react-markdown';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Paperclip, Image as ImageIcon, Map, FileText, Search, Key, X, ChevronDown, ChevronRight, Menu } from 'lucide-react';
import { User } from 'firebase/auth';

type Message = {
  role: 'user' | 'model';
  text: string;
  steps?: AgentStep[];
  images?: string[]; // base64 data urls
};

type ChatSession = {
  id: string;
  title: string;
  updatedAt: number;
};

function MainChat({ user }: { user: User }) {
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('omni_chat_sessions');
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [sessionId, setSessionId] = useState(() => {
    const saved = localStorage.getItem('omni_chat_current_session');
    if (saved) return saved;
    const newId = Date.now().toString();
    localStorage.setItem('omni_chat_current_session', newId);
    return newId;
  });

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentSteps, setCurrentSteps] = useState<AgentStep[]>([]);
  const [artifacts, setArtifacts] = useState<any[]>([]);
  const [selectedImages, setSelectedImages] = useState<{ data: string, mimeType: string }[]>([]);
  const [expandedSteps, setExpandedSteps] = useState<Record<number, boolean>>({});
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedArtifact, setSelectedArtifact] = useState<any | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load messages when sessionId changes
  useEffect(() => {
    try {
      const saved = localStorage.getItem(`omni_chat_messages_${sessionId}`);
      setMessages(saved ? JSON.parse(saved) : []);
      localStorage.setItem('omni_chat_current_session', sessionId);
      setExpandedSteps({});
    } catch (e) {
      setMessages([]);
    }
  }, [sessionId]);

  // Save messages and update sessions list
  useEffect(() => {
    if (messages.length > 0) {
      try {
        localStorage.setItem(`omni_chat_messages_${sessionId}`, JSON.stringify(messages));
        
        setSessions(prev => {
          const existing = prev.find(s => s.id === sessionId);
          const firstUserMsg = messages.find(m => m.role === 'user')?.text || 'New Chat';
          const title = existing ? existing.title : (firstUserMsg.slice(0, 30) + (firstUserMsg.length > 30 ? '...' : ''));
          
          const updatedSession = { id: sessionId, title, updatedAt: Date.now() };
          const newSessions = prev.filter(s => s.id !== sessionId);
          const finalSessions = [updatedSession, ...newSessions].sort((a, b) => b.updatedAt - a.updatedAt);
          
          localStorage.setItem('omni_chat_sessions', JSON.stringify(finalSessions));
          return finalSessions;
        });
      } catch (e) {
        console.warn('Failed to save messages to localStorage:', e);
      }
    }
  }, [messages, sessionId]);

  const handleNewChat = () => {
    const newId = Date.now().toString();
    setSessionId(newId);
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, currentSteps]);

  // Listen for artifacts
  useEffect(() => {
    const q = query(
      collection(db, 'artifacts'), 
      where('userId', '==', user.uid),
      where('sessionId', '==', sessionId)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const arts = snapshot.docs.map(doc => doc.data());
      // Sort by createdAt client-side since we don't have a composite index
      arts.sort((a, b) => a.createdAt?.toMillis() - b.createdAt?.toMillis());
      setArtifacts(arts);
    }, (error) => {
      console.error("Artifacts listener error:", error);
    });
    return () => unsubscribe();
  }, [user.uid, sessionId]);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        // Extract base64 and mime type
        const match = result.match(/^data:(image\/[a-zA-Z+]+);base64,(.+)$/);
        if (match) {
          setSelectedImages(prev => [...prev, { mimeType: match[1], data: match[2] }]);
        }
      };
      reader.readAsDataURL(file);
    });
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if ((!input.trim() && selectedImages.length === 0) || isLoading) return;

    const userMessage = input.trim();
    const imagesToSend = [...selectedImages];
    const imagePreviewUrls = imagesToSend.map(img => `data:${img.mimeType};base64,${img.data}`);
    
    setInput('');
    setSelectedImages([]);
    setMessages(prev => [...prev, { role: 'user', text: userMessage, images: imagePreviewUrls }]);
    setIsLoading(true);
    setCurrentSteps([]);

    try {
      // Convert history
      const history: Content[] = messages.map(m => ({
        role: m.role,
        parts: [{ text: m.text }]
      }));

      const responseText = await runSupervisor(
        history, 
        userMessage, 
        imagesToSend, 
        user.uid, 
        sessionId,
        (step) => {
          setCurrentSteps(prev => [...prev, step]);
        }
      );

      setMessages(prev => {
        const newMsg: Message = { role: 'model', text: responseText, steps: [...currentSteps] };
        return [...prev, newMsg];
      });
    } catch (error) {
      console.error("Error running supervisor:", error);
      setMessages(prev => [...prev, { role: 'model', text: `**Error:** ${error instanceof Error ? error.message : String(error)}` }]);
    } finally {
      setIsLoading(false);
      setCurrentSteps([]);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    if (window.aistudio && window.aistudio.openSelectKey) {
      // @ts-ignore
      await window.aistudio.openSelectKey();
    } else {
      alert("API Key selection is not available in this environment.");
    }
  };

  const toggleSteps = (idx: number) => {
    setExpandedSteps(prev => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 border-r border-zinc-800 bg-zinc-900/50 flex flex-col">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <h1 className="font-semibold text-lg flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            Omni Agent
          </h1>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Settings</div>
          <button 
            onClick={handleSelectKey}
            className="w-full mb-4 flex items-center gap-2 px-3 py-2 bg-zinc-800 hover:bg-zinc-700 rounded-lg text-sm transition-colors text-left"
          >
            <Key className="w-4 h-4 text-amber-400" />
            <span>Set Gemini Pro Key</span>
          </button>
          <p className="text-xs text-zinc-500 mb-6">Required for generating high-quality images with Nano Banana Pro.</p>
          
          <div className="text-xs font-semibold text-zinc-500 uppercase tracking-wider mb-3">Recent Chats</div>
          <button 
            onClick={handleNewChat}
            className="w-full mb-4 flex items-center gap-2 px-3 py-2 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 rounded-lg text-sm transition-colors text-left"
          >
            <span className="text-lg leading-none">+</span>
            <span>New Chat</span>
          </button>
          
          <div className="space-y-1 overflow-y-auto max-h-[40vh] pr-1">
            {sessions.map(s => (
              <button
                key={s.id}
                onClick={() => setSessionId(s.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  s.id === sessionId 
                    ? 'bg-zinc-800 text-zinc-100' 
                    : 'text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-300'
                }`}
              >
                {s.title}
              </button>
            ))}
            {sessions.length === 0 && messages.length === 0 && (
              <div className="text-sm text-zinc-500 italic px-3 py-2">No recent chats</div>
            )}
          </div>
        </div>
        <div className="p-4 border-t border-zinc-800">
          <div className="flex items-center gap-3 mb-4">
            <img src={user.photoURL || ''} alt="User" className="w-8 h-8 rounded-full bg-zinc-800" referrerPolicy="no-referrer" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{user.displayName}</div>
              <div className="text-xs text-zinc-500 truncate">{user.email}</div>
            </div>
          </div>
          <button 
            onClick={logOut}
            className="w-full py-2 text-sm text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="flex-1 flex flex-col relative min-w-0">
        {/* Mobile/Tablet Top Bar */}
        <div className="xl:hidden p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
          <div className="font-semibold text-sm">Chat</div>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="flex items-center gap-2 text-sm text-zinc-400 hover:text-white bg-zinc-800 px-3 py-1.5 rounded-lg"
          >
            <FileText className="w-4 h-4" />
            Artifacts {artifacts.length > 0 && <span className="bg-emerald-500 text-black text-xs px-1.5 py-0.5 rounded-full">{artifacts.length}</span>}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto">
            {messages.length === 0 ? (
              <div className="text-center mt-20 mb-12">
                <h2 className="text-4xl font-semibold mb-4 text-transparent bg-clip-text bg-gradient-to-r from-zinc-200 to-zinc-500">
                  How can I help you today?
                </h2>
                <p className="text-zinc-400">I can search the web, generate images, analyze data, and more.</p>
              </div>
            ) : (
              <div className="space-y-6 pb-4">
                {messages.map((msg, idx) => (
                  <div key={idx} className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'model' && (
                      <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                        <span className="w-4 h-4 rounded-full bg-emerald-500"></span>
                      </div>
                    )}
                    <div className={`max-w-[85%] flex flex-col gap-2 ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                      
                      {/* User Images */}
                      {msg.images && msg.images.length > 0 && (
                        <div className="flex gap-2 flex-wrap justify-end mb-1">
                          {msg.images.map((img, i) => (
                            <img key={i} src={img} alt="Uploaded" className="h-32 rounded-lg object-cover border border-zinc-700" />
                          ))}
                        </div>
                      )}

                      {/* Model Steps Accordion */}
                      {msg.role === 'model' && msg.steps && msg.steps.length > 0 && (
                        <div className="w-full mb-2">
                          <button 
                            onClick={() => toggleSteps(idx)}
                            className="flex items-center gap-2 text-xs font-medium text-zinc-400 hover:text-zinc-300 transition-colors"
                          >
                            {expandedSteps[idx] ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                            Thinking Process ({msg.steps.length} steps)
                          </button>
                          {expandedSteps[idx] && (
                            <div className="mt-2 pl-4 border-l-2 border-zinc-800 space-y-2">
                              {msg.steps.map((step, sIdx) => (
                                <div key={sIdx} className="text-xs text-zinc-500 flex items-start gap-2">
                                  <span className="mt-0.5 text-zinc-600">•</span>
                                  <span className={step.type === 'error' ? 'text-red-400' : ''}>{step.message}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Message Bubble */}
                      <div className={`rounded-2xl px-5 py-3 ${
                        msg.role === 'user' 
                          ? 'bg-zinc-800 text-zinc-100' 
                          : 'bg-transparent text-zinc-200 prose prose-invert prose-zinc max-w-none'
                      }`}>
                        {msg.role === 'user' ? (
                          <div className="whitespace-pre-wrap">{msg.text}</div>
                        ) : (
                          <div className="markdown-body">
                            <Markdown>{msg.text}</Markdown>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
                
                {/* Loading State */}
                {isLoading && (
                  <div className="flex gap-4 justify-start">
                    <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 mt-1">
                      <span className="w-4 h-4 rounded-full bg-emerald-500 animate-pulse"></span>
                    </div>
                    <div className="flex flex-col gap-2 w-full max-w-[85%]">
                      <div className="pl-2 space-y-2">
                        {currentSteps.map((step, sIdx) => (
                          <div key={sIdx} className="text-xs text-zinc-400 flex items-start gap-2 animate-pulse">
                            <span className="mt-0.5 text-zinc-600">•</span>
                            <span>{step.message}</span>
                          </div>
                        ))}
                        {currentSteps.length === 0 && (
                          <div className="text-xs text-zinc-400 animate-pulse">Starting...</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>
        
        {/* Input Area */}
        <div className="p-4 bg-zinc-950/80 backdrop-blur-md border-t border-zinc-800/50">
          <div className="max-w-3xl mx-auto relative">
            
            {/* Selected Images Preview */}
            {selectedImages.length > 0 && (
              <div className="flex gap-2 mb-3 overflow-x-auto pb-2">
                {selectedImages.map((img, idx) => (
                  <div key={idx} className="relative shrink-0">
                    <img src={`data:${img.mimeType};base64,${img.data}`} alt="Preview" className="h-16 w-16 object-cover rounded-lg border border-zinc-700" />
                    <button 
                      onClick={() => removeImage(idx)}
                      className="absolute -top-2 -right-2 bg-zinc-800 text-white rounded-full p-1 hover:bg-red-500 transition-colors"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative flex items-end gap-2 bg-zinc-900 border border-zinc-800 rounded-2xl p-2 focus-within:border-zinc-700 focus-within:ring-1 focus-within:ring-zinc-700">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleImageUpload} 
                accept="image/*" 
                multiple 
                className="hidden" 
              />
              <button 
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors disabled:opacity-50"
                title="Attach images"
              >
                <Paperclip className="w-5 h-5" />
              </button>
              
              <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => handleKeyDown(e)}
                disabled={isLoading}
                className="flex-1 bg-transparent py-2 px-2 text-zinc-100 placeholder-zinc-500 focus:outline-none resize-none min-h-[44px] max-h-48 disabled:opacity-50"
                placeholder="Ask Omni Agent anything..."
                rows={1}
              />
              
              <button 
                onClick={() => handleSubmit()}
                disabled={(!input.trim() && selectedImages.length === 0) || isLoading}
                className="p-2 bg-white text-black rounded-xl hover:bg-zinc-200 transition-colors disabled:opacity-50 disabled:hover:bg-white"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
                </svg>
              </button>
            </div>
          </div>
          <div className="text-center mt-2">
            <span className="text-xs text-zinc-600">Omni Agent can make mistakes. Consider verifying important information.</span>
          </div>
        </div>
      </main>

      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 xl:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Artifacts Sidebar (Right) */}
      <aside className={`fixed inset-y-0 right-0 z-50 w-80 border-l border-zinc-800 bg-zinc-900 flex flex-col transition-transform duration-300 xl:relative xl:translate-x-0 ${isSidebarOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="p-4 border-b border-zinc-800 flex justify-between items-center">
          <h2 className="font-medium text-sm text-zinc-400">Artifacts & Data</h2>
          <button onClick={() => setIsSidebarOpen(false)} className="xl:hidden text-zinc-400 hover:text-white p-1">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
          {artifacts.length === 0 ? (
            <div className="text-center text-zinc-500 text-sm mt-10">
              <FileText className="w-8 h-8 mx-auto mb-3 opacity-50" />
              Generated images, reports, and maps will appear here.
            </div>
          ) : (
            artifacts.map((art, idx) => (
              <div 
                key={idx} 
                className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl overflow-hidden shadow-sm hover:border-zinc-600 transition-colors cursor-pointer group"
                onClick={() => setSelectedArtifact(art)}
              >
                <div className="px-3 py-2 border-b border-zinc-700/50 bg-zinc-800 flex items-center gap-2 group-hover:bg-zinc-700/80 transition-colors">
                  {art.type === 'image' && <ImageIcon className="w-4 h-4 text-blue-400 shrink-0" />}
                  {art.type === 'map' && <Map className="w-4 h-4 text-green-400 shrink-0" />}
                  {art.type === 'report' && <FileText className="w-4 h-4 text-purple-400 shrink-0" />}
                  {art.type === 'search_results' && <Search className="w-4 h-4 text-orange-400 shrink-0" />}
                  <span className="text-xs font-medium truncate flex-1">{art.title}</span>
                </div>
                <div className="p-3">
                  {art.type === 'image' ? (
                    <img src={art.data} alt={art.title} className="w-full h-32 object-cover rounded-lg" />
                  ) : art.type === 'map' ? (
                    <div className="text-sm text-blue-400 break-all line-clamp-2">
                      {art.data}
                    </div>
                  ) : (
                    <div className="text-xs text-zinc-300 line-clamp-4 prose prose-invert prose-sm">
                      <Markdown>{art.data}</Markdown>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Artifact Modal */}
      {selectedArtifact && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setSelectedArtifact(null)} />
          <div className="relative bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/80 backdrop-blur-md z-10">
              <div className="flex items-center gap-3">
                {selectedArtifact.type === 'image' && <ImageIcon className="w-5 h-5 text-blue-400" />}
                {selectedArtifact.type === 'map' && <Map className="w-5 h-5 text-green-400" />}
                {selectedArtifact.type === 'report' && <FileText className="w-5 h-5 text-purple-400" />}
                {selectedArtifact.type === 'search_results' && <Search className="w-5 h-5 text-orange-400" />}
                <h2 className="font-semibold text-lg">{selectedArtifact.title}</h2>
              </div>
              <button 
                onClick={() => setSelectedArtifact(null)}
                className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {selectedArtifact.type === 'image' ? (
                <img src={selectedArtifact.data} alt={selectedArtifact.title} className="max-w-full h-auto mx-auto rounded-lg" />
              ) : selectedArtifact.type === 'map' ? (
                <div className="text-center pt-8">
                  <Map className="w-16 h-16 text-green-400 mx-auto mb-4" />
                  <a 
                    href={selectedArtifact.data} 
                    target="_blank" 
                    rel="noreferrer" 
                    className="inline-block px-6 py-3 bg-green-500 text-black font-medium rounded-xl hover:bg-green-400 transition-colors"
                  >
                    Open in Google Maps
                  </a>
                  <p className="mt-4 text-sm text-zinc-500 break-all max-w-xl mx-auto">{selectedArtifact.data}</p>
                </div>
              ) : (
                <div className="prose prose-invert prose-zinc max-w-none">
                  <Markdown>{selectedArtifact.data}</Markdown>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <Auth>
        {(user) => <MainChat user={user} />}
      </Auth>
    </ErrorBoundary>
  );
}
