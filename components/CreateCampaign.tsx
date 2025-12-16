import React, { useState, useMemo, useEffect } from 'react';
import { Campaign, Platform, Sentiment, Comment, SeedingAccount, SeedingMode } from '../types';
import { generateSeedingComments } from '../services/geminiService';
import { decryptData } from '../utils/crypto';
import { Copy, RefreshCw, Save, Wand2, Loader2, Sparkles, MessageSquare, Link as LinkIcon, Users, Plus, AlertCircle, ShieldCheck, UserCircle2, Check, ArrowRight, Shuffle, GripVertical, Settings, CheckSquare, Square, CalendarClock, Play, Info, Lock, Edit3, FileText, Bot, Fingerprint } from 'lucide-react';

interface CreateCampaignProps {
  onSave: (campaign: Campaign) => void;
  accounts: SeedingAccount[];
  onNavigateToAccounts: () => void;
}

export const CreateCampaign: React.FC<CreateCampaignProps> = ({ onSave, accounts, onNavigateToAccounts }) => {
  const [targetUrl, setTargetUrl] = useState('');
  
  // INPUT MODE: 'ai' or 'manual'
  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  
  // AI Input State
  const [postContent, setPostContent] = useState('');
  
  // Manual Input State
  const [manualInput, setManualInput] = useState('');

  const [platform, setPlatform] = useState<Platform>(Platform.FACEBOOK_PAGE);
  const [sentiment, setSentiment] = useState<Sentiment>(Sentiment.POSITIVE);
  const [mode, setMode] = useState<SeedingMode>(SeedingMode.MIXED);
  
  // Default selection: Select all available accounts by default
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(() => {
      return accounts.map(a => a.id);
  });

  // STRICT MODE: 1 Account = 1 Comment
  const [isStrictOneToOne, setIsStrictOneToOne] = useState(true);
  
  // Quantity State
  const [quantity, setQuantity] = useState(Math.max(1, accounts.length));
  
  // Quick Select Count State
  const [quickSelectCount, setQuickSelectCount] = useState<number>(() => Math.min(5, accounts.length));

  // Sync Quantity logic
  useEffect(() => {
      if (inputMode === 'manual') {
          // In manual mode, quantity is determined by lines
          const lines = manualInput.split('\n').filter(line => line.trim().length > 0).length;
          setQuantity(Math.max(1, lines));
      } else {
          // AI Mode logic
          if (isStrictOneToOne && selectedAccounts.length > 0) {
              setQuantity(selectedAccounts.length);
          }
      }
  }, [selectedAccounts.length, isStrictOneToOne, inputMode, manualInput]);

  // Update quick select count when accounts change
  useEffect(() => {
      if (quickSelectCount > accounts.length) {
          setQuickSelectCount(accounts.length);
      }
  }, [accounts.length]);

  // Scheduling State
  const [scheduleTime, setScheduleTime] = useState('');
  const [isScheduling, setIsScheduling] = useState(false);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedComments, setGeneratedComments] = useState<Comment[]>([]);

  // Memoize active accounts to prevent unnecessary re-renders
  const activeSeedingAccounts = useMemo(() => 
    accounts.filter(acc => selectedAccounts.includes(acc.id)), 
    [accounts, selectedAccounts]
  );

  // Optimized Distribution Logic: Smart Spacing & De-clustering
  const accountDistribution = useMemo(() => {
    if (activeSeedingAccounts.length === 0) return [];
    if (generatedComments.length === 0) return [];

    const totalSlots = generatedComments.length;
    
    // 1. Fill the pool ensuring quota balance (Fair share)
    let pool: SeedingAccount[] = [];
    while (pool.length < totalSlots) {
        // Shuffle the accounts source array before adding to pool to vary the starting sequence
        const batch = [...activeSeedingAccounts].sort(() => Math.random() - 0.5);
        pool = [...pool, ...batch];
    }
    pool = pool.slice(0, totalSlots); // Trim to exact size needed

    // 2. Fisher-Yates Shuffle for global randomness
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }

    // 3. "Smart Spacing" (De-clustering)
    if (activeSeedingAccounts.length > 1) {
         for (let i = 1; i < pool.length; i++) {
             if (pool[i].id === pool[i-1].id) {
                 for (let j = i + 1; j < pool.length; j++) {
                     if (pool[j].id !== pool[i].id) {
                         [pool[i], pool[j]] = [pool[j], pool[i]]; // Swap
                         break;
                     }
                 }
             }
         }
    }

    return pool;
  }, [generatedComments.length, activeSeedingAccounts]); 

  // Helper to extract UID from encrypted cookie
  const getUID = (encryptedCookie?: string) => {
      if (!encryptedCookie) return null;
      try {
          const raw = decryptData(encryptedCookie);
          const match = raw.match(/c_user=(\d+)/);
          return match ? match[1] : null;
      } catch (e) {
          return null;
      }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setGeneratedComments([]);
    
    // 1. MANUAL MODE LOGIC
    if (inputMode === 'manual') {
        const lines = manualInput.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) {
            alert("Vui lòng nhập ít nhất 1 dòng nội dung!");
            setIsGenerating(false);
            return;
        }

        const comments: Comment[] = lines.map((text, index) => ({
            id: `manual-${Date.now()}-${index}`,
            text: text.trim(),
            authorName: "Manual User", // Will be replaced by distribution logic
            avatarUrl: `https://ui-avatars.com/api/?name=User&background=random`, 
            sentiment: Sentiment.NEUTRAL,
            isUsed: false,
        }));
        
        // Slight delay to simulate processing
        setTimeout(() => {
            setGeneratedComments(comments);
            setIsGenerating(false);
        }, 500);
        return;
    }

    // 2. AI MODE LOGIC
    if (!postContent.trim()) {
        alert("Vui lòng nhập nội dung hoặc chủ đề bài viết trước khi tạo!");
        setIsGenerating(false);
        return;
    }
    
    try {
      const comments = await generateSeedingComments(postContent, platform, sentiment, mode, quantity);
      setGeneratedComments(comments);
    } catch (error: any) {
      console.error("Generation failed:", error);
      
      const errorMessage = error.message || "";
      if (errorMessage.includes("API key not valid") || errorMessage.includes("API_KEY_INVALID")) {
          alert(`Lỗi API Key: Key bạn nhập không hợp lệ hoặc đã hết hạn.\nVui lòng vào mục "Cài đặt" để cập nhật lại Gemini API Key.`);
      } else {
          alert(`Lỗi không xác định: ${errorMessage}.\nVui lòng kiểm tra kết nối mạng và thử lại.`);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveCampaign = (runNow: boolean = false) => {
    if (generatedComments.length === 0) return;
    if (!targetUrl) {
      alert("Vui lòng nhập Link bài viết cần seeding!");
      return;
    }

    let status: Campaign['status'] = 'generated';
    
    // Check scheduling
    if (isScheduling && scheduleTime) {
        const scheduledDate = new Date(scheduleTime);
        if (scheduledDate <= new Date()) {
            alert("Thời gian đặt lịch phải lớn hơn thời gian hiện tại!");
            return;
        }
        status = 'scheduled';
    }

    // CRITICAL: Merge the distributed accounts into the comment objects permanently
    const finalComments = generatedComments.map((comment, index) => {
        const assigned = activeSeedingAccounts.length > 0 ? accountDistribution[index] : undefined;
        if (assigned) {
            return {
                ...comment,
                authorName: assigned.name,
                avatarUrl: assigned.avatar,
                assignedAccount: assigned // Save the assignment for execution phase
            };
        }
        return comment;
    });

    const titlePrefix = inputMode === 'manual' ? '[Thủ công] ' : '';
    const titleSource = inputMode === 'manual' ? (manualInput.split('\n')[0] || 'Manual Content') : postContent;

    const newCampaign: Campaign = {
      id: Date.now().toString(),
      title: titlePrefix + titleSource.slice(0, 30) + (titleSource.length > 30 ? '...' : ''),
      targetUrl,
      postContent: inputMode === 'manual' ? 'Nội dung nhập thủ công' : postContent,
      platform,
      targetSentiment: sentiment,
      status: status,
      createdAt: new Date(),
      scheduledTime: (isScheduling && scheduleTime) ? scheduleTime : undefined,
      comments: finalComments
    };

    onSave(newCampaign);
    
    if (status === 'scheduled') {
        alert(`Đã đặt lịch chạy vào: ${new Date(scheduleTime).toLocaleString('vi-VN')}\nVui lòng giữ tab này mở để hệ thống tự động chạy.`);
    } else {
        alert("Đã lưu chiến dịch thành công! \nCác tài khoản đã được gán tự động vào từng comment.");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleSelectRandom = () => {
      if (quickSelectCount <= 0) return;
      const count = Math.min(quickSelectCount, accounts.length);
      const shuffled = [...accounts].sort(() => 0.5 - Math.random());
      const selectedIds = shuffled.slice(0, count).map(a => a.id);
      setSelectedAccounts(selectedIds);
  };

  const handleSelectAll = () => {
      setSelectedAccounts(accounts.map(a => a.id));
  };

  const handleDeselectAll = () => {
      setSelectedAccounts([]);
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-8rem)]">
        {/* Configuration Panel */}
        <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
          <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-6">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Wand2 className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-bold text-gray-800">Cấu hình Chiến dịch</h2>
            </div>

            <div className="space-y-5">
              {/* Target URL */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Link bài viết (Target URL) <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <LinkIcon className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    value={targetUrl}
                    onChange={(e) => setTargetUrl(e.target.value)}
                    placeholder="Dán link bài viết Reels/Post/Group..."
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 text-sm"
                  />
                </div>
              </div>

              {/* Account Selection */}
              <div>
                <div className="flex justify-between items-center mb-2">
                    <label className="text-sm font-medium text-gray-700">
                        Chọn tài khoản Seeding ({activeSeedingAccounts.length}/{accounts.length})
                    </label>
                    <button 
                        onClick={onNavigateToAccounts}
                        className="text-xs font-semibold text-blue-600 hover:text-blue-700 hover:underline flex items-center gap-1"
                    >
                         Quản lý TK <ArrowRight className="w-3 h-3" />
                    </button>
                </div>
                
                {/* Quick Selection Toolbar */}
                {accounts.length > 0 && (
                    <div className="flex items-center flex-wrap gap-2 mb-3 bg-gray-50/80 p-2 rounded-lg border border-gray-100">
                        <button 
                            onClick={handleSelectAll}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:text-blue-600 hover:border-blue-300 transition-colors"
                            title="Chọn tất cả"
                        >
                            <CheckSquare className="w-3 h-3" /> Tất cả
                        </button>
                         <button 
                            onClick={handleDeselectAll}
                            className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-gray-600 bg-white border border-gray-200 rounded hover:text-red-600 hover:border-red-300 transition-colors"
                            title="Bỏ chọn tất cả"
                        >
                            <Square className="w-3 h-3" /> Bỏ chọn
                        </button>
                        
                        <div className="h-4 w-px bg-gray-300 mx-1"></div>
                        
                        <div className="flex items-center gap-1 bg-white border border-gray-200 rounded p-0.5">
                            <input 
                                type="number" 
                                min="1" 
                                max={accounts.length}
                                value={quickSelectCount}
                                onChange={(e) => setQuickSelectCount(parseInt(e.target.value) || 0)}
                                className="w-10 h-6 text-xs text-center border-none focus:ring-0 p-0"
                            />
                            <button 
                                onClick={handleSelectRandom}
                                className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-white bg-blue-500 rounded hover:bg-blue-600 transition-colors shadow-sm"
                            >
                                <Shuffle className="w-3 h-3" /> Random
                            </button>
                        </div>
                    </div>
                )}

                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
                  {accounts.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 flex flex-col items-center">
                        <Users className="w-6 h-6 mb-2 text-gray-300" />
                        <span className="text-xs">Chưa có tài khoản nào.</span>
                        <button onClick={onNavigateToAccounts} className="mt-2 text-xs bg-white border border-gray-300 px-3 py-1 rounded shadow-sm hover:border-blue-500 hover:text-blue-600">
                           + Nạp tài khoản
                        </button>
                      </div>
                  ) : (
                      accounts.map(acc => {
                        const uid = getUID(acc.cookie);
                        return (
                        <div key={acc.id} onClick={() => toggleAccount(acc.id)} className={`group flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors mb-1 ${selectedAccounts.includes(acc.id) ? 'bg-white shadow-sm border border-blue-100' : 'hover:bg-gray-100 border border-transparent'}`}>
                          <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${selectedAccounts.includes(acc.id) ? 'bg-blue-600 border-blue-600' : 'border-gray-300 bg-white'}`}>
                            {selectedAccounts.includes(acc.id) && <Check className="w-3 h-3 text-white" />}
                          </div>
                          
                          <div className="relative">
                            <img src={acc.avatar} alt="" className="w-8 h-8 rounded-full object-cover" />
                          </div>

                          <div className="flex-1 min-w-0">
                            <div className="flex flex-col">
                                <div className="flex items-center gap-2">
                                    <p className="text-sm font-medium text-gray-800 truncate">{acc.name}</p>
                                    {acc.cookie && (
                                        <div className="group/shield relative" title="Cookie Available">
                                            <ShieldCheck className="w-3 h-3 text-green-500" />
                                        </div>
                                    )}
                                </div>
                                {uid && (
                                    <p className="text-[10px] text-gray-400 font-mono flex items-center gap-1">
                                        <Fingerprint className="w-2.5 h-2.5" /> {uid}
                                    </p>
                                )}
                            </div>
                          </div>
                        </div>
                      )})
                  )}
                </div>
              </div>

              {/* INPUT MODE TABS */}
              <div>
                  <div className="flex bg-gray-100 p-1 rounded-lg mb-3">
                      <button 
                          onClick={() => setInputMode('ai')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${inputMode === 'ai' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          <Bot className="w-4 h-4" /> Dùng AI (Gemini)
                      </button>
                      <button 
                          onClick={() => setInputMode('manual')}
                          className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-md text-xs font-bold transition-all ${inputMode === 'manual' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                      >
                          <Edit3 className="w-4 h-4" /> Tự nhập thủ công
                      </button>
                  </div>

                  {inputMode === 'ai' ? (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Chủ đề bài viết (Prompt)</label>
                        <textarea
                          value={postContent}
                          onChange={(e) => setPostContent(e.target.value)}
                          placeholder="Ví dụ: Review quán cà phê, bán quần áo, tranh luận về bóng đá..."
                          className="w-full h-24 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 resize-none text-sm"
                        />
                         <button 
                          onClick={() => setPostContent("Xả kho 500 mẫu áo thun cotton 100%, giá chỉ 49k/cái. Freeship hôm nay!")}
                          className="text-xs text-blue-600 font-medium mt-2 hover:underline flex items-center gap-1"
                         >
                           <Sparkles className="w-3 h-3" /> Dùng mẫu bán hàng
                         </button>
                      </>
                  ) : (
                      <>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Danh sách Comment (Mỗi dòng 1 nội dung)</label>
                        <textarea
                          value={manualInput}
                          onChange={(e) => setManualInput(e.target.value)}
                          placeholder={`Tuyệt vời quá shop ơi\nIb giá giúp mình\nShip COD không ạ?\n...`}
                          className="w-full h-32 px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 resize-none text-sm font-mono leading-relaxed"
                        />
                         <div className="mt-2 text-xs text-gray-500 flex items-center gap-2">
                             <FileText className="w-3 h-3" />
                             Đã nhập: <span className="font-bold text-blue-600">{manualInput.split('\n').filter(l => l.trim().length > 0).length}</span> dòng
                         </div>
                      </>
                  )}
              </div>

              {/* Settings (Only show valid options based on mode) */}
              <div className="space-y-4">
                {inputMode === 'ai' && (
                    <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Thái độ</label>
                        <select
                        value={sentiment}
                        onChange={(e) => setSentiment(e.target.value as Sentiment)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                        {Object.values(Sentiment).map((s) => (
                            <option key={s} value={s}>{s}</option>
                        ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Phong cách</label>
                        <select
                        value={mode}
                        onChange={(e) => setMode(e.target.value as SeedingMode)}
                        className="w-full px-3 py-2.5 rounded-xl border border-gray-200 text-sm focus:ring-2 focus:ring-blue-500"
                        >
                        {Object.values(SeedingMode).map((m) => (
                            <option key={m} value={m}>{m}</option>
                        ))}
                        </select>
                    </div>
                    </div>
                )}

                <div>
                  <div className="flex justify-between items-center mb-2">
                      <label className="block text-sm font-medium text-gray-700">Số lượng comment</label>
                      
                      {inputMode === 'ai' && (
                          <div className="flex items-center gap-2">
                               <input 
                                    type="checkbox" 
                                    id="strictMode"
                                    checked={isStrictOneToOne}
                                    onChange={(e) => setIsStrictOneToOne(e.target.checked)}
                                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                               />
                               <label htmlFor="strictMode" className="text-xs text-gray-600 cursor-pointer select-none">
                                   1 Nick / 1 Comment
                               </label>
                          </div>
                      )}
                      <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">{quantity}</span>
                  </div>
                  
                  {inputMode === 'ai' ? (
                      <div className={`flex items-center gap-3 ${isStrictOneToOne ? 'opacity-50 cursor-not-allowed' : ''}`}>
                        <input
                          type="range"
                          min="1"
                          max="50"
                          step="1"
                          value={quantity}
                          disabled={isStrictOneToOne}
                          onChange={(e) => setQuantity(Number(e.target.value))}
                          className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:cursor-not-allowed"
                        />
                      </div>
                  ) : (
                      <div className="text-xs text-gray-500 bg-gray-100 p-2 rounded">
                          Số lượng comment được tính tự động dựa trên số dòng bạn nhập bên trên.
                      </div>
                  )}

                  {inputMode === 'ai' && (
                    <div className="flex justify-between mt-1 text-[10px] text-gray-400">
                        <span>1</span>
                        <span>50</span>
                    </div>
                  )}
                </div>
              </div>

              <button
                onClick={handleGenerate}
                disabled={isGenerating || (inputMode === 'ai' && !postContent) || (inputMode === 'manual' && !manualInput)}
                className={`w-full py-3.5 rounded-xl font-semibold text-white shadow-lg shadow-blue-200 flex items-center justify-center gap-2 transition-all ${
                  isGenerating || (inputMode === 'ai' && !postContent) || (inputMode === 'manual' && !manualInput)
                    ? 'bg-gray-300 cursor-not-allowed shadow-none'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-xl hover:-translate-y-0.5'
                }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Đang xử lý...
                  </>
                ) : (
                  <>
                    {inputMode === 'ai' ? <Wand2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                    {inputMode === 'ai' ? 'Tạo Seeding (AI)' : 'Xác nhận nội dung'}
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-gray-500" />
              <h2 className="text-lg font-bold text-gray-800">Kết quả ({generatedComments.length})</h2>
            </div>
            {generatedComments.length > 0 && (
               <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white border border-gray-200 rounded-lg mr-2 p-1">
                      <button 
                        onClick={() => setIsScheduling(!isScheduling)}
                        className={`p-2 rounded-md transition-all ${isScheduling ? 'bg-purple-100 text-purple-600' : 'text-gray-400 hover:bg-gray-50'}`}
                        title="Đặt lịch chạy"
                      >
                         <CalendarClock className="w-5 h-5" />
                      </button>
                      {isScheduling && (
                          <input 
                            type="datetime-local" 
                            className="text-xs border-none focus:ring-0 text-gray-600 bg-transparent p-0 pl-1"
                            value={scheduleTime}
                            onChange={(e) => setScheduleTime(e.target.value)}
                          />
                      )}
                  </div>
                  
                  <button onClick={handleGenerate} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="Tạo lại">
                     <RefreshCw className="w-5 h-5" />
                  </button>
                  
                  <button 
                    onClick={() => handleSaveCampaign(false)} 
                    className={`px-4 py-2 text-white text-sm font-medium rounded-lg flex items-center gap-2 shadow-sm transition-colors
                        ${isScheduling 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-green-600 hover:bg-green-700'
                        }
                    `}
                  >
                     {isScheduling ? <CalendarClock className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                     {isScheduling ? 'Đặt lịch' : 'Lưu & Chạy'}
                  </button>
               </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
            {generatedComments.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4">
                <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mb-2">
                   {inputMode === 'ai' ? <Sparkles className="w-10 h-10 text-gray-300" /> : <Edit3 className="w-10 h-10 text-gray-300" />}
                </div>
                <p className="max-w-xs">
                    {inputMode === 'ai' ? "Nhập Link, chọn Phong cách để AI tạo kịch bản." : "Nhập nội dung thủ công để bắt đầu."}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                 {/* Visual Indication of Rotation */}
                 {activeSeedingAccounts.length > 0 ? (
                     <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-800 flex items-center gap-2 mb-2">
                         <UserCircle2 className="w-4 h-4" />
                         Bạn đã chọn {activeSeedingAccounts.length} tài khoản.
                         {generatedComments.length > activeSeedingAccounts.length && <span className="text-orange-600 ml-1 font-bold">Lưu ý: Có {generatedComments.length} comment nên một số nick sẽ đăng nhiều lần.</span>}
                     </div>
                 ) : (
                     <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 text-xs text-orange-800 flex items-center gap-2 mb-2">
                         <AlertCircle className="w-4 h-4" />
                         Chưa có tài khoản thật. Tên và Avatar bên dưới là giả định.
                     </div>
                 )}

                {generatedComments.map((comment, idx) => {
                  // Determine Poster using Randomized Distribution
                  const assignedAccount = activeSeedingAccounts.length > 0 
                      ? accountDistribution[idx] || activeSeedingAccounts[0] // Fallback safe
                      : null; // Fallback to AI persona

                  const displayName = assignedAccount ? assignedAccount.name : comment.authorName;
                  const displayAvatar = assignedAccount ? assignedAccount.avatar : comment.avatarUrl;
                  const isRealAccount = !!assignedAccount;

                  return (
                    <div key={comment.id} className="group bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-all">
                      <div className="flex items-start gap-4">
                        <div className="relative shrink-0">
                             <img 
                              src={displayAvatar} 
                              alt="Avatar" 
                              className="w-10 h-10 rounded-full object-cover border border-gray-100"
                            />
                            {isRealAccount && <div className="absolute -bottom-1 -right-1 bg-green-500 border-2 border-white w-3 h-3 rounded-full"></div>}
                        </div>
                       
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <div className="flex flex-col">
                                <h4 className={`font-bold text-sm ${isRealAccount ? 'text-blue-700' : 'text-gray-600'}`}>
                                    {displayName}
                                </h4>
                                {isRealAccount && <span className="text-[10px] text-green-600 flex items-center gap-0.5"><ShieldCheck className="w-3 h-3" /> Real Account</span>}
                            </div>
                            <button onClick={() => copyToClipboard(comment.text)} className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
                                <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-gray-800 text-sm leading-relaxed">{comment.text}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};