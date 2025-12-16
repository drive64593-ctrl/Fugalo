
export enum Platform {
  FACEBOOK_PAGE = 'Fanpage',
  FACEBOOK_GROUP = 'Facebook Group',
  FACEBOOK_PROFILE = 'Facebook Cá nhân',
  TIKTOK = 'TikTok',
  INSTAGRAM = 'Instagram'
}

export enum Sentiment {
  POSITIVE = 'Tích cực/Khen ngợi',
  NEUTRAL = 'Trung lập/Hỏi thông tin',
  CONTROVERSIAL = 'Tranh luận/Gây war',
  FUNNY = 'Hài hước/Bắt trend',
  SEEDING_SALES = 'Mồi chốt đơn',
  DAILY_LIFE = 'Đời sống/Tâm trạng' // New for Trust Builder
}

export enum SeedingMode {
  MIXED = 'Tự nhiên (Đa dạng độ dài)',
  SHORT = 'Ngắn gọn (Mồi ib/giá)',
  DETAILED = 'Chi tiết (Review/Tâm sự)',
  QUESTIONS = 'Hỏi đáp (Tăng tương tác)',
  STATUS_CAPTION = 'Caption/Status đăng tường' // New for Trust Builder
}

export interface SeedingAccount {
  id: string;
  name: string;
  avatar: string;
  status: 'live' | 'checkpoint' | 'die';
  cookie?: string;
  token?: string;
}

export interface Comment {
  id: string;
  text: string;
  authorName: string; // Simulated persona name
  avatarUrl?: string;
  sentiment: Sentiment;
  isUsed: boolean;
  assignedAccount?: SeedingAccount; // The specific account assigned to execute this comment
}

export interface HumanizeConfig {
  enabled: boolean;
  typingSpeed: 'slow' | 'normal' | 'fast';
  randomScroll: boolean; // Randomly scroll up/down while surfing
  readMoreAction: boolean; // Expand "See more" or click photos
  randomDelay: boolean; // Add random pauses between actions
}

export interface TrustWorkflowConfig {
  enablePosting: boolean;
  enableFeedSurfing: boolean;
  surfDuration: number; // Seconds
  likeCount: number; // Number of random likes
  humanize?: HumanizeConfig; // Specific humanization for trust building
}

export interface Campaign {
  id: string;
  title: string;
  targetUrl: string; // URL of the post to seed
  postContent: string;
  platform: Platform;
  targetSentiment: Sentiment;
  status: 'draft' | 'generated' | 'completed' | 'scheduled';
  createdAt: Date;
  scheduledTime?: string; // ISO String for scheduled execution
  comments: Comment[];
  trustConfig?: TrustWorkflowConfig; // Optional config for Trust Builder workflows
}

export interface AutoReplyRule {
  id: string;
  keywords: string; // Comma separated keywords
  response: string;
  isActive: boolean;
}

export type ViewState = 'dashboard' | 'create' | 'campaigns' | 'accounts' | 'settings' | 'trust-builder';
