import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { Dashboard } from './components/Dashboard';
import { CreateCampaign } from './components/CreateCampaign';
import { CampaignList } from './components/CampaignList';
import { ExecutionModal } from './components/ExecutionModal'; 
import { ConnectExtensionModal } from './components/ConnectExtensionModal'; 
import { AccountManager } from './components/AccountManager'; 
import { Settings } from './components/Settings'; 
import { CampaignDetailsModal } from './components/CampaignDetailsModal'; // Import new modal
import { TrustBuilder } from './components/TrustBuilder'; // Import new TrustBuilder
import { ViewState, Campaign, SeedingAccount } from './types';
import { Wifi, WifiOff, CalendarClock } from 'lucide-react';

const ACCOUNTS_STORAGE_KEY = 'autoseed_saved_accounts_v1';
const CAMPAIGNS_STORAGE_KEY = 'autoseed_saved_campaigns_v1';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>('dashboard');
  
  // Load campaigns from storage or empty
  const [campaigns, setCampaigns] = useState<Campaign[]>(() => {
    try {
      const saved = localStorage.getItem(CAMPAIGNS_STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // CHANGED: Instead of just an ID, we hold the whole Campaign Object.
  // This allows running "Temporary" campaigns (Trust Builder) that are NOT in the saved list.
  const [activeExecutionPayload, setActiveExecutionPayload] = useState<Campaign | null>(null);
  
  // Extension State
  const [isExtensionConnected, setIsExtensionConnected] = useState(false);
  const [showConnectModal, setShowConnectModal] = useState(false);

  // Campaign Details Modal State
  const [selectedCampaignDetails, setSelectedCampaignDetails] = useState<Campaign | null>(null);

  // Accounts State
  const [accounts, setAccounts] = useState<SeedingAccount[]>(() => {
    try {
        const saved = localStorage.getItem(ACCOUNTS_STORAGE_KEY);
        return saved ? JSON.parse(saved) : []; 
    } catch (e) {
        console.error("Failed to load accounts", e);
        return [];
    }
  });

  // Save accounts to localStorage on change
  useEffect(() => {
     localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
  }, [accounts]);

  // Save campaigns to localStorage
  useEffect(() => {
    localStorage.setItem(CAMPAIGNS_STORAGE_KEY, JSON.stringify(campaigns));
  }, [campaigns]);

  // SCHEDULER: Check every 30 seconds
  useEffect(() => {
      const interval = setInterval(() => {
          if (activeExecutionPayload) return; // Don't interrupt if already running

          const now = new Date();
          const dueCampaign = campaigns.find(c => {
              if (c.status === 'scheduled' && c.scheduledTime) {
                  return new Date(c.scheduledTime) <= now;
              }
              return false;
          });

          if (dueCampaign) {
              console.log("[Scheduler] Auto-starting campaign:", dueCampaign.title);
              // For scheduled campaigns, they exist in the list, so we run them
              setActiveExecutionPayload(dueCampaign);
          }
      }, 30000); // Check every 30s

      return () => clearInterval(interval);
  }, [campaigns, activeExecutionPayload]);

  const handleAddAccount = (account: SeedingAccount) => {
    setAccounts(prev => [...prev, account]);
  };

  const handleUpdateAccount = (updatedAccount: SeedingAccount) => {
    setAccounts(prev => prev.map(acc => acc.id === updatedAccount.id ? updatedAccount : acc));
  };

  const handleRemoveAccount = (id: string) => {
    setAccounts(prev => prev.filter(a => a.id !== id));
  };

  const handleImportAccounts = (newAccounts: SeedingAccount[]) => {
      setAccounts(prev => {
          // Avoid duplicates by checking ID
          const currentIds = new Set(prev.map(a => a.id));
          const uniqueNewAccounts = newAccounts.filter(a => !currentIds.has(a.id));
          return [...prev, ...uniqueNewAccounts];
      });
      alert(`Đã nhập thành công ${newAccounts.length} tài khoản!`);
  };

  // Auto-check connection on mount with aggressive polling
  useEffect(() => {
    let isFound = false;
    let attempts = 0;
    
    const pongHandler = (event: MessageEvent) => {
      if (event.data.type === "AUTOSEED_PONG") {
        console.log("App: Extension detected v" + event.data.version);
        setIsExtensionConnected(true);
        isFound = true;
      }
    };

    window.addEventListener("message", pongHandler);
    
    // Initial ping
    window.postMessage({ type: "AUTOSEED_PING" }, "*");

    // Poll a few times to ensure we catch it if extension loads slightly later
    const interval = setInterval(() => {
        if (isFound || attempts > 5) {
            clearInterval(interval);
            return;
        }
        window.postMessage({ type: "AUTOSEED_PING" }, "*");
        attempts++;
    }, 500);

    return () => {
        window.removeEventListener("message", pongHandler);
        clearInterval(interval);
    }
  }, []);

  const handleSaveCampaign = (campaign: Campaign) => {
    setCampaigns([campaign, ...campaigns]);
    setCurrentView('campaigns');
  };

  const handleRunSavedCampaign = (campaignId: string) => {
    // Guard Clause: Check connection first
    if (!isExtensionConnected) {
        alert("Vui lòng kết nối Extension trước khi chạy chiến dịch!");
        setShowConnectModal(true);
        return;
    }
    
    const campaignToRun = campaigns.find(c => c.id === campaignId);
    if (campaignToRun) {
        setActiveExecutionPayload(campaignToRun);
    }
  };

  // SEPARATE LOGIC FOR TRUST BUILDER
  const handleTrustBuilderExecute = (campaign: Campaign) => {
      if (!isExtensionConnected) {
          alert("Vui lòng kết nối Extension trước khi chạy nuôi nick!");
          setShowConnectModal(true);
          return;
      }

      // 1. SAVE to History (So we can review it later in the Trust Builder History tab)
      // Note: We use the same 'campaigns' state, but filtered in UI
      setCampaigns(prev => [campaign, ...prev]);

      // 2. EXECUTE Immediately
      setActiveExecutionPayload(campaign);
  };

  const handleExecutionComplete = () => {
     if (activeExecutionPayload) {
        // Update status to completed in the history list
        setCampaigns(prev => prev.map(c => 
            c.id === activeExecutionPayload.id ? { ...c, status: 'completed' } : c
        ));
        
        setActiveExecutionPayload(null);
     }
  };

  const renderContent = () => {
    switch (currentView) {
      case 'dashboard':
        return <Dashboard campaigns={campaigns} />;
      case 'create':
        return <CreateCampaign onSave={handleSaveCampaign} accounts={accounts} onNavigateToAccounts={() => setCurrentView('accounts')} />;
      case 'trust-builder':
        return <TrustBuilder 
            accounts={accounts} 
            campaigns={campaigns}
            onExecute={handleTrustBuilderExecute} 
            onNavigateToAccounts={() => setCurrentView('accounts')} 
            onViewDetails={(c) => setSelectedCampaignDetails(c)}
        />;
      case 'campaigns':
        return <CampaignList 
          campaigns={campaigns} 
          onRun={handleRunSavedCampaign} 
          onViewDetails={(c) => setSelectedCampaignDetails(c)} 
        />;
      case 'accounts':
        return <AccountManager 
            accounts={accounts} 
            onAddAccount={handleAddAccount} 
            onUpdateAccount={handleUpdateAccount} 
            onRemoveAccount={handleRemoveAccount} 
            onImportAccounts={handleImportAccounts}
        />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard campaigns={campaigns} />;
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar 
        currentView={currentView} 
        onChangeView={setCurrentView} 
        isExtensionConnected={isExtensionConnected}
        onConnectExtension={() => setShowConnectModal(true)}
      />
      
      <main className="flex-1 ml-64 p-8">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              {currentView === 'dashboard' && 'Tổng quan'}
              {currentView === 'create' && 'Tạo chiến dịch Seeding'}
              {currentView === 'trust-builder' && 'Nuôi Nick (Trust Builder)'}
              {currentView === 'campaigns' && 'Lịch sử Chiến dịch'}
              {currentView === 'accounts' && 'Quản lý Tài khoản'}
              {currentView === 'settings' && 'Cài đặt hệ thống'}
            </h2>
            <p className="text-sm text-gray-500 mt-1">Quản lý hoạt động seeding tự động của bạn</p>
          </div>
          
          <div className="flex items-center gap-4">
             {/* Pending Scheduled Tasks Indicator */}
             {campaigns.some(c => c.status === 'scheduled') && (
                 <div className="flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-lg text-xs font-medium animate-pulse border border-purple-200">
                     <CalendarClock className="w-4 h-4" />
                     Có lịch hẹn chạy
                 </div>
             )}

             {/* Extension Status Indicator */}
             <div 
                onClick={() => !isExtensionConnected && setShowConnectModal(true)}
                className={`group flex items-center gap-3 px-4 py-2 rounded-full border shadow-sm transition-all duration-300 ${
                    isExtensionConnected 
                    ? 'bg-emerald-50 border-emerald-200 cursor-default' 
                    : 'bg-white border-red-200 hover:bg-red-50 hover:border-red-300 cursor-pointer'
                }`}
                title={isExtensionConnected ? "Extension đã kết nối" : "Nhấn để kết nối Extension"}
             >
                  <div className="relative flex h-3 w-3">
                      {isExtensionConnected ? (
                          <>
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                          </>
                      ) : (
                          <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                      )}
                  </div>
                  
                  <div className="flex flex-col">
                      <span className={`text-xs font-bold flex items-center gap-1.5 ${
                          isExtensionConnected ? 'text-emerald-700' : 'text-gray-600 group-hover:text-red-600'
                      }`}>
                          {isExtensionConnected ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
                          {isExtensionConnected ? 'System Online' : 'Disconnected'}
                      </span>
                  </div>
             </div>

             <div className="h-8 w-px bg-gray-200 mx-1"></div>

             <div className="flex items-center gap-3">
                <div className="text-right hidden md:block">
                    <p className="text-sm font-bold text-gray-800">Admin User</p>
                    <p className="text-xs text-gray-500">Free Plan</p>
                </div>
                <img 
                src="https://picsum.photos/seed/admin/40/40" 
                alt="Admin" 
                className="w-10 h-10 rounded-full border-2 border-white shadow-sm cursor-pointer hover:border-blue-500 transition-colors"
                />
             </div>
          </div>
        </header>

        {renderContent()}
      </main>

      {/* Execution Modal Overlay - now accepts the payload object directly */}
      {activeExecutionPayload && (
        <ExecutionModal 
            campaign={activeExecutionPayload} 
            onComplete={handleExecutionComplete}
            onClose={() => {
                setActiveExecutionPayload(null);
            }}
            isExtensionConnected={isExtensionConnected}
        />
      )}

      {/* Connect Extension Modal */}
      {showConnectModal && (
        <ConnectExtensionModal 
            onClose={() => setShowConnectModal(false)}
            onConnected={() => setIsExtensionConnected(true)}
        />
      )}

      {/* Campaign Details Modal */}
      {selectedCampaignDetails && (
        <CampaignDetailsModal 
            campaign={selectedCampaignDetails}
            onClose={() => setSelectedCampaignDetails(null)}
        />
      )}
    </div>
  );
};

export default App;