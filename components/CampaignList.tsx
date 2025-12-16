import React from 'react';
import { Campaign, Platform } from '../types';
import { MoreHorizontal, Calendar, Facebook, Instagram, MessageCircle, Play, CheckCircle, RotateCcw, Clock, CalendarClock, Eye, Coffee, User } from 'lucide-react';

interface CampaignListProps {
  campaigns: Campaign[];
  onRun: (campaignId: string) => void;
  onViewDetails: (campaign: Campaign) => void;
}

export const CampaignList: React.FC<CampaignListProps> = ({ campaigns, onRun, onViewDetails }) => {
  // FILTER: Only show Seeding Campaigns, Hide Trust Builder (Profile Status)
  const seedingCampaigns = campaigns.filter(c => c.platform !== Platform.FACEBOOK_PROFILE);

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="p-6 border-b border-gray-200">
        <h2 className="text-lg font-bold text-gray-800">Lịch sử Chiến dịch & Hoạt động</h2>
        <p className="text-xs text-gray-500 mt-1">Danh sách các chiến dịch seeding bán hàng đã tạo.</p>
      </div>
      
      {seedingCampaigns.length === 0 ? (
        <div className="p-12 text-center text-gray-500">Chưa có chiến dịch seeding nào.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold">
              <tr>
                <th className="px-6 py-4">Tên chiến dịch / Link</th>
                <th className="px-6 py-4">Nền tảng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Số lượng</th>
                <th className="px-6 py-4">Thời gian tạo</th>
                <th className="px-6 py-4 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {seedingCampaigns.map((campaign) => {
                return (
                  <tr key={campaign.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-start gap-3">
                          <div className="p-2 rounded-lg shrink-0 bg-blue-100">
                              <MessageCircle className="w-4 h-4 text-blue-600" />
                          </div>
                          <div>
                              <p className="font-medium text-gray-900 truncate max-w-xs">{campaign.title}</p>
                              <a href={campaign.targetUrl} target="_blank" rel="noreferrer" className="text-xs text-blue-500 hover:underline mt-0.5 block truncate max-w-xs">
                                  {campaign.targetUrl || 'Chưa có link'}
                              </a>
                          </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium 
                        ${campaign.platform.includes('Facebook') ? 'bg-blue-50 text-blue-700' : 
                          campaign.platform.includes('TikTok') ? 'bg-gray-900 text-white' : 'bg-pink-50 text-pink-700'}`}>
                        {campaign.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        campaign.status === 'completed' ? 'bg-green-100 text-green-800' : 
                        campaign.status === 'generated' ? 'bg-yellow-100 text-yellow-800' : 
                        campaign.status === 'scheduled' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {campaign.status === 'completed' ? 'Đã hoàn thành' : 
                         campaign.status === 'generated' ? 'Sẵn sàng chạy' : 
                         campaign.status === 'scheduled' ? 'Đã đặt lịch' : 'Nháp'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-gray-700 text-sm font-medium">
                         {campaign.comments.length} Comment
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                             <Calendar className="w-4 h-4 text-gray-400" />
                             {new Date(campaign.createdAt).toLocaleDateString('vi-VN')}
                          </div>
                          {campaign.status === 'scheduled' && campaign.scheduledTime && (
                              <div className="flex items-center gap-2 text-purple-600 font-medium text-xs">
                                 <CalendarClock className="w-3 h-3" />
                                 {new Date(campaign.scheduledTime).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                              </div>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                         <button 
                          onClick={() => onViewDetails(campaign)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                          title="Xem chi tiết nội dung đã chạy"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {campaign.status === 'completed' ? (
                          <button 
                            onClick={() => onRun(campaign.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 hover:bg-blue-100 text-gray-600 hover:text-blue-700 text-xs font-medium rounded-lg transition-colors border border-gray-200 hover:border-blue-300"
                            title="Chạy lại chiến dịch này"
                          >
                            <RotateCcw className="w-3 h-3" />
                            Chạy lại
                          </button>
                        ) : campaign.status === 'scheduled' ? (
                            <span className="flex items-center gap-1 text-xs text-purple-600 font-medium px-3 py-1.5 bg-purple-50 rounded-lg animate-pulse">
                                <Clock className="w-3 h-3" /> Đang chờ
                            </span>
                        ) : (
                          <button 
                            onClick={() => onRun(campaign.id)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors shadow-sm"
                          >
                            <Play className="w-3 h-3 fill-current" />
                            Chạy ngay
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};