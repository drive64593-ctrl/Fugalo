import React, { useState, useEffect } from 'react';
import { AutoReplyRule } from '../types';
import { GoogleGenAI } from "@google/genai";
import { Save, RefreshCw, Trash2, Clock, Zap, Shield, Sparkles, Database, AlertTriangle, Moon, Smartphone, MessageSquare, Plus, X, Power, Key, CheckCircle2, XCircle, Loader2, Keyboard, MousePointer2, Heart, Activity } from 'lucide-react';

export const Settings: React.FC = () => {
  const [delay, setDelay] = useState(5);
  
  // Humanize Advanced Settings
  const [humanize, setHumanize] = useState(true);
  const [typingSpeed, setTypingSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [enableTypos, setEnableTypos] = useState(false);
  const [autoLike, setAutoLike] = useState(false);
  const [randomScroll, setRandomScroll] = useState(true);

  // Auto Reply State
  const [rules, setRules] = useState<AutoReplyRule[]>([]);
  const [newKeywords, setNewKeywords] = useState('');
  const [newResponse, setNewResponse] = useState('');

  // API Key State
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [checkingKey, setCheckingKey] = useState(false);
  const [keyStatus, setKeyStatus] = useState<'idle' | 'valid' | 'invalid'>('idle');

  const [isSaved, setIsSaved] = useState(false);

  // Load settings (Mock loading from localStorage)
  useEffect(() => {
    const savedDelay = localStorage.getItem('autoseed_setting_delay');
    if (savedDelay) setDelay(Number(savedDelay));
    
    const savedHumanize = localStorage.getItem('autoseed_setting_humanize');
    if (savedHumanize) setHumanize(savedHumanize === 'true');

    // Load Advanced Humanize Settings
    const savedSpeed = localStorage.getItem('autoseed_setting_typing_speed');
    if (savedSpeed) setTypingSpeed(savedSpeed as any);

    const savedTypos = localStorage.getItem('autoseed_setting_enable_typos');
    if (savedTypos) setEnableTypos(savedTypos === 'true');

    const savedAutoLike = localStorage.getItem('autoseed_setting_auto_like');
    if (savedAutoLike) setAutoLike(savedAutoLike === 'true');

    const savedScroll = localStorage.getItem('autoseed_setting_random_scroll');
    if (savedScroll) setRandomScroll(savedScroll === 'true');

    const savedRules = localStorage.getItem('autoseed_autoreply_rules');
    if (savedRules) {
        try {
            setRules(JSON.parse(savedRules));
        } catch (e) {
            console.error("Failed to parse rules", e);
        }
    }

    const savedKey = localStorage.getItem('user_gemini_api_key');
    if (savedKey) {
        setApiKey(savedKey);
    }
  }, []);

  const handleTestApiKey = async (keyToTest: string) => {
    if (!keyToTest.trim()) {
        setKeyStatus('idle');
        return;
    }
    
    setCheckingKey(true);
    setKeyStatus('idle');
    
    try {
        const ai = new GoogleGenAI({ apiKey: keyToTest.trim() });
        // Try a minimal generation request to validate the key
        await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: 'Ping',
        });
        setKeyStatus('valid');
    } catch (error) {
        console.error("API Key Validation Failed:", error);
        setKeyStatus('invalid');
    } finally {
        setCheckingKey(false);
    }
  };

  const handleSave = () => {
    localStorage.setItem('autoseed_setting_delay', delay.toString());
    localStorage.setItem('autoseed_setting_humanize', humanize.toString());
    
    // Save Advanced Humanize Settings
    localStorage.setItem('autoseed_setting_typing_speed', typingSpeed);
    localStorage.setItem('autoseed_setting_enable_typos', enableTypos.toString());
    localStorage.setItem('autoseed_setting_auto_like', autoLike.toString());
    localStorage.setItem('autoseed_setting_random_scroll', randomScroll.toString());

    localStorage.setItem('autoseed_autoreply_rules', JSON.stringify(rules));
    
    // Save API Key
    if (apiKey.trim()) {
        localStorage.setItem('user_gemini_api_key', apiKey.trim());
    } else {
        localStorage.removeItem('user_gemini_api_key');
    }
    
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleClearData = () => {
    if (window.confirm('CẢNH BÁO: Hành động này sẽ xóa toàn bộ Chiến dịch và Tài khoản đã lưu. Bạn không thể hoàn tác. Bạn có chắc chắn không?')) {
        localStorage.removeItem('autoseed_saved_campaigns_v1');
        localStorage.removeItem('autoseed_saved_accounts_v1');
        localStorage.removeItem('autoseed_autoreply_rules');
        localStorage.removeItem('user_gemini_api_key');
        
        // Clear new settings
        localStorage.removeItem('autoseed_setting_typing_speed');
        localStorage.removeItem('autoseed_setting_enable_typos');
        localStorage.removeItem('autoseed_setting_auto_like');
        localStorage.removeItem('autoseed_setting_random_scroll');
        
        window.location.reload();
    }
  };

  // Rule Handlers
  const handleAddRule = () => {
      if (!newKeywords.trim() || !newResponse.trim()) return;
      
      const newRule: AutoReplyRule = {
          id: Date.now().toString(),
          keywords: newKeywords,
          response: newResponse,
          isActive: true
      };
      
      setRules([...rules, newRule]);
      setNewKeywords('');
      setNewResponse('');
  };

  const handleDeleteRule = (id: string) => {
      setRules(rules.filter(r => r.id !== id));
  };

  const handleToggleRule = (id: string) => {
      setRules(rules.map(r => r.id === id ? { ...r, isActive: !r.isActive } : r));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      
      {/* Seeding Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
          <div className="bg-blue-100 p-2 rounded-lg">
             <Clock className="w-5 h-5 text-blue-600" />
          </div>
          <div>
              <h3 className="text-lg font-bold text-gray-800">Cấu hình Tốc độ & Hành vi</h3>
              <p className="text-xs text-gray-500">Kiểm soát tốc độ gửi comment để tránh bị Facebook đánh spam.</p>
          </div>
        </div>
        
        <div className="p-6 space-y-8">
            {/* Delay Slider */}
            <div>
                <div className="flex justify-between mb-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        Độ trễ giữa các lần comment
                        <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Khuyên dùng: 15s - 60s</span>
                    </label>
                    <span className="text-sm font-bold text-blue-600">{delay} giây</span>
                </div>
                <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5"
                    value={delay} 
                    onChange={(e) => setDelay(Number(e.target.value))}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                />
                <div className="flex justify-between mt-1 text-xs text-gray-400">
                    <span>5s (Nhanh - Nguy hiểm)</span>
                    <span>120s (Rất an toàn)</span>
                </div>
            </div>

            {/* Humanize Advanced Toggle */}
            <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
                <div className="flex items-center justify-between p-4 bg-gray-50 border-b border-gray-100">
                    <div className="flex gap-3">
                        <div className="mt-1">
                            <Smartphone className="w-5 h-5 text-purple-500" />
                        </div>
                        <div>
                            <h4 className="text-sm font-bold text-gray-800">Mô phỏng thao tác người dùng (Humanize)</h4>
                            <p className="text-xs text-gray-500 mt-1">Hệ thống sẽ hoạt động như một người dùng thật để tránh checkpoint.</p>
                        </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" checked={humanize} onChange={(e) => setHumanize(e.target.checked)} className="sr-only peer" />
                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                </div>
                
                {/* Advanced Humanize Options */}
                {humanize && (
                    <div className="p-4 bg-white grid grid-cols-1 md:grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                         {/* Typing Speed */}
                         <div className="col-span-1 md:col-span-2">
                             <label className="text-xs font-semibold text-gray-700 flex items-center gap-2 mb-2">
                                <Keyboard className="w-3.5 h-3.5" /> Tốc độ gõ phím
                             </label>
                             <div className="grid grid-cols-3 gap-2">
                                 <button 
                                    onClick={() => setTypingSpeed('slow')}
                                    className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors ${typingSpeed === 'slow' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                 >
                                    Chậm (Thận trọng)
                                 </button>
                                 <button 
                                    onClick={() => setTypingSpeed('normal')}
                                    className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors ${typingSpeed === 'normal' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                 >
                                    Trung bình (Tự nhiên)
                                 </button>
                                 <button 
                                    onClick={() => setTypingSpeed('fast')}
                                    className={`py-2 px-3 text-xs rounded-lg border font-medium transition-colors ${typingSpeed === 'fast' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-gray-50 border-gray-200 text-gray-600 hover:bg-gray-100'}`}
                                 >
                                    Nhanh (Thần tốc)
                                 </button>
                             </div>
                         </div>

                         {/* Typos Simulation */}
                         <div className="p-3 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setEnableTypos(!enableTypos)}>
                             <div className="flex items-center gap-3">
                                 <div className={`p-1.5 rounded ${enableTypos ? 'bg-orange-100 text-orange-600' : 'bg-gray-100 text-gray-400'}`}>
                                     <Activity className="w-4 h-4" />
                                 </div>
                                 <div>
                                     <p className="text-xs font-bold text-gray-700">Mô phỏng lỗi gõ (Typos)</p>
                                     <p className="text-[10px] text-gray-500">Thỉnh thoảng gõ sai và xóa đi viết lại.</p>
                                 </div>
                             </div>
                             <div className={`w-4 h-4 rounded-full border ${enableTypos ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                 {enableTypos && <div className="w-full h-full flex items-center justify-center text-white text-[10px]">✓</div>}
                             </div>
                         </div>

                         {/* Auto Like */}
                         <div className="p-3 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer" onClick={() => setAutoLike(!autoLike)}>
                             <div className="flex items-center gap-3">
                                 <div className={`p-1.5 rounded ${autoLike ? 'bg-pink-100 text-pink-600' : 'bg-gray-100 text-gray-400'}`}>
                                     <Heart className="w-4 h-4" />
                                 </div>
                                 <div>
                                     <p className="text-xs font-bold text-gray-700">Tự động Like bài viết</p>
                                     <p className="text-[10px] text-gray-500">Thả tim/Like trước khi comment (Ngẫu nhiên).</p>
                                 </div>
                             </div>
                             <div className={`w-4 h-4 rounded-full border ${autoLike ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                 {autoLike && <div className="w-full h-full flex items-center justify-center text-white text-[10px]">✓</div>}
                             </div>
                         </div>

                         {/* Random Scroll */}
                         <div className="p-3 border border-gray-100 rounded-lg flex items-center justify-between hover:bg-gray-50 transition-colors cursor-pointer md:col-span-2" onClick={() => setRandomScroll(!randomScroll)}>
                             <div className="flex items-center gap-3">
                                 <div className={`p-1.5 rounded ${randomScroll ? 'bg-indigo-100 text-indigo-600' : 'bg-gray-100 text-gray-400'}`}>
                                     <MousePointer2 className="w-4 h-4" />
                                 </div>
                                 <div>
                                     <p className="text-xs font-bold text-gray-700">Đọc nội dung (Random Scroll)</p>
                                     <p className="text-[10px] text-gray-500">Tự động cuộn lên xuống để giả vờ đọc bài viết và bình luận khác.</p>
                                 </div>
                             </div>
                             <div className={`w-4 h-4 rounded-full border ${randomScroll ? 'bg-blue-600 border-blue-600' : 'border-gray-300'}`}>
                                 {randomScroll && <div className="w-full h-full flex items-center justify-center text-white text-[10px]">✓</div>}
                             </div>
                         </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Auto-Reply Configuration */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
           <div className="bg-green-100 p-2 rounded-lg">
             <MessageSquare className="w-5 h-5 text-green-600" />
          </div>
          <div>
              <h3 className="text-lg font-bold text-gray-800">Cấu hình Auto-Reply</h3>
              <p className="text-xs text-gray-500">Tự động trả lời khi bình luận của khách chứa từ khóa cụ thể.</p>
          </div>
        </div>
        
        <div className="p-6">
            {/* Add Rule Form */}
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-6">
                <h4 className="text-sm font-bold text-gray-700 mb-3">Thêm quy tắc mới</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Từ khóa (phân cách bằng dấu phẩy)</label>
                        <input 
                            type="text" 
                            value={newKeywords}
                            onChange={(e) => setNewKeywords(e.target.value)}
                            placeholder="Ví dụ: giá, bao nhiêu, ib, tư vấn"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Nội dung trả lời</label>
                        <input 
                            type="text" 
                            value={newResponse}
                            onChange={(e) => setNewResponse(e.target.value)}
                            placeholder="Ví dụ: Dạ shop đã inbox ạ, check tin nhắn chờ nhé!"
                            className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-green-500 focus:border-transparent"
                        />
                    </div>
                </div>
                <button 
                    onClick={handleAddRule}
                    disabled={!newKeywords.trim() || !newResponse.trim()}
                    className={`w-full py-2 rounded-lg flex items-center justify-center gap-2 text-sm font-medium transition-colors
                        ${(!newKeywords.trim() || !newResponse.trim()) 
                            ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                            : 'bg-green-600 text-white hover:bg-green-700 shadow-sm'}
                    `}
                >
                    <Plus className="w-4 h-4" /> Thêm quy tắc
                </button>
            </div>

            {/* Rules List */}
            <div className="space-y-3">
                {rules.length === 0 ? (
                    <div className="text-center py-6 text-gray-400 text-sm italic">
                        Chưa có quy tắc nào.
                    </div>
                ) : (
                    rules.map((rule) => (
                        <div key={rule.id} className={`flex items-start justify-between p-3 rounded-lg border transition-all ${rule.isActive ? 'bg-white border-gray-200' : 'bg-gray-50 border-gray-100 opacity-70'}`}>
                            <div className="flex-1 min-w-0 mr-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Nếu gặp:</span>
                                    <div className="flex flex-wrap gap-1">
                                        {rule.keywords.split(',').map((kw, i) => (
                                            <span key={i} className="px-2 py-0.5 bg-yellow-100 text-yellow-800 text-xs rounded-md font-medium border border-yellow-200">
                                                {kw.trim()}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-start gap-2">
                                     <span className="text-xs font-bold text-gray-500 uppercase tracking-wider mt-0.5">Trả lời:</span>
                                     <p className="text-sm text-gray-800 font-medium break-words">{rule.response}</p>
                                </div>
                            </div>
                            
                            <div className="flex items-center gap-2 shrink-0">
                                <button 
                                    onClick={() => handleToggleRule(rule.id)}
                                    title={rule.isActive ? "Tắt quy tắc" : "Bật quy tắc"}
                                    className={`p-1.5 rounded-lg transition-colors ${rule.isActive ? 'text-green-600 bg-green-50 hover:bg-green-100' : 'text-gray-400 bg-gray-100 hover:bg-gray-200'}`}
                                >
                                    <Power className="w-4 h-4" />
                                </button>
                                <button 
                                    onClick={() => handleDeleteRule(rule.id)}
                                    title="Xóa quy tắc"
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
      </div>

      {/* AI Preferences */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex items-center gap-3">
           <div className="bg-purple-100 p-2 rounded-lg">
             <Sparkles className="w-5 h-5 text-purple-600" />
          </div>
          <div>
              <h3 className="text-lg font-bold text-gray-800">Cấu hình AI Generative</h3>
              <p className="text-xs text-gray-500">Nhập API Key để kích hoạt tính năng tạo nội dung.</p>
          </div>
        </div>
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
             <div className="md:col-span-2">
                 <label className="block text-sm font-medium text-gray-700 mb-2">
                     Gemini API Key <span className="text-red-500">*</span>
                 </label>
                 <div className="relative">
                     <input 
                         type={showKey ? "text" : "password"} 
                         value={apiKey}
                         onChange={(e) => {
                             setApiKey(e.target.value);
                             if (keyStatus !== 'idle') setKeyStatus('idle'); // Reset status on edit
                         }}
                         onBlur={() => handleTestApiKey(apiKey)} // Auto validate on leave
                         placeholder="Nhập API Key của bạn (bắt đầu bằng AIza...)"
                         className={`w-full pl-10 pr-24 py-2.5 rounded-lg border focus:ring-2 text-sm transition-colors
                            ${keyStatus === 'valid' ? 'border-green-300 focus:ring-green-500 bg-green-50' : 
                              keyStatus === 'invalid' ? 'border-red-300 focus:ring-red-500 bg-red-50' : 
                              'border-gray-300 focus:ring-purple-500'}
                         `}
                     />
                     <Key className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
                     
                     <div className="absolute right-2 top-1.5 flex items-center gap-1">
                         {/* Validation Status Icon */}
                         {checkingKey && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
                         {!checkingKey && keyStatus === 'valid' && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                         {!checkingKey && keyStatus === 'invalid' && <XCircle className="w-4 h-4 text-red-500" />}

                         <div className="h-4 w-px bg-gray-300 mx-1"></div>

                         <button 
                            type="button"
                            onClick={() => setShowKey(!showKey)}
                            className="text-gray-400 hover:text-gray-600 text-xs font-medium px-1"
                         >
                            {showKey ? "Ẩn" : "Hiện"}
                         </button>
                     </div>
                 </div>
                 
                 {/* Feedback Message */}
                 <div className="flex justify-between items-start mt-2">
                     <div className="text-xs">
                        {checkingKey && <span className="text-purple-600">Đang kiểm tra kết nối...</span>}
                        {!checkingKey && keyStatus === 'valid' && <span className="text-green-600 font-medium">✓ API Key hợp lệ. Đã kết nối thành công!</span>}
                        {!checkingKey && keyStatus === 'invalid' && <span className="text-red-500 font-medium">✕ API Key không hợp lệ hoặc hết hạn. Vui lòng kiểm tra lại.</span>}
                        {keyStatus === 'idle' && <span className="text-gray-500">Key được lưu cục bộ trên trình duyệt. Lấy key miễn phí tại <a href="https://aistudio.google.com/app/apikey" target="_blank" className="text-blue-600 hover:underline">Google AI Studio</a>.</span>}
                     </div>
                     
                     <button 
                        type="button"
                        onClick={() => handleTestApiKey(apiKey)}
                        className="text-xs bg-gray-100 hover:bg-gray-200 border border-gray-200 px-3 py-1 rounded text-gray-700 transition-colors"
                     >
                        Kiểm tra Key
                     </button>
                 </div>
             </div>

             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Model</label>
                 <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                     <option>Gemini 2.5 Flash (Recommended)</option>
                     <option>Gemini 1.5 Pro</option>
                 </select>
             </div>
             <div>
                 <label className="block text-sm font-medium text-gray-700 mb-2">Ngôn ngữ</label>
                 <select className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-800">
                     <option>Tiếng Việt (Vietnamese)</option>
                     <option>English</option>
                 </select>
             </div>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-2xl border border-red-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-red-50 bg-red-50/30 flex items-center gap-3">
           <div className="bg-red-100 p-2 rounded-lg">
             <Database className="w-5 h-5 text-red-600" />
          </div>
          <div>
              <h3 className="text-lg font-bold text-gray-800">Quản lý Dữ liệu</h3>
              <p className="text-xs text-gray-500">Xử lý dữ liệu cục bộ trên trình duyệt.</p>
          </div>
        </div>
        <div className="p-6 flex items-center justify-between">
            <div>
                <h4 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-500" /> Xóa toàn bộ dữ liệu ứng dụng
                </h4>
                <p className="text-xs text-gray-500 mt-1 max-w-md">
                    Thao tác này sẽ xóa tất cả Chiến dịch, Lịch sử comment và Tài khoản đã lưu trong LocalStorage. Ứng dụng sẽ trở về trạng thái ban đầu.
                </p>
            </div>
            <button 
                onClick={handleClearData}
                className="px-4 py-2 border border-red-200 bg-red-50 text-red-600 hover:bg-red-600 hover:text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
                <Trash2 className="w-4 h-4" /> Reset App
            </button>
        </div>
      </div>

      {/* Footer Actions */}
      <div className="flex justify-end pt-4">
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-lg shadow-blue-200 transition-all hover:-translate-y-0.5 active:translate-y-0"
          >
              {isSaved ? (
                  <>
                    <RefreshCw className="w-5 h-5 animate-spin" /> Đang lưu...
                  </>
              ) : (
                  <>
                    <Save className="w-5 h-5" /> Lưu cấu hình
                  </>
              )}
          </button>
      </div>

    </div>
  );
};