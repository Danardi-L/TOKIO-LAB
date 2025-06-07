import { useState, useRef, useEffect } from 'react';
import { Bot, Plus, Send, Settings, FileText, X, LoaderCircle, Trash2, Menu, FolderUp } from 'lucide-react';

// =================================================================================
// 1. UTILITY HOOKS
// =================================================================================
const useLocalStorage = (key, initialValue) => {
  const [storedValue, setStoredValue] = useState(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      console.log(error); return initialValue;
    }
  });

  const setValue = (value) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) { console.log(error); }
  };
  return [storedValue, setValue];
};

// =================================================================================
// 2. CHILD COMPONENTS (Tidak ada perubahan di sini)
// =================================================================================

// --- Sidebar Component ---
const Sidebar = ({ isCollapsed, onToggle, onNewChat, chats, activeChatId, onSelectChat, onDeleteChat, onOpenSettings }) => {
  return (
    <aside className={`bg-gray-800 flex flex-col transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-1/4 max-w-xs'}`}>
      <div className="flex-shrink-0 p-2 flex items-center justify-between border-b border-gray-700/50">
        {!isCollapsed && <span className="text-lg font-semibold px-2">Chats</span>}
        <button onClick={onToggle} className="p-2 rounded-md hover:bg-gray-700"><Menu size={20}/></button>
      </div>
      <div className="p-2 flex-shrink-0">
        <button onClick={onNewChat} className={`flex items-center gap-3 w-full p-3 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors ${isCollapsed ? 'justify-center' : ''}`}>
          <Plus size={18} /> {!isCollapsed && "New Chat"}
        </button>
      </div>
      {!isCollapsed && <h2 className="flex-shrink-0 text-xs font-semibold text-gray-400 mt-2 uppercase px-4">Recent</h2>}
      <div className="flex-grow overflow-y-auto px-2">
        {chats.map((chat) => (
          <div key={chat.id} onClick={() => onSelectChat(chat.id)} className={`flex items-center justify-between p-3 my-1 text-sm rounded-lg cursor-pointer group whitespace-nowrap ${activeChatId === chat.id ? 'bg-gray-700' : 'hover:bg-gray-700/50'}`}>
            {!isCollapsed ? <span className="truncate">{chat.title}</span> : <FileText size={18} className="mx-auto" />}
            {!isCollapsed && <button onClick={(e) => onDeleteChat(e, chat.id)} className="text-gray-500 hover:text-white opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={16} /></button>}
          </div>
        ))}
      </div>
      <div className="flex-shrink-0 border-t border-gray-700/50 p-2">
         <button onClick={onOpenSettings} className={`flex items-center gap-3 w-full p-3 rounded-lg hover:bg-gray-700 ${isCollapsed ? 'justify-center' : ''}`}>
           <Settings size={20} /> {!isCollapsed && <span>Settings</span>}
         </button>
      </div>
    </aside>
  );
};

// --- Settings Modal Component ---
const SettingsModal = ({ isOpen, onClose, settings, setSettings }) => {
  if (!isOpen) return null;
  const handleSliderChange = (key, value) => setSettings(prev => ({ ...prev, [key]: parseFloat(value) }));
  const handleTextChange = (key, value) => setSettings(prev => ({...prev, [key]: value}));
  const handleModelFileSelect = async () => {
    if (window.electronAPI) {
      const filePath = await window.electronAPI.openFileDialog();
      if (filePath) {
        const fileName = filePath.split(/[\\/]/).pop();
        setSettings(prev => ({...prev, selectedModel: fileName, modelPath: filePath }));
      }
    } else {
      console.log("File dialog only available in Electron app. Using fallback.");
      document.getElementById('model-file-input-fallback')?.click();
    }
  };
  const handleModelFileChangeFallback = (e) => {
    if (e.target.files[0]) {
      setSettings(prev => ({...prev, selectedModel: e.target.files[0].name, modelPath: e.target.files[0].name }));
    }
  };
  const sliders = [
      { key: "temperature", label: "Temperature", max: 2, step: 0.1 }, { key: "topK", label: "Top K", max: 100, step: 1 },
      { key: "repeatPenalty", label: "Repeat Penalty", max: 2, step: 0.05 }, { key: "topP", label: "Top P", max: 1, step: 0.05 },
      { key: "minP", label: "Min P", max: 1, step: 0.05 }, { key: "contextLength", label: "Context Length", max: 8192, step: 128 }
  ];
  return (
      <div className="absolute inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50">
        <div className="bg-gray-800 rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
          <div className="p-6 border-b border-gray-700 flex justify-between items-center"><h2 className="text-xl font-bold">Settings</h2><button onClick={onClose} className="p-2 rounded-full hover:bg-gray-700"><X size={20} /></button></div>
          <div className="p-6 overflow-y-auto space-y-6">
              <div><label className="block text-sm font-medium text-gray-300 mb-1">System Prompt</label><textarea value={settings.systemPrompt} onChange={e => handleTextChange('systemPrompt', e.target.value)} rows="4" className="w-full bg-gray-900 rounded-lg p-2 text-sm focus:ring-indigo-500 focus:border-indigo-500"></textarea></div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-300 mb-1">Model File</label>
                    <button onClick={handleModelFileSelect} className="flex items-center gap-2 w-full text-left px-3 py-2 bg-gray-900 rounded-lg hover:bg-gray-700 border border-gray-700">
                        <FolderUp size={16} className="text-gray-400" /> <span className="truncate text-sm">{settings.selectedModel || "Select a model file..."}</span>
                    </button>
                    <input type="file" id="model-file-input-fallback" className="hidden" onChange={handleModelFileChangeFallback} />
                    <p className="text-xs text-gray-500 mt-1">Select a model file from your computer.</p>
                </div>
                <div><label className="block text-sm font-medium text-gray-300 mb-1">AI Server URL</label><input type="text" value={settings.serverUrl} onChange={e => handleTextChange('serverUrl', e.target.value)} className="w-full bg-gray-900 rounded-lg p-2 text-sm" placeholder="e.g., http://localhost:11434"/></div>
              </div>
              {sliders.map(({key, label, max, step}) => (
                <div key={key}>
                    <div className="flex justify-between items-center"><label className="text-sm font-medium text-gray-300">{label}</label><span className="text-sm font-mono bg-gray-700 px-2 py-1 rounded">{settings[key]}</span></div>
                    <input type="range" min="0" max={max} step={step} value={settings[key]} onChange={e => handleSliderChange(key, e.target.value)} className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer mt-2" />
                </div>
              ))}
          </div>
          <div className="p-6 border-t border-gray-700 flex justify-end"><button onClick={onClose} className="px-6 py-2 bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">Close</button></div>
        </div>
      </div>
  );
};


// =================================================================================
// 3. MAIN PAGE COMPONENT
// =================================================================================
export default function HomePage() {
  // --- PERBAIKAN HYDRATION DIMULAI DI SINI ---
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);
  // --- PERBAIKAN HYDRATION SELESAI ---

  const [allChats, setAllChats] = useLocalStorage('allChats', []);
  const [activeChatId, setActiveChatId] = useLocalStorage('activeChatId', null);
  const [settings, setSettings] = useLocalStorage('aiSettings', {
      systemPrompt: "You are a helpful AI assistant.", selectedModel: "Not Selected", modelPath: null,
      serverUrl: "http://localhost:11434", temperature: 0.7, topK: 40,
      repeatPenalty: 1.1, topP: 0.9, minP: 0.1, contextLength: 4096,
  });
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useLocalStorage('isSidebarCollapsed', false); // Gunakan localStorage untuk ini juga
  const [input, setInput] = useState('');
  const [attachedFile, setAttachedFile] = useState(null);
  
  const chatEndRef = useRef(null);
  const activeChat = allChats.find(chat => chat.id === activeChatId);
  const messages = activeChat ? activeChat.messages : [];
  
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);
  useEffect(() => {
      if (allChats.length === 0 && isClient) { handleNewChat(); } 
      else if (!activeChatId && isClient) { setActiveChatId(allChats[0]?.id); }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isClient]);

  const updateMessagesInChat = (chatId, newMessages) => setAllChats(prev => prev.map(chat => chat.id === chatId ? { ...chat, messages: newMessages } : chat));
  const updateLastMessageInChat = (chatId, contentUpdater) => { /* ... (fungsi ini tidak berubah) ... */ };
  const handleSendMessage = async () => { /* ... (fungsi ini tidak berubah) ... */ };
  const handleNewChat = () => { /* ... (fungsi ini tidak berubah) ... */ };
  const handleDeleteChat = (e, chatIdToDelete) => { /* ... (fungsi ini tidak berubah) ... */ };

  // Jangan render apapun sampai kita yakin kita berada di klien
  if (!isClient) {
    return null;
  }

  return (
    <div className="flex h-screen bg-gray-900 text-white font-sans">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)} onNewChat={handleNewChat} chats={allChats} activeChatId={activeChatId} onSelectChat={setActiveChatId} onDeleteChat={handleDeleteChat} onOpenSettings={() => setIsSettingsOpen(true)} />
      <SettingsModal isOpen={isSettingsOpen} onClose={() => setIsSettingsOpen(false)} settings={settings} setSettings={setSettings} />
      <main className="flex-1 flex flex-col">
         <header className="flex-shrink-0 flex items-center gap-4 p-3 border-b border-gray-700 bg-gray-900">
            <div className="flex items-baseline gap-2"><span className="text-sm text-gray-400">Model:</span><span className="font-semibold text-white truncate">{settings.selectedModel}</span></div>
         </header>
        <div className="flex-1 p-6 overflow-y-auto">
          {(!activeChat) ? <div className="flex flex-col items-center justify-center h-full text-gray-400"><Bot size={64} /><h1 className="text-2xl mt-4">Welcome!</h1></div> : (
             <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex gap-4 items-start ${msg.role === 'user' ? 'justify-end' : ''}`}>
                    {msg.role !== 'user' && <div className="w-8 h-8 rounded-full bg-indigo-500 flex-shrink-0 flex items-center justify-center"><Bot size={20}/></div>}
                    <div className={`p-4 rounded-xl max-w-2xl prose prose-invert prose-p:my-0 ${msg.role === 'user' ? 'bg-indigo-600' : 'bg-gray-700'}`}>
                      <p dangerouslySetInnerHTML={{ __html: msg.content.replace(/\n/g, '<br />').replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
                      {isLoading && index === messages.length -1 && msg.role === 'assistant' && <div className="flex items-center gap-2 mt-2 text-gray-400"><LoaderCircle className="animate-spin" size={16} /><span>Thinking...</span></div>}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
            </div>
          )}
        </div>
        <div className="p-4 border-t border-gray-700">
          <div className="relative bg-gray-800 rounded-xl p-2">
            <div className="flex items-center">
              <label htmlFor="file-upload" className="p-2 rounded-full hover:bg-gray-700 cursor-pointer"><Plus size={20} /><input id="file-upload" type="file" className="hidden" onChange={(e) => setAttachedFile(e.target.files[0])} /></label>
              <input type="text" value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => !isLoading && e.key === 'Enter' && handleSendMessage()} placeholder="Type your message..." className="flex-1 bg-transparent focus:outline-none px-4" disabled={isLoading || !activeChatId} />
              <button onClick={handleSendMessage} className="p-3 bg-indigo-600 rounded-lg disabled:opacity-50" disabled={(!input.trim() && !attachedFile) || isLoading || !activeChatId}><Send size={20} /></button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
