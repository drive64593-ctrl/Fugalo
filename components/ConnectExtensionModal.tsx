import React, { useState, useEffect } from 'react';
import JSZip from 'jszip';
import { X, Puzzle, Copy, Check, Terminal, FolderOpen, PlayCircle, Download, FileJson, FileCode, Server, Layers, AlertTriangle, Cpu, Zap, Video, RefreshCw, Wifi, WifiOff, Package, Globe, Keyboard, MousePointerClick, Coffee, RotateCcw, ShieldCheck, Eye, ExternalLink, Activity, Image as ImageIcon } from 'lucide-react';

interface ConnectExtensionModalProps {
  onClose: () => void;
  onConnected: () => void;
}

export const ConnectExtensionModal: React.FC<ConnectExtensionModalProps> = ({ onClose, onConnected }) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [activeTab, setActiveTab] = useState<'manifest' | 'content' | 'background' | 'popup' | 'popup_js'>('popup');
  const [copied, setCopied] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'failed'>('idle');

  const dummyIconBase64 = "iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAADJSURBVHhe7dsxCsIwFEXR20kEO3X/K3H/K3AnuAAH0UUQBMHQWPLzQSEkL/wJV8YYY4wxxphW10+9Xq/N9Xptttvtttvf43K5NJfLpZlOp+Z0OjX7/b45n8/Nfr9vLpZl2Wy322a/3zez2ay5WJZls91um/1+38xms+ZiWZbNdrt9+935fG4ulmXZbLfbZr/fN7PZrLlYlmWz3W6b/X7fzGaz5mJZls12u232+30zm82ai2VZNsYYY4wxxhhjTDP9ACz3l63T9IcfAAAAAElFTkSuQmCC";

  // 1. MANIFEST.JSON (V3.95)
  const manifestCode = `{
  "manifest_version": 3,
  "name": "AutoSeed AI Bridge (V3.95 Stable)",
  "version": "3.95",
  "description": "AutoSeed Bridge V3.95. Stable Professional Mode.",
  "action": {
    "default_popup": "popup.html",
    "default_icon": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" }
  },
  "icons": { "16": "icons/icon16.png", "48": "icons/icon48.png", "128": "icons/icon128.png" },
  "permissions": ["activeTab", "scripting", "tabs", "cookies", "browsingData", "storage"],
  "host_permissions": ["<all_urls>", "*://*.facebook.com/*"],
  "background": { "service_worker": "background.js" },
  "content_scripts": [{ "matches": ["<all_urls>"], "js": ["content.js"], "run_at": "document_end" }],
  "web_accessible_resources": [{ "resources": ["icons/*.png"], "matches": ["<all_urls>"] }]
}`;

  // 2. BACKGROUND.JS (V3.95)
  const backgroundCode = `// background.js - V3.95
let liveWindowId = null;
let appTabId = null; 

async function ensureLiveWindow(targetUrl) {
    if (liveWindowId !== null) {
        try {
            const win = await chrome.windows.get(liveWindowId);
            if (win) {
                // Focus existing window
                await chrome.windows.update(liveWindowId, { focused: true, drawAttention: true });
                const tabs = await chrome.tabs.query({ windowId: liveWindowId });
                if (tabs.length > 0) {
                    const tab = tabs[0];
                    // If we are on same domain, don't reload unless necessary
                    if (tab.url && tab.url.includes('facebook.com') && targetUrl.includes('facebook.com')) {
                        // Just focus
                    } else {
                        await chrome.tabs.update(tabs[0].id, { url: targetUrl });
                    }
                    return tabs[0];
                }
            }
        } catch (e) {
            liveWindowId = null; 
        }
    }

    // Create new window
    const win = await chrome.windows.create({
        url: targetUrl,
        type: 'popup',
        width: 1000, 
        height: 900, 
        left: 500, 
        top: 50,
        focused: true
    });
    liveWindowId = win.id;
    return win.tabs[0];
}

async function setFacebookCookies(cookieString) {
    try {
        const url = 'https://www.facebook.com';
        
        // Cleanup existing
        const cookies = await chrome.cookies.getAll({ domain: 'facebook.com' });
        for (const cookie of cookies) {
            const protocol = cookie.secure ? "https://" : "http://";
            const cookieUrl = protocol + cookie.domain + cookie.path;
            await chrome.cookies.remove({ url: cookieUrl, name: cookie.name });
        }
        
        await new Promise(r => setTimeout(r, 100)); 

        const rawCookies = cookieString.split(';');
        
        for (const raw of rawCookies) {
            const trimmed = raw.trim();
            if (!trimmed) continue;
            const separatorIndex = trimmed.indexOf('=');
            if (separatorIndex === -1) continue;
            
            const name = trimmed.substring(0, separatorIndex);
            const value = trimmed.substring(separatorIndex + 1);
            
            await chrome.cookies.set({
                url: url,
                domain: '.facebook.com',
                name: name,
                value: value,
                path: '/',
                secure: true,
                sameSite: 'no_restriction',
                expirationDate: (Date.now() / 1000) + (86400 * 365)
            });
        }
        return true;
    } catch (e) { return false; }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'REGISTER_APP_TAB' || request.type === 'SYNC_ACCOUNTS') {
      if (sender.tab) appTabId = sender.tab.id;
  }

  if (request.type === 'SYNC_ACCOUNTS') {
      chrome.storage.local.set({ savedAccounts: request.payload });
      sendResponse({ status: 'synced' });
      return true;
  }

  if (request.type === 'POPUP_LOGIN') {
      setFacebookCookies(request.payload.cookie).then((success) => {
          if (success) ensureLiveWindow('https://www.facebook.com');
          sendResponse({ success });
      });
      return true;
  }

  // --- IDENTITY CHECK LOGIC ---
  if (request.type === 'CHECK_FB_IDENTITY') {
      if (sender.tab) appTabId = sender.tab.id;
      if (liveWindowId) {
          chrome.tabs.query({ windowId: liveWindowId }, (tabs) => {
             if(tabs[0]) {
                 // Try to inject script if it's not responding
                 chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_IDENTITY_FROM_BG' }).catch(() => {
                     // If fetch fails, content script might not be loaded. Try injecting.
                     chrome.scripting.executeScript({
                         target: { tabId: tabs[0].id },
                         files: ['content.js']
                     }).then(() => {
                         // Retry sending message
                         setTimeout(() => {
                            chrome.tabs.sendMessage(tabs[0].id, { type: 'GET_IDENTITY_FROM_BG' }).catch(()=>{});
                         }, 500);
                     }).catch(() => {});
                 });
             }
          });
      }
      return true;
  }

  if (request.type === 'IDENTITY_DATA_FROM_FB') {
      if (appTabId) chrome.tabs.sendMessage(appTabId, { type: 'RELAY_IDENTITY_REPORT', payload: request.payload });
      return true;
  }

  if (request.type === 'ACTION_COMPLETE') {
      if (appTabId) chrome.tabs.sendMessage(appTabId, { type: 'RELAY_ACTION_COMPLETE', payload: request.payload });
      return true;
  }

  if (request.type === 'SWITCH_ACCOUNT') {
      if (sender.tab) appTabId = sender.tab.id;
      setFacebookCookies(request.payload.cookie).then(() => {
          ensureLiveWindow(request.payload.url).then((tab) => {
              // Reload to apply cookies
              chrome.tabs.reload(tab.id, { bypassCache: true });
              sendResponse({ status: 'done' });
          });
      });
      return true; 
  }

  if (request.type === 'TEST_TARGET') {
      if (sender.tab) appTabId = sender.tab.id;
      sendResponse({ success: true });
      return true;
  }

  if (request.type === 'RELAY_TO_FB') {
    if (sender.tab) appTabId = sender.tab.id;
    ensureLiveWindow(request.payload.url).then(targetTab => {
        let msgType = 'EXECUTE_COMMENT';
        if (request.payload.actionType === 'STATUS') msgType = 'EXECUTE_STATUS';
        if (request.payload.actionType === 'FEED_WALK') msgType = 'EXECUTE_FEED_WALK';

        setTimeout(() => { 
             chrome.tabs.sendMessage(targetTab.id, { type: msgType, payload: request.payload }).catch(()=>{});
        }, 100);
        sendResponse({status: 'sent', tabId: targetTab.id});
    });
    return true; 
  }
});`;

  // 3. CONTENT.JS (V3.95)
  const contentCode = `// content.js - V3.95
const currentHost = window.location.hostname;

function getIdentity() {
    const cookie = document.cookie;
    let uid = ''; 
    try { uid = cookie.match(/c_user=(\\d+)/)?.[1] || ''; } catch(e) {}
    // If we have UID, we are likely logged in, even if title is loading
    return { uid, name: document.title || 'Loading...' };
}

if (currentHost.includes('facebook.com')) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
        if (msg.type === 'GET_IDENTITY_FROM_BG') {
            const identity = getIdentity();
            chrome.runtime.sendMessage({ type: 'IDENTITY_DATA_FROM_FB', payload: identity });
        }
        
        if (msg.type === 'EXECUTE_STATUS') handleStatusPost(msg.payload).then(()=>finishTask()).catch(e=>failTask(e));
        if (msg.type === 'EXECUTE_COMMENT') handleCommentPost(msg.payload).then(()=>finishTask()).catch(e=>failTask(e));
        if (msg.type === 'EXECUTE_FEED_WALK') handleFeedWalk(msg.payload).then(()=>finishTask()).catch(e=>failTask(e));
        
        if (msg.payload && msg.payload.accountInfo) {
             showLiveDashboard(msg.payload.accountInfo, msg.type.replace('EXECUTE_', ''));
        }
    });
}

if (!currentHost.includes('facebook.com')) {
    window.addEventListener("message", (event) => {
        if (event.source !== window) return;
        if (event.data.type === "AUTOSEED_PING") {
            try { chrome.runtime.sendMessage({ type: 'REGISTER_APP_TAB' }); } catch(e){}
            window.postMessage({ type: "AUTOSEED_PONG", version: "3.95" }, "*");
        }
        if (event.data.type === "AUTOSEED_CHECK_IDENTITY") {
            try { chrome.runtime.sendMessage({ type: 'CHECK_FB_IDENTITY' }); } catch(e){}
        }
        if (["AUTOSEED_SWITCH_ACCOUNT", "AUTOSEED_EXECUTE", "AUTOSEED_SYNC_ACCOUNTS_TO_EXT", "AUTOSEED_TEST_TARGET"].includes(event.data.type)) {
            let bgType = event.data.type.replace("AUTOSEED_", "");
            if(bgType === "EXECUTE") bgType = "RELAY_TO_FB";
            try { chrome.runtime.sendMessage({ type: bgType, payload: event.data.payload }); } catch (e) {}
        }
    });

    chrome.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'RELAY_IDENTITY_REPORT') window.postMessage({ type: "AUTOSEED_IDENTITY_REPORT", payload: msg.payload }, "*");
        if (msg.type === 'RELAY_ACTION_COMPLETE') window.postMessage({ type: "AUTOSEED_ACTION_COMPLETE" }, "*");
        if (msg.type === 'RELAY_TARGET_RESULT') window.postMessage({ type: "AUTOSEED_TARGET_RESULT", found: msg.found }, "*");
    });
}

// --- HELPERS ---
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

function showLiveDashboard(accountInfo, actionType) {
    let dashboard = document.getElementById('autoseed-live-dashboard');
    if (!dashboard) {
        dashboard = document.createElement('div');
        dashboard.id = 'autoseed-live-dashboard';
        dashboard.style.cssText = 'position:fixed !important; top:10px !important; right:10px !important; z-index:2147483647 !important; background:white !important; padding:8px !important; border-radius:8px !important; box-shadow:0 4px 12px rgba(0,0,0,0.2) !important; display:flex !important; flex-direction:column !important; width:180px !important; font-family:sans-serif !important; border:1px solid #ccc !important; font-size:11px !important; pointer-events:none !important;';
        document.body.appendChild(dashboard);
    }
    const avatarUrl = accountInfo.avatar || 'https://ui-avatars.com/api/?name=User';
    dashboard.innerHTML = \`
        <div style="display:flex;align-items:center;gap:6px;margin-bottom:4px;border-bottom:1px solid #eee;padding-bottom:4px;">
            <div style="width:6px;height:6px;background:#22c55e;border-radius:50%;animate:pulse"></div>
            <span style="font-weight:bold;color:#1877f2;">Stable (V3.95)</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
            <img src="\${avatarUrl}" style="width:24px;height:24px;border-radius:50%;">
            <div>
                <div style="font-weight:bold;color:#000;">\${accountInfo.name}</div>
                <div style="color:#666;">\${actionType}</div>
            </div>
        </div>
    \`;
    if(window.autoseedDashTimer) clearTimeout(window.autoseedDashTimer);
    window.autoseedDashTimer = setTimeout(() => { dashboard.remove(); }, 60000);
}

function showOverlay(message, color = 'blue') {
    let toast = document.createElement('div');
    toast.style.cssText = \`position:fixed;bottom:30px;left:50%;transform:translateX(-50%);z-index:99999;padding:8px 16px;background:\${color==='red'?'#ef4444':'#1f2937'};color:white;border-radius:20px;font-size:12px;font-family:sans-serif;box-shadow:0 5px 15px rgba(0,0,0,0.3);opacity:0;transition:opacity 0.3s;\`;
    toast.innerText = message;
    document.body.appendChild(toast);
    setTimeout(()=>toast.style.opacity='1', 10);
    setTimeout(() => { toast.style.opacity='0'; setTimeout(()=>toast.remove(), 300); }, 3000);
}

function finishTask() { 
    showOverlay("Action Completed!", "green"); 
    setTimeout(() => chrome.runtime.sendMessage({ type: 'ACTION_COMPLETE' }), 200); 
}
function failTask(e) { 
    showOverlay("Error: " + e.message, "red"); 
    setTimeout(() => chrome.runtime.sendMessage({ type: 'ACTION_COMPLETE' }), 1000); 
}

function forceClick(element) {
    if(!element) return;
    element.focus();
    ['mousedown', 'mouseup', 'click'].forEach(eventType => {
        const event = new MouseEvent(eventType, { view: window, bubbles: true, cancelable: true, buttons: 1 });
        element.dispatchEvent(event);
    });
}

async function pasteTextLikeHuman(element, text) {
    element.focus();
    forceClick(element);
    document.execCommand('selectAll', false, null);
    document.execCommand('delete', false, null);
    await sleep(50);
    try {
        const dataTransfer = new DataTransfer();
        dataTransfer.setData('text/plain', text);
        element.dispatchEvent(new ClipboardEvent('paste', { bubbles: true, cancelable: true, clipboardData: dataTransfer, view: window }));
        element.dispatchEvent(new InputEvent('input', { bubbles: true, cancelable: true, inputType: 'insertFromPaste', data: text, view: window }));
    } catch (e) {
        document.execCommand('insertText', false, text);
    }
}

async function waitForSelector(selector, timeout = 3000) {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
        const el = document.querySelector(selector);
        if (el && el.offsetParent !== null) return el;
        await sleep(50);
    }
    return null;
}

// --- V3.95 STATUS POSTING ---
async function handleStatusPost(payload) {
    // If not at home, go home first
    if (window.location.pathname !== '/' && window.location.pathname !== '/home.php') {
        showOverlay("Go Home...", "blue");
        window.location.href = 'https://www.facebook.com/';
        await sleep(2000); 
    }

    showOverlay("Finding Box...", "blue");

    const triggers = Array.from(document.querySelectorAll('div[role="button"], span')).filter(el => {
        const txt = el.innerText?.toLowerCase() || '';
        return (txt.includes("bạn đang nghĩ gì") || txt.includes("mind?") || txt.includes("nghĩ gì?"));
    });

    let clicked = false;
    for (const el of triggers) {
        let clickable = el;
        while(clickable && clickable.tagName !== 'DIV' && clickable.getAttribute('role') !== 'button') {
            clickable = clickable.parentElement;
        }
        if (clickable && clickable.offsetParent) { forceClick(clickable); clicked = true; break; }
    }
    
    if (!clicked) {
        const greyBox = document.querySelector('div[role="region"] div[role="button"]');
        if (greyBox) { forceClick(greyBox); clicked = true; }
    }

    if (!clicked) throw new Error("Create Post button not found");

    const dialog = await waitForSelector('div[role="dialog"]', 4000);
    if (!dialog) throw new Error("Modal not found");

    let inputBox = dialog.querySelector('div[contenteditable="true"][role="textbox"]');
    if (!inputBox) inputBox = dialog.querySelector('div[contenteditable="true"]');
    if (!inputBox) throw new Error("Input not found");

    showOverlay("Pasting...", "blue");
    await pasteTextLikeHuman(inputBox, payload.text);
    await sleep(500); 

    const getButtons = () => Array.from(dialog.querySelectorAll('div[role="button"]')).filter(b => b.clientHeight > 0);
    const findTargetButton = () => {
        const btns = getButtons();
        const textMatch = btns.find(b => {
             const txt = b.innerText?.toLowerCase() || '';
             return (txt === 'đăng' || txt === 'post' || txt === 'tiếp' || txt === 'next');
        });
        if (textMatch) return textMatch;
        const blueMatch = btns.find(b => {
             const bg = window.getComputedStyle(b).backgroundColor;
             return bg.includes('rgb(24, 119, 242)') || bg.includes('rgb(0, 100, 224)') || bg.includes('rgb(8, 102, 255)');
        });
        return blueMatch;
    };

    let actionBtn = findTargetButton();
    if (!actionBtn) { await sleep(500); actionBtn = findTargetButton(); }

    if (actionBtn) {
        if (actionBtn.getAttribute('aria-disabled') === 'true') {
             document.execCommand('insertText', false, ' ');
             await sleep(200);
        }

        if (actionBtn.getAttribute('aria-disabled') !== 'true') {
             const btnText = actionBtn.innerText?.toLowerCase() || '';
             if (btnText === 'tiếp' || btnText === 'next') {
                 showOverlay("Next...", "blue");
                 forceClick(actionBtn);
                 await sleep(1000); 
                 const finalPost = getButtons().find(b => {
                      const txt = b.innerText?.toLowerCase() || '';
                      return txt === 'đăng' || txt === 'post';
                 }) || getButtons().find(b => window.getComputedStyle(b).backgroundColor.includes('rgb(8, 102, 255)'));

                 if (finalPost) {
                     showOverlay("POST!", "green");
                     forceClick(finalPost);
                 } else throw new Error("Post button missing.");
             } else {
                 showOverlay("POST!", "green");
                 forceClick(actionBtn);
             }
             
             await sleep(1500);
             const stillOpen = document.body.contains(dialog) && dialog.offsetParent !== null;
             if (!stillOpen) return; 
             throw new Error("Modal stuck.");
        } else throw new Error("Button disabled.");
    } else throw new Error("No Action button found.");
}

async function handleCommentPost(payload) {
    showOverlay("Finding box...", "blue");
    window.scrollTo(0, 400);
    await sleep(300);
    let commentBox = document.querySelector('div[contenteditable="true"][role="textbox"][aria-label*="bình luận"]');
    if (!commentBox) {
        const btn = document.querySelector('div[aria-label="Bình luận"]');
        if(btn) { forceClick(btn); await sleep(300); }
        commentBox = document.querySelector('div[contenteditable="true"][role="textbox"]');
    }
    if (commentBox) {
        await pasteTextLikeHuman(commentBox, payload.text);
        showOverlay("Enter...", "blue");
        await sleep(300);
        commentBox.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, view: window, keyCode: 13, key: 'Enter', code: 'Enter' }));
        await sleep(800);
    } else throw new Error("Comment box missing");
}

async function handleFeedWalk(payload) {
    const duration = payload.trustConfig?.surfDuration || 30;
    showOverlay(\`Surfing (\${duration}s)...\`, "blue");
    const endTime = Date.now() + (duration * 1000);
    while (Date.now() < endTime) {
        window.scrollBy({ top: 600, behavior: 'smooth' });
        await sleep(2000);
    }
}`;
  
  // 4. POPUP.HTML (V3.95)
  const popupHtml = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { width: 350px; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 0; margin: 0; background: #f0f2f5; color: #1c1e21; }
        .header { background: #fff; padding: 12px 16px; border-bottom: 1px solid #dddfe2; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05); }
        .brand { font-weight: bold; font-size: 14px; color: #1877f2; display: flex; align-items: center; gap: 6px; }
        .status { font-size: 11px; color: #42b72a; font-weight: 600; display: flex; align-items: center; gap: 4px; }
        .container { padding: 16px; }
        .group { margin-bottom: 12px; }
        .label { font-size: 12px; font-weight: 600; color: #606770; margin-bottom: 4px; display: block; }
        textarea { width: 100%; height: 60px; padding: 8px; border: 1px solid #ccd0d5; border-radius: 6px; font-family: monospace; font-size: 11px; resize: none; box-sizing: border-box; outline: none; background: #fff; }
        textarea:focus { border-color: #1877f2; box-shadow: 0 0 0 2px rgba(24, 119, 242, 0.2); }
        select { width: 100%; padding: 8px; border: 1px solid #ccd0d5; border-radius: 6px; font-size: 13px; outline: none; background: #fff; cursor: pointer; }
        .btn-row { display: flex; gap: 8px; margin-top: 16px; }
        .btn { flex: 1; padding: 10px; border: none; border-radius: 6px; font-size: 13px; font-weight: 600; cursor: pointer; transition: background 0.2s; display: flex; align-items: center; justify-content: center; gap: 6px; }
        .btn-primary { background: #1877f2; color: white; }
        .btn-primary:hover { background: #166fe5; }
        .btn-secondary { background: #e4e6eb; color: #050505; }
        .btn-secondary:hover { background: #d8dadf; }
        .footer { text-align: center; margin-top: 16px; font-size: 11px; color: #90949c; }
        #msg { text-align: center; font-size: 12px; margin-bottom: 10px; min-height: 16px; color: #1877f2; font-weight: 500; }
        .divider { height: 1px; background: #e4e6eb; margin: 16px 0; }
    </style>
</head>
<body>
    <div class="header">
        <div class="brand">AutoSeed Manager</div>
        <div class="status">● Active</div>
    </div>
    
    <div class="container">
        <div id="msg"></div>
        
        <div class="group">
            <label class="label">Quick Login (Saved Accounts)</label>
            <select id="accountSelect">
                <option value="">-- Loading Accounts... --</option>
            </select>
        </div>

        <div class="divider"></div>

        <div class="group">
            <label class="label">Cookie</label>
            <textarea id="cookie" placeholder="Paste cookie here or click 'Get Data'"></textarea>
        </div>

        <div class="group">
            <label class="label">Token (Optional)</label>
            <textarea id="token" placeholder="EAAG..."></textarea>
        </div>

        <div class="btn-row">
            <button id="btnGet" class="btn btn-secondary">Get Data</button>
            <button id="btnCopy" class="btn btn-secondary">Copy</button>
        </div>
        
        <div class="btn-row">
            <button id="btnLogin" class="btn btn-primary" style="flex: 2;">Login to Facebook</button>
        </div>

        <div class="footer">
            Version 3.95 • Stable Mode
        </div>
    </div>
    <script src="popup.js"></script>
</body>
</html>
  `;

  // 5. POPUP.JS (V3.95)
  const popupJsCode = `
    const qs = (sel) => document.querySelector(sel);
    const log = (txt, color='#1877f2') => { 
        const el = qs('#msg'); el.innerText = txt; el.style.color = color;
        setTimeout(() => el.innerText = '', 5000);
    };

    document.addEventListener('DOMContentLoaded', () => {
        chrome.storage.local.get(['savedAccounts'], (result) => {
            const accs = result.savedAccounts || [];
            const sel = qs('#accountSelect');
            sel.innerHTML = '';
            const defaultOpt = document.createElement('option');
            defaultOpt.value = "";
            defaultOpt.text = accs.length > 0 ? \`-- Select Account (\${accs.length}) --\` : "(No synced accounts)";
            sel.add(defaultOpt);
            accs.forEach(acc => {
                const opt = document.createElement('option');
                opt.value = acc.cookie;
                opt.text = acc.name || 'Unnamed Account';
                opt.setAttribute('data-token', acc.token || '');
                sel.add(opt);
            });
        });

        qs('#accountSelect').onchange = (e) => {
            const cookie = e.target.value;
            if (cookie) {
                qs('#cookie').value = cookie;
                qs('#token').value = e.target.selectedOptions[0].getAttribute('data-token') || '';
                log('Account Selected!', 'green');
            }
        };

        const btnGet = qs('#btnGet');
        if (btnGet) {
            btnGet.onclick = () => {
                log('Scanning tab...', 'blue');
                chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
                    if (!tabs[0] || !tabs[0].url.includes('facebook.com')) return log('Open Facebook Tab first!', 'red');
                    chrome.tabs.sendMessage(tabs[0].id, {type: 'POPUP_GET_DATA'}, (resp) => {
                        if (resp && resp.cookie) {
                            qs('#cookie').value = resp.cookie;
                            log('Cookie extracted!', 'green');
                        } else log('Failed. Refresh FB tab.', 'red');
                    });
                });
            };
        }

        const btnLogin = qs('#btnLogin');
        if (btnLogin) {
            btnLogin.onclick = () => {
                const c = qs('#cookie').value.trim();
                if (!c) return log('Cookie missing!', 'red');
                btnLogin.innerText = 'Opening Mobile View...';
                chrome.runtime.sendMessage({type: 'POPUP_LOGIN', payload: {cookie: c}}, (resp) => {
                    btnLogin.innerText = 'Login to Facebook';
                    if (resp && resp.success) log('Success! Check window...', 'green');
                    else log('Cookie Error', 'red');
                });
            };
        }

        const btnCopy = qs('#btnCopy');
        if (btnCopy) btnCopy.onclick = () => {
             const val = qs('#cookie').value;
             if(val) navigator.clipboard.writeText(val).then(() => log('Copied!', 'green'));
        };
    });
  `;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadZip = async () => {
    try {
        const zip = new JSZip();
        zip.file("manifest.json", manifestCode);
        zip.file("background.js", backgroundCode);
        zip.file("content.js", contentCode);
        zip.file("popup.html", popupHtml);
        zip.file("popup.js", popupJsCode); 
        
        const iconBlob = await (await fetch(`data:image/png;base64,${dummyIconBase64}`)).blob();
        const icons = zip.folder("icons");
        if (icons) { icons.file("icon16.png", iconBlob); icons.file("icon48.png", iconBlob); icons.file("icon128.png", iconBlob); }

        const content = await zip.generateAsync({ type: "blob" });
        const url = URL.createObjectURL(content);
        const link = document.createElement("a");
        link.href = url;
        link.download = "AutoSeed_Extension_V3.95.zip";
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        alert("Lỗi khi tạo file ZIP: " + e);
    }
  };

  const checkConnection = () => {
    setIsChecking(true);
    setConnectionStatus('idle');

    let isSuccess = false;
    const pongHandler = (event: MessageEvent) => {
      if (event.data.type === "AUTOSEED_PONG") {
        isSuccess = true;
        setConnectionStatus('success');
        setIsChecking(false);
        window.removeEventListener("message", pongHandler);
        setTimeout(() => { onConnected(); onClose(); }, 1500);
      }
    };
    window.addEventListener("message", pongHandler);
    
    const pingInterval = setInterval(() => {
        if (isSuccess) { clearInterval(pingInterval); return; }
        window.postMessage({ type: "AUTOSEED_PING" }, "*");
    }, 500);

    setTimeout(() => {
      clearInterval(pingInterval);
      if (!isSuccess) { 
         setIsChecking(false);
         setConnectionStatus('failed');
         window.removeEventListener("message", pongHandler);
      }
    }, 4000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-gray-900 rounded-2xl shadow-2xl w-full max-w-4xl border border-gray-700 overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-gray-800 flex justify-between items-center bg-gray-800">
           <div className="flex items-center gap-2">
               <div className="bg-gradient-to-r from-blue-600 to-cyan-600 p-1.5 rounded text-white animate-pulse">
                   <Globe className="w-5 h-5" />
               </div>
               <div>
                   <h3 className="text-lg font-bold text-white">Extension V3.95 (Stable Mode)</h3>
                   <p className="text-xs text-gray-400">Quy trình: Mở → Check Login → Đăng bài (Ổn định cao).</p>
               </div>
           </div>
           <button onClick={onClose} className="text-gray-400 hover:text-white p-2 rounded-full hover:bg-gray-700 transition-colors">
             <X className="w-5 h-5" />
           </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
            {step === 1 ? (
                <div className="space-y-6">
                    <div className="bg-gradient-to-r from-blue-900/40 to-cyan-900/40 border border-blue-700/50 p-5 rounded-xl flex flex-col md:flex-row gap-5 items-center justify-between">
                         <div className="flex gap-4">
                            <div className="bg-blue-600 p-3 rounded-lg h-fit shadow-lg">
                                <Package className="w-6 h-6 text-white" />
                            </div>
                            <div>
                                <h4 className="font-bold text-white text-lg">Cập nhật V3.95 ngay</h4>
                                <p className="text-sm text-gray-300 mt-1 max-w-lg">
                                    Phiên bản này khắc phục hoàn toàn lỗi cú pháp và tăng độ ổn định khi kiểm tra trạng thái đăng nhập.
                                </p>
                            </div>
                         </div>
                         <button onClick={handleDownloadZip} className="shrink-0 px-6 py-3 bg-white hover:bg-gray-100 text-blue-900 font-bold rounded-lg shadow-lg flex items-center gap-2 transition-transform hover:scale-105">
                            <Download className="w-5 h-5" /> Tải V3.95 (.zip)
                         </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                         <button onClick={() => setActiveTab('popup')} className={`p-2 border rounded-xl text-center transition-all ${activeTab === 'popup' ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <span className="text-xs font-bold text-white block">popup.html</span>
                        </button>
                         <button onClick={() => setActiveTab('popup_js')} className={`p-2 border rounded-xl text-center transition-all ${activeTab === 'popup_js' ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <span className="text-xs font-bold text-white block">popup.js</span>
                        </button>
                         <button onClick={() => setActiveTab('background')} className={`p-2 border rounded-xl text-center transition-all ${activeTab === 'background' ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <span className="text-xs font-bold text-white block">background.js</span>
                        </button>
                        <button onClick={() => setActiveTab('content')} className={`p-2 border rounded-xl text-center transition-all ${activeTab === 'content' ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <span className="text-xs font-bold text-white block">content.js</span>
                        </button>
                        <button onClick={() => setActiveTab('manifest')} className={`p-2 border rounded-xl text-center transition-all ${activeTab === 'manifest' ? 'bg-gray-800 border-green-500' : 'bg-gray-800/50 border-gray-700'}`}>
                                <span className="text-xs font-bold text-white block">manifest.json</span>
                        </button>
                    </div>
                    
                    <div className="border border-gray-700 rounded-xl overflow-hidden opacity-90 relative">
                        <div className="flex bg-gray-900 border-b border-gray-800 justify-between items-center pr-2">
                            <div className="flex items-center">
                                <button className="px-4 py-2 text-xs font-medium bg-gray-800 text-white border-r border-gray-700">{activeTab}</button>
                            </div>
                            <button onClick={() => handleCopy(activeTab === 'popup' ? popupHtml : activeTab === 'popup_js' ? popupJsCode : activeTab === 'background' ? backgroundCode : activeTab === 'content' ? contentCode : manifestCode)} className="flex items-center gap-1 text-xs text-blue-400 font-bold px-2 py-1">
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />} Copy
                            </button>
                        </div>
                        <div className="relative bg-black p-4 h-60 overflow-y-auto custom-scrollbar">
                            <pre className="text-xs font-mono text-green-400 leading-relaxed"><code>{activeTab === 'popup' ? popupHtml : activeTab === 'popup_js' ? popupJsCode : activeTab === 'background' ? backgroundCode : activeTab === 'content' ? contentCode : manifestCode}</code></pre>
                        </div>
                    </div>

                    <button onClick={() => setStep(2)} className="w-full py-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all">
                         Đã cài đặt bản V3.95 <PlayCircle className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <div className="flex flex-col items-center justify-center text-center h-full space-y-8 animate-in zoom-in-95">
                    <div className={`w-32 h-32 rounded-full flex items-center justify-center border-4 shadow-2xl ${connectionStatus === 'success' ? 'border-green-500 bg-green-900/20' : 'border-gray-700 bg-gray-800'}`}>
                         {isChecking ? <RefreshCw className="w-16 h-16 text-yellow-500 animate-spin" /> : <Wifi className={`w-16 h-16 ${connectionStatus === 'success' ? 'text-green-500' : 'text-gray-500'}`} />}
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white mb-2">Kiểm tra kết nối</h3>
                        <p className="text-gray-400 text-sm">Sau khi nạp V3.95, hãy bấm nút "Đồng bộ Ext" ở trang Quản lý tài khoản.</p>
                    </div>
                    <button onClick={checkConnection} disabled={isChecking} className="w-full max-w-sm py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl shadow-lg transition-transform hover:-translate-y-1">
                        {isChecking ? 'Đang ping Extension...' : 'Kiểm tra ngay'}
                    </button>
                </div>
            )}
        </div>
      </div>
    </div>
  );
};