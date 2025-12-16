import React, { useState, useRef, useEffect } from 'react';
import { SeedingAccount } from '../types';
import { encryptData, decryptData } from '../utils/crypto';
import { Trash2, ShieldCheck, Lock, Plus, UserCircle2, Cookie, AlertCircle, Save, Key, Fingerprint, Pencil, Download, Upload, FileJson, RefreshCw, CheckCircle2, XCircle, AlertTriangle, Activity, LogIn, ArrowDownToLine, CloudCog } from 'lucide-react';

interface AccountManagerProps {
  accounts: SeedingAccount[];
  onAddAccount: (account: SeedingAccount) => void;
  onUpdateAccount: (account: SeedingAccount) => void;
  onRemoveAccount: (id: string) => void;
  onImportAccounts: (accounts: SeedingAccount[]) => void;
}

export const AccountManager: React.FC<AccountManagerProps> = ({ accounts, onAddAccount, onUpdateAccount, onRemoveAccount, onImportAccounts }) => {
  const [name, setName] = useState('');
  const [cookie, setCookie] = useState('');
  const [token, setToken] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isGettingCookie, setIsGettingCookie] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Track IDs currently being checked
  const [checkingIds, setCheckingIds] = useState<Set<string>>(new Set());
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  // SYNC ACCOUNTS TO EXTENSION AUTOMATICALLY
  useEffect(() => {
      if (accounts.length > 0) {
          syncAccountsToExtension();
      }
  }, [accounts]);

  const syncAccountsToExtension = () => {
      setIsSyncing(true);
      // Prepare data: We need to send DECRYPTED cookies to extension so it can use them directly
      const plainAccounts = accounts.map(acc => ({
          id: acc.id,
          name: acc.name,
          cookie: acc.cookie ? decryptData(acc.cookie) : '',
          token: acc.token ? decryptData(acc.token) : '',
          avatar: acc.avatar
      })).filter(a => a.cookie); // Only sync accounts with cookies

      window.postMessage({ 
          type: 'AUTOSEED_SYNC_ACCOUNTS_TO_EXT', 
          payload: plainAccounts 
      }, '*');
      
      setTimeout(() => setIsSyncing(false), 1000);
  };

  // LISTENER FOR EXTENSION RESULTS
  useEffect(() => {
    const handler = (event: MessageEvent) => {
      // 1. Handle Status Check Result
      if (event.data.type === "AUTOSEED_ACCOUNT_STATUS") {
        const { id, status } = event.data.payload;
        setCheckingIds(prev => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });

        const account = accounts.find(a => a.id === id);
        if (account && account.status !== status) {
             onUpdateAccount({ ...account, status: status });
        }
      }

      // 2. Handle Get Cookie Result
      if (event.data.type === "AUTOSEED_COOKIE_DATA") {
          const { cookie: grabbedCookie, token: grabbedToken, name: grabbedName, uid } = event.data.payload;
          if (grabbedCookie) setCookie(grabbedCookie);
          if (grabbedToken) setToken(grabbedToken);
          if (grabbedName && !name) setName(grabbedName + (uid ? ` (${uid})` : ''));
          setIsGettingCookie(false);
          alert("Đã lấy thông tin từ Tab hiện tại thành công!");
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, [accounts, onUpdateAccount, name]);

  const handleCheckAlive = (account: SeedingAccount) => {
      if (!account.cookie) {
          alert("Tài khoản chưa có Cookie!");
          return;
      }
      const decryptedCookie = decryptData(account.cookie);
      if (!decryptedCookie) {
          alert("Lỗi giải mã Cookie.");
          return;
      }
      setCheckingIds(prev => new Set(prev).add(account.id));
      window.postMessage({ type: 'AUTOSEED_CHECK_ALIVE', payload: { id: account.id, cookie: decryptedCookie } }, '*');
  };

  const handleLogin = (account: SeedingAccount) => {
      if (!account.cookie) return;
      const decryptedCookie = decryptData(account.cookie);
      if (!decryptedCookie) return;

      if(window.confirm(`Bạn muốn đăng nhập vào nick "${account.name}" ngay bây giờ? Trình duyệt sẽ reload lại trang Facebook.`)) {
          window.postMessage({ 
              type: 'AUTOSEED_SWITCH_ACCOUNT', 
              payload: { cookie: decryptedCookie, url: 'https://www.facebook.com' } 
          }, '*');
      }
  };

  const handleGetCookieFromTab = () => {
      setIsGettingCookie(true);
      // Ask extension to grab data
      window.postMessage({ type: 'AUTOSEED_GET_CURRENT_COOKIE' }, '*');
      
      // Timeout fallback
      setTimeout(() => {
          setIsGettingCookie((prev) => {
              if (prev) {
                  alert("Không lấy được dữ liệu. Hãy chắc chắn bạn đang mở Tab Facebook và đã kết nối Extension.");
                  return false;
              }
              return false;
          });
      }, 5000);
  };

  const resetForm = () => {
      setName('');
      setCookie('');
      setToken('');
      setEditingId(null);
  };

  const handleOpenAdd = () => {
      resetForm();
      setIsFormOpen(true);
  };

  const handleEdit = (acc: SeedingAccount) => {
      setEditingId(acc.id);
      setName(acc.name);
      const decryptedCookie = acc.cookie ? decryptData(acc.cookie) : '';
      const decryptedToken = acc.token ? decryptData(acc.token) : '';
      setCookie(decryptedCookie);
      setToken(decryptedToken);
      setIsFormOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) {
      alert('Vui lòng nhập tên gợi nhớ cho tài khoản!');
      return;
    }

    let encryptedCookie = undefined;
    if (cookie.trim()) {
        try { encryptedCookie = encryptData(cookie.trim()); } catch (e) { alert("Lỗi mã hóa cookie."); return; }
    }

    let encryptedToken = undefined;
    if (token.trim()) {
        try { encryptedToken = encryptData(token.trim()); } catch (e) { alert("Lỗi mã hóa token."); return; }
    }

    const accountData: SeedingAccount = {
      id: editingId || `acc-${Date.now()}`,
      name: name,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=0D8ABC&color=fff`,
      status: 'live',
      cookie: encryptedCookie,
      token: encryptedToken
    };

    if (editingId) {
        onUpdateAccount(accountData);
    } else {
        onAddAccount(accountData);
    }
    resetForm();
    setIsFormOpen(false);
  };

  const handleExport = () => {
      if (accounts.length === 0) { alert("Chưa có tài khoản nào!"); return; }
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(accounts, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      downloadAnchorNode.setAttribute("download", `autoseed_accounts_backup_${new Date().toISOString().slice(0,10)}.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const importedData = JSON.parse(event.target?.result as string);
              if (Array.isArray(importedData)) onImportAccounts(importedData);
              else alert("File không đúng định dạng.");
          } catch (error) { alert("Lỗi khi đọc file JSON."); }
      };
      reader.readAsText(file);
      e.target.value = ''; 
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
           <h2 className="text-2xl font-bold text-gray-800">Quản lý Tài khoản Seeding</h2>
           <p className="text-sm text-gray-500 mt-1">Nạp tài khoản Facebook/TikTok để extension tự động đăng bài.</p>
        </div>
        
        <div className="flex items-center gap-3">
            <input type="file" ref={fileInputRef} className="hidden" accept=".json" onChange={handleFileChange} />
            <button 
                onClick={syncAccountsToExtension} 
                className="flex items-center gap-2 px-3 py-2 bg-orange-50 border border-orange-200 text-orange-700 hover:bg-orange-100 rounded-lg text-sm font-medium transition-colors"
                title="Gửi danh sách sang Extension"
            >
                {isSyncing ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CloudCog className="w-4 h-4" />}
                Đồng bộ Ext
            </button>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <button onClick={handleImportClick} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                <Upload className="w-4 h-4" /> Nhập File
            </button>
            <button onClick={handleExport} className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 rounded-lg text-sm font-medium transition-colors">
                <Download className="w-4 h-4" /> Xuất Backup
            </button>
            <button onClick={handleOpenAdd} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-medium transition-colors shadow-sm ml-2">
                <Plus className="w-4 h-4" /> Thêm tài khoản
            </button>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 text-xs text-blue-800 flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
              <strong>Lưu ý bảo mật:</strong> Cookie được mã hóa và lưu trữ cục bộ (LocalStorage). <br/>
              Sử dụng nút <strong>Đồng bộ Ext</strong> để cập nhật danh sách này lên Extension (Login nhanh).
          </span>
      </div>

      {/* Add/Edit Form */}
      {isFormOpen && (
        <div className="bg-white p-6 rounded-2xl border border-blue-100 shadow-lg animate-in fade-in slide-in-from-top-4">
          <div className="flex justify-between items-center mb-4">
               <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                <UserCircle2 className="w-5 h-5 text-blue-600" /> 
                {editingId ? 'Cập nhật tài khoản' : 'Thêm tài khoản mới'}
              </h3>
              <button 
                onClick={handleGetCookieFromTab}
                disabled={isGettingCookie}
                className="flex items-center gap-2 px-3 py-1.5 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-colors"
              >
                  {isGettingCookie ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <ArrowDownToLine className="w-3.5 h-3.5" />}
                  Lấy Cookie từ Tab hiện tại
              </button>
          </div>
          
          <div className="space-y-4">
            <div>
               <label className="block text-sm font-medium text-gray-700 mb-1">Tên gợi nhớ <span className="text-red-500">*</span></label>
               <input 
                 type="text"
                 value={name}
                 onChange={(e) => setName(e.target.value)}
                 placeholder="Ví dụ: Nick Chính, Clone 1..."
                 className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500"
               />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Cookie (c_user, xs...) 
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encrypted
                      </span>
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       value={cookie}
                       onChange={(e) => setCookie(e.target.value)}
                       placeholder="Dán chuỗi cookie vào đây"
                       className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-500 text-sm font-mono"
                     />
                     <Cookie className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                   </div>
                </div>

                <div>
                   <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                      Access Token (EAAG...)
                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-3 h-3" /> Encrypted
                      </span>
                   </label>
                   <div className="relative">
                     <input 
                       type="text"
                       value={token}
                       onChange={(e) => setToken(e.target.value)}
                       placeholder="Dán token vào đây (Tùy chọn)"
                       className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 focus:ring-2 focus:ring-blue-500 text-gray-500 text-sm font-mono"
                     />
                     <Key className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
                   </div>
                </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <button onClick={() => { resetForm(); setIsFormOpen(false); }} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg font-medium">Hủy</button>
            <button onClick={handleSave} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium flex items-center gap-2">
              <Save className="w-4 h-4" /> {editingId ? 'Cập nhật' : 'Lưu tài khoản'}
            </button>
          </div>
        </div>
      )}

      {/* Account List */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {accounts.length === 0 ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              <UserCircle2 className="w-8 h-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-gray-900">Chưa có tài khoản nào</h3>
            <p className="text-gray-500 max-w-sm mt-1 mb-6">Hãy thêm tài khoản seeding hoặc nhập file backup để bắt đầu.</p>
            <button onClick={handleOpenAdd} className="px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-lg font-medium">Thêm mới</button>
          </div>
        ) : (
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Tài khoản</th>
                <th className="px-6 py-4">Thông tin đăng nhập</th>
                <th className="px-6 py-4">Trạng thái Nick</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {accounts.map((acc) => (
                <tr key={acc.id} className="hover:bg-gray-50/50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <img 
                        src={acc.avatar || "https://ui-avatars.com/api/?name=User&background=random"} 
                        alt="" 
                        className="w-10 h-10 rounded-full bg-gray-100 object-cover" 
                        onError={(e) => {
                           e.currentTarget.src = "https://ui-avatars.com/api/?name=User&background=random";
                        }}
                      />
                      <div>
                        <p className="font-medium text-gray-900">{acc.name}</p>
                        <p className="text-xs text-gray-500">ID: {acc.id.slice(0, 8)}...</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                             {acc.cookie ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                                    <ShieldCheck className="w-3 h-3" /> Cookie OK
                                </span>
                             ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-500 border border-gray-200">
                                    <AlertCircle className="w-3 h-3" /> No Cookie
                                </span>
                             )}
                        </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border
                      ${acc.status === 'live' ? 'bg-green-100 text-green-800 border-green-200' : 
                        acc.status === 'die' ? 'bg-red-100 text-red-800 border-red-200' :
                        acc.status === 'checkpoint' ? 'bg-yellow-100 text-yellow-800 border-yellow-200' :
                        'bg-gray-100 text-gray-800 border-gray-200'
                      }`}>
                      {acc.status === 'live' && <CheckCircle2 className="w-3 h-3" />}
                      {acc.status === 'die' && <XCircle className="w-3 h-3" />}
                      {acc.status === 'checkpoint' && <AlertTriangle className="w-3 h-3" />}
                      {acc.status?.toUpperCase() || 'UNKNOWN'}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={() => handleLogin(acc)}
                          className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all"
                          title="Đăng nhập trình duyệt bằng Cookie này"
                        >
                          <LogIn className="w-3.5 h-3.5" /> Login
                        </button>
                        
                        <div className="w-px h-4 bg-gray-300 mx-1"></div>

                        <button 
                          onClick={() => handleCheckAlive(acc)}
                          disabled={checkingIds.has(acc.id)}
                          className={`p-2 rounded-lg transition-colors border ${checkingIds.has(acc.id) ? 'text-blue-500 bg-blue-50 border-blue-100' : 'text-gray-400 bg-white border-gray-200 hover:text-blue-600 hover:border-blue-300'}`}
                          title="Check Live"
                        >
                          <RefreshCw className={`w-4 h-4 ${checkingIds.has(acc.id) ? 'animate-spin' : ''}`} />
                        </button>
                        <button onClick={() => handleEdit(acc)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Sửa">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => { if(window.confirm('Xóa tài khoản này?')) onRemoveAccount(acc.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                          <Trash2 className="w-4 h-4" />
                        </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};