#!/usr/bin/env bun
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const WECHAT_SKILL_DIR = path.join(os.homedir(), '.claude/skills/baoyu-post-to-wechat');
const CDP = path.join(WECHAT_SKILL_DIR, 'scripts/cdp.ts');
const {
  tryConnectExisting,
  findExistingChromeDebugPort,
  sleep,
} = await import(CDP);

function usage(): never {
  console.error(`Upload and select a WeChat article cover in the currently open editor.

Usage:
  npx -y bun upload-wechat-cover.ts --cover <cover.png> [--force] [--no-save]

The script uses the WeChat editor's image-library flow:
cover area -> 从图片库选择 -> upload file -> select image -> 下一步 -> save draft.`);
  process.exit(1);
}

function parseArgs(argv: string[]) {
  const opts = {
    cover: '',
    force: false,
    save: true,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--cover') {
      opts.cover = argv[++i] || '';
    } else if (arg === '--force') {
      opts.force = true;
    } else if (arg === '--no-save') {
      opts.save = false;
    } else if (arg === '--help' || arg === '-h') {
      usage();
    }
  }

  if (!opts.cover) usage();
  opts.cover = path.resolve(opts.cover);
  if (!fs.existsSync(opts.cover)) {
    throw new Error(`Cover image not found: ${opts.cover}`);
  }
  return opts;
}

async function evaluate(session: any, expression: string) {
  return session.cdp.send<{ result: { value: any } }>('Runtime.evaluate', {
    expression,
    returnByValue: true,
  }, { sessionId: session.sessionId });
}

async function waitFor(session: any, expression: string, timeoutMs: number, label: string) {
  const start = Date.now();
  let lastValue: any = null;

  while (Date.now() - start < timeoutMs) {
    const result = await evaluate(session, expression);
    lastValue = result.result.value;
    if (lastValue) return lastValue;
    await sleep(500);
  }

  throw new Error(`Timed out waiting for ${label}. Last value: ${JSON.stringify(lastValue)}`);
}

async function clickVisibleByText(session: any, text: string): Promise<boolean> {
  // 微信弹窗按钮（下一步/确认等）对 JS element.click() 不响应——必须用真实鼠标事件
  // （Input.dispatchMouseEvent）。这是封面脚本长期超时的真因：选图、按钮文案都对，
  // 但 .click() 点了不前进，弹窗卡住直到超时。所以这里只用 JS 取按钮中心坐标，
  // 再用 CDP 派发真实 mousePressed/mouseReleased。
  const result = await evaluate(session, `
    (function() {
      const candidates = Array.from(document.querySelectorAll('button,a,span,div'))
        .filter((el) => (el.innerText || el.textContent || '').trim() === ${JSON.stringify(text)})
        .filter((el) => !el.disabled)
        .filter((el) => {
          const style = getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden'
            && (el.offsetWidth || el.offsetHeight || el.getClientRects().length);
        });
      const el = candidates[0];
      if (!el) return 'null';
      el.scrollIntoView({ block: 'center' });
      const r = el.getBoundingClientRect();
      return JSON.stringify({ x: r.x + r.width / 2, y: r.y + r.height / 2 });
    })()
  `);
  if (result.result.value === 'null') return false;
  const pos = JSON.parse(result.result.value);
  await session.cdp.send('Input.dispatchMouseEvent', { type: 'mousePressed', x: pos.x, y: pos.y, button: 'left', clickCount: 1 }, { sessionId: session.sessionId });
  await sleep(50);
  await session.cdp.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: pos.x, y: pos.y, button: 'left', clickCount: 1 }, { sessionId: session.sessionId });
  return true;
}

