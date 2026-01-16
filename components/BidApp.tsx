
import React, { useState, useRef, useEffect } from 'react';
import { 
  FileUp, LogOut, FileText, 
  Loader2, Download, AlertCircle, CheckCircle2, 
  Trash2, Sliders, Edit3,
  Target, Sparkles, Files, ExternalLink,
  ChevronRight, ShieldCheck, Briefcase,
  Layers, BookOpen
} from 'lucide-react';
import { BidProject } from '../types';
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
    setParsingStatus('正在深度析取招标要素...');
    setError(null);

    try {
      const extension = file.name.split('.').pop()?.toLowerCase();
      let text = '';

      if (extension === 'docx') {
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        text = result.value;
      } else if (extension === 'pdf') {
        const loadingTask = pdfjsLib.getDocument({ data: await file.arrayBuffer() });
        const pdf = await loadingTask.promise;
        let fullText = '';
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const content = await page.getTextContent();
          fullText += content.items.map((item: any) => (item as any).str).join(' ') + '\n';
        }
        text = fullText;
      }

      if (!text.trim()) throw new Error('解析失败：未检测到有效文本内容。');

      setProject({
        id: Date.now().toString(),
        tenderTitle: file.name.replace(/\.[^/.]+$/, ""),
        originalText: text,
        targetTotalWords: wordCountInput,
        sections: [],
        status: 'idle'
      });
    } catch (err: any) {
      setError(`要素录入异常: ${err.message}`);
    } finally {
      setIsProcessing(false);
      setParsingStatus('');
    }
  };

  const handleAnalyze = async () => {
    if (!project) return;
    setIsProcessing(true);
    setParsingStatus('正在规划方案大纲...');
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
    } catch (err: any) {
      setError(`架构规划失败: ${err.message}`);
    } finally { 
      setIsProcessing(false);
      setParsingStatus('');
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
    } catch (err: any) {
      setError(`[${section.title}] 编制异常: ${err.message}`);
      setProject(prev => {
        if (!prev) return null;
        const newSections = [...prev.sections];
        newSections[index] = { ...newSections[index], isGenerating: false };
        return { ...prev, sections: newSections };
      });
    }
  };

  const handleGenerateAll = async () => {
    if (!project) return;
    for (let i = 0; i < project.sections.length; i++) {
      if (!project.sections[i].content) {
        await handleGenerateSection(i);
      }
    }
  };

  const downloadPDF = () => {
    if (!project) return;
    const element = pdfExportRef.current;
    
    const opt = {
      margin: [15, 15, 15, 15],
      filename: `投标书_${project.tenderTitle}_${new Date().getTime()}.pdf`,
      image: { type: 'jpeg', quality: 1.0 },
      html2canvas: { 
        scale: 3, 
        useCORS: true, 
        letterRendering: true,
        windowWidth: 1024
      },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['css', 'legacy'] }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <div className="h-screen flex flex-col bg-[#F8FAFC] text-slate-900 overflow-hidden">
      {/* Top Nav: Professional & Clean */}
      <nav className="h-14 bg-[#0F172A] px-6 flex items-center justify-between z-40 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center text-white shadow-lg">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-white font-bold tracking-tight text-sm uppercase">SmartBid <span className="text-indigo-400">Pro</span></h1>
            <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest leading-none mt-0.5">AI Bidding Authority</p>
          </div>
        </div>

        <div className="flex items-center gap-10">
          {project && (
            <div className="flex items-center gap-10">
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">编制达成率</span>
                  <div className="flex items-center gap-3 mt-1">
                    <div className="h-1 w-32 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 transition-all duration-1000 shadow-[0_0_8px_rgba(99,102,241,0.5)]" style={{ width: `${Math.min(100, wordAccuracy)}%` }}></div>
                    </div>
                    <span className="text-[10px] font-bold text-white tabular-nums">{wordAccuracy}%</span>
                  </div>
               </div>
               <div className="flex flex-col items-end">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">实时字符数</span>
                  <span className="text-xs font-bold text-white tabular-nums">
                    {totalCurrentWords.toLocaleString()} <span className="text-slate-600 font-medium">/ {project.targetTotalWords.toLocaleString()}</span>
                  </span>
               </div>
            </div>
          )}
          <button onClick={onLogout} className="p-2 text-slate-500 hover:text-white transition-colors">
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </nav>

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar Controls */}
        <aside className="w-[280px] bg-white border-r border-slate-200 flex flex-col z-30 flex-shrink-0">
          <div className="p-6 space-y-10 overflow-y-auto flex-1 custom-scrollbar">
            <section className="space-y-6">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5" /> 编制任务配置
              </h4>
              
              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">目标字数</label>
                  <input 
                    type="number" 
                    value={wordCountInput}
                    onChange={(e) => setWordCountInput(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-lg font-black focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all"
                  />
                </div>

                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className={`group p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-4 cursor-pointer transition-all ${project ? 'border-indigo-100 bg-indigo-50/20' : 'border-slate-100 hover:border-indigo-400 hover:bg-slate-50'}`}
                >
                  <FileUp className={`w-6 h-6 ${project ? 'text-indigo-600' : 'text-slate-300'}`} />
                  <div className="text-center">
                    <span className="text-[10px] font-bold text-slate-800 block uppercase tracking-tight">
                      {project ? '更新招标原件' : '录入招标原件'}
                    </span>
                    <span className="text-[8px] font-bold text-slate-300 mt-1 uppercase">Docx / PDF Supported</span>
                  </div>
                  <input type="file" ref={fileInputRef} className="hidden" accept=".pdf,.docx" onChange={handleFileUpload} />
                </div>

                <button 
                  onClick={handleAnalyze}
                  disabled={isProcessing || !project}
                  className="w-full py-4 bg-[#0F172A] text-white rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] hover:bg-indigo-600 shadow-xl disabled:opacity-20 transition-all flex items-center justify-center gap-2"
                >
                  {isProcessing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Layers className="w-3.5 h-3.5" />}
                  智能架构规划
                </button>
              </div>
            </section>

            {project && project.sections.length > 0 && (
              <section className="space-y-4 pt-8 border-t border-slate-50 animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">章节导航清单</h4>
                  <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-100">{project.sections.length} 章</span>
                </div>
                <div className="space-y-1">
                  {project.sections.map((s, idx) => (
                    <div key={idx} className={`p-2.5 rounded-lg border transition-all flex items-center justify-between gap-3 ${s.content ? 'bg-indigo-50/40 border-indigo-100' : 'bg-transparent border-transparent'}`}>
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <span className="text-[9px] font-bold text-slate-300 tabular-nums">#{(idx+1).toString().padStart(2, '0')}</span>
                        <p className={`text-[10px] font-bold truncate ${s.content ? 'text-slate-800' : 'text-slate-400'}`}>{s.title}</p>
                      </div>
                      {s.content ? <CheckCircle2 className="w-3 h-3 text-indigo-500 flex-shrink-0" /> : <ChevronRight className="w-3 h-3 text-slate-100" />}
                    </div>
                  ))}
                </div>
              </section>
            )}
          </div>

          <div className="p-4 border-t border-slate-100">
             <button 
               onClick={() => project && confirm('是否确定清除当前编制进度？') && setProject(null)} 
               className="w-full py-2.5 text-[9px] font-bold text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all uppercase tracking-[0.1em] flex items-center justify-center gap-2"
             >
                <Trash2 className="w-3 h-3" /> 重置编制任务
             </button>
          </div>
        </aside>

        {/* Main Workspace */}
        <main className="flex-1 flex flex-col relative overflow-hidden">
          {!project ? (
            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center animate-in fade-in duration-700">
               <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-10 border border-slate-100">
                  <Briefcase className="w-8 h-8 text-slate-200" />
               </div>
               <h2 className="text-xl font-bold text-slate-900 mb-2 tracking-tight">准备开启专业投标编制</h2>
               <p className="text-slate-400 max-w-xs text-[10px] leading-relaxed font-bold uppercase tracking-widest">
                 录入招标原件并规划架构，依托旗舰级 AI 实现全自动、高合规性的正文编制。
               </p>
            </div>
          ) : (
            <>
              {/* Secondary Toolbar */}
              <div className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-100 px-8 flex items-center justify-between flex-shrink-0 z-20">
                <div className="flex items-center gap-4">
                   <div className="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center shadow-lg"><Files className="w-4.5 h-4.5 text-white" /></div>
                   <div>
                      <h2 className="font-bold text-slate-800 text-sm truncate max-w-md">{project.tenderTitle}</h2>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded tracking-widest uppercase border border-indigo-100">AI PRO Pipeline</span>
                      </div>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   {project.sections.length > 0 && (
                     <>
                       <button onClick={handleGenerateAll} disabled={isProcessing} className="px-5 py-2.5 bg-slate-50 text-slate-600 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-slate-100 transition-all border border-slate-200">一键流水线编制</button>
                       <button onClick={downloadPDF} className="px-6 py-2.5 bg-[#0F172A] text-white rounded-xl text-[10px] font-bold uppercase tracking-widest hover:bg-black shadow-xl flex items-center gap-2.5 transition-all active:scale-95">
                          <Download className="w-3.5 h-3.5" /> 导出终稿 PDF
                       </button>
                     </>
                   )}
                </div>
              </div>

              {/* Scrollable Editor Canvas */}
              <div className="flex-1 overflow-y-auto p-12 space-y-16 scroll-smooth custom-scrollbar bg-[#F1F5F9]/30">
                {error && (
                  <div className="max-w-4xl mx-auto p-5 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4 text-red-600 shadow-xl shadow-red-100/30 animate-in slide-in-from-top-4">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <div className="flex-1 text-[11px] font-bold leading-relaxed">{error}</div>
                    <button onClick={() => setError(null)} className="p-1.5 hover:bg-red-100 rounded-full transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                )}

                {project.sections.length === 0 ? (
                  <div className="max-w-4xl mx-auto py-32 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center text-slate-200 gap-6 opacity-60">
                    <BookOpen className="w-14 h-14" />
                    <p className="font-bold text-[10px] uppercase tracking-[0.5em]">请在左侧控制台执行架构规划</p>
                  </div>
                ) : (
                  project.sections.map((section, idx) => (
                    <article key={idx} className="max-w-4xl mx-auto bg-white rounded-[2rem] shadow-sm border border-slate-100 overflow-hidden group transition-all duration-500 hover:shadow-2xl hover:border-indigo-100 hover:-translate-y-1">
                      {/* Section Header */}
                      <div className="px-10 py-10 border-b border-slate-50 flex items-center justify-between bg-slate-50/10 group-hover:bg-white transition-colors">
                         <div className="flex items-center gap-8">
                            <span className="text-7xl font-black text-slate-100 select-none group-hover:text-indigo-50 transition-colors duration-1000">{(idx+1).toString().padStart(2, '0')}</span>
                            <div className="h-12 w-1.5 bg-indigo-600/10 rounded-full"></div>
                            <div>
                               <h4 className="text-xl font-bold text-slate-900 tracking-tight leading-tight">{section.title}</h4>
                               <div className="flex items-center gap-4 mt-3">
                                  <div className="flex items-center gap-1.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest bg-white px-3 py-1 rounded-lg border border-slate-100 shadow-sm">
                                     <Target className="w-3 h-3 text-indigo-400" /> 目标: {section.targetWordCount}
                                  </div>
                                  {section.content && (
                                     <div className={`text-[9px] font-bold uppercase tracking-widest px-3 py-1 rounded-lg border shadow-sm transition-colors ${section.content.length >= section.targetWordCount ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-amber-600 bg-amber-50 border-amber-100'}`}>
                                        当前量级: {section.content.length}
                                     </div>
                                  )}
                               </div>
                            </div>
                         </div>
                         <button 
                           disabled={section.isGenerating}
                           onClick={() => handleGenerateSection(idx)}
                           className={`px-7 py-3 rounded-xl text-[10px] font-bold uppercase tracking-[0.2em] transition-all ${section.content ? 'text-indigo-600 bg-white border border-indigo-100 hover:bg-indigo-50' : 'bg-[#0F172A] text-white hover:bg-black active:scale-95 shadow-lg shadow-slate-100'}`}
                         >
                            {section.isGenerating ? <Loader2 className="w-4 h-4 animate-spin" /> : section.content ? '重编正文' : '自动编制'}
                         </button>
                      </div>
                      
                      {/* Body Workspace */}
                      <div className="p-12 min-h-[300px] relative">
                        {section.isGenerating ? (
                           <div className="py-24 flex flex-col items-center justify-center gap-8 animate-in fade-in zoom-in-95">
                              <div className="w-16 h-16 relative">
                                <div className="absolute inset-0 border-[3px] border-slate-50 rounded-full"></div>
                                <div className="absolute inset-0 border-[3px] border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                                <div className="absolute inset-0 flex items-center justify-center"><Edit3 className="w-6 h-6 text-indigo-600" /></div>
                              </div>
                              <div className="text-center space-y-2">
                                <p className="text-[11px] font-bold text-slate-900 uppercase tracking-[0.4em] animate-pulse">正在深度同步编制正文内容...</p>
                                <p className="text-[9px] font-medium text-slate-300 uppercase tracking-widest">基于标书背景深度生成中</p>
                              </div>
                           </div>
                        ) : section.content ? (
                           <div className="relative group/editor animate-in fade-in duration-1000">
                             <div className="absolute -top-7 right-0 opacity-0 group-hover/editor:opacity-100 transition-all text-[9px] font-bold text-slate-300 uppercase tracking-[0.3em] flex items-center gap-2">
                                实时同步编辑模式 <ExternalLink className="w-3 h-3" />
                             </div>
                             <textarea 
                               value={section.content}
                               onChange={(e) => handleUpdateContent(idx, e.target.value)}
                               className="w-full min-h-[400px] text-slate-700 leading-[2.2] font-normal text-[17px] outline-none bg-transparent resize-none border-none focus:ring-0 p-0 text-justify custom-scrollbar"
                               spellCheck={false}
                               placeholder="内容等待生成..."
                             />
                           </div>
                        ) : (
                          <div className="py-24 flex flex-col items-center justify-center opacity-[0.04] grayscale gap-6">
                             <FileText className="w-24 h-24" />
                             <p className="font-bold text-xs uppercase tracking-[0.8em]">Awaiting Content Synthesis</p>
                          </div>
                        )}
                      </div>
                    </article>
                  ))
                )}
                <div className="h-48"></div>
              </div>
            </>
          )}
        </main>
      </div>

      {/* PDF Export Template - Hidden, Optimized for Chinese */}
      <div className="hidden">
        <div ref={pdfExportRef} className="pdf-export-container p-20 text-black bg-white">
           {/* Cover: Minimalist Enterprise Design */}
           <div className="text-center pt-48 mb-[500px]" style={{ pageBreakAfter: 'always' }}>
              <div className="w-24 h-2 bg-black mx-auto mb-20 rounded-full"></div>
              <h4 className="text-[14px] font-bold tracking-[1.2em] text-gray-400 mb-12 uppercase">Strictly Confidential Proposal</h4>
              <h1 className="text-6xl font-black mb-20 leading-[1.2] px-16 tracking-tight text-gray-900">{project?.tenderTitle}</h1>
              <div className="h-1.5 w-56 bg-indigo-600 mx-auto mb-28 rounded-full"></div>
              <h2 className="text-4xl font-bold tracking-[0.6em] text-gray-800 uppercase">投标方案建议书</h2>
              
              <div className="mt-[200px] max-w-sm mx-auto text-left space-y-7 border-t-2 border-gray-100 pt-20">
                 <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">编制引擎</span>
                    <span className="text-sm font-bold text-gray-900">SmartBid Pro AI Pipeline</span>
                 </div>
                 <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">最终字符数</span>
                    <span className="text-sm font-bold text-gray-900">{project?.targetTotalWords.toLocaleString()} Chars</span>
                 </div>
                 <div className="flex justify-between items-end">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">最终编制日期</span>
                    <span className="text-sm font-bold text-gray-900">{new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
                 </div>
              </div>
           </div>
           
           {/* Contents Page Placeholder (Manual/Optional) */}
           
           {/* Body Sections: Standard Public Document Layout */}
           {project?.sections.map((s, idx) => (
             <div key={idx} className="mb-32" style={{ pageBreakInside: 'avoid' }}>
                <div className="flex items-end gap-12 mb-16 border-b-4 border-gray-900 pb-8">
                   <span className="text-8xl font-black text-gray-100 leading-none">{(idx+1).toString().padStart(2, '0')}</span>
                   <h3 className="text-4xl font-bold flex-1 tracking-tight mb-2">{s.title}</h3>
                </div>
                <div className="text-[15.5pt] leading-[2.2] whitespace-pre-wrap text-justify tracking-normal font-normal text-gray-900" style={{ lineHeight: '2.2' }}>
                   {s.content || "内容正在同步中，请稍候。"}
                </div>
             </div>
           ))}

           <div className="mt-60 pt-12 border-t border-gray-100 text-center text-gray-300 text-[10px] font-bold uppercase tracking-[0.8em]">
              由 SmartBid AI 系统自动化编制完成 • 仅供企业内部投标评审使用
           </div>
        </div>
      </div>

      {/* Global Processing Loader */}
      {(isProcessing || parsingStatus) && (
        <div className="fixed inset-0 bg-white/70 backdrop-blur-2xl z-[100] flex items-center justify-center animate-in fade-in duration-500">
           <div className="flex flex-col items-center gap-10 bg-white p-16 rounded-[3rem] shadow-[0_30px_100px_rgba(0,0,0,0.1)] border border-white">
              <div className="relative">
                 <div className="w-20 h-20 border-[3px] border-slate-100 border-t-indigo-600 rounded-full animate-spin"></div>
                 <div className="absolute inset-0 flex items-center justify-center">
                    <Sparkles className="w-7 h-7 text-indigo-600 animate-pulse" />
                 </div>
              </div>
              <div className="text-center space-y-3">
                 <p className="text-xs font-bold text-slate-900 uppercase tracking-[0.5em] ml-1">AI Pipeline Processing</p>
                 <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest animate-pulse">{parsingStatus || '逻辑神经网络运算中...'}</p>
              </div>
           </div>
        </div>
      )}
    </div>
  );
};

export default BidApp;
