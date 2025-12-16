import React, { useState } from 'react';
import { SeedingAccount, SeedingMode, Sentiment, Platform, Campaign, TrustWorkflowConfig, HumanizeConfig } from '../types';
import { generateSeedingComments } from '../services/geminiService';
import { Coffee, Wand2, Loader2, Sparkles, Send, CheckCircle2, AlertCircle, Shuffle, Copy, User, UserCircle2, ArrowRight, History, Calendar, Eye, RotateCcw, Edit3, Bot, FileText, MousePointer2, ThumbsUp, Layers, ArrowDown, Smartphone, Keyboard, Eye as EyeIcon, PauseCircle } from 'lucide-react';

interface TrustBuilderProps {
  accounts: SeedingAccount[];
  campaigns: Campaign[]; 
  onExecute: (campaign: Campaign) => void;
  onNavigateToAccounts: () => void;
  onViewDetails: (campaign: Campaign) => void;
}

export const TrustBuilder: React.FC<TrustBuilderProps> = ({ accounts, campaigns, onExecute, onNavigateToAccounts, onViewDetails }) => {
  const [activeTab, setActiveTab] = useState<'create' | 'history'>('create');
  
  // Content Generation State
  const [inputMode, setInputMode] = useState<'ai' | 'manual'>('ai');
  const [topic, setTopic] = useState('');
  const [manualInput, setManualInput] = useState('');
  const [sentiment, setSentiment] = useState<Sentiment>(Sentiment.DAILY_LIFE);
  const [generatedStatuses, setGeneratedStatuses] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);

  // WORKFLOW CONFIGURATION
  const [enablePosting, setEnablePosting] = useState(true);
  const [enableFeedSurfing, setEnableFeedSurfing] = useState(true);
  const [surfDuration, setSurfDuration] = useState(60); // seconds
  const [likeCount, setLikeCount] = useState(3); // items

  // HUMANIZE CONFIGURATION (Trust Specific)
  const [humanizeEnabled, setHumanizeEnabled] = useState(true);
  const [typingSpeed, setTypingSpeed] = useState<'slow' | 'normal' | 'fast'>('normal');
  const [randomScroll, setRandomScroll] = useState(true);
  const [readMoreAction, setReadMoreAction] = useState(false);
  const [randomDelay, setRandomDelay] = useState(true);

  const trustHistory = campaigns.filter(c => c.platform === Platform.FACEBOOK_PROFILE);

  const handleGenerate = async () => {
    if (!enablePosting) {
        // If not posting, just mock data for the selected accounts so we can run interaction only
        const mapped = selectedAccounts.map((accId, index) => {
            const acc = accounts.find(a => a.id === accId);
            return {
                account: acc,
                content: "(Chỉ tương tác - Không đăng bài)",
                id: `interaction-only-${index}`
            };
        });
        setGeneratedStatuses(mapped);
        return;
    }

    if (inputMode === 'ai' && !topic.trim()) {
        alert("Vui lòng nhập chủ đề status!");
        return;
    }
    
    if (inputMode === 'manual' && !manualInput.trim()) {
        alert("Vui lòng nhập nội dung status!");
        return;
    }

    if (selectedAccounts.length === 0) {
        alert("Vui lòng chọn ít nhất 1 tài khoản!");
        return;
    }

    setIsGenerating(true);
    setGeneratedStatuses([]);

    try {
        let contents: any[] = [];

        if (inputMode === 'manual') {
            const lines = manualInput.split('\n').filter(l => l.trim().length > 0);
            if(lines.length === 0) {
                 alert("Không có nội dung hợp lệ.");
                 setIsGenerating(false);
                 return;
            }
            contents = lines.map((text, i) => ({
                id: `manual-status-${Date.now()}-${i}`,
                text: text.trim()
            }));
            await new Promise(r => setTimeout(r, 500));
        } else {
            const count = selectedAccounts.length;
            const generated = await generateSeedingComments(
                topic, 
                Platform.FACEBOOK_PROFILE, 
                sentiment, 
                SeedingMode.STATUS_CAPTION, 
                Math.max(count, 3) 
            );
            contents = generated;
        }

        const mapped = selectedAccounts.map((accId, index) => {
            const acc = accounts.find(a => a.id === accId);
            const content = contents[index % contents.length]; 
            return {
                account: acc,
                content: content.text,
                id: content.id || `status-${index}`
            };
        });

        setGeneratedStatuses(mapped);
    } catch (error) {
        console.error(error);
        alert("Lỗi khi tạo nội dung.");
    } finally {
        setIsGenerating(false);
    }
  };

  const handlePostNow = () => {
      if (generatedStatuses.length === 0 && enablePosting) return;
      if (selectedAccounts.length === 0) return;

      const campaignComments = generatedStatuses.map((item, idx) => ({
          id: `trust-${Date.now()}-${idx}`,
          text: item.content,
          authorName: item.account?.name || 'Unknown',
          avatarUrl: item.account?.avatar,
          sentiment: sentiment,
          isUsed: false,
          assignedAccount: item.account
      }));

      const titleSource = inputMode === 'manual' ? (manualInput.split('\n')[0] || 'Manual Status') : topic;
      const workflowTitle = `[Quy trình Nuôi] ${enablePosting ? 'Đăng bài + ' : ''}${enableFeedSurfing ? 'Tương tác' : ''} - ${titleSource.slice(0, 15)}`;

      const humanizeConfig: HumanizeConfig = {
          enabled: humanizeEnabled,
          typingSpeed,
          randomScroll,
          readMoreAction,
          randomDelay
      };

      const trustConfig: TrustWorkflowConfig = {
          enablePosting,
          enableFeedSurfing,
          surfDuration,
          likeCount,
          humanize: humanizeConfig
      };

      const trustCampaign: Campaign = {
          id: `trust-camp-${Date.now()}`,
          title: workflowTitle,
          targetUrl: 'https://www.facebook.com', 
          postContent: titleSource,
          platform: Platform.FACEBOOK_PROFILE,
          targetSentiment: sentiment,
          status: 'generated',
          createdAt: new Date(),
          comments: campaignComments,
          trustConfig: trustConfig // Attach config
      };

      onExecute(trustCampaign);
  };

  const toggleAccount = (id: string) => {
    setSelectedAccounts(prev => 
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const selectAll = () => setSelectedAccounts(accounts.map(a => a.id));
  const deselectAll = () => setSelectedAccounts([]);

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
        {/* Navigation Tabs */}
        <div className="flex items-center gap-4 mb-6 border-b border-gray-200">
            <button 
                onClick={() => setActiveTab('create')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'create' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <Layers className="w-4 h-4" /> Thiết lập Quy trình
            </button>
            <button 
                onClick={() => setActiveTab('history')}
                className={`pb-3 px-2 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'history' ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
            >
                <History className="w-4 h-4" /> Lịch sử Nuôi ({trustHistory.length})
            </button>
        </div>

        {activeTab === 'create' ? (
             <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
                {/* Configuration Panel */}
                <div className="lg:col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar">
                    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                        <div className="flex items-center gap-2 mb-6">
                            <div className="bg-orange-100 p-2 rounded-lg">
                                <Coffee className="w-5 h-5 text-orange-600" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-gray-800">Quy trình Nuôi Nick (Trust Builder)</h2>
                                <p className="text-xs text-gray-500">Giả lập hành vi người dùng thật để tăng độ tin cậy cho tài khoản.</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {/* Account Selection */}
                            <div>
                                <div className="flex justify-between items-center mb-2">
                                    <label className="text-sm font-medium text-gray-700">
                                        Chọn tài khoản thực thi ({selectedAccounts.length})
                                    </label>
                                    <div className="flex gap-2">
                                        <button onClick={selectAll} className="text-xs text-blue-600 hover:underline">Tất cả</button>
                                        <span className="text-gray-300">|</span>
                                        <button onClick={deselectAll} className="text-xs text-gray-500 hover:underline">Bỏ chọn</button>
                                    </div>
                                </div>

                                <div className="bg-gray-50 rounded-xl p-3 border border-gray-200 max-h-48 overflow-y-auto custom-scrollbar">
                                    {accounts.length === 0 ? (
                                        <div className="text-center py-8 text-gray-400">
                                            <p className="text-xs">Chưa có tài khoản nào.</p>
                                            <button onClick={onNavigateToAccounts} className="mt-2 text-xs text-blue-600 font-medium hover:underline">
                                                + Thêm tài khoản
                                            </button>
                                        </div>
                                    ) : (
                                        accounts.map(acc => (
                                            <div key={acc.id} onClick={() => toggleAccount(acc.id)} className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors mb-1 ${selectedAccounts.includes(acc.id) ? 'bg-white shadow-sm border border-orange-200' : 'hover:bg-gray-100 border border-transparent'}`}>
                                                <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selectedAccounts.includes(acc.id) ? 'bg-orange-500 border-orange-500' : 'border-gray-300 bg-white'}`}>
                                                    {selectedAccounts.includes(acc.id) && <CheckCircle2 className="w-3 h-3 text-white" />}
                                                </div>
                                                <img src={acc.avatar} className="w-8 h-8 rounded-full" />
                                                <p className="text-sm font-medium text-gray-700 truncate">{acc.name}</p>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </div>

                            {/* Workflow Builder */}
                            <div className="border-t border-gray-100 pt-4">
                                <h3 className="text-sm font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <Layers className="w-4 h-4 text-blue-600" /> Cấu hình luồng hành động
                                </h3>
                                
                                <div className="space-y-3">
                                    {/* Step 1: Post */}
                                    <div className={`p-4 rounded-xl border transition-all ${enablePosting ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={enablePosting} onChange={e => setEnablePosting(e.target.checked)} className="w-4 h-4 text-blue-600 rounded" />
                                                <span className="font-bold text-sm text-gray-800">Bước 1: Đăng bài lên tường (Build Profile)</span>
                                            </label>
                                        </div>
                                        
                                        {enablePosting && (
                                            <div className="pl-6 space-y-3">
                                                 <div className="flex bg-white p-1 rounded-lg border border-gray-200">
                                                    <button onClick={() => setInputMode('ai')} className={`flex-1 py-1.5 text-xs font-bold rounded ${inputMode === 'ai' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>Dùng AI</button>
                                                    <button onClick={() => setInputMode('manual')} className={`flex-1 py-1.5 text-xs font-bold rounded ${inputMode === 'manual' ? 'bg-blue-100 text-blue-700' : 'text-gray-500'}`}>Thủ công</button>
                                                 </div>
                                                 {inputMode === 'ai' ? (
                                                     <textarea value={topic} onChange={e => setTopic(e.target.value)} placeholder="Chủ đề status..." className="w-full text-xs p-2 rounded border border-gray-200 h-16" />
                                                 ) : (
                                                     <textarea value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Nội dung status..." className="w-full text-xs p-2 rounded border border-gray-200 h-16" />
                                                 )}
                                            </div>
                                        )}
                                    </div>

                                    <div className="flex justify-center -my-2 relative z-10">
                                        <div className="bg-white border border-gray-200 rounded-full p-1 text-gray-400">
                                            <ArrowDown className="w-3 h-3" />
                                        </div>
                                    </div>

                                    {/* Step 2: Interact */}
                                    <div className={`p-4 rounded-xl border transition-all ${enableFeedSurfing ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200 opacity-60'}`}>
                                        <div className="flex items-center justify-between mb-3">
                                            <label className="flex items-center gap-2 cursor-pointer">
                                                <input type="checkbox" checked={enableFeedSurfing} onChange={e => setEnableFeedSurfing(e.target.checked)} className="w-4 h-4 text-green-600 rounded" />
                                                <span className="font-bold text-sm text-gray-800">Bước 2: Đi tương tác dạo (Build Trust/Cookie)</span>
                                            </label>
                                        </div>
                                        
                                        {enableFeedSurfing && (
                                            <div className="pl-6 grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><MousePointer2 className="w-3 h-3" /> Lướt Newfeed (giây)</label>
                                                    <input type="number" value={surfDuration} onChange={e => setSurfDuration(parseInt(e.target.value))} className="w-full text-xs p-2 rounded border border-gray-200" min="30" />
                                                </div>
                                                <div>
                                                    <label className="block text-xs font-medium text-gray-600 mb-1 flex items-center gap-1"><ThumbsUp className="w-3 h-3" /> Like ngẫu nhiên</label>
                                                    <input type="number" value={likeCount} onChange={e => setLikeCount(parseInt(e.target.value))} className="w-full text-xs p-2 rounded border border-gray-200" min="1" max="10" />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                            
                            {/* HUMANIZE CONFIGURATION */}
                            <div className="border-t border-gray-100 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                    <h3 className="text-sm font-bold text-gray-800 flex items-center gap-2">
                                        <Smartphone className="w-4 h-4 text-purple-600" /> Cấu hình hành vi (Humanize)
                                    </h3>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input type="checkbox" checked={humanizeEnabled} onChange={(e) => setHumanizeEnabled(e.target.checked)} className="sr-only peer" />
                                        <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-purple-600"></div>
                                    </label>
                                </div>
                                
                                {humanizeEnabled && (
                                    <div className="bg-purple-50 rounded-xl p-4 border border-purple-100 space-y-3 animate-in fade-in slide-in-from-top-2">
                                        <div className="grid grid-cols-2 gap-3">
                                            {enablePosting && (
                                                <div className="col-span-2">
                                                    <label className="text-xs font-medium text-purple-900 mb-1 flex items-center gap-1"><Keyboard className="w-3 h-3" /> Tốc độ gõ Status</label>
                                                    <div className="flex bg-white rounded border border-purple-200 p-0.5">
                                                        {(['slow', 'normal', 'fast'] as const).map(s => (
                                                            <button 
                                                                key={s} 
                                                                onClick={() => setTypingSpeed(s)}
                                                                className={`flex-1 text-[10px] font-bold py-1 rounded transition-colors ${typingSpeed === s ? 'bg-purple-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
                                                            >
                                                                {s === 'slow' ? 'Chậm' : s === 'normal' ? 'Tự nhiên' : 'Nhanh'}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                            )}
                                            {enableFeedSurfing && (
                                                <>
                                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-purple-200 cursor-pointer" onClick={() => setRandomScroll(!randomScroll)}>
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${randomScroll ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                            {randomScroll && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                        </div>
                                                        <span className="text-xs text-gray-700">Cuộn trang ngẫu nhiên</span>
                                                    </div>
                                                    <div className="flex items-center gap-2 bg-white p-2 rounded border border-purple-200 cursor-pointer" onClick={() => setReadMoreAction(!readMoreAction)}>
                                                        <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${readMoreAction ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                            {readMoreAction && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                        </div>
                                                        <span className="text-xs text-gray-700">Click "Xem thêm/Ảnh"</span>
                                                    </div>
                                                </>
                                            )}
                                            <div className="col-span-2 flex items-center gap-2 bg-white p-2 rounded border border-purple-200 cursor-pointer" onClick={() => setRandomDelay(!randomDelay)}>
                                                 <div className={`w-3 h-3 rounded-full border flex items-center justify-center ${randomDelay ? 'bg-purple-600 border-purple-600' : 'border-gray-300'}`}>
                                                        {randomDelay && <div className="w-1.5 h-1.5 bg-white rounded-full" />}
                                                 </div>
                                                 <span className="text-xs text-gray-700 flex items-center gap-1"><PauseCircle className="w-3 h-3" /> Nghỉ ngẫu nhiên giữa các thao tác (Random Delay)</span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Generate Button */}
                            <button
                                onClick={handleGenerate}
                                disabled={isGenerating}
                                className={`w-full py-3 rounded-xl font-bold text-white shadow-lg shadow-orange-200 flex items-center justify-center gap-2 transition-all ${
                                    isGenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-gradient-to-r from-orange-500 to-pink-500 hover:from-orange-600 hover:to-pink-600 hover:-translate-y-0.5'
                                }`}
                            >
                                {isGenerating ? (
                                    <><Loader2 className="w-5 h-5 animate-spin" /> Đang chuẩn bị...</>
                                ) : (
                                    <><Wand2 className="w-5 h-5" /> Chuẩn bị Kịch bản</>
                                )}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Results Panel */}
                <div className="lg:col-span-7 bg-white rounded-2xl border border-gray-100 shadow-sm flex flex-col h-full overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                        <div>
                            <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                Kịch bản thực thi ({generatedStatuses.length} tác vụ)
                            </h2>
                        </div>
                        {generatedStatuses.length > 0 && (
                            <button 
                                onClick={handlePostNow}
                                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-sm flex items-center gap-2 transition-colors"
                            >
                                <Send className="w-4 h-4" /> Chạy Quy trình
                            </button>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto p-6 bg-gray-50/30">
                        {generatedStatuses.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-center text-gray-400 space-y-4">
                                <UserCircle2 className="w-16 h-16 text-gray-200" />
                                <p>Cấu hình quy trình bên trái và nhấn "Chuẩn bị" để xem trước.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {generatedStatuses.map((item, idx) => (
                                    <div key={idx} className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                                        <div className="absolute top-0 right-0 p-2 bg-gray-50 rounded-bl-xl border-b border-l border-gray-100 text-[10px] text-gray-500 font-mono">
                                            Task #{idx + 1}
                                        </div>
                                        <div className="flex items-center gap-3 mb-3 pb-3 border-b border-gray-50">
                                            <img src={item.account?.avatar} className="w-8 h-8 rounded-full border border-gray-200" />
                                            <div>
                                                <p className="text-sm font-bold text-blue-700">{item.account?.name}</p>
                                                <p className="text-[10px] text-gray-400">Thực hiện quy trình nuôi nick</p>
                                            </div>
                                        </div>
                                        
                                        <div className="space-y-2">
                                            {enablePosting && (
                                                <div className="flex gap-2">
                                                    <div className="min-w-[80px] text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded h-fit">Bước 1: Đăng</div>
                                                    <p className="text-gray-800 text-sm whitespace-pre-wrap font-medium flex-1 bg-gray-50 p-2 rounded">{item.content}</p>
                                                </div>
                                            )}
                                            {enableFeedSurfing && (
                                                 <div className="flex gap-2 items-center">
                                                    <div className="min-w-[80px] text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded h-fit">Bước 2: Tương tác</div>
                                                    <p className="text-xs text-gray-600 flex items-center gap-2">
                                                        <MousePointer2 className="w-3 h-3" /> Lướt {surfDuration}s 
                                                        <span className="text-gray-300">|</span> 
                                                        <ThumbsUp className="w-3 h-3" /> Like {likeCount} bài
                                                    </p>
                                                </div>
                                            )}
                                            
                                            {/* Show Humanize Info */}
                                            {humanizeEnabled && (
                                                <div className="flex gap-2 items-center mt-2 pt-2 border-t border-dashed border-gray-100">
                                                    <div className="min-w-[80px] text-[10px] font-bold text-purple-600 bg-purple-50 px-2 py-1 rounded h-fit flex items-center gap-1">
                                                        <Smartphone className="w-3 h-3" /> Humanize
                                                    </div>
                                                    <div className="flex gap-2">
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Gõ {typingSpeed}</span>
                                                        {randomScroll && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Scroll</span>}
                                                        {randomDelay && <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">Delay</span>}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
             </div>
        ) : (
             // HISTORY TAB
             <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-full flex flex-col">
                <div className="p-6 border-b border-gray-200">
                    <h2 className="text-lg font-bold text-gray-800">Lịch sử Hoạt động Nuôi Nick</h2>
                    <p className="text-xs text-gray-500 mt-1">Các phiên đăng status tự động đã thực hiện.</p>
                </div>
                
                {trustHistory.length === 0 ? (
                    <div className="flex-1 flex flex-col items-center justify-center text-center text-gray-400">
                        <History className="w-12 h-12 text-gray-200 mb-2" />
                        <p>Chưa có lịch sử hoạt động nào.</p>
                    </div>
                ) : (
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left">
                            <thead className="bg-orange-50 text-orange-800 text-xs uppercase font-semibold">
                                <tr>
                                    <th className="px-6 py-4">Chủ đề / Quy trình</th>
                                    <th className="px-6 py-4">Số lượng Nick</th>
                                    <th className="px-6 py-4">Trạng thái</th>
                                    <th className="px-6 py-4">Thời gian</th>
                                    <th className="px-6 py-4 text-right">Chi tiết</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {trustHistory.map((campaign) => (
                                    <tr key={campaign.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4">
                                            <p className="font-bold text-gray-800 line-clamp-1">{campaign.title.replace('[Nuôi Nick]', '').replace('[Quy trình Nuôi]', '')}</p>
                                            <div className="flex gap-1 mt-1">
                                                 {campaign.trustConfig?.enablePosting && <span className="text-[10px] bg-blue-100 text-blue-700 px-1 rounded">Post</span>}
                                                 {campaign.trustConfig?.enableFeedSurfing && <span className="text-[10px] bg-green-100 text-green-700 px-1 rounded">Interact</span>}
                                                 {campaign.trustConfig?.humanize?.enabled && <span className="text-[10px] bg-purple-100 text-purple-700 px-1 rounded flex items-center gap-0.5"><Smartphone className="w-2.5 h-2.5" /> Human</span>}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex -space-x-2">
                                                {campaign.comments.slice(0, 5).map((c, i) => (
                                                    <img key={i} src={c.assignedAccount?.avatar || c.avatarUrl} className="w-8 h-8 rounded-full border-2 border-white" title={c.authorName} />
                                                ))}
                                                {campaign.comments.length > 5 && (
                                                    <div className="w-8 h-8 rounded-full border-2 border-white bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                                                        +{campaign.comments.length - 5}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                                                campaign.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                            }`}>
                                                {campaign.status === 'completed' ? 'Hoàn tất' : 'Đang chạy/Chờ'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-500">
                                            <div className="flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-gray-400" />
                                                {new Date(campaign.createdAt).toLocaleString('vi-VN')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button 
                                                    onClick={() => onViewDetails(campaign)}
                                                    className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                    title="Xem chi tiết nick đã đăng"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button 
                                                    onClick={() => onExecute(campaign)}
                                                    className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                                    title="Chạy lại"
                                                >
                                                    <RotateCcw className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
             </div>
        )}
    </div>
  );
};
