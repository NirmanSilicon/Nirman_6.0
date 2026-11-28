import React, { useState, useRef, useEffect } from "react";
import { 
  MessageCircle, Activity, X, Send, Paperclip, Camera, 
  Trash2, Image, FileText, CheckCircle, ShieldAlert 
} from "lucide-react";
import { CameraCapture } from "./CameraCapture";
import { sendChatMessage } from "@/lib/api";

// types
type ChatMessage = { 
  sender: "user" | "bot"; 
  text: string; 
  time: string;
  attachment?: {
    type: "image" | "document";
    name: string;
    url: string;
  };
};

const askGroq = async (userMessage: string, history: { role: string; content: string }[]): Promise<string> => {
  try {
    let patientContext = {};
    const localUser = localStorage.getItem("user");
    if (localUser) {
      const parsed = JSON.parse(localUser);
      if (parsed.patient_id) {
        patientContext = { patient_id: parsed.patient_id };
      }
    }

    const data = await sendChatMessage(userMessage, patientContext);
    return data.response ?? "I'm sorry, I couldn't generate a response right now. Please try again.";
  } catch (error: any) {
    console.error("Chat API error:", error);
    return `Note: I am running in local consultation mode. For your safety, clean any minor wound with sterile water, apply a clean bandage, and monitor for redness. Please consult a physician immediately for deep injuries. (${error?.message || "Connection timeout"})`;
  }
};

