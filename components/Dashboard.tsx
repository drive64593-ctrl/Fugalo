import React from 'react';
import { Campaign } from '../types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, MessageCircle, Users, CheckCircle2 } from 'lucide-react';

interface DashboardProps {
  campaigns: Campaign[];
}

export const Dashboard: React.FC<DashboardProps> = ({ campaigns }) => {
  const totalComments = campaigns.reduce((acc, curr) => acc + curr.comments.length, 0);
  const activeCampaigns = campaigns.filter(c => c.status === 'generated').length;
  const completedCampaigns = campaigns.filter(c => c.status === 'completed').length;
  
  // Dynamic Chart Data based on real campaigns
  // Group by day of week (simple mapping)
  const daysMap: Record<string, number> = { 'T2': 0, 'T3': 0, 'T4': 0, 'T5': 0, 'T6': 0, 'T7': 0, 'CN': 0 };
  
  campaigns.forEach(c => {
      // Simple logic: assume creation date maps to today. 
      // In real app, we would parse `createdAt` properly.
      // For now, if no campaigns, graph is empty.
      const day = c.createdAt ? new Date(c.createdAt).getDay() : 0;
      // JS getDay: 0 = Sunday.
      const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
      const dayStr = map[day];
      if (daysMap[dayStr] !== undefined) {
          daysMap[dayStr] += c.comments.length;
      }
  });

  const activityData = Object.keys(daysMap).map(key => ({
      name: key,
      seeds: daysMap[key]
  }));

  const StatCard = ({ title, value, sub, icon: Icon, color }: any) => (
    <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm flex items-start justify-between">
      <div>
        <p className="text-sm font-medium text-gray-500 mb-1">{title}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
        <p className={`text-xs mt-2 font-medium text-gray-400`}>
          {sub}
        </p>
      </div>
      <div className={`p-3 rounded-xl ${color}`}>
        <Icon className="w-6 h-6 text-white" />
      </div>
    </div>
  );

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard 
          title="Tổng bình luận" 
          value={totalComments} 
          sub="Đã tạo" 
          icon={MessageCircle} 
          color="bg-blue-500" 
        />
        <StatCard 
          title="Chiến dịch Active" 
          value={activeCampaigns} 
          sub="Đang sẵn sàng" 
          icon={TrendingUp} 
          color="bg-purple-500" 
        />
        <StatCard 
          title="Đã hoàn thành" 
          value={completedCampaigns} 
          sub="Chiến dịch đã chạy" 
          icon={CheckCircle2} 
          color="bg-emerald-500" 
        />
        <StatCard 
          title="Tài khoản" 
          value="-" 
          sub="Được quản lý" 
          icon={Users} 
          color="bg-indigo-500" 
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="text-lg font-semibold text-gray-800 mb-6">Hiệu suất Seeding (Real-time)</h3>
          <div className="h-72">
            {campaigns.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activityData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} dy={10} />
                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af'}} />
                    <Tooltip 
                    contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
                    cursor={{fill: '#f8fafc'}}
                    />
                    <Bar dataKey="seeds" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={32} />
                </BarChart>
                </ResponsiveContainer>
            ) : (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">
                    Chưa có dữ liệu hoạt động.
                </div>
            )}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
           <h3 className="text-lg font-semibold text-gray-800 mb-6">Hoạt động gần đây</h3>
           <div className="space-y-4">
             {campaigns.slice(0, 5).map(c => (
               <div key={c.id} className="flex items-center gap-3 pb-3 border-b border-gray-50 last:border-0 last:pb-0">
                 <div className={`w-2 h-2 rounded-full ${c.status === 'completed' ? 'bg-green-500' : 'bg-yellow-500'}`}></div>
                 <div className="flex-1 min-w-0">
                   <p className="text-sm font-medium text-gray-900 truncate">{c.title || c.postContent}</p>
                   <p className="text-xs text-gray-500">{new Date(c.createdAt).toLocaleDateString('vi-VN')} • {c.comments.length} comments</p>
                 </div>
                 <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded-full">
                   {c.platform}
                 </span>
               </div>
             ))}
             {campaigns.length === 0 && (
               <p className="text-sm text-gray-400 text-center py-4">Chưa có chiến dịch nào.</p>
             )}
           </div>
        </div>
      </div>
    </div>
  );
};