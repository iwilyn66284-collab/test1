
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, Settings, LogOut, ChevronRight, FileText, 
  Loader2, Download, AlertCircle, CheckCircle2, 
  Trash2, Layers, LayoutDashboard, Sliders, Info, Edit3,
  PlusCircle, Target, Sparkles, Files
} from 'lucide-react';
import { BidProject, BidSection } from '../types';
import { analyzeTenderStructure, generateSectionContent } from '../services/geminiService';

declare const mammoth: any;
declare const pdfjsLib: any;
declare const html2pdf: any;

interface BidAppProps {
  onLogout: () => void;
}

const BidApp: React.FC<BidAppProps> = ({ onLogout }) => {
  const [project, setProject] = useState<BidProject | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [parsingStatus, setParsingStatus] = useState<string>('');
  const [wordCountInput, setWordCountInput] = useState<number>(10000);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pdfExportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof pdfjsLib !== 'undefined') {
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
    }
  }, []);

  const totalCurrentWords = project?.sections.reduce((acc, s) => acc + (s.content?.length || 0), 0) || 0;
  const wordAccuracy = project ? Math.round((totalCurrentWords / project.targetTotalWords) * 100) : 0;

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setParsingStatus('正在初始化文档解析引擎...');
    setError(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let text = '';

      if (extension === 'docx') {
        setParsingStatus('正在提取 Word 结构内容...');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (extension === 'pdf') {
        const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
        const pdf = await loadingTask.promise;
        
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          setParsingStatus(`扫描 PDF 页面: ${i}/${pdf.numPages}`);
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => item.str).join(' ') + '\n';
        }
        text = fullText;
      }

      if (!text.trim()) throw new Error('解析失败：未发现可提取的文本内容。');

      setProject({
        id: Date.now().toString(),
        tenderTitle: file.name.replace(/\.[^/.]+$/, ""),
        originalText: text,
        targetTotalWords: wordCountInput,
        sections: [],
        status: 'idle'
      });
    } catch (err: any) {
      setError(err.message || '文件上传失败。');
    } finally {
      setIsProcessing(false);
      setParsingStatus('');
    }
  };

  const handleAnalyze = async () => {
    if (!project) return;
    setIsProcessing(true);
    setError(null);
    try {
      const structure = await analyzeTenderStructure(project.originalText, wordCountInput);
      setProject(prev => prev ? {
        ...prev,
        targetTotalWords: wordCountInput,
        sections: structure.sections.map((s: any) => ({
          title: s.title,
          targetWordCount: s.targetWordCount,
          description: s.description,
          content: '',
          isGenerating: false
        })),
        status: 'idle'
      } : null);
    } catch (err) {
      setError('分析失败：AI 无法从当前内容中构建有效大纲。');
    } finally { setIsProcessing(false); }
  };

  const handleGenerateSection = async (index: number) => {
    if (!project) return;
    const section = project.sections[index];
    setProject(prev => {
      if (!prev) return null;
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], isGenerating: true };
      return { ...prev, sections: newSections };
    });

    try {
      const content = await generateSectionContent(
        project.originalText,
        section.title,
        section.targetWordCount,
        section.description
      );
      setProject(prev => {
        if (!prev) return null;
        const newSections = [...prev.sections];
        newSections[index] = { ...newSections[index], content, isGenerating: false };
        return { ...prev, sections: newSections };
      });
    } catch (err) {
      setError(`章节生成中断：${section.title}`);
      setProject(prev => {
        if (!prev) return null;
        const newSections = [...prev.sections];
        newSections[index] = { ...newSections[index], isGenerating: false };
        return { ...prev, sections: newSections };
      });
    }
  };

  const handleUpdateContent = (index: number, newContent: string) => {
    setProject(prev => {
      if (!prev) return null;
      const newSections = [...prev.sections];
      newSections[index] = { ...newSections[index], content: newContent };
      return { ...prev, sections: newSections };
    });
  };

  const handleGenerateAll = async () => {
    if (!project) return;
    for (let i = 0; i < project.sections.length; i++) {
      if (!project.sections[i].content) await handleGenerateSection(i);
    }
  };

  const downloadPDF = () => {
    if (!project) return;
    const element = pdfExportRef.current;
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `${project.tenderTitle}_AI全量投标书.pdf`,
      image: { type: 'jpeg', quality: 1 },
      html2canvas: { scale: 3, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="h-screen flex flex-col bg-[#F9FBFC] overflow-hidden text-slate-900 font-sans">
      {/* 精简顶栏 */}
      <nav className="h-14 bg-white border-b border-slate-200 px-6 flex items-center justify-between z-40 flex-shrink-0 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-indigo-100 shadow-lg">
            <Layers className="w-4.5 h-4.5" />
          </div>
          <h1 className="font-extrabold text-slate-800 tracking-tight text-base">SmartBid <span className="text-indigo-600">AI</span></h1>
          <span className="h-4 w-px bg-slate-200 mx-2"></span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-md">Enterprise Console</span>
        </div>

        <div className="flex items-center gap-6">
          {project && (
            <div className="flex items-center gap-4">
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Completion</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-indigo-600 transition-all duration-1000 ease-in-out`} style={{ width: `${Math.min(100, wordAccuracy)}%` }}></div>
                    </div>
                    <span className="text-[11px] font-bold text-indigo-600">{wordAccuracy}%</span>
                  </div>
               </div>
               <div className="h-8 w-px bg-slate-100"></div>
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">Word Count</span>
                  <span className="text-[11px] font-bold text-slate-700">{totalCurrentWords.toLocaleString()} <span className="text-slate-300">/ {project.targetTotalWords.toLocaleString()}</span></span>
               </div>
            </div>
          )}
          <button onClick={onLogout} className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* 工具导航区 */}
        <aside className="w-72 bg-white border-r border-slate-200 flex flex-col z-30 flex-shrink-0">
          <div className="p-5 space-y-8 overflow-y-auto flex-1 scrollbar-thin">
            {/* 项目核心入口 */}
            <section className="space-y-4">
              <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] px-1">基础配置</h4>
              <div className="space-y-3">
                <div className="group p-4 bg-slate-50 border border-slate-100 rounded-2xl transition-all focus-within:ring-2 focus-within:ring-indigo-100">
                  <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">理想总字数</label>
                  <input 
                    type="number" 
                    value={wordCountInput}
                    onChange={(e) => setWordCountInput(parseInt(e.target.value) || 0)}
                    className="w-full bg-transparent text-lg font-black text-slate-800 outline-none"
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`p-4 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 cursor-pointer transition-all ${project ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-200 hover:border-indigo-300 hover:bg-slate-50'}`}
                >
                  <FileUp className={`w-5 h-5 ${project ? 'text-indigo-500' : 'text-slate-300'}`} />
                  <span className="text-[11px] font-bold text-slate-600">{project ? '更换原件' : '上传招标书'}</span>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                </div>

                <button 
                  onClick={handleAnalyze}
                  disabled={isProcessing || !project}
                  className="w-full py-3.5 bg-slate-900 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 shadow-xl shadow-slate-100 disabled:opacity-20 transition-all active:scale-95"
                >
                  AI 规划大纲
                </button>
              </div>
            </section>

            {/* 章节导航列表 */}
            {project && project.sections.length > 0 && (
              <section className="space-y-4 pt-4">
                <div className="flex items-center justify-between px-1">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">智能大纲</h4>
                  <span className="text-[9px] font-bold text-slate-300">{project.sections.length} 章节</span>
                </div>
                <div className="space-y-1.5">
                  {project.sections.map((s, idx) => (
                    <div key={idx} className={`p-3 rounded-xl border border-transparent transition-all cursor-default flex items-center justify-between group ${s.content ? 'bg-indigo-50/50 border-indigo-100' : 'hover:bg-slate-50'}`}>
                      <div className="flex items-center gap-3 overflow-hidden">
                        <span className="text-[10px] font-black text-slate-300 w-4">{idx + 1}</span>
                        <p className={`text-[11px] font-bold truncate transition-colors ${s.content ? 'text-indigo-600' : 'text-slate-600'}`}>{s.title}</p>
                      </div>
                      {s.content && <CheckCircle2 className="w-3 h-3 text-indigo-500" />}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="p-4 border-t border-slate-100 bg-slate-50/30">
             <button 
               onClick={() => project && confirm('重置将清空所有内容，是否继续？') && setProject(null)} 
               className="w-full py-2.5 text-[10px] font-black text-slate-400 hover:text-red-500 transition-colors uppercase tracking-widest"
             >
                Reset System
             </button>
          </div>
        </aside>

        {/* 核心创作工作台 */}
        <main className="flex-1 overflow-hidden flex flex-col">
          {!project ? (
            <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
               <div className="w-24 h-24 bg-white rounded-3xl shadow-[0_20px_40px_-15px_rgba(0,0,0,0.1)] flex items-center justify-center mb-8">
                  <Sparkles className="w-10 h-10 text-indigo-500" />
               </div>
               <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">标书创作，由此开始</h2>
               <p className="text-slate-400 max-w-sm font-medium leading-relaxed">请通过左侧面板上传您的招标书文件，SmartBid 将通过 Gemini 模型为您精准构建万字投标方案。</p>
            </div>
          ) : (
            <>
              {/* 文档工具条 */}
              <div className="h-16 bg-white border-b border-slate-200 px-10 flex items-center justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                   <div className="p-2 bg-slate-100 rounded-lg"><Files className="w-4 h-4 text-slate-500" /></div>
                   <h2 className="font-black text-slate-800 tracking-tight text-sm truncate max-w-sm">{project.tenderTitle}</h2>
                </div>
                <div className="flex items-center gap-3">
                   {project.sections.length > 0 && (
                     <>
                       <button onClick={handleGenerateAll} className="px-5 py-2.5 bg-indigo-50 text-indigo-600 rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-100 transition-all">全本生成</button>
                       <button onClick={downloadPDF} className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-[11px] font-black uppercase tracking-widest hover:bg-indigo-700 shadow-xl shadow-indigo-100 flex items-center gap-2">
                          <Download className="w-3.5 h-3.5" /> 导出 PDF
                       </button>
                     </>
                   )}
                </div>
              </div>

              {/* 文档滚动画布 */}
              <div className="flex-1 overflow-y-auto p-12 bg-[#F2F5F8] space-y-8 scroll-smooth custom-scrollbar">
                {error && (
                  <div className="max-w-4xl mx-auto p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-3 text-red-600 text-[13px] font-bold">
                    <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                {project.sections.length === 0 ? (
                  <div className="max-w-4xl mx-auto py-20 border-2 border-dashed border-slate-200 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 gap-4">
                    <LayoutDashboard className="w-12 h-12 opacity-10" />
                    <p className="font-black text-sm uppercase tracking-widest">请启动 AI 规划大纲以展开画布</p>
                  </div>
                ) : (
                  project.sections.map((section, idx) => (
                    <article key={idx} className="max-w-4xl mx-auto bg-white border border-slate-200 rounded-[2rem] shadow-[0_4px_12px_rgba(0,0,0,0.02)] transition-all hover:shadow-[0_20px_40px_-10px_rgba(0,0,0,0.04)] overflow-hidden">
                      {/* 章节头 */}
                      <div className="px-10 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                         <div className="flex items-center gap-6">
                            <span className="text-4xl font-black text-slate-100 select-none">{idx + 1}</span>
                            <div>
                               <h4 className="text-lg font-black text-slate-800 tracking-tight">{section.title}</h4>
                               <div className="flex items-center gap-4 mt-1">
                                  <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                                     <Target className="w-2.5 h-2.5" /> 建议: {section.targetWordCount}
                                  </div>
                                  {section.content && (
                                     <div className={`text-[10px] font-black uppercase tracking-widest ${section.content.length >= section.targetWordCount ? 'text-green-500' : 'text-amber-500'}`}>
                                        当前: {section.content.length} 字
                                     </div>
                                  )}
                               </div>
                            </div>
                         </div>
                         <button 
                           disabled={section.isGenerating}
                           onClick={() => handleGenerateSection(idx)}
                           className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${section.content ? 'text-indigo-600 bg-indigo-50 border border-indigo-100' : 'bg-indigo-600 text-white shadow-lg'}`}
                         >
                            {section.isGenerating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : section.content ? '重新生成' : '启动扩写'}
                         </button>
                      </div>
                      
                      {/* 内容编辑区 */}
                      <div className="p-10">
                        {section.isGenerating ? (
                           <div className="py-20 flex flex-col items-center justify-center gap-4 text-slate-300">
                              <Loader2 className="w-10 h-10 animate-spin text-indigo-400" />
                              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">正在进行深度语义建模与字数填充...</p>
                           </div>
                        ) : section.content ? (
                           <div className="group relative">
                             <div className="absolute -top-6 right-0 text-[9px] font-black text-slate-300 uppercase tracking-widest flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Edit3 className="w-2.5 h-2.5" /> 已进入预览编辑模式
                             </div>
                             <textarea 
                               value={section.content}
                               onChange={(e) => handleUpdateContent(idx, e.target.value)}
                               className="w-full min-h-[400px] text-slate-700 leading-[1.8] font-serif text-[17px] outline-none bg-transparent resize-none border-none focus:ring-0 p-0"
                               spellCheck={false}
                             />
                           </div>
                        ) : (
                          <div className="py-20 flex flex-col items-center justify-center opacity-5 gap-3">
                             <FileText className="w-16 h-16" />
                             <p className="font-black text-xs uppercase tracking-[0.4em]">Draft Pending</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                )}
                
                {/* 底部留白 */}
                <div className="h-20"></div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* 隐藏的 PDF 物理模板 (精准排版无乱码) */}
      <div className="hidden">
        <div ref={pdfExportRef} className="p-16 text-black bg-white" style={{ fontFamily: '"Microsoft YaHei", SimSun, serif' }}>
           <div className="text-center mb-24 mt-20">
              <h1 className="text-5xl font-black mb-8 leading-tight">{project?.tenderTitle}</h1>
              <div className="h-1.5 w-40 bg-black mx-auto mb-10"></div>
              <p className="text-2xl font-bold tracking-[0.8em] text-slate-600 uppercase">投标方案建议书</p>
           </div>
           
           <div className="mb-24 space-y-6 max-w-lg mx-auto border-y border-slate-200 py-10">
              <div className="flex justify-between text-base font-bold text-slate-400 uppercase tracking-widest">
                 <span>字数配比</span>
                 <span className="text-black">{project?.targetTotalWords.toLocaleString()} 字</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-400 uppercase tracking-widest">
                 <span>编制机构</span>
                 <span className="text-black italic">SmartBid AI Engine</span>
              </div>
              <div className="flex justify-between text-base font-bold text-slate-400 uppercase tracking-widest">
                 <span>日期时间</span>
                 <span className="text-black">{new Date().toLocaleDateString('zh-CN')}</span>
              </div>
           </div>

           <div className="page-break" style={{ pageBreakAfter: 'always' }}></div>
           
           {project?.sections.map((s, idx) => (
             <div key={idx} className="mb-20" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-baseline gap-6 mb-8 border-b-2 border-slate-100 pb-4">
                   <span className="text-5xl font-black text-slate-100">{idx + 1}</span>
                   <h3 className="text-3xl font-black flex-1">{s.title}</h3>
                </div>
                <div className="text-[14pt] leading-[2] whitespace-pre-wrap text-justify tracking-wide">
                   {s.content || "该章节内容未填充。"}
                </div>
             </div>
           ))}
        </div>
      </div>

      {/* 沉浸式加载态 */}
      {(isProcessing || parsingStatus) && (
        <div className="fixed inset-0 bg-white/80 backdrop-blur-xl z-[100] flex items-center justify-center animate-in fade-in duration-300">
           <div className="flex flex-col items-center gap-6">
              <div className="relative">
                 <div className="w-16 h-16 border-[3px] border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-indigo-500 animate-pulse" />
                 </div>
              </div>
              <div className="text-center">
                 <p className="text-[11px] font-black text-slate-900 uppercase tracking-[0.3em] mb-1">Processing Content</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">{parsingStatus || 'Gemini 正在构建投标逻辑树...'}</p>
              </div>
           </div>
        </div>
      )}

      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #E2E8F0; border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #CBD5E1; }
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 25s linear infinite; }
      `}</style>
    </div>
  );
};

export default BidApp;
