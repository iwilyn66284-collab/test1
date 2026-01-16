
import { GoogleGenAI, Type } from "@google/genai";

/**
 * 方案架构顶层设计
 */
export const analyzeTenderStructure = async (text: string, totalWords: number) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      # 角色：资深招标顾问
      # 任务：基于提供的招标需求书，规划一份逻辑严密、满足商务和技术评分标准的投标方案架构。

      ## 编制原则：
      1. **架构稳定性**：章节数量控制在 10 章左右（8-12章）。
      2. **科学分配**：基于总字数 ${totalWords}，主章节（技术方案、施工组织等）需分配 60% 以上字数。
      3. **合规术语**：标题需符合行业标准（如：编制依据、质量保证措施、应急响应方案等）。

      ## 响应要求：
      必须以纯 JSON 格式返回。

      ## 招标原始文档：
      ${text.substring(0, 15000)}
    `,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          sections: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                targetWordCount: { type: Type.NUMBER },
                description: { type: Type.STRING }
              },
              required: ["title", "targetWordCount", "description"]
            }
          }
        },
        required: ["title", "sections"]
      }
    }
  });

  try {
    const textOutput = response.text || '';
    return JSON.parse(textOutput.replace(/```json|```/g, '').trim());
  } catch (e) {
    console.error("解析大纲失败:", e);
    throw new Error("架构规划解析异常，请重试。");
  }
};

/**
 * 章节内容深度扩写引擎
 */
export const generateSectionContent = async (
  tenderContext: string,
  sectionTitle: string,
  targetCount: number,
  description: string
) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      # 角色：资深标书编制专家
      # 任务：为投标书章节《${sectionTitle}》进行深度内容扩写。

      ## 核心要求：
      - **字数对标**：生成内容必须不少于 ${targetCount} 字。
      - **条款响应**：深度结合下方招标参考资料，进行针对性响应，体现方案的唯一性和匹配度。
      - **专业排版**：强制使用公文分级：一、 (一) 1. (1)。
      - **严禁虚假空话**：增加具体的工作标准、管理流程、质量控制点及具体参数描述。

      ## 章节编制导向：
      ${description}

      ## 招标背景资料支持：
      ${tenderContext.substring(0, 6000)}

      请直接输出正文内容。
    `
  });

  return response.text || '内容生成异常，请重新尝试。';
};
