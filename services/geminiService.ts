
import { GoogleGenAI, Type } from "@google/genai";

// Always use process.env.API_KEY directly for client initialization.
const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const analyzeTenderStructure = async (text: string, totalWords: number) => {
  const ai = getAI();
  // 根据字数动态建议章节数，更灵活，不再死守 10 章
  const suggestedMin = Math.max(6, Math.floor(totalWords / 2000));
  const suggestedMax = Math.min(15, Math.ceil(totalWords / 1000));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      你是一个资深的投标专家。请根据提供的招标书内容，规划一份总字数目标为 ${totalWords} 字的投标方案结构。
      
      要求：
      1. 规划约 ${suggestedMin}-${suggestedMax} 个章节，确保结构能够覆盖招标书所有核心要求。
      2. 为每个章节分配目标字数，且所有章节的 targetWordCount 总和必须【完全等于】 ${totalWords}。
      3. 每个章节必须有简要的“扩写指南”，指导后续如何通过技术细节、案例、流程图描述来填充字数。
      4. 输出 JSON 格式。

      招标书参考文本：
      ${text.substring(0, 8000)}
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

  return JSON.parse(response.text);
};

export const generateSectionContent = async (
  tenderContext: string,
  sectionTitle: string,
  targetCount: number,
  description: string
) => {
  const ai = getAI();
  
  // 核心扩写指令：要求 AI 采用详尽叙述
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `
      你正在编写投标书的“${sectionTitle}”章节。
      【字数铁律】：该章节必须输出约 ${targetCount} 字。字数不足会导致失分。
      
      【写作任务】：
      1. 任务背景：${description}
      2. 扩写技巧：如果字数要求较多，请通过“多维论证”来扩充内容。例如：不仅仅写“我们会保证质量”，而是详细描述“原材料入库检验（15个指标）、生产过程巡检（每2小时一次）、成品出厂抽检（AQL标准）”等具体操作。
      3. 结构化：每 300-500 字建议一个小标题，确保长文本易读。
      4. 包含具体的数据、标准的管理表格描述（文字叙述）、详尽的职责分工和时间节点规划。
      
      【关联招标书】：
      ${tenderContext.substring(0, 4000)}
      
      请直接输出正文，不要包含任何自我介绍或解释。
    `,
    config: {
      temperature: 0.85,
      thinkingConfig: { thinkingBudget: 15000 }
    }
  });

  return response.text;
};