async function getCoverState(session: any) {
  const result = await evaluate(session, `
    JSON.stringify((function() {
      const coverPreview = document.querySelector('.js_cover_preview_new');
      const cardThumb = document.querySelector('.js_appmsg_thumb_new');
      const coverError = document.querySelector('.js_cover_error');
      return {
        cover_preview_bg: getComputedStyle(coverPreview || document.body).backgroundImage,
        card_thumb_bg: getComputedStyle(cardThumb || document.body).backgroundImage,
        visible_cover_error: coverError && getComputedStyle(coverError).display !== 'none'
          ? coverError.innerText
          : ''
      };
    })())
  `);
  return JSON.parse(result.result.value);
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const port = await findExistingChromeDebugPort();
  if (!port) throw new Error('Chrome debug port not found. Run wechat-article.ts first.');

  const cdp = await tryConnectExisting(port);
  if (!cdp) throw new Error(`Failed to connect Chrome debug port: ${port}`);

  try {
    const { targetInfos } = await cdp.send<{ targetInfos: Array<{ targetId: string; url: string; type: string }> }>('Target.getTargets', {});
    const editorTab = targetInfos.find((target) => target.type === 'page' && target.url.includes('appmsg_edit'));
    if (!editorTab) throw new Error('No WeChat article editor tab found.');

    const { sessionId } = await cdp.send<{ sessionId: string }>('Target.attachToTarget', {
      targetId: editorTab.targetId,
      flatten: true,
    });

    const session = { cdp, sessionId, targetId: editorTab.targetId };
    await cdp.send('Page.enable', {}, { sessionId });
    await cdp.send('DOM.enable', {}, { sessionId });
    await cdp.send('Runtime.enable', {}, { sessionId });

    const existing = await getCoverState(session);
    const hasCover = existing.cover_preview_bg !== 'url("")' && existing.card_thumb_bg !== 'url("")';
    if (hasCover && !opts.force) {
      console.log(JSON.stringify({ ok: true, skipped: true, reason: 'cover-already-set', ...existing }, null, 2));
      return;
    }

    const opened = await evaluate(session, `
      (function() {
        const button = document.querySelector('#js_cover_null .js_imagedialog')
          || Array.from(document.querySelectorAll('.js_imagedialog')).find((el) => {
            const style = getComputedStyle(el);
            return style.display !== 'none' || el.closest('#js_cover_area');
          });
        if (!button) return false;
        button.scrollIntoView({ block: 'center' });
        button.click();
        return true;
      })()
    `);
    if (!opened.result.value) throw new Error('Cover image-library button not found.');

    await waitFor(session, `!!document.querySelector('.weui-desktop-dialog_img-picker input[type=file]')`, 15_000, 'image picker file input');

    const doc = await cdp.send<any>('DOM.getDocument', { depth: -1, pierce: true }, { sessionId });
    const input = await cdp.send<any>('DOM.querySelector', {
      nodeId: doc.root.nodeId,
      selector: '.weui-desktop-dialog_img-picker input[type=file]',
    }, { sessionId });

    if (!input.nodeId) throw new Error('Image picker file input node not found.');

    await cdp.send('DOM.setFileInputFiles', {
      nodeId: input.nodeId,
      files: [opts.cover],
    }, { sessionId });

    const basename = path.basename(opts.cover);
    await waitFor(session, `
      Array.from(document.querySelectorAll('.weui-desktop-dialog_img-picker .weui-desktop-img-picker__item'))
        .some((item) => (item.innerText || item.textContent || '').includes(${JSON.stringify(basename)}))
    `, 30_000, `uploaded cover item ${basename}`);

    // 确保目标图被选中——但**不能无脑 click**：上传完成后微信通常已自动选中该图，
    // 再 click 会 toggle 取消选中，导致「下一步」在无选中状态下点了无效、弹窗不前进
    // → 一直停在图片库 → 超时（这正是封面长期传不上的真因）。所以先判断选中态，
    // 仅在未选中时才 click。选中态用 item 自身或子节点的 selected/checked class 判断。
    const selectResult = await evaluate(session, `
      (function() {
        const basename = ${JSON.stringify(basename)};
        const item = Array.from(document.querySelectorAll('.weui-desktop-dialog_img-picker .weui-desktop-img-picker__item'))
          .find((el) => (el.innerText || el.textContent || '').includes(basename));
        if (!item) return 'not_found';
        const isSelected = item.className.includes('selected')
          || !!item.querySelector('.weui-desktop-icon-checked, [class*="selected"], [class*="checked"]');
        if (isSelected) return 'already_selected';
        item.scrollIntoView({ block: 'center' });
        item.click();
        return 'clicked';
      })()
    `);
    if (selectResult.result.value === 'not_found') {
      throw new Error('Uploaded cover item not found in image picker.');
    }
    await sleep(500);

    const clickedNext = await clickVisibleByText(session, '下一步');
    if (!clickedNext) throw new Error('Image picker 下一步 button not found.');

    await sleep(3000);
    // 下一步后进入裁剪/确认界面。不同微信版本的确认按钮文案不一（「确认」/「完成」/
    // 再一次「下一步」）——baoyu 原来只点「完成」，新版是「确认」，找不到就一直
    // 卡在"等封面预览非空"超时。按弹窗内优先级依次尝试，点中即停。
    const confirmLabels = ['确认', '完成', '下一步'];
    let confirmed = false;
    for (const label of confirmLabels) {
      if (await clickVisibleByText(session, label)) {
        confirmed = true;
        break;
      }
    }
    if (!confirmed) {
      console.warn('[upload-cover] 裁剪确认按钮未找到（确认/完成/下一步），封面可能未生效');
    }

    await waitFor(session, `
      (function() {
        const coverPreview = document.querySelector('.js_cover_preview_new');
        const cardThumb = document.querySelector('.js_appmsg_thumb_new');
        return getComputedStyle(coverPreview || document.body).backgroundImage !== 'url("")'
          && getComputedStyle(cardThumb || document.body).backgroundImage !== 'url("")';
      })()
    `, 20_000, 'non-empty cover preview and card thumbnail');

    if (opts.save) {
      await evaluate(session, `document.querySelector('#js_submit button')?.click()`);
      await sleep(3000);
    }

    const finalState = await getCoverState(session);
    console.log(JSON.stringify({ ok: true, skipped: false, saved: opts.save, ...finalState }, null, 2));
  } finally {
    cdp.close();
  }
}

main().catch((error) => {
  console.error(`[upload-cover] ${error instanceof Error ? error.message : String(error)}`);
  process.exit(1);
});
