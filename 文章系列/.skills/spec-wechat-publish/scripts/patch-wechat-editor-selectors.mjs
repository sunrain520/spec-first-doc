#!/usr/bin/env node

/**
 * 修复 baoyu-post-to-wechat 的正文编辑器选择器 bug。
 *
 * 背景：新版微信公众号图文编辑器里有两个 ProseMirror 实例——
 *   pm[0] = .title-editor__input .ProseMirror（标题）
 *   pm[1] = .rich_media_content .ProseMirror（正文）
 * baoyu 的 wechat-article.ts 用 document.querySelector('.ProseMirror') /
 * clickElement(session, '.ProseMirror') 定位正文，querySelector 永远取到第一个
 * （标题框），导致：点击聚焦点到标题 → 整篇正文粘进标题字段、图片占位符也在
 * 标题里找不到、正文验证查标题框非空形成假阳性（日志显示 Body verified OK 但
 * 正文其实是空的）。
 *
 * 修法：把 wechat-article.ts 里所有指向正文的 '.ProseMirror' 收窄为
 * '.rich_media_content .ProseMirror'。该脚本不碰标题/作者/摘要逻辑。
 *
 * 不直接手改 baoyu 源是因为它是上游 skill，手改会在升级时冲突；与
 * install-tech-blog-theme.mjs 一致，走项目内幂等补丁。可安全重复执行。
 */

import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

function parseArgs(argv) {
  let skillDir = path.join(os.homedir(), '.claude', 'skills', 'baoyu-post-to-wechat');
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--skill-dir' && argv[i + 1]) {
      skillDir = argv[i + 1];
      i += 1;
    }
  }
  return { skillDir: path.resolve(skillDir) };
}

const BODY_SELECTOR = '.rich_media_content .ProseMirror';

// 这些常量是要原样写进 baoyu 源、由 baoyu 运行时求值的代码文本，其中的反引号、
// ${...} 都必须保持字面量、不能在本补丁脚本里被求值。所以一律用单引号字符串拼接
// （单引号串里反引号和 ${} 都是普通字符），BT = 反引号字面量。
const BT = '`';

// ── 标题修复 ──
// baoyu 原来只设隐藏 #title.value。但新版微信编辑器数据流是「可见 ProseMirror
// 标题框 → 同步隐藏 #title」，反向设隐藏框无效 → 编辑器标题显示空。
// 改为设可见标题框 innerHTML + 派发 input（微信据此同步隐藏字段），隐藏字段一并写。
const TITLE_FROM =
  'await evaluate(session, ' + BT +
  'document.querySelector(\'#title\').value = ${JSON.stringify(effectiveTitle)}; document.querySelector(\'#title\').dispatchEvent(new Event(\'input\', { bubbles: true }));' +
  BT + ');';
const TITLE_TO =
  'await evaluate(session, ' + BT +
  '(function(){ var t = ${JSON.stringify(effectiveTitle)}; var pm = document.querySelector(\'.title-editor__input .ProseMirror\'); if (pm) { pm.innerHTML = \'<p>\' + t.replace(/</g,\'&lt;\').replace(/>/g,\'&gt;\') + \'</p>\'; pm.dispatchEvent(new Event(\'input\', { bubbles: true })); pm.dispatchEvent(new Event(\'change\', { bubbles: true })); } var h = document.querySelector(\'#title\'); if (h) { h.value = t; h.dispatchEvent(new Event(\'input\', { bubbles: true })); } })();' +
  BT + ');';

// ── 摘要修复 ──
// baoyu 原来设 #js_description.value + 仅 input 事件。微信摘要框是受控组件，
// 直接 .value= 会被前端框架的虚拟状态忽略，保存时用框架里的空值 → 微信自动拿
// 正文开头填充摘要（污染）。改用 native value setter（绕过受控拦截）+ input/
// change/blur 完整事件链，让框架坐实该值，保存不再被覆盖。
const SUMMARY_FROM =
  'await evaluate(session, ' + BT +
  'document.querySelector(\'#js_description\').value = ${JSON.stringify(effectiveSummary)}; document.querySelector(\'#js_description\').dispatchEvent(new Event(\'input\', { bubbles: true }));' +
  BT + ');';
const SUMMARY_TO =
  'await evaluate(session, ' + BT +
  '(function(){ var el = document.querySelector(\'#js_description\'); if (!el) return; var proto = el.tagName === \'TEXTAREA\' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype; var setter = Object.getOwnPropertyDescriptor(proto, \'value\').set; setter.call(el, ${JSON.stringify(effectiveSummary)}); el.dispatchEvent(new Event(\'input\', { bubbles: true })); el.dispatchEvent(new Event(\'change\', { bubbles: true })); el.dispatchEvent(new Event(\'blur\', { bubbles: true })); })();' +
  BT + ');';

