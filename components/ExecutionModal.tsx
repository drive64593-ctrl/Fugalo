import React, { useEffect, useState, useRef } from 'react';
import { Campaign, Platform } from '../types';
import { decryptData } from '../utils/crypto';
import { X, Terminal, CheckCircle2, Loader2, AlertCircle, Play, ThumbsUp, MessageCircle, Share2, MoreHorizontal, Globe, Send, Server, Shield, Zap, User, ExternalLink, Wifi, RefreshCw, Pause, PlayCircle, Timer, UserCircle2, Smartphone, PenTool, SkipForward, AlertTriangle, MousePointer2, Coffee, Layers, Fingerprint, MonitorPlay, Eye, ArrowRight } from 'lucide-react';

interface ExecutionModalProps {
  campaign: Campaign;
  onClose: () => void;
  onComplete: () => void;
  isExtensionConnected: boolean; 
}

interface Log {
  id: string;
  message: string;
  status: 'pending' | 'success' | 'error' | 'info' | 'network' | 'bridge';
  timestamp: string;
}

export const ExecutionModal: React.FC<ExecutionModalProps> = ({ campaign, onClose, onComplete, isExtensionConnected }) => {
  const [logs, setLogs] = useState<Log[]>([]);
  const [progress, setProgress] = useState(0);
  const [isFinished, setIsFinished] = useState(false);
  
  // Execution Control
  const [isPaused, setIsPaused] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [currentActionDescription, setCurrentActionDescription] = useState<string>("Khởi tạo...");
  const isPausedRef = useRef(false); 

  // Sync Logic State
  const [isWaitingForSync, setIsWaitingForSync] = useState(false);
  const [showManualSkip, setShowManualSkip] = useState(false);
  const skipResolverRef = useRef<(() => void) | null>(null);
  
  // Identity Verification Refs
  const identityResolverRef = useRef<((success: boolean) => void) | null>(null);

  const logsEndRef = useRef<HTMLDivElement>(null);
  const [targetStatus, setTargetStatus] = useState<'idle' | 'checking' | 'connected' | 'not_found'>('idle');
  
  // Track current account
  const [currentAccountInfo, setCurrentAccountInfo] = useState<{name: string, avatar: string} | null>(null);
  const [currentAccountID, setCurrentAccountID] = useState<string | null>(null);

  // Load Delay Settings
  const [delaySetting, setDelaySetting] = useState(3);

  // DETERMINE MODE
  const isTrustMode = campaign.trustConfig != null || campaign.platform === Platform.FACEBOOK_PROFILE;

  useEffect(() => {
    const savedDelay = localStorage.getItem('autoseed_setting_delay');
    if (savedDelay) {
        setDelaySetting(parseInt(savedDelay, 10));
    }
  }, []);

  const addLog = (message: string, status: Log['status'] = 'info') => {
    const now = new Date();
    const time = now.toLocaleTimeString('vi-VN', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setLogs(prev => [...prev, {
      id: Math.random().toString(36).substr(2, 9),
      message,
      status,
      timestamp: time
    }]);
  };

  useEffect(() => {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
      isPausedRef.current = isPaused;
  }, [isPaused]);

  // Handle Extension Messages (Target Check & Identity Verify)
  useEffect(() => {
    const messageHandler = (event: MessageEvent) => {
        if (event.data.type === "AUTOSEED_TARGET_RESULT") {
            const found = event.data.found;
            setTargetStatus(found ? 'connected' : 'not_found');
            if (found) addLog(`[NETWORK] Target verified.`, 'success');
        }

        // IDENTITY VERIFICATION HANDLER
        if (event.data.type === "AUTOSEED_IDENTITY_REPORT") {
            const { uid, name } = event.data.payload;
            if (identityResolverRef.current) {
                if (uid) {
                    const isMatch = currentAccountID && (uid.includes(currentAccountID) || currentAccountID.includes(uid));
                    if (isMatch) {
                        addLog(`[AUTH] Đã xác minh: ${name}`, 'success');
                    } else {
                        addLog(`[INFO] Đã đăng nhập: ${name} (Khác ID gốc, nhưng chấp nhận)`, 'info');
                    }
                    identityResolverRef.current(true);
                } else {
                    // Don't log error here, just resolve false to let the loop handle retry
                    identityResolverRef.current(false);
                }
            }
        }

        // Action Complete Handler
        if (event.data.type === "AUTOSEED_ACTION_COMPLETE") {
             if (skipResolverRef.current) {
                 skipResolverRef.current();
                 skipResolverRef.current = null; // Consume
             }
        }
    };
    window.addEventListener("message", messageHandler);
    // Trigger initial check
    window.postMessage({ type: "AUTOSEED_TEST_TARGET", payload: { url: campaign.targetUrl } }, "*");

    return () => window.removeEventListener("message", messageHandler);
  }, [campaign.targetUrl, currentAccountID]);

  const togglePause = () => {
      setIsPaused(!isPaused);
      addLog(isPaused ? `[USER] Đang tiếp tục...` : `[USER] Đã tạm dừng.`, 'info');
  };

  const handleManualSkip = () => {
      if (skipResolverRef.current) {
          addLog(`[USER] Đã bỏ qua bước này.`, 'info');
          skipResolverRef.current();
          skipResolverRef.current = null;
      }
  };

  // V3.95 Professional Mode
  const performAccountSwitch = async (account: any): Promise<boolean> => {
      if (!account || !account.cookie) return false;
      
      const decryptedCookie = decryptData(account.cookie);
      if (!decryptedCookie) {
          addLog(`[ERROR] Decrypt failed: ${account.name}`, 'error');
          return false;
      }

      setCurrentAccountID(account.id);
      setCurrentAccountInfo({ name: account.name, avatar: account.avatar });

      // STEP 1: OPEN BROWSER
      setCurrentActionDescription(`Đang mở trình duyệt: ${account.name}`);
      addLog(`[BROWSER] Opening window for ${account.name}...`, 'bridge');
      
      window.postMessage({ 
          type: 'AUTOSEED_SWITCH_ACCOUNT', 
          payload: { 
              cookie: decryptedCookie,
              url: campaign.targetUrl
          } 
      }, '*');

      // STEP 2: WAIT FOR LOAD & VERIFY IDENTITY
      // Initial wait for browser to pop up
      await new Promise(r => setTimeout(r, 3000));

      let verified = false;
      let attempts = 0;
      const maxAttempts = 6; // More generous attempts

      while (!verified && attempts < maxAttempts) {
          attempts++;
          // Only update UI log periodically to avoid spam
          if (attempts === 1 || attempts % 2 === 0) {
             setCurrentActionDescription(`Đợi tải trang Facebook... (${attempts})`);
             addLog(`[WAIT] Waiting for Facebook load...`, 'pending');
          }
          
          const checkPromise = new Promise<boolean>((resolve) => {
              identityResolverRef.current = resolve;
              window.postMessage({ type: 'AUTOSEED_CHECK_IDENTITY' }, '*'); 
              setTimeout(() => resolve(false), 2500); 
          });

          verified = await checkPromise;
          
          if (!verified && attempts < maxAttempts) {
              await new Promise(r => setTimeout(r, 1000));
          }
      }

      identityResolverRef.current = null;

      if (verified) {
          addLog(`[SYSTEM] Browser Ready.`, 'success');
          return true;
      } else {
          return false;
      }
  };

  const waitForActionComplete = () => {
      return new Promise<void>((resolve) => {
          setIsWaitingForSync(true);
          setShowManualSkip(false);
          
          skipResolverRef.current = () => {
              setIsWaitingForSync(false);
              resolve();
          };
          
          const warnTimer = setTimeout(() => {
             setShowManualSkip(true);
          }, 8000); // 8s warning

          const timeoutLimit = isTrustMode && campaign.trustConfig?.enableFeedSurfing ? (campaign.trustConfig.surfDuration + 20) * 1000 : 45000;

          const timeoutTimer = setTimeout(() => {
              clearTimeout(warnTimer);
              if (skipResolverRef.current) {
                  addLog(`[TIMEOUT] Tự động bỏ qua do hết thời gian.`, 'error');
                  skipResolverRef.current(); 
              }
          }, timeoutLimit); 
      });
  };

  useEffect(() => {
    let isMounted = true;

    const runExecution = async () => {
      const modeText = isTrustMode ? 'TRUST WORKFLOW' : 'AUTO SEEDING';
      addLog(`[SYSTEM] Starting: ${modeText} (Pro V3.95)`, 'bridge');
      
      window.postMessage({ type: 'AUTOSEED_PING', payload: { version: '3.95' } }, '*');
      await new Promise(r => setTimeout(r, 500));

      const totalSteps = campaign.comments.length;
      
      for (let i = 0; i < totalSteps; i++) {
        if (!isMounted) return;
        setCurrentStepIndex(i);

        // Pause Check at start of loop
        while (isPausedRef.current) {
            setCurrentActionDescription("Đang tạm dừng...");
            await new Promise(r => setTimeout(r, 500));
            if (!isMounted) return;
        }
        
        const task = campaign.comments[i];
        setProgress(Math.round(((i) / totalSteps) * 100));

        // ACCOUNT SWITCH LOGIC
        let accountReady = false;
        if (task.assignedAccount) {
             while (!accountReady) {
                 if (!isMounted) return;
                 // Pause Check inside Loop
                 while (isPausedRef.current) {
                      setCurrentActionDescription("Đang tạm dừng...");
                      await new Promise(r => setTimeout(r, 500));
                 }

                 const success = await performAccountSwitch(task.assignedAccount);
                 if (success) {
                     accountReady = true;
                 } else {
                     setCurrentActionDescription("⚠️ Cảnh báo: Không tìm thấy cửa sổ FB!");
                     addLog("[ATTENTION] Không kết nối được trình duyệt. Vui lòng kiểm tra:", 'network');
                     addLog("1. Cửa sổ Facebook đã mở chưa?", 'info');
                     addLog("2. Bạn đã đăng nhập chưa?", 'info');
                     addLog("-> Bấm 'Tiếp tục' để thử lại.", 'bridge');
                     setIsPaused(true);
                 }
             }
        } else {
             // Fallback for simulation
        }

        const authorDisplay = task.assignedAccount ? task.assignedAccount.name : task.authorName;
        const authorAvatar = task.assignedAccount ? task.assignedAccount.avatar : null;

        // Ready delay
        await new Promise(r => setTimeout(r, 1000));

        const enablePosting = campaign.trustConfig ? campaign.trustConfig.enablePosting : true;
        
        if (enablePosting) {
            setCurrentActionDescription(isTrustMode ? "Đang soạn Status..." : "Đang soạn Comment...");
            addLog(`[EXEC] ${authorDisplay}: Soạn nội dung...`, 'bridge');
            
            window.postMessage({ 
                type: 'AUTOSEED_EXECUTE', 
                payload: { 
                    text: task.text,
                    url: campaign.targetUrl,
                    campaignId: campaign.id,
                    actionType: isTrustMode ? 'STATUS' : 'COMMENT',
                    config: {
                        isStatusPost: isTrustMode
                    },
                    accountInfo: { 
                        name: authorDisplay,
                        avatar: authorAvatar
                    }
                } 
            }, '*');
            
            await waitForActionComplete();
            addLog(`[DONE] Đã hoàn thành tác vụ.`, 'success');
        }

        if (campaign.trustConfig?.enableFeedSurfing) {
             setCurrentActionDescription(`Đang lướt Feed ${campaign.trustConfig.surfDuration}s...`);
             addLog(`[EXEC] Tương tác ngẫu nhiên...`, 'bridge');
             
             window.postMessage({ 
                type: 'AUTOSEED_EXECUTE', 
                payload: { 
                    url: campaign.targetUrl,
                    campaignId: campaign.id,
                    actionType: 'FEED_WALK',
                    trustConfig: campaign.trustConfig,
                    accountInfo: { 
                        name: authorDisplay,
                        avatar: authorAvatar
                    }
                } 
            }, '*');

            await waitForActionComplete();
        }

        if (i < totalSteps - 1) {
            const waitTime = delaySetting;
            setCurrentActionDescription(`Nghỉ ${waitTime}s...`);
            addLog(`[WAIT] Chờ ${waitTime}s để giống người thật...`, 'pending');
            for (let t = waitTime; t > 0; t--) {
                if (!isMounted) return;
                while (isPausedRef.current) await new Promise(r => setTimeout(r, 500));
                setCountdown(t);
                await new Promise(r => setTimeout(r, 1000));
            }
            setCountdown(0);
        } else {
             await new Promise(r => setTimeout(r, 1000));
        }
      }

      setProgress(100);
      setCurrentActionDescription("Hoàn tất!");
      addLog('[SYSTEM] Chiến dịch đã hoàn thành.', 'success');
      await new Promise(r => setTimeout(r, 500));
      setIsFinished(true);
      onComplete();
    };

    runExecution();
    return () => { isMounted = false; };
  }, [campaign]); 


  const borderColor = isTrustMode ? 'border-orange-500' : 'border-blue-500';
  const progressColor = isTrustMode ? 'bg-orange-500' : 'bg-blue-500';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-gray-900 w-full max-w-3xl rounded-2xl shadow-2xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        
        <div className={`flex items-center justify-between px-6 py-4 border-b border-gray-800 ${isTrustMode ? 'bg-orange-900/20' : 'bg-blue-900/20'}`}>
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${isTrustMode ? 'bg-orange-600 text-white' : 'bg-blue-600 text-white'}`}>
                {isTrustMode ? <Coffee className="w-5 h-5" /> : <Zap className="w-5 h-5" />}
            </div>
            <div>
                <h3 className={`font-mono text-base font-bold tracking-wider ${isTrustMode ? 'text-orange-400' : 'text-blue-400'}`}>
                    {isTrustMode ? 'TRUST BUILDER' : 'AUTO SEEDING'}
                </h3>
                <p className="text-xs text-gray-400 flex items-center gap-1">
                    <Terminal className="w-3 h-3" /> Pro Stable V3.95
                </p>
            </div>
          </div>
          {!isFinished && <button onClick={onClose} className="text-gray-500 hover:text-white transition-colors"><X className="w-6 h-6" /></button>}
        </div>

        <div className="p-6 bg-gray-800/50 border-b border-gray-700">
             <div className="flex flex-col md:flex-row gap-6 items-center">
                 <div className="flex flex-col items-center gap-2 min-w-[100px]">
                     <div className={`relative w-16 h-16 rounded-full border-4 ${isWaitingForSync ? 'animate-pulse border-yellow-500' : borderColor} p-0.5`}>
                         <img 
                            src={currentAccountInfo?.avatar || "https://ui-avatars.com/api/?name=System&background=333&color=fff"} 
                            className="w-full h-full rounded-full object-cover" 
                         />
                         <div className="absolute -bottom-1 -right-1 bg-gray-900 rounded-full p-1 border border-gray-700">
                             {isTrustMode ? <Shield className="w-4 h-4 text-green-500" /> : <MessageCircle className="w-4 h-4 text-blue-500" />}
                         </div>
                     </div>
                     <p className="text-xs font-bold text-gray-300 max-w-[120px] truncate text-center">
                         {currentAccountInfo?.name || "Loading..."}
                     </p>
                 </div>

                 <div className="flex-1 w-full space-y-3">
                     <div className="flex justify-between items-end">
                         <div>
                             <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mb-1">
                                 TRẠNG THÁI
                             </p>
                             <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                                 {isFinished ? 'HOÀN TẤT' : currentActionDescription}
                             </h2>
                         </div>
                         <div className="text-right">
                             <p className="text-3xl font-mono font-bold text-white">
                                 {currentStepIndex + (isFinished ? 1 : 0)}<span className="text-lg text-gray-500">/{campaign.comments.length}</span>
                             </p>
                         </div>
                     </div>
                     
                     <div className="h-3 w-full bg-gray-700 rounded-full overflow-hidden shadow-inner">
                         <div 
                            className={`h-full transition-all duration-300 ease-out ${isPaused ? 'bg-yellow-500' : progressColor} relative`} 
                            style={{ width: `${progress}%` }}
                         >
                             <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
                         </div>
                     </div>

                     {!isFinished && (
                         <div className="flex items-center gap-2 h-6">
                             {isWaitingForSync ? (
                                 <span className="text-xs text-yellow-400 font-mono flex items-center gap-2 animate-pulse">
                                     <MonitorPlay className="w-3 h-3 animate-spin" /> Đang thao tác trên trình duyệt...
                                 </span>
                             ) : countdown > 0 ? (
                                 <span className="text-xs text-blue-400 font-mono flex items-center gap-2">
                                     <Timer className="w-3 h-3" /> Tiếp tục sau: {countdown}s
                                 </span>
                             ) : (
                                 <span className="text-xs text-gray-500 font-mono">...</span>
                             )}
                         </div>
                     )}
                 </div>
             </div>
        </div>

        <div className="flex-1 p-4 overflow-y-auto font-mono text-xs space-y-1.5 bg-black/40 custom-scrollbar border-t border-gray-800">
          {logs.map((log) => (
            <div key={log.id} className="flex gap-3 animate-fade-in group hover:bg-white/5 p-0.5 rounded">
              <span className="text-gray-600 shrink-0 select-none">[{log.timestamp}]</span>
              <div className="flex items-start gap-2">
                {log.status === 'success' && <CheckCircle2 className="w-3.5 h-3.5 text-green-500 mt-0.5 shrink-0" />}
                {log.status === 'error' && <AlertCircle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />}
                {log.status === 'pending' && <Loader2 className="w-3.5 h-3.5 text-yellow-500 mt-0.5 animate-spin shrink-0" />}
                {log.status === 'bridge' && <Zap className="w-3.5 h-3.5 text-orange-400 mt-0.5 shrink-0" />}
                {log.status === 'network' && <Wifi className="w-3.5 h-3.5 text-blue-400 mt-0.5 shrink-0" />}
                <span className={`break-all ${log.status === 'success' ? 'text-green-400' : log.status === 'error' ? 'text-red-400' : log.status === 'pending' ? 'text-yellow-400' : log.status === 'bridge' ? 'text-orange-300 font-bold' : log.status === 'network' ? 'text-blue-300' : 'text-gray-300'}`}>{log.message}</span>
              </div>
            </div>
          ))}
          <div ref={logsEndRef} />
        </div>

        <div className="p-4 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center">
            <div className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-xs font-medium border ${targetStatus === 'connected' ? 'bg-gray-800 text-green-500 border-gray-700' : 'bg-gray-800 text-gray-400 border-gray-700'}`}>
                     <Wifi className="w-3 h-3" /> {targetStatus === 'connected' ? 'Connected' : 'Extension Ready'}
                </div>
            </div>

            <div className="flex items-center gap-3">
                {!isFinished ? (
                   <>
                       <button onClick={togglePause} className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold transition-all shadow-lg ${isPaused ? 'bg-green-600 hover:bg-green-500 text-white' : 'bg-gray-700 hover:bg-gray-600 text-gray-200'}`}>
                           {isPaused ? <PlayCircle className="w-4 h-4" /> : <Pause className="w-4 h-4" />} {isPaused ? "Tiếp tục" : "Tạm dừng"}
                       </button>
                       {showManualSkip && (
                           <button onClick={handleManualSkip} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-sm font-bold shadow-lg animate-pulse">
                               <SkipForward className="w-4 h-4" /> Bỏ qua
                           </button>
                       )}
                       {isPaused && (
                           <button onClick={() => { if(skipResolverRef.current) skipResolverRef.current(); setIsPaused(false); }} className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg text-sm font-bold border border-gray-600">
                               <ArrowRight className="w-4 h-4" /> Bỏ qua & Chạy tiếp
                           </button>
                       )}
                   </>
                ) : (
                    <button onClick={onClose} className="px-6 py-2 bg-gray-700 hover:bg-gray-600 text-white text-sm font-bold rounded-lg transition-colors">
                        Đóng cửa sổ
                    </button>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};