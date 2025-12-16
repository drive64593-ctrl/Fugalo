import React from 'react';
import { ViewState } from '../types';
import { LayoutDashboard, MessageSquarePlus, ListTodo, Settings, Zap, Puzzle, Check, Users, Coffee } from 'lucide-react';

interface SidebarProps {
  currentView: ViewState;
  onChangeView: (view: ViewState) => void;
  isExtensionConnected?: boolean;
  onConnectExtension?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentView, onChangeView, isExtensionConnected = false, onConnectExtension }) => {
  const menuItems = [
    { id: 'dashboard' as ViewState, label: 'Tổng quan', icon: LayoutDashboard },
    { id: 'create' as ViewState, label: 'Tạo Seeding Mới', icon: MessageSquarePlus },
    { id: 'trust-builder' as ViewState, label: 'Nuôi Nick (Trust)', icon: Coffee }, // New Item
    { id: 'campaigns' as ViewState, label: 'Chiến dịch', icon: ListTodo },
    { id: 'accounts' as ViewState, label: 'Quản lý Tài khoản', icon: Users },
    { id: 'settings' as ViewState, label: 'Cài đặt', icon: Settings },
  ];

  return (
    <div className="w-64 bg-white h-screen border-r border-gray-200 flex flex-col fixed left-0 top-0">
      <div className="p-6 flex items-center gap-3 border-b border-gray-100">
        <div className="bg-blue-600 p-2 rounded-lg">
          <Zap className="w-6 h-6 text-white" />
        </div>
        <h1 className="text-xl font-bold text-gray-800 tracking-tight">AutoSeed AI</h1>
      </div>
      
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onChangeView(item.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group ${
              currentView === item.id
                ? 'bg-blue-50 text-blue-700 font-semibold shadow-sm'
                : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
            }`}
          >
            <item.icon className={`w-5 h-5 ${currentView === item.id ? 'text-blue-600' : 'text-gray-400 group-hover:text-gray-600'}`} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 space-y-4 border-t border-gray-100">
        
        {/* Connection Status Box */}
        <div 
            onClick={onConnectExtension}
            className={`p-3 rounded-xl border cursor-pointer transition-all duration-500 ${
            isExtensionConnected 
                ? 'bg-green-50 border-green-200 hover:bg-green-100' 
                : 'bg-red-50 border-red-300 animate-pulse shadow-lg shadow-red-100 hover:bg-red-100'
        }`}>
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg ${isExtensionConnected ? 'bg-green-200 text-green-700' : 'bg-red-200 text-red-600'}`}>
                    <Puzzle className="w-4 h-4" />
                </div>
                <div>
                    <p className={`text-xs font-bold ${isExtensionConnected ? 'text-green-800' : 'text-red-700'}`}>
                        {isExtensionConnected ? 'Extension Active' : 'Kết nối Extension'}
                    </p>
                    <p className={`text-[10px] ${isExtensionConnected ? 'text-green-600' : 'text-red-500'}`}>
                        {isExtensionConnected ? 'Sẵn sàng chạy thật' : 'Cần để chạy tự động'}
                    </p>
                </div>
                {isExtensionConnected && <Check className="w-4 h-4 text-green-600 ml-auto" />}
            </div>
        </div>

        <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-blue-100">
          <h4 className="text-sm font-semibold text-blue-900 mb-1">Gói Pro</h4>
          <p className="text-xs text-blue-600 mb-3">Mở khóa tính năng seeding đa nền tảng không giới hạn.</p>
          <button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium py-2 px-3 rounded-lg transition-colors">
            Nâng cấp ngay
          </button>
        </div>
      </div>
    </div>
  );
};