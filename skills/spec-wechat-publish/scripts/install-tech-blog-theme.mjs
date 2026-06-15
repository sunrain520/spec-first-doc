#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));
const SKILL_DIR = path.resolve(SCRIPT_DIR, '..');
const THEME_SOURCE = path.join(SKILL_DIR, 'assets', 'tech-blog.css');

function usage() {
  console.error([
    'Usage:',
    '  node scripts/install-tech-blog-theme.mjs [--skill-dir <baoyu-post-to-wechat-dir>]',
    '',
    'Default skill dir:',
    '  ~/.claude/skills/baoyu-post-to-wechat',
  ].join('\n'));
}

function parseArgs(argv) {
  let skillDir = path.join(os.homedir(), '.claude', 'skills', 'baoyu-post-to-wechat');
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--skill-dir' && argv[i + 1]) {
      skillDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (arg === '--help' || arg === '-h') {
      usage();
      process.exit(0);
    }
    console.error(`Unknown argument: ${arg}`);
    usage();
    process.exit(1);
  }
  return { skillDir: path.resolve(skillDir) };
}

function replaceOnce(source, from, to, label) {
  if (source.includes(to)) return source;
  if (!source.includes(from)) {
    throw new Error(`Cannot patch baoyu runtime: missing ${label}`);
  }
  return source.replace(from, to);
}

const INLINE_STYLE_HELPERS = `
function addInlineStyle(html: string, tagName: string, style: string): string {
  return html.replace(new RegExp(\`<\${tagName}([^>]*)>\`, 'g'), (match, attrs: string) => {
    if (/\\sstyle=/.test(attrs)) {
      return match.replace(/style="([^"]*)"/, (_styleMatch, existing: string) => {
        const separator = existing.trim().endsWith(';') ? ' ' : '; ';
        return \`style="\${existing}\${separator}\${style}"\`;
      });
    }
    return \`<\${tagName}\${attrs} style="\${style}">\`;
  });
}

function inlineTechBlogStyles(html: string): string {
  // tech-blog 主题用 CSS list-style 显示项目符号，所以要去掉 render.ts 在 <li>
  // 内手写的 '• ' / '数字. ' 前缀，否则与 CSS 符号叠成双层点（问题 8）。
  // 只在 tech-blog 后处理里做，不碰 render.ts，grace/simple（list-style:none，
  // 依赖手写前缀）不受影响。
  html = html.replace(
    /(<li\\b[^>]*>)\\s*(?:•\\s*|\\d+\\.\\s+)/g,
    '$1'
  );

  // 代码块保护：先把 <pre>…</pre> 整块抽走占位，再套通用样式。原因有二：
  // 1) styles.p 的正则 <p([^>]*)> 会误吞 <pre>（p 后的 're' 被当属性），把段落
  //    样式错套到代码块；2) 行内 code 的浅蓝底也会渗进块内 <code>，形成"深框套
  //    浅框"的双层效果。抽走后块内不再被 p/code 通用样式命中，最后单层重套。
  const preBlocks: string[] = [];
  html = html.replace(/<pre\\b[^>]*>[\\s\\S]*?<\\/pre>/g, (block: string) => {
    preBlocks.push(block);
    return \`___TECHBLOG_PRE_\${preBlocks.length - 1}___\`;
  });

  const styles: Record<string, string> = {
    p: 'margin:0 0 24px;font-size:16px;line-height:1.85;color:#1f2937;',
    h2: 'margin:44px 0 22px;padding:14px 16px 14px 18px;font-size:21px;line-height:1.45;font-weight:700;color:#0f172a;background:#f4f8ff;border-left:5px solid #2563eb;border-radius:4px;',
    h3: 'margin:32px 0 16px;padding:0 0 0 12px;font-size:17px;line-height:1.55;font-weight:700;color:#0f172a;background:transparent;border-left:3px solid #06b6d4;',
    blockquote: 'margin:0 0 28px;padding:16px 18px;color:#172033;background:#f5f9ff;border-left:4px solid #2563eb;border-top:1px solid #dbeafe;border-right:1px solid #dbeafe;border-bottom:1px solid #dbeafe;border-radius:4px;',
    ul: 'margin:0 0 24px;padding-left:1.35em;color:#1f2937;list-style:disc outside;',
    ol: 'margin:0 0 24px;padding-left:1.35em;color:#1f2937;list-style:decimal outside;',
    li: 'margin:0 0 8px;padding-left:0.1em;line-height:1.8;color:#1f2937;',
    figure: 'margin:10px 0 32px;padding:0;',
    img: 'display:block;width:100%;max-width:100%;height:auto;border-radius:4px;border:1px solid #e5e7eb;',
    code: 'padding:0.12em 0.34em;color:#1e3a5f;background:#eff6ff;border-radius:3px;font-family:Menlo, Monaco, Consolas, monospace;font-size:0.92em;',
    // hr/strong 在 CSS 里有规则，但微信粘贴会剥离 <style> 只留 inline；不补则
    // 分隔线变默认粗黑线、加粗金句丢深色强调。h2/h3 不含 strong，正文加色安全。
    hr: 'height:1px;margin:34px 0;border:none;background:#e5e7eb;',
    strong: 'color:#0f172a;font-weight:700;',
  };

  let styled = Object.entries(styles).reduce(
    (current, [tagName, style]) => addInlineStyle(current, tagName, style),
    html
  );

  // 把抽走的代码块单层重套后放回：<pre> 深色外框，内层 <code> 强制透明背景，
  // 不再叠出"深框套浅框"。微信会清掉 class，所以样式全部走 inline。
  // 代码块横向滚动适配手机：内层 code 用 white-space:pre 不换行（保持原始
  // 格式与对齐），外层 pre 用 overflow-x:auto 在超宽时横向滚动；长行不再折行
  // 破坏对齐，超出部分手指左右滑动查看（微信 iOS/Android webview 均支持）。
  // code 设 min-width:max-content，让内容自然撑开宽度以触发 pre 的横向滚动。
  const preStyle =
    'margin:4px 0 28px;padding:8px 0 16px;background:#0f172a;border:1px solid #1e293b;' +
    'border-radius:8px;overflow-x:auto;-webkit-overflow-scrolling:touch;line-height:1.75;';
  const preCodeStyle =
    'display:block;min-width:max-content;padding:6px 16px 0;background:transparent;' +
    'color:#e5e7eb;font-family:Menlo, Monaco, Consolas, monospace;font-size:14px;' +
    'white-space:pre;';
  styled = styled.replace(/___TECHBLOG_PRE_(\\d+)___/g, (_m, idx: string) => {
    let block = preBlocks[Number(idx)];
    block = block.replace(/<pre\\b([^>]*)\\sstyle="[^"]*"/, '<pre$1');
    block = block.replace(/<pre\\b([^>]*)>/, \`<pre$1 style="\${preStyle}">\`);
    block = block.replace(/<code\\b([^>]*)\\sstyle="[^"]*"/, '<code$1');
    block = block.replace(/<code\\b([^>]*)>/, \`<code$1 style="\${preCodeStyle}">\`);
    return block;
  });

  // 引用块内的 <p> 带着段落的 24px 下边距，与 blockquote 自身的 padding 叠加，
  // 在引用块底部撑出一条多余空白。清零 blockquote 内每个 <p> 的下 margin，
  // 引用块内的段间距交给 blockquote 的 padding 控制。
  styled = styled.replace(/<blockquote\\b[^>]*>[\\s\\S]*?<\\/blockquote>/g, (quote: string) =>
    quote.replace(/(<p\\b[^>]*style="[^"]*?)margin:0 0 24px;/g, '$1margin:0;')
  );

  return styled;
}
`.trim();

