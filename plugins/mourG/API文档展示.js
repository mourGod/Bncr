/**
 * @author mourG
 * @name API文档展示
 * @team mourG
 * @version 1.3.0
 * @description 在线展示 Bncr 框架 API 文档（锚点算法与 GitHub 对齐，修复内嵌 TOC 链接跳转，修复 marked API 兼容性）
 * @service true
 * @public false
 * @disable false
 * @authentication false
 * @systemVersion >=:3.0.0
 */

const fs = require('fs');
const path = require('path');
const log = BncrJSLogger || require('log4js').getLogger('API文档展示');

const MD_PATH = path.join(process.cwd(), 'BncrData/docs/Bncr框架API.md');

/**
 * GitHub 兼容的标题锚点生成函数
 * 规则：去格式符 → 小写 → 删除非 word/空格/CJK/连字符字符 → 空格转连字符 → 去首尾连字符
 */
function toSlug(rawText) {
  return String(rawText)
    .replace(/[`*_]/g, '')                    // 去 markdown 格式符
    .toLowerCase()
    .replace(/[^\w\s\u4e00-\u9fa5-]/g, '')   // 删除特殊标点（保留 word、空格、CJK、连字符）
    .replace(/\s/g, '-')                       // 每个空格 → 连字符（与 GitHub 规则一致，保留双空格产生的双横线）
    .replace(/^-+|-+$/g, '');                  // 去首尾连字符
}

// ── 服务端渲染（优先），无依赖则降级到客户端渲染 ──
let markedSSR = null;
try {
  markedSSR = require(path.join(process.cwd(), 'BncrData/node_modules/marked/src/marked.cjs'));
} catch (_) {}
try {
  if (!markedSSR) markedSSR = require(path.join(process.cwd(), 'BncrData/node_modules/marked'));
} catch (_) {}
try {
  if (!markedSSR) markedSSR = require('marked');
} catch (_) {}

// 内存缓存：文件不变则直接返回，避免重复读取和渲染
let cache = { mtime: 0, html: '', toc: '' };

function buildPage() {
  const stat = fs.statSync(MD_PATH);
  const mtime = stat.mtimeMs;
  if (mtime === cache.mtime && cache.html) return cache;

  const md = fs.readFileSync(MD_PATH, 'utf-8');

  // 提取标题生成 TOC
  const headings = [];
  const tocRe = /^(#{1,3})\s+(.+)$/gm;
  let m;

  while ((m = tocRe.exec(md)) !== null) {
    const level = m[1].length;
    const text = m[2].replace(/[`*_]/g, '');
    const id = toSlug(m[2]);  // 使用统一 slug 函数（传原始文本）
    headings.push({ level, text, id });
  }

  const tocHtml = headings.map(h => {
    const indent = h.level === 1 ? '' : h.level === 2 ? 'l2' : 'l3';
    return `<a class="toc-item ${indent}" href="#${h.id}">${h.text}</a>`;
  }).join('\n    ');

  // 内容渲染
  let contentHtml;
  if (markedSSR) {
    const RendererClass = markedSSR.Renderer || (markedSSR.marked && markedSSR.marked.Renderer);
    const renderer = RendererClass ? new RendererClass() : {};
    const headingId = {};

    renderer.heading = function(text, level, raw) {
      let rawForId, displayHtml, headingLevel;
      if (typeof text === 'object') {
        // marked v5+: 第一个参数是 token 对象
        headingLevel = text.depth;
        rawForId = text.text;
        displayHtml = text.text;
      } else {
        // marked v4: (text, level, raw)
        headingLevel = level;
        rawForId = (typeof raw === 'string' ? raw : null) || text;
        displayHtml = text;
      }

      const id = toSlug(rawForId);
      headingId[id] = (headingId[id] || 0) + 1;
      const finalId = headingId[id] > 1 ? `${id}-${headingId[id]}` : id;
      return `<h${headingLevel} id="${finalId}">${displayHtml}</h${headingLevel}>`;
    };

    // 表格：自动包一层横向滚动容器
    renderer.table = function(header, body) {
      if (typeof header === 'object' && header !== null && 'header' in header) {
        // marked v5+ token 对象
        const hCells = header.header.map(c => `<th>${c.text}</th>`).join('');
        const bRows  = (header.rows || []).map(r =>
          `<tr>${r.map(c => `<td>${c.text}</td>`).join('')}</tr>`
        ).join('');
        return `<div class="table-scroll"><table><thead><tr>${hCells}</tr></thead><tbody>${bRows}</tbody></table></div>`;
      }
      // marked v4 字符串参数
      return `<div class="table-scroll"><table><thead>${header}</thead><tbody>${body || ''}</tbody></table></div>`;
    };

    try {
      if (markedSSR.Marked) {
        // marked v5+：用实例避免污染全局状态
        const instance = new markedSSR.Marked();
        instance.use({ renderer });
        contentHtml = instance.parse(md);
      } else if (markedSSR.marked) {
        contentHtml = markedSSR.marked(md, { renderer });
      } else {
        contentHtml = markedSSR(md, { renderer });
      }
    } catch (e) {
      log.warn('SSR 渲染失败，降级客户端渲染:', e.message);
      contentHtml = null;
    }
  } else {
    contentHtml = null; // 客户端渲染降级
  }

  cache = { mtime, html: contentHtml, toc: tocHtml, md: contentHtml ? null : md };
  return cache;
}

