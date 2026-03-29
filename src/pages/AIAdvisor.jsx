import React, { useState, useEffect, useRef } from 'react';
import { Sparkles, Send, Loader2, AlertCircle, MessageCircle } from 'lucide-react';

const AIAdvisor = () => {
  const [kids, setKids] = useState([]);
  const [selectedKid, setSelectedKid] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const saved = localStorage.getItem('smart-kids-list');
    if (saved) {
      const parsed = JSON.parse(saved);
      setKids(parsed);
      if (parsed.length > 0) setSelectedKid(parsed[0]);
    }
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const context = selectedKid 
        ? `Το παιδί λέγεται ${selectedKid.name}, είναι ${selectedKid.age} ετών, φύλο: ${selectedKid.gender === 'Αγόρι' ? 'αγόρι' : 'κορίτσι'}.`
        : '';

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=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`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [{
                text: `Είσαι βοηθός για γονείς που ψάχνουν δώρα/προϊόντα για παιδιά. ${context} 

Ερώτηση: ${userMessage}

Απάντησε στα Ελληνικά, σύντομα (2-3 προτάσεις), με συγκεκριμένες προτάσεις προϊόντων.`
              }]
            }]
          })
        }
      );

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'Συγγνώμη, δεν μπόρεσα να απαντήσω.';
      
      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error(error);
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Σφάλμα σύνδεσης με το AI. Δοκιμάστε ξανά.' 
      }]);
    }

    setLoading(false);
  };

  const quickPrompts = [
    'Τι δώρο να πάρω για γενέθλια;',
    'Προτείνε παιχνίδια για την ηλικία του',
    'Τι ρούχα χρειάζονται τώρα;',
    'Εκπαιδευτικά παιχνίδια',
  ];

  return (
    <div className="max-w-md mx-auto min-h-screen bg-gradient-to-b from-violet-50 to-slate-50 flex flex-col">
      
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-purple-700 px-6 pt-12 pb-6 rounded-b-[2rem] shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-2xl font-black text-white flex items-center gap-2">
            <Sparkles size={24} className="text-yellow-300" />
            AI Advisor
          </h1>
        </div>

        {/* Kid Selector */}
        {kids.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
            {kids.map(kid => (
              <button
                key={kid.id}
                onClick={() => setSelectedKid(kid)}
                className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                  selectedKid?.id === kid.id
                    ? 'bg-white text-violet-600'
                    : 'bg-violet-500/30 text-white border border-white/20'
                }`}
              >
                {kid.avatar} {kid.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-10">
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-violet-100">
              <MessageCircle size={40} className="mx-auto text-violet-400 mb-3" />
              <p className="text-slate-600 font-semibold mb-4">
                Ρώτησέ με για δώρα, παιχνίδια ή ρούχα!
              </p>
              
              {/* Quick prompts */}
              <div className="space-y-2">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInput(prompt)}
                    className="w-full bg-violet-50 text-violet-700 px-4 py-2 rounded-xl text-xs font-bold hover:bg-violet-100 transition-all"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                msg.role === 'user'
                  ? 'bg-violet-500 text-white'
                  : 'bg-white text-slate-800 shadow-sm border border-slate-100'
              }`}
            >
              <p className="text-sm leading-relaxed">{msg.content}</p>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-100">
              <Loader2 size={20} className="animate-spin text-violet-500" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t border-slate-200">
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={`Ρώτησε για ${selectedKid?.name || 'το παιδί'}...`}
            className="flex-1 px-4 py-3 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-violet-500 text-sm"
            disabled={loading}
          />
          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className="bg-violet-500 text-white p-3 rounded-2xl active:scale-95 transition-all disabled:opacity-50 disabled:scale-100"
          >
            <Send size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIAdvisor;
