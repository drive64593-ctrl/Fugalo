import React from 'react';
import { Campaign, Comment } from '../types';
import { X, User, MessageCircle, CheckCircle2, Clock, ShieldCheck, UserCircle2, ExternalLink, Calendar, Layers } from 'lucide-react';

interface CampaignDetailsModalProps {
  campaign: Campaign;
  onClose: () => void;
}

export const CampaignDetailsModal: React.FC<CampaignDetailsModalProps> = ({ campaign, onClose }) => {
  const isCompleted = campaign.status === 'completed';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="p-5 border-b border-gray-100 flex justify-between items-start bg-gray-50/50">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <h3 className="text-xl font-bold text-gray-900 line-clamp-1">{campaign.title}</h3>
                <span className={`px-2 py-0.5 text-xs font-bold rounded-full border ${
                    isCompleted ? 'bg-green-100 text-green-700 border-green-200' : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                }`}>
                    {isCompleted ? 'Đã hoàn thành' : 'Đang chờ/Nháp'}
                </span>
            </div>
            <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> 
                    Tạo ngày: {new Date(campaign.createdAt).toLocaleDateString('vi-VN')}
                </span>
                <span className="flex items-center gap-1">
                    <Layers className="w-3.5 h-3.5" /> 
                    Nền tảng: {campaign.platform}
                </span>
                {campaign.targetUrl && (
                    <a href={campaign.targetUrl} target="_blank" rel="noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                        <ExternalLink className="w-3.5 h-3.5" /> Link bài viết
                    </a>
                )}
            </div>
          </div>
          <button onClick={onClose} className="p-2 bg-white border border-gray-200 rounded-full hover:bg-gray-100 transition-colors text-gray-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content - Scrollable Table */}
        <div className="flex-1 overflow-y-auto p-0">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase font-semibold sticky top-0 z-10 shadow-sm">
                    <tr>
                        <th className="px-6 py-4 w-16 text-center">STT</th>
                        <th className="px-6 py-4 w-1/4">Tài khoản thực hiện</th>
                        <th className="px-6 py-4">Nội dung Seeding</th>
                        <th className="px-6 py-4 w-32 text-center">Trạng thái</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {campaign.comments.map((comment: Comment, index: number) => {
                        const hasRealAccount = !!comment.assignedAccount;
                        
                        return (
                            <tr key={index} className="hover:bg-blue-50/30 transition-colors">
                                <td className="px-6 py-4 text-center text-gray-400 font-mono text-xs">
                                    #{index + 1}
                                </td>
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="relative">
                                            <img 
                                                src={hasRealAccount ? comment.assignedAccount?.avatar : comment.avatarUrl} 
                                                alt="Avatar" 
                                                className="w-10 h-10 rounded-full border border-gray-200 object-cover"
                                            />
                                            {hasRealAccount && (
                                                <div className="absolute -bottom-1 -right-1 bg-white rounded-full p-0.5">
                                                    <ShieldCheck className="w-3.5 h-3.5 text-blue-600 fill-blue-100" />
                                                </div>
                                            )}
                                        </div>
                                        <div>
                                            <p className={`text-sm font-semibold ${hasRealAccount ? 'text-blue-700' : 'text-gray-700'}`}>
                                                {hasRealAccount ? comment.assignedAccount?.name : comment.authorName}
                                            </p>
                                            <p className="text-[10px] text-gray-500 flex items-center gap-1">
                                                {hasRealAccount ? (
                                                    <>ID: {comment.assignedAccount?.id.slice(0, 8)}...</>
                                                ) : (
                                                    <><UserCircle2 className="w-3 h-3" /> AI Persona</>
                                                )}
                                            </p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    <div className="bg-gray-50 p-3 rounded-xl rounded-tl-none border border-gray-100 text-sm text-gray-800">
                                        {comment.text}
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    {isCompleted ? (
                                        <div className="inline-flex flex-col items-center gap-1">
                                            <div className="p-1.5 bg-green-100 text-green-600 rounded-full">
                                                <CheckCircle2 className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-bold text-green-700">Đã đăng</span>
                                        </div>
                                    ) : (
                                        <div className="inline-flex flex-col items-center gap-1">
                                            <div className="p-1.5 bg-gray-100 text-gray-400 rounded-full">
                                                <Clock className="w-4 h-4" />
                                            </div>
                                            <span className="text-[10px] font-bold text-gray-500">Chờ chạy</span>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-end">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white font-medium rounded-lg transition-colors text-sm"
            >
                Đóng
            </button>
        </div>
      </div>
    </div>
  );
};