(async () => {
  // 预热缓存
  try {
    buildPage();
  } catch (e) {
    log.warn('预热缓存失败（首次访问再生成）:', e.message);
  }

  router.get('/api/docs/bncr', (req, res) => {
    try {
      const { html, toc, md } = buildPage();
      const isSSR = !!html;
      const mdJson = isSSR ? 'null' : JSON.stringify(md);
      const content = isSSR ? html : '<div id="ssr-placeholder" style="color:#9aa5ce;padding:2rem">渲染中…</div>';

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(`<!DOCTYPE html>
<html lang="zh">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=5">
  <title>Bncr API 文档</title>
  <style>
    /* ── 全局变量 ── */
    :root {
      --bg: #f7f9fc;
      --surface: #ffffff;
      --border: #e6ebf1;
      --text: #32383e;
      --muted: #6e7781;
      --heading: #0d1117;
      --link: #0969da;
      --accent: #0969da;
      --accent2: #8250df;
      --code-bg: #f3fdf9; /* 亮色绿蓝背景 */
      --code-border: #aedccf; /* 绿蓝边框 */
      --code-text: #0d1117; /* 代码文字为黑色 */
      --code-muted: #57606a; /* 代码注释灰色 */
      --inline: #cf222e;
      --nav-bg: #ffffff;
      --sidebar-bg: #ffffff;
      --sidebar: 270px;
      --nav: 58px;
    }

    * { box-sizing: border-box; margin: 0; padding: 0; }

    html {
      scroll-behavior: smooth;
      scroll-padding-top: calc(var(--nav) + 16px);
      overflow-x: hidden;
    }

    body {
      background: var(--bg);
      color: var(--text);
      font: 16px/1.8 -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Noto Sans SC', sans-serif;
      min-height: 100vh;
      overflow-x: hidden;
    }

    /* ── 动画定义 ── */
    @keyframes fade-in-up {
      from { opacity: 0; transform: translateY(15px); }
      to { opacity: 1; transform: none; }
    }

    @keyframes floating-effect {
      0%, 100% { transform: translateY(0) scale(1); opacity: 0.2; }
      50% { transform: translateY(-12px) scale(1.06); opacity: 0.35; }
    }

    .page-animated { animation: fade-in-up 0.65s ease-out both; }

    /* 全屏蓝绿浮动背景 */
    #floating-bg {
      position: fixed;
      inset: 0;
      z-index: -2;
      pointer-events: none;
      overflow: hidden;
    }

    .bg-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(100px);
      animation: floating-effect 14s infinite ease-in-out;
      opacity: 0.2;
    }

    /* ── 导航栏 ── */
    #nav {
      position: fixed; top: 0; left: 0; right: 0; height: var(--nav);
      background: rgba(255, 255, 255, 0.94); backdrop-filter: blur(14px);
      border-bottom: 1px solid var(--border);
      display: flex; align-items: center; padding: 0 24px; z-index: 110; gap: 16px;
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.03);
    }

    #nav-logo {
      font-weight: 800; font-size: 17px; white-space: nowrap;
      background: linear-gradient(135deg, #0969da, #8250df);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    #nav-badge {
      background: linear-gradient(135deg, rgba(9, 105, 218, 0.1), rgba(130, 80, 223, 0.1));
      color: var(--link); font-size: 11px; font-weight: 700;
      padding: 3px 10px; border-radius: 20px; white-space: nowrap;
      border: 1px solid rgba(9, 105, 218, 0.2);
    }

    #nav-sub { color: var(--muted); font-size: 14px; flex: 1; }

    #hamburger {
      display: none; flex-direction: column; gap: 5px; cursor: pointer;
      padding: 8px; border-radius: 8px; border: none; background: none;
      transition: background 0.2s;
    }
    #hamburger:hover { background: rgba(9, 105, 218, 0.05); }

    #hamburger span {
      display: block; width: 20px; height: 2px; background: var(--text);
      border-radius: 2px; transition: 0.25s;
    }

    #hamburger.open span:nth-child(1) { transform: translateY(7px) rotate(45deg); }
    #hamburger.open span:nth-child(2) { opacity: 0; }
    #hamburger.open span:nth-child(3) { transform: translateY(-7px) rotate(-45deg); }

    /* ── 整体布局 ── */
    #layout { display: flex; padding-top: var(--nav); z-index: 1; }

    #overlay {
      display: none; position: fixed; inset: 0; background: rgba(0, 0, 0, 0.3);
      z-index: 90; backdrop-filter: blur(2px); transition: opacity 0.25s;
    }

    /* ── 侧边栏 ── */
    #sidebar {
      width: var(--sidebar); position: fixed; top: var(--nav); left: 0; bottom: 0;
      overflow-y: auto; overflow-x: hidden; background: var(--sidebar-bg);
      border-right: 1px solid var(--border); padding: 24px 0 40px;
      transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1), box-shadow 0.25s; z-index: 100;
    }

    #sidebar::-webkit-scrollbar { width: 5px; }
    #sidebar::-webkit-scrollbar-thumb { background: #d3dae1; border-radius: 5px; }

    #toc-title {
      font-size: 11px; font-weight: 700; color: var(--muted);
      letter-spacing: 0.1em; text-transform: uppercase; padding: 0 20px 12px;
    }

    .toc-item {
      display: block; padding: 6px 20px; font-size: 14px; color: var(--muted);
      text-decoration: none; border-left: 3px solid transparent; line-height: 1.6;
      transition: all 0.15s; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }

    .toc-item:hover { color: var(--text); background: rgba(9, 105, 218, 0.04); }
    .toc-item.l2 { padding-left: 34px; font-size: 13.5px; }
    .toc-item.l3 { padding-left: 48px; font-size: 13px; color: #8c959f; }
    
    .toc-item.active {
      color: var(--link); border-left-color: var(--link);
      background: linear-gradient(90deg, rgba(9, 105, 218, 0.08), rgba(9, 105, 218, 0.02));
      font-weight: 600;
    }

    /* ── 正文容器 ── */
    #main {
      margin-left: var(--sidebar); flex: 1; min-width: 0; padding: 40px 60px 80px;
      transition: margin-left 0.25s;
    }

    #article { max-width: 900px; }

    /* ── 标题 ── */
    #article h1, #article h2, #article h3, #article h4 {
      color: var(--heading); font-weight: 700; line-height: 1.4; margin: 2.2em 0 0.8em;
    }

    #article h1 {
      font-size: 2.2rem; border-bottom: 2px solid var(--border);
      padding-bottom: 0.6em; margin-top: 0.5em;
      background: linear-gradient(135deg, #0969da, #8250df);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent;
    }

    #article h2 { font-size: 1.6rem; border-bottom: 1px solid var(--border); padding-bottom: 0.5em; }
    #article h3 { font-size: 1.25rem; color: #0969da; }
    #article h4 { font-size: 1.05rem; }

    /* ── 正文元素 ── */
    #article p { margin: 1em 0; color: #40464c; }
    
    #article a {
      color: var(--link); text-decoration: none;
      border-bottom: 1px solid rgba(9, 105, 218, 0.25); transition: border-color 0.15s, background 0.15s;
    }
    
    #article a:hover { border-bottom-color: var(--link); background: rgba(9, 105, 218, 0.03); }
    #article ul, #article ol { margin: 0.6em 0 0.6em 1.7em; color: #40464c; }
    #article li { margin: 0.4em 0; }
    #article strong { color: var(--heading); font-weight: 700; }
    #article em { color: #ac831e; }
    #article hr { border: none; border-top: 2px dashed var(--border); margin: 3em 0; }

    #article blockquote {
      border-left: 4px solid #0969da; padding: 0.9em 1.4em; margin: 1.2em 0;
      background: rgba(9, 105, 218, 0.05); border-radius: 0 12px 12px 0;
    }
    #article blockquote p { margin: 0; color: #0969da; font-size: 15px; }

    /* ── 表格滚动包裹层 ── */
    .table-scroll {
      overflow-x: auto;
      -webkit-overflow-scrolling: touch;
      border-radius: 12px;
      border: 1px solid var(--border);
      box-shadow: 0 1px 4px rgba(0, 0, 0, 0.04);
      margin: 1.2em 0;
    }

    /* ── 表格本体（无外框，由包裹层负责） ── */
    #article table {
      width: 100%; border-collapse: collapse; font-size: 15px;
      min-width: max-content;
    }

    #article th {
      background: linear-gradient(135deg, #f1f6ff, #fdf5ff); color: var(--heading);
      font-weight: 700; padding: 13px 18px; text-align: left; border-bottom: 2px solid var(--border);
      white-space: nowrap;
    }

    #article td { padding: 12px 18px; border-bottom: 1px solid #eef1f4; vertical-align: top; color: #40464c; }
    #article tr:last-child td { border-bottom: none; }
    #article tbody tr:hover { background: rgba(9, 105, 218, 0.04); }
    #article tbody tr:nth-child(even) { background: rgba(9, 105, 218, 0.02); }

    /* ── 代码块（黑色高亮，亮色绿蓝背景） ── */
    #article pre {
      position: relative; background: var(--code-bg); border: 1px solid var(--code-border);
      border-radius: 12px; overflow: hidden; margin: 1.5em 0;
      box-shadow: 0 4px 15px rgba(174, 220, 207, 0.2); transition: transform 0.2s, box-shadow 0.2s;
    }
    #article pre:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(174, 220, 207, 0.3); }

    #article pre code {
      background: none !important; padding: 24px 26px; display: block; overflow-x: auto;
      font-size: 13.5px; line-height: 1.8; white-space: pre; color: var(--code-text);
      font-family: 'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace;
    }

    #article :not(pre) > code {
      background: rgba(175, 184, 193, 0.2); color: var(--inline);
      padding: 3px 7px; border-radius: 7px; font-size: 13px;
      white-space: nowrap; font-weight: 600; font-family: 'JetBrains Mono', 'Fira Code', monospace;
    }

    #article pre:hover .copy-btn { opacity: 1; }

    .copy-btn {
      position: absolute; top: 12px; right: 12px; padding: 5px 14px;
      font-size: 11px; font-weight: 700; background: rgba(255, 255, 255, 0.9);
      color: var(--muted); border: 1px solid var(--border); border-radius: 9px;
      cursor: pointer; opacity: 0; transition: opacity 0.2s, all 0.2s;
      box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08); backdrop-filter: blur(4px);
    }

    .copy-btn:hover { background: var(--link); color: #fff; border-color: var(--link); transform: scale(1.05); }
    .copy-btn.ok { background: #dafbe1; color: #1a7f37; border-color: #a8f0c6; }

    /* ── 重置 Highlight.js 高亮颜色为黑色/灰色 ── */
    #article pre code .hljs-comment,
    #article pre code .hljs-quote { color: var(--code-muted); font-style: italic; }
    #article pre code [class^="hljs-"] { color: var(--code-text); }
    #article pre code [class^="hljs-"].hljs-comment { color: var(--code-muted); }

    /* ── 回顶部按钮 ── */
    #top-btn {
      position: fixed; bottom: 30px; right: 30px; width: 46px; height: 46px;
      border-radius: 50%; background: linear-gradient(135deg, #0969da, #8250df);
      border: none; color: #fff; font-size: 20px; cursor: pointer;
      display: flex; align-items: center; justify-content: center;
      opacity: 0; transform: translateY(12px) scale(0.9);
      transition: 0.35s cubic-bezier(0.34, 1.56, 0.64, 1); z-index: 80;
      box-shadow: 0 4px 20px rgba(9, 105, 218, 0.4);
    }

    #top-btn.show { opacity: 1; transform: none; }
    #top-btn:hover { transform: translateY(-3px); box-shadow: 0 8px 28px rgba(9, 105, 218, 0.5); }

    /* ── 移动端响应式 ── */
    @media (max-width: 768px) {
      :root { --sidebar: 0px; }
      #hamburger { display: flex; }
      #sidebar { transform: translateX(-270px); width: 270px; box-shadow: 4px 0 30px rgba(0, 0, 0, 0.15); }
      #sidebar.open { transform: none; }
      #overlay.show { display: block; }
      #main { margin-left: 0; padding: 24px 20px 60px; }
      #article h1 { font-size: 1.7rem; }
      #article h2 { font-size: 1.3rem; }
      #article pre code { padding: 16px 18px; font-size: 12.5px; }
      #article table { font-size: 13px; min-width: unset; }
      #nav-sub { display: none; }
    }
    @media (max-width: 1150px) and (min-width: 769px) { #main { padding: 32px 36px 60px; } }
  </style>
</head>
<body>
  <div id="floating-bg"></div>

  <nav id="nav">
    <button id="hamburger" aria-label="菜单" onclick="toggleSidebar()">
      <span></span><span></span><span></span>
    </button>
    <div id="nav-logo">⚡ Bncr</div>
    <div id="nav-badge">API 文档</div>
    <div id="nav-sub">框架内置方法完整手册</div>
  </nav>

  <div id="overlay" onclick="closeSidebar()"></div>

  <div id="layout">
    <aside id="sidebar">
      <div id="toc-title">目录</div>
      ${toc}
    </aside>
    <main id="main">
      <article id="article">${content}</article>
    </main>
  </div>

  <button id="top-btn" onclick="scrollTo({top:0,behavior:'smooth'})" title="回到顶部">↑</button>

  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/core.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/javascript.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/typescript.min.js" defer></script>
  <script src="https://cdn.jsdelivr.net/npm/highlight.js@11.9.0/lib/languages/bash.min.js" defer></script>
  ${isSSR ? '' : `<script src="https://cdn.jsdelivr.net/npm/marked@4/marked.min.js"></script>`}
  
  <script>
    // 1. 服务端变量注入前端 (避免模板字符串嵌套冲突)
    window.__SSR_DATA__ = {
      isSSR: ${isSSR},
      mdRaw: ${mdJson}
    };

    // 2. 客户端降级渲染 (锚点算法与 GitHub 对齐，使用 rawText 生成 ID)
    if (!window.__SSR_DATA__.isSSR && window.__SSR_DATA__.mdRaw) {
      const renderer = new marked.Renderer();
      const headingId = {};

      // marked@4 API: heading(text, level, rawText)
      // text    = 渲染后的 HTML（用于展示）
      // rawText = 原始 markdown 文本（用于生成 ID）
      renderer.heading = function(text, level, rawText) {
        const textStr = typeof text === 'object' ? text.text : text;
        // 优先用原始 markdown 文本生成 ID，与 GitHub 规则对齐
        const rawStr = (typeof rawText === 'string' ? rawText : null) || textStr;


        // GitHub 兼容算法：去格式符 → 小写 → 删非word/空格/CJK/连字符 → 空格转连字符 → 去首尾连字符
        // 注：\\x60 = 反引号，避免嵌套模板字符串报错
        const id = rawStr.replace(/[\\x60\\*\\_]/g, '')
                         .toLowerCase()
                         .replace(/[^\\w\\s\\u4e00-\\u9fa5-]/g, '')
                         .replace(/\\s/g, '-')
                         .replace(/^-+|-+$/g, '');

        headingId[id] = (headingId[id] || 0) + 1;
        const finalId = headingId[id] > 1 ? id + '-' + headingId[id] : id;

        return '<h' + level + ' id="' + finalId + '">' + textStr + '</h' + level + '>';
      };

      // 表格：自动包一层横向滚动容器（marked@4 字符串参数）
      renderer.table = function(header, body) {
        return '<div class="table-scroll"><table><thead>' + header + '</thead><tbody>' + (body || '') + '</tbody></table></div>';
      };

      const placeholder = document.getElementById('ssr-placeholder');
      if (placeholder) {
        placeholder.outerHTML = marked.parse(window.__SSR_DATA__.mdRaw, { renderer: renderer });
      }
    }

    // ── 侧边栏控制 ──
    function toggleSidebar() {
      const s = document.getElementById('sidebar');
      const o = document.getElementById('overlay');
      const h = document.getElementById('hamburger');
      s.classList.toggle('open');
      o.classList.toggle('show');
      h.classList.toggle('open');
    }

    function closeSidebar() {
      document.getElementById('sidebar').classList.remove('open');
      document.getElementById('overlay').classList.remove('show');
      document.getElementById('hamburger').classList.remove('open');
    }

    // ── 代码复制按钮 ──
    function initCode() {
      if (typeof hljs === 'undefined') return setTimeout(initCode, 200);
      
      document.querySelectorAll('#article pre code').forEach(el => {
        hljs.highlightElement(el);
        const pre = el.parentElement;
        if (pre.querySelector('.copy-btn')) return;
        
        const btn = document.createElement('button');
        btn.className = 'copy-btn';
        btn.textContent = '复制';
        
        btn.onclick = () => {
          navigator.clipboard.writeText(el.innerText).then(() => {
            btn.textContent = '✓';
            btn.classList.add('ok');
            setTimeout(() => {
              btn.textContent = '复制';
              btn.classList.remove('ok');
            }, 1500);
          });
        };
        pre.appendChild(btn);
      });
    }

    // ── TOC 交互逻辑 (修复移动端点击跳转 Bug) ──
    function initTOC() {
      const items = document.querySelectorAll('.toc-item');
      if (!items.length) return;
      
      const map = {};
      
      items.forEach(a => {
        const id = decodeURIComponent(a.getAttribute('href').slice(1));
        map[id] = a;

        // 接管点击事件，强制平滑滚动并兼容移动端关闭侧边栏
        a.addEventListener('click', (e) => {
          const targetEl = document.getElementById(id);
          
          if (targetEl) {
            e.preventDefault(); // 阻止原生哈希跳转以防动画中断
            
            // 移动端点选后关闭侧边栏
            if (window.innerWidth <= 768) {
              closeSidebar();
            }
            
            // 强制平滑滚动到目标元素
            targetEl.scrollIntoView({ behavior: 'smooth' });
            
            // 补充：确保 URL hash 更新
            history.pushState(null, null, '#' + id);
          } else if (window.innerWidth <= 768) {
            closeSidebar();
          }
        });
      });

      // 滚动监听，高亮当前目录
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            Object.values(map).forEach(a => a.classList.remove('active'));
            const a = map[e.target.id];
            if (a) {
              a.classList.add('active');
              a.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
            }
          }
        });
      }, { rootMargin: '-60px 0px -70% 0px' });

      document.querySelectorAll('#article h1, #article h2, #article h3').forEach(h => {
        if (h.id) observer.observe(h);
      });
    }

    // ── 页面动态效果 (加强流畅性) ──
    function initPageAnimations() {
      // 1. 元素上浮动画
      const items = document.querySelectorAll('#article p, #article h2, #article h3, #article h4, #article ul, #article table');
      const observer = new IntersectionObserver(entries => {
        entries.forEach(e => {
          if (e.isIntersecting) {
            e.target.classList.add('page-animated');
            observer.unobserve(e.target);
          }
        });
      }, { rootMargin: '0px 0px -100px 0px', threshold: 0.1 });

      items.forEach(h => observer.observe(h));

      // 2. 页面蓝绿渐变背景浮动光斑 (全屏)
      const bgContainer = document.getElementById('floating-bg');
      if (!bgContainer.children.length) {
        const blob1 = document.createElement('div');
        blob1.className = 'bg-blob';
        blob1.style.width = '600px'; blob1.style.height = '600px';
        blob1.style.top = '-10%'; blob1.style.left = '-15%';
        blob1.style.background = 'linear-gradient(135deg, rgba(9, 105, 218, 0.4), rgba(26, 127, 55, 0.4))';
        
        const blob2 = document.createElement('div');
        blob2.className = 'bg-blob';
        blob2.style.width = '450px'; blob2.style.height = '450px';
        blob2.style.bottom = '-5%'; blob2.style.right = '-10%';
        blob2.style.background = 'linear-gradient(135deg, rgba(26, 127, 55, 0.4), rgba(130, 80, 223, 0.4))';
        blob2.style.animationDelay = '-4s';

        bgContainer.appendChild(blob1);
        bgContainer.appendChild(blob2);
      }
    }

    // ── 回顶部按钮 ──
    function initTopBtn() {
      const btn = document.getElementById('top-btn');
      window.addEventListener('scroll', () => {
        btn.classList.toggle('show', window.scrollY > 450);
      }, { passive: true });
    }

    function initAll() {
      if (window._isInit) return;
      window._isInit = true;
      
      initCode();
      initTOC();
      initTopBtn();
      initPageAnimations(); // 加强页面流畅性
    }

    // 3. 执行初始化
    initAll();
  </script>
</body>
</html>`);
    } catch (e) {
      log.error('文档路由错误:', e.message);
      res.status(500).send('文档加载失败：' + e.message);
    }
  });

  sysMethod.createStartupCompletionHook('API文档展示', async () => {
    await sysMethod.sleep(3);
    log.warn('API 文档路由已注册：/api/docs/bncr');
  });
})();
