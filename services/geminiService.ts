
import { GoogleGenAI, Type } from "@google/genai";
import { Platform, Sentiment, Comment, SeedingMode } from "../types";

// Helper to get initialized AI instance dynamically
const getAIClient = () => {
  // 1. Try getting key from User Settings (LocalStorage)
  const userKey = localStorage.getItem('user_gemini_api_key');
  
  // 2. Fallback to Environment Variable
  const envKey = process.env.API_KEY;
  
  const apiKey = userKey || envKey;

  if (!apiKey || !apiKey.trim()) {
      throw new Error("Chưa có API Key. Vui lòng vào Cài đặt > Cấu hình AI để nhập Gemini API Key.");
  }

  // Debug log (Masked) to help users troubleshoot in Console
  console.log(`[AutoSeed] Using API Key: ${apiKey.substring(0, 8)}...`);

  return new GoogleGenAI({ apiKey: apiKey.trim() });
};

// Helper to generate random Vietnamese names for personas
const FIRST_NAMES = ["An", "Bình", "Chi", "Dũng", "Giang", "Hương", "Khánh", "Lan", "Minh", "Nam", "Phúc", "Quỳnh", "Sơn", "Thảo", "Tuấn", "Vy", "Yến"];
const LAST_NAMES = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ"];

const getRandomName = () => {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return `${last} ${first}`;
};

export const generateSeedingComments = async (
  postContent: string,
  platform: Platform,
  sentiment: Sentiment,
  mode: SeedingMode = SeedingMode.MIXED,
  count: number = 5
): Promise<Comment[]> => {
  const modelId = "gemini-2.5-flash";

  let styleInstruction = "";
  switch (mode) {
    case SeedingMode.SHORT:
        styleInstruction = "Tập trung vào các câu ngắn gọn, súc tích (dưới 15 từ). Thường dùng để chấm bài, hỏi giá, hỏi ship, hoặc khen nhanh.";
        break;
    case SeedingMode.DETAILED:
        styleInstruction = "Tập trung vào các bình luận dài, chi tiết, có chiều sâu (trên 30 từ). Chia sẻ trải nghiệm cá nhân, feedback cụ thể, kể chuyện.";
        break;
    case SeedingMode.QUESTIONS:
        styleInstruction = "Tập trung đặt câu hỏi để kích thích chủ tus trả lời. Hỏi về công dụng, cách dùng, giá cả, chế độ bảo hành.";
        break;
    case SeedingMode.STATUS_CAPTION:
        styleInstruction = "Viết status đăng tường cá nhân Facebook. Giọng văn tự nhiên, đời thường, giống người thật chia sẻ suy nghĩ, meme, hoặc than thở nhẹ nhàng. KHÔNG mang tính chất bán hàng. Có thể dùng icon.";
        break;
    case SeedingMode.MIXED:
    default:
        styleInstruction = "Phối hợp ngẫu nhiên: 40% câu ngắn, 40% câu trung bình, 20% câu dài. Tạo sự đa dạng tối đa để trông giống người thật nhất.";
        break;
  }

  const systemInstruction = `
    Bạn là một chuyên gia Social Media Seeding tại Việt Nam. 
    Nhiệm vụ của bạn là tạo ra các nội dung text (comment hoặc status) tự nhiên, chân thật, phù hợp với ngữ cảnh mạng xã hội Việt Nam.
    
    Yêu cầu quan trọng:
    - Ngôn ngữ: Tiếng Việt tự nhiên, có thể dùng teencode, slang phổ biến nếu phù hợp (vd: kkk, ui chao, hóng, ib, shop ơi, trầm cảm).
    - Không được quá giống robot, phải giống người dùng thật.
    - Phù hợp với nền tảng: ${platform}.
    - Phù hợp với thái độ: ${sentiment}.
    - Yêu cầu về Phong cách/Độ dài: ${styleInstruction}
  `;

  let promptContext = `Nội dung bài đăng gốc cần seeding: "${postContent}"`;
  
  if (mode === SeedingMode.STATUS_CAPTION) {
      promptContext = `Chủ đề status muốn đăng: "${postContent}". Hãy viết các caption khác nhau về chủ đề này để đăng lên tường nhà.`;
  }

  const prompt = `
    Hãy tạo ${count} nội dung khác nhau dựa trên yêu cầu sau:
    ${promptContext}
    
    Yêu cầu đầu ra:
    - Trả về danh sách ${count} nội dung text khác nhau.
    - Đảm bảo tuân thủ phong cách ${mode}.
    - Chỉ trả về nội dung text.
  `;

  try {
    const ai = getAIClient();
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: systemInstruction,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              commentText: {
                type: Type.STRING,
                description: "Nội dung text tiếng Việt",
              },
            },
            required: ["commentText"],
          },
        },
      },
    });

    const rawComments = JSON.parse(response.text || "[]");
    
    // Map to our Comment interface with simulated user data
    return rawComments.map((item: any, index: number) => ({
      id: `gen-${Date.now()}-${index}`,
      text: item.commentText,
      authorName: getRandomName(),
      avatarUrl: `https://picsum.photos/seed/${Math.random()}/50/50`,
      sentiment: sentiment,
      isUsed: false,
    }));

  } catch (error) {
    console.error("Lỗi khi gọi Gemini:", error);
    throw error; // Throw error to UI to let user know API failed
  }
};

export const suggestCampaignIdeas = async (topic: string): Promise<string[]> => {
    try {
        const ai = getAIClient();
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: `Hãy gợi ý 5 ý tưởng nội dung bài đăng Facebook để seeding cho chủ đề: "${topic}". Trả về JSON array string.`,
            config: {
                 responseMimeType: "application/json",
                 responseSchema: {
                    type: Type.ARRAY,
                    items: { type: Type.STRING }
                 }
            }
        });
        return JSON.parse(response.text || "[]");
    } catch (e) {
        return [];
    }
}