// 每条 = [唯一上下文 from, to, label]。用足够长的上下文保证唯一，避免误伤。
const REPLACEMENTS = [
  [TITLE_FROM, TITLE_TO, '标题填可见 ProseMirror 框'],
  [SUMMARY_FROM, SUMMARY_TO, '摘要 native setter + 完整事件链'],
  [
    "        const editor = document.querySelector('.ProseMirror');\n        if (!editor) return false;\n\n        const walker = document.createTreeWalker(editor",
    `        const editor = document.querySelector('${BODY_SELECTOR}');\n        if (!editor) return false;\n\n        const walker = document.createTreeWalker(editor`,
    'selectAndReplacePlaceholder 正文定位',
  ],
  [
    "    console.log('[wechat] Clicking on editor...');\n    await clickElement(session, '.ProseMirror');",
    `    console.log('[wechat] Clicking on editor...');\n    await clickElement(session, '${BODY_SELECTOR}');`,
    'Clicking on editor 正文点击',
  ],
  [
    "    console.log('[wechat] Ensuring editor focus...');\n    await clickElement(session, '.ProseMirror');",
    `    console.log('[wechat] Ensuring editor focus...');\n    await clickElement(session, '${BODY_SELECTOR}');`,
    'Ensuring editor focus 正文聚焦',
  ],
  [
    "          const editor = document.querySelector('.ProseMirror');\n          if (!editor) return false;\n          const text = editor.innerText?.trim() || '';\n          return text.length > 0;\n        })()\n      `);\n      if (editorHasContent) {\n        console.log('[wechat] Body content verified OK.');\n      } else {\n        console.warn('[wechat] Body content verification failed: editor appears empty after paste.');",
    `          const editor = document.querySelector('${BODY_SELECTOR}');\n          if (!editor) return false;\n          const text = editor.innerText?.trim() || '';\n          return text.length > 0;\n        })()\n      \`);\n      if (editorHasContent) {\n        console.log('[wechat] Body content verified OK.');\n      } else {\n        console.warn('[wechat] Body content verification failed: editor appears empty after paste.');`,
    '粘贴后正文验证',
  ],
  [
    "          const editor = document.querySelector('.ProseMirror');\n          if (!editor) return false;\n          const text = editor.innerText?.trim() || '';\n          return text.length > 0;\n        })()\n      `);\n      if (editorHasContent) {\n        console.log('[wechat] Body content verified OK.');\n      } else {\n        console.warn('[wechat] Body content verification failed: editor appears empty after typing.');",
    `          const editor = document.querySelector('${BODY_SELECTOR}');\n          if (!editor) return false;\n          const text = editor.innerText?.trim() || '';\n          return text.length > 0;\n        })()\n      \`);\n      if (editorHasContent) {\n        console.log('[wechat] Body content verified OK.');\n      } else {\n        console.warn('[wechat] Body content verification failed: editor appears empty after typing.');`,
    'typeText 后正文验证',
  ],
];

function patch(skillDir) {
  const target = path.join(skillDir, 'scripts', 'wechat-article.ts');
  if (!fs.existsSync(target)) {
    throw new Error(`Missing baoyu wechat-article.ts: ${target}`);
  }
  let source = fs.readFileSync(target, 'utf8');

  let applied = 0;
  let alreadyDone = 0;
  for (const [from, to, label] of REPLACEMENTS) {
    if (source.includes(to)) {
      alreadyDone += 1;
      continue;
    }
    if (!source.includes(from)) {
      throw new Error(`Cannot patch baoyu runtime: missing anchor for "${label}"`);
    }
    source = source.replace(from, to);
    applied += 1;
  }

  fs.writeFileSync(target, source, 'utf8');

  // 校验：① 不再有裸 querySelector('.ProseMirror') / clickElement(.,'.ProseMirror')
  //       ② 标题修复已注入（可见标题框写入）
  //       ③ 摘要修复已注入（native value setter）
  const bareQuery = (source.match(/querySelector\('\.ProseMirror'\)/g) || []).length;
  const bareClick = (source.match(/clickElement\(session, '\.ProseMirror'\)/g) || []).length;
  const titleFixed = source.includes('.title-editor__input .ProseMirror');
  const summaryFixed = source.includes("getOwnPropertyDescriptor(proto, 'value').set");
  const ok = bareQuery === 0 && bareClick === 0 && titleFixed && summaryFixed;

  console.log(JSON.stringify({
    ok,
    target,
    applied,
    alreadyDone,
    残留裸正文选择器: { querySelector: bareQuery, clickElement: bareClick },
    标题修复已注入: titleFixed,
    摘要修复已注入: summaryFixed,
  }, null, 2));

  if (!ok) {
    throw new Error('补丁校验失败：检查 baoyu 是否改版（正文选择器残留 / 标题或摘要修复未注入）');
  }
}

const { skillDir } = parseArgs(process.argv.slice(2));
patch(skillDir);