function installInlineStylePatch(skillDir) {
  const mdToWechatPath = path.join(skillDir, 'scripts', 'md-to-wechat.ts');
  if (!fs.existsSync(mdToWechatPath)) {
    throw new Error(`Missing baoyu md-to-wechat script: ${mdToWechatPath}`);
  }

  let source = fs.readFileSync(mdToWechatPath, 'utf8');
  source = replaceOnce(
    source,
    '\nexport async function convertMarkdown',
    `\n${INLINE_STYLE_HELPERS}\n\nexport async function convertMarkdown`,
    'tech-blog inline style helpers'
  );
  source = replaceOnce(
    source,
    '  const contentImages: ImageInfo[] = [];',
    `  if (theme === 'tech-blog') {
    const renderedHtml = fs.readFileSync(htmlPath, 'utf-8');
    fs.writeFileSync(htmlPath, inlineTechBlogStyles(renderedHtml), 'utf-8');
  }

  const contentImages: ImageInfo[] = [];`,
    'tech-blog inline style application'
  );
  fs.writeFileSync(mdToWechatPath, source, 'utf8');
}

function installTheme(skillDir) {
  const renderPath = path.join(skillDir, 'scripts', 'md', 'render.ts');
  const themeDir = path.join(skillDir, 'scripts', 'md', 'themes');
  const themeTarget = path.join(themeDir, 'tech-blog.css');

  if (!fs.existsSync(renderPath)) {
    throw new Error(`Missing baoyu renderer: ${renderPath}`);
  }
  if (!fs.existsSync(THEME_SOURCE)) {
    throw new Error(`Missing project theme source: ${THEME_SOURCE}`);
  }

  fs.mkdirSync(themeDir, { recursive: true });
  fs.copyFileSync(THEME_SOURCE, themeTarget);

  let render = fs.readFileSync(renderPath, 'utf8');
  render = replaceOnce(
    render,
    'type ThemeName = "default" | "grace" | "simple";',
    'type ThemeName = "default" | "grace" | "simple" | "tech-blog";',
    'ThemeName union'
  );
  render = replaceOnce(
    render,
    'const THEME_NAMES: ThemeName[] = ["default", "grace", "simple"];',
    'const THEME_NAMES: ThemeName[] = ["default", "grace", "simple", "tech-blog"];',
    'THEME_NAMES list'
  );
  fs.writeFileSync(renderPath, render, 'utf8');
  installInlineStylePatch(skillDir);

  const verified = fs.readFileSync(renderPath, 'utf8').includes('"tech-blog"')
    && fs.existsSync(themeTarget)
    && fs.readFileSync(path.join(skillDir, 'scripts', 'md-to-wechat.ts'), 'utf8').includes('inlineTechBlogStyles');
  if (!verified) {
    throw new Error('tech-blog theme installation verification failed');
  }

  console.log(JSON.stringify({
    ok: true,
    skillDir,
    renderPath,
    themeTarget,
  }, null, 2));
}

const { skillDir } = parseArgs(process.argv.slice(2));
installTheme(skillDir);