export function RishiAIChat() {
  const [showChat, setShowChat] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  
  // File upload and Camera states
  const [attachedFile, setAttachedFile] = useState<{ name: string; url: string; type: "image" | "document" } | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initial greeting
  const initChat = () => {
    if (chatMessages.length === 0) {
      const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      setChatMessages([
        { 
          sender: "bot", 
          text: "👋 Hi! I'm **Rishi AI**, your AI health assistant.\n\nHow can I help you today? You can ask about medicines, lab tests, or **upload/capture photos of your injuries** to get immediate first-aid guidance.", 
          time 
        }
      ]);
    }
  };

  useEffect(() => {
    if (showChat) {
      initChat();
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    }
  }, [showChat]);

  // Listen to global trigger event
  useEffect(() => {
    const handleOpenChat = (e: Event) => {
      const customEvent = e as CustomEvent<{ message?: string }>;
      setShowChat(true);
      
      setChatMessages(prev => {
        let current = prev;
        if (prev.length === 0) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          current = [
            { 
              sender: "bot", 
              text: "👋 Hi! I'm **Rishi AI**, your AI health assistant.\n\nHow can I help you today? You can ask about medicines, lab tests, or **upload/capture photos of your injuries** to get immediate first-aid guidance.", 
              time 
            }
          ];
        }
        
        if (customEvent.detail?.message) {
          const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          const userMsg: ChatMessage = {
            sender: "user",
            text: customEvent.detail.message,
            time
          };
          
          // Trigger the bot response asynchronously
          const promptContext = userMsg.text;
          const history = current.slice(-6).map(m => ({
            role: m.sender === "user" ? "user" : "assistant",
            content: m.text
          }));
          
          setIsTyping(true);
          setChatError(null);
          
          askGroq(promptContext, history).then(botReplyText => {
            const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            setChatMessages(p => [
              ...p,
              { sender: "bot", text: botReplyText, time: botTime }
            ]);
            setIsTyping(false);
            setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
          }).catch(err => {
            setIsTyping(false);
            setChatError(err.message || "Failed to get reply");
          });
          
          return [...current, userMsg];
        }
        
        return current;
      });
      
      setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 200);
    };

    window.addEventListener("open-rishi-chat", handleOpenChat);
    return () => window.removeEventListener("open-rishi-chat", handleOpenChat);
  }, []);

  // Handle standard file selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isImage = file.type.startsWith("image/");
    const reader = new FileReader();
    reader.onload = () => {
      setAttachedFile({
        name: file.name,
        url: reader.result as string,
        type: isImage ? "image" : "document",
      });
    };
    reader.readAsDataURL(file);
    // Reset file input so same file can be selected again
    e.target.value = "";
  };

  // Handle webcam capture
  const handleCameraCapture = (dataUrl: string) => {
    setAttachedFile({
      name: `webcam_${Date.now()}.jpg`,
      url: dataUrl,
      type: "image",
    });
  };

  const handleSendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim() && !attachedFile) return;

    const textToSend = chatInput.trim();
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    // Add user message
    const userMsg: ChatMessage = {
      sender: "user",
      text: textToSend,
      time,
      attachment: attachedFile ? { ...attachedFile } : undefined
    };

    setChatMessages(prev => [...prev, userMsg]);
    setChatInput("");
    setAttachedFile(null);
    setIsTyping(true);
    setChatError(null);
    
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 80);

    // Build context prompt
    let promptContext = textToSend;
    if (userMsg.attachment) {
      promptContext += `\n[User has attached a ${userMsg.attachment.type}: "${userMsg.attachment.name}". They are sharing this to show you their symptoms or injuries. Please review details and advise accordingly.]`;
    }

    // Build history
    const history = chatMessages.slice(-6).map(m => ({
      role: m.sender === "user" ? "user" : "assistant",
      content: m.text
    }));

    const botReplyText = await askGroq(promptContext, history);
    const botTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    setChatMessages(prev => [
      ...prev,
      { sender: "bot", text: botReplyText, time: botTime }
    ]);
    
    setIsTyping(false);
    setTimeout(() => chatEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100);
  };

  return (
    <>
      {/* FLOATING ACTION LAUNCHER BUTTON */}
      <button 
        onClick={() => setShowChat(!showChat)}
        className="fixed bottom-6 right-6 z-[100] grid h-14 w-14 place-items-center rounded-full bg-gradient-teal text-white shadow-glow-teal hover:scale-105 transition duration-200 cursor-pointer"
        aria-label="Rishi AI Assistant"
      >
        {showChat ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </button>

      {/* CHAT WINDOW */}
      {showChat && (
        <div 
          className="fixed bottom-24 right-6 z-[100] w-[360px] max-w-[calc(100vw-32px)] bg-white border border-slate-200 rounded-3xl shadow-2xl overflow-hidden animate-scale-in flex flex-col" 
          style={{ height: '520px' }}
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-navy to-teal/95 text-white p-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="relative h-9 w-9 rounded-xl bg-white/10 grid place-items-center">
                <Activity className="h-5 w-5 text-teal-300" />
                <div className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-400 border-2 border-navy" />
              </div>
              <div className="text-left">
                <div className="text-xs font-black font-display tracking-wide">Rishi AI Assistant</div>
                <div className="text-[9px] text-teal-100 flex items-center gap-1 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 inline-block animate-ping" />
                  Live clinical triage AI
                </div>
              </div>
            </div>
            <button 
              onClick={() => setShowChat(false)}
              className="text-white/60 hover:text-white p-1 hover:bg-white/10 rounded-lg transition"
            >
              <X className="h-4.5 w-4.5" />
            </button>
          </div>

          {/* Chat message list */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50/50 scrollbar-thin">
            {chatMessages.map((msg, idx) => (
              <div 
                key={idx}
                className={`flex flex-col max-w-[85%] ${
                  msg.sender === "user" ? "ml-auto items-end" : "mr-auto items-start"
                }`}
              >
                {/* Bot Label */}
                {msg.sender === "bot" && (
                  <div className="flex items-center gap-1 mb-1">
                    <span className="text-[9px] font-bold text-slate-400">Rishi AI</span>
                  </div>
                )}
                
                {/* Bubble content */}
                <div className={`p-3 rounded-2xl text-[11px] leading-relaxed relative ${
                  msg.sender === "user" 
                    ? "bg-navy text-white rounded-tr-none" 
                    : "bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm"
                }`}>
                  {/* Text */}
                  <span className="whitespace-pre-wrap">{msg.text}</span>
                  
                  {/* Attachment if present */}
                  {msg.attachment && (
                    <div className="mt-2.5 p-1 bg-black/5 rounded-xl overflow-hidden border border-black/10">
                      {msg.attachment.type === "image" ? (
                        <img 
                          src={msg.attachment.url} 
                          alt="Patient Injury Attachment" 
                          className="max-w-full max-h-32 object-cover rounded-lg shadow-sm" 
                        />
                      ) : (
                        <div className="flex items-center gap-2 px-2 py-1 text-slate-600">
                          <FileText className="h-5 w-5 text-red-500 shrink-0" />
                          <span className="truncate max-w-[150px] font-mono text-[9px]">{msg.attachment.name}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Time stamp */}
                <span className="text-[8px] text-slate-400 mt-1 px-1">
                  {msg.time}
                </span>
              </div>
            ))}

            {isTyping && (
              <div className="mr-auto flex items-start gap-1.5">
                <div className="bg-white border border-slate-100 rounded-2xl rounded-tl-none p-3 shadow-sm text-slate-400 text-xs flex gap-1 items-center">
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 bg-teal rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}

            {chatError && (
              <div className="text-center">
                <span className="text-[9px] text-red-400 bg-red-50 px-2 py-1 rounded-full">{chatError}</span>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Quick chips - clinical issues */}
          <div className="bg-white px-3 py-2 flex gap-1.5 overflow-x-auto border-t border-slate-100 whitespace-nowrap scrollbar-none shrink-0">
            {[
              "First aid for burn?",
              "Treat a cut?",
              "OPD booking help",
              "Track express pharmacy",
              "Is Paracetamol safe?"
            ].map((chipText, i) => (
              <button 
                key={i}
                onClick={() => setChatInput(chipText)}
                className="bg-slate-50 border border-slate-200 text-slate-600 hover:border-teal hover:bg-teal/5 hover:text-teal text-[10px] font-semibold px-2.5 py-1 rounded-full shrink-0 transition cursor-pointer"
              >
                {chipText}
              </button>
            ))}
          </div>

          {/* Preview of file attachment before sending */}
          {attachedFile && (
            <div className="px-3 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-3 text-xs shrink-0 animate-fade-in">
              <div className="flex items-center gap-2 min-w-0">
                {attachedFile.type === "image" ? (
                  <div className="h-8 w-8 rounded-lg overflow-hidden border border-slate-200 bg-white flex items-center justify-center shrink-0">
                    <img src={attachedFile.url} className="h-full w-full object-cover" alt="preview" />
                  </div>
                ) : (
                  <FileText className="h-5 w-5 text-red-500 shrink-0" />
                )}
                <span className="text-[10px] font-mono text-slate-500 truncate">{attachedFile.name}</span>
              </div>
              <button 
                onClick={() => setAttachedFile(null)}
                className="text-slate-400 hover:text-red-500 p-1 hover:bg-slate-200 rounded-lg transition"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}

          {/* Input Form */}
          <form 
            onSubmit={handleSendChatMessage} 
            className="p-3 border-t border-slate-100 flex items-center gap-2 bg-white shrink-0"
          >
            {/* Hidden File Input */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange}
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden" 
            />

            {/* Attachment Button */}
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="text-slate-400 hover:text-teal p-1.5 hover:bg-slate-50 rounded-xl transition cursor-pointer shrink-0"
              title="Attach document or photo"
            >
              <Paperclip className="h-4.5 w-4.5" />
            </button>

            {/* Camera Button */}
            <button 
              type="button"
              onClick={() => setShowCamera(true)}
              className="text-slate-400 hover:text-teal p-1.5 hover:bg-slate-50 rounded-xl transition cursor-pointer shrink-0"
              title="Take a photo with webcam"
            >
              <Camera className="h-4.5 w-4.5" />
            </button>

            {/* Message input */}
            <input 
              type="text" 
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              disabled={isTyping}
              placeholder="Ask anything or show injuries..."
              className="flex-1 bg-slate-50 border border-slate-200 text-[11px] rounded-2xl px-3.5 py-2 outline-none focus:border-teal focus:bg-white text-navy transition disabled:opacity-60"
            />

            {/* Send Button */}
            <button 
              type="submit"
              disabled={isTyping || (!chatInput.trim() && !attachedFile)}
              className="bg-navy hover:bg-teal disabled:opacity-50 text-white p-2 rounded-2xl transition cursor-pointer shrink-0"
            >
              <Send className="h-3.5 w-3.5" />
            </button>
          </form>
          
          {/* Medical Disclaimer */}
          <div className="px-3 pb-2.5 bg-white text-[7.5px] text-slate-300 text-center shrink-0 border-t border-slate-50 pt-1 leading-normal flex items-center justify-center gap-1">
            <ShieldAlert className="h-3 w-3 text-slate-300 shrink-0" />
            AI advice only. Wash wounds, and consult a doctor immediately for clinical care.
          </div>
        </div>
      )}

      {/* CAMERA CAPTURE MODAL */}
      {showCamera && (
        <CameraCapture 
          onCapture={handleCameraCapture}
          onClose={() => setShowCamera(false)}
        />
      )}
    </>
  );
}
