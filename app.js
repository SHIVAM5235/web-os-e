


const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const create = (tag, props = {}) => Object.assign(document.createElement(tag), props);


const STORAGE = {
  SETTINGS: 'webos_settings_v1',
  WINDOWS: 'webos_windows_v1',
  NOTES: 'webos_notes_v1'
};

const DEFAULT_SETTINGS = {
  theme: 'dark',          
  wallpaper: 'sample1',   
  customWallpaper: 'wallpaper.jpg',
  lockWallpaper: true,
  lockWallpaperImage: 'https://picsum.photos/seed/lockscreen/1600/900',
  dock: 'bottom',         
  shortcuts: { notes: 'Ctrl+N' }
};

function loadSettings() {
  try {
    const raw = localStorage.getItem(STORAGE.SETTINGS);
    return raw ? JSON.parse(raw) : { ...DEFAULT_SETTINGS };
  } catch (e) {
    console.warn('Failed to load settings', e);
    return { ...DEFAULT_SETTINGS };
  }
}
function saveSettings(s) {
  try { localStorage.setItem(STORAGE.SETTINGS, JSON.stringify(s)); } catch (e) { console.warn('Failed to save settings', e); }
}


const lockEl = $('#lockscreen');
const clockEl = $('#lock-clock');
const swipeArea = $('#swipeArea');
const swipeKnob = $('#swipeKnob');
const unlockBtn = $('#unlockBtn');
let unlocked = false;

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString();
  const trayTime = $('#tray-time');
  if (trayTime) trayTime.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateClock, 1000);
updateClock();


let swipeActive = false;
let swipeStartX = 0;
swipeArea.addEventListener('pointerdown', (e) => {
  swipeActive = true;
  swipeStartX = e.clientX;
  swipeArea.setPointerCapture(e.pointerId);
});
swipeArea.addEventListener('pointermove', (e) => {
  if (!swipeActive) return;
  const dx = Math.max(0, Math.min(260, e.clientX - swipeStartX));
  swipeKnob.style.transform = `translateX(${dx}px)`;
  swipeArea.setAttribute('aria-valuenow', Math.round(dx / 2.6));
});
swipeArea.addEventListener('pointerup', (e) => {
  swipeActive = false;
  const dx = e.clientX - swipeStartX;
  if (dx > 180) unlock();
  else swipeKnob.style.transform = 'translateX(0)';
});
unlockBtn.addEventListener('click', unlock);
swipeArea.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') unlock(); });
lockEl.classList.add('active');

function unlock() {
  if (unlocked) return;
  unlocked = true;
  
  lockEl.style.filter = 'blur(12px)';
  lockEl.style.opacity = '0';
  setTimeout(() => {
    lockEl.style.display = 'none';
    showDesktop();
  }, 600);
}


const desktop = $('#desktop');
const taskbar = $('#taskbar');
const sysMenuButton = $('#sys-menu');
const startButton = $('#start-btn');
const startPanel = $('#start-panel');
const startSearch = $('#start-search');
let settings = loadSettings();
const SINGLE_INSTANCE_APPS = new Set(['explorer','browser','notes','settings','calculator','weather']);
const windows = new Map(); // id -> element
const taskButtons = new Map();
let zCounter = 100;

function getAppKey(appName) {
  return String(appName || '').toLowerCase().trim();
}
function findOpenWindow(appName) {
  const key = getAppKey(appName);
  for (const [id, win] of windows) {
    if (win.dataset.app === key || getAppKey(win.querySelector('.win-title')?.textContent) === key) {
      return win;
    }
  }
  return null;
}
function restoreWindow(win) {
  if (!win) return;
  win.classList.remove('hidden');
  win.style.display = 'flex';
  win.style.opacity = '1';
  win.style.pointerEvents = 'auto';
  win.style.zIndex = ++zCounter;
  win.dataset.minimized = 'false';
  win.focus();
  const btn = taskButtons.get(win.id);
  if (btn) btn.classList.remove('minimized');
  saveWindows();
}
function createTaskbarButton(id, appName) {
  if (!taskbar) return;
  const button = create('button', {
    className: 'taskbar-button',
    type: 'button',
    textContent: appName,
    'aria-label': `Show ${appName}`
  });
  button.addEventListener('click', () => {
    const win = windows.get(id);
    if (!win) return;
    if (win.style.display === 'none') restoreWindow(win);
    else {
      win.style.zIndex = ++zCounter;
      win.focus();
    }
  });
  taskbar.appendChild(button);
  taskButtons.set(id, button);
}
function removeTaskbarButton(id) {
  const button = taskButtons.get(id);
  if (button) {
    button.remove();
    taskButtons.delete(id);
  }
}
function updateTaskbarButton(id, minimized = false) {
  const button = taskButtons.get(id);
  if (!button) return;
  button.classList.toggle('minimized', minimized);
}
function openSearchApp(query) {
  if (!query) return;
  const name = query.toLowerCase();
  const app = ['Explorer','Browser','Notes','Settings','Calculator','Weather']
    .find(a => a.toLowerCase().includes(name) || name.includes(a.toLowerCase()));
  if (app) {
    createWindow(app);
    closeStartPanel();
  } else {
    alert('No matching app found. Try Explorer, Browser, Notes, Settings, Calculator, or Weather.');
  }
}
function applySettings() {
  const wallpaper = $('#wallpaper');
  if (!wallpaper) return;
  if (settings.theme === 'light') wallpaper.classList.add('light'); else wallpaper.classList.remove('light');

  
  if (settings.customWallpaper) {
    wallpaper.style.backgroundImage = `url(${settings.customWallpaper})`;
    wallpaper.style.backgroundSize = 'cover';
    wallpaper.style.backgroundPosition = 'center';
    if (settings.lockWallpaper) {
      lockEl.style.backgroundImage = `url(${settings.lockWallpaperImage || settings.customWallpaper})`;
      lockEl.style.backgroundSize = 'cover';
      lockEl.style.backgroundPosition = 'center';
    } else {
      lockEl.style.backgroundImage = '';
      lockEl.style.background = '';
    }
  } else {
    wallpaper.style.backgroundImage = '';
    wallpaper.style.backgroundPosition = '';
    lockEl.style.backgroundImage = '';
    lockEl.style.backgroundPosition = '';
    lockEl.style.background = '';
    
    if (settings.wallpaper === 'sample2') {
      wallpaper.style.background = 'linear-gradient(135deg,#1b2a4a,#4f9cff)';
    } else if (settings.wallpaper === 'sample3') {
      wallpaper.style.background = 'linear-gradient(135deg,#ff9e4f,#ff5f7a)';
    } else {
      wallpaper.style.background = settings.theme === 'light' ? 'linear-gradient(135deg,#f6f9ff,#eaf2ff)' : 'linear-gradient(135deg,#0b1220,#0f2a4a)';
    }
    if (settings.lockWallpaper) {
      lockEl.style.backgroundImage = `url(${settings.lockWallpaperImage})`;
      lockEl.style.backgroundSize = 'cover';
      lockEl.style.backgroundPosition = 'center';
    }
  }
  const dockWrap = $('#dock-wrap');
  if (settings.dock === 'left') {
    dockWrap.style.position = 'absolute';
    dockWrap.style.left = '8px';
    dockWrap.style.top = '50%';
    dockWrap.style.transform = 'translateY(-50%)';
  } else if (settings.dock === 'right') {
    dockWrap.style.position = 'absolute';
    dockWrap.style.right = '8px';
    dockWrap.style.top = '50%';
    dockWrap.style.transform = 'translateY(-50%)';
  } else {
    dockWrap.style.position = 'static';
    dockWrap.style.left = '';
    dockWrap.style.right = '';
    dockWrap.style.top = '';
    dockWrap.style.transform = '';
  }
}
applySettings();

function showDesktop() {
  desktop.style.pointerEvents = 'auto';
  desktop.style.opacity = '1';
  desktop.focus();
  restoreWindows();
}

function toggleStartPanel() {
  if (!startPanel || !startButton) return;
  startPanel.classList.toggle('hidden');
  const isOpen = !startPanel.classList.contains('hidden');
  startButton.setAttribute('aria-expanded', String(isOpen));
}
function closeStartPanel() {
  if (!startPanel || !startButton) return;
  startPanel.classList.add('hidden');
  startButton.setAttribute('aria-expanded', 'false');
}
function openStartApp(appName) {
  if (!appName) return;
  createWindow(appName);
  closeStartPanel();
}

if (sysMenuButton) {
  sysMenuButton.addEventListener('click', toggleStartPanel);
  sysMenuButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStartPanel();
    }
  });
}
if (startButton) {
  startButton.addEventListener('click', toggleStartPanel);
  startButton.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleStartPanel();
    }
  });
}
if (startSearch) {
  startSearch.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      openSearchApp(startSearch.value);
    }
  });
}
if (startPanel) {
  startPanel.addEventListener('click', (e) => {
    const app = e.target.closest('[data-app]')?.dataset?.app;
    const action = e.target.dataset.action;
    if (app) openStartApp(app);
    if (!app && action) {
      if (action === 'lock') { lockEl.style.display = 'flex'; lockEl.style.opacity = '1'; unlocked = false; }
      if (action === 'about') { alert('WebOS Prototype\nModern feel, quick apps, and intuitive taskbar controls.'); }
      closeStartPanel();
    }
  });
}
document.addEventListener('click', (e) => {
  if (!startPanel || startPanel.classList.contains('hidden')) return;
  if (!startPanel.contains(e.target) && !sysMenuButton.contains(e.target) && !startButton.contains(e.target)) {
    closeStartPanel();
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeStartPanel();
});


function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

function createWindow(appName, opts = {}) {
  const appKey = getAppKey(appName);
  if (SINGLE_INSTANCE_APPS.has(appKey)) {
    const existing = findOpenWindow(appName);
    if (existing) {
      restoreWindow(existing);
      return existing.id;
    }
  }

  const id = opts.id || makeId(appName);
  const win = create('div', { className: 'win', id, role: 'dialog', tabIndex: 0, 'aria-label': `${appName} window` });
  win.dataset.app = getAppKey(appName);
  win.classList.add('opening');
  win.addEventListener('animationend', () => win.classList.remove('opening'), { once: true });

 
  win.style.width = (opts.w || 640) + 'px';
  win.style.height = (opts.h || 360) + 'px';
  win.style.left = (opts.x || 120) + 'px';
  win.style.top = (opts.y || 80) + 'px';
  win.style.zIndex = ++zCounter;

  
  const header = create('div', { className: 'win-header' });
  const title = create('div', { className: 'win-title', textContent: appName });
  const controls = create('div', { className: 'win-controls' });
  const btnMin = create('button', { type: 'button', innerHTML: '🗕', title: 'Minimize', 'aria-label': 'Minimize' });
  const btnMax = create('button', { type: 'button', innerHTML: '🗖', title: 'Maximize', 'aria-label': 'Maximize' });
  const btnClose = create('button', { type: 'button', innerHTML: '✖', title: 'Close', 'aria-label': 'Close' });
  controls.append(btnMin, btnMax, btnClose);
  header.append(title, controls);
  win.appendChild(header);


  const body = create('div', { className: 'win-body' });
  body.innerHTML = '<div class="loading">Loading…</div>';
  win.appendChild(body);

  
  win.dataset.maximized = 'false';
  win.dataset.prevX = win.style.left;
  win.dataset.prevY = win.style.top;
  win.dataset.prevW = win.style.width;
  win.dataset.prevH = win.style.height;

 
  const resizer = create('div', { className: 'resizer' });
  win.appendChild(resizer);

  document.body.appendChild(win);
  windows.set(id, win);
  createTaskbarButton(id, appName);

  
  win.addEventListener('mousedown', () => { win.style.zIndex = ++zCounter; });


  let dragging = false, dragOffsetX = 0, dragOffsetY = 0;
  header.addEventListener('pointerdown', (e) => {
    if (e.target.closest('button')) return;
    dragging = true;
    header.setPointerCapture(e.pointerId);
    dragOffsetX = e.clientX - win.offsetLeft;
    dragOffsetY = e.clientY - win.offsetTop;
    win.style.transition = 'none';
  });
  document.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    win.style.left = (e.clientX - dragOffsetX) + 'px';
    win.style.top = (e.clientY - dragOffsetY) + 'px';
    // snapping
    const snap = 24;
    if (win.offsetLeft < snap) win.style.left = '0px';
    if (window.innerWidth - (win.offsetLeft + win.offsetWidth) < snap) win.style.left = (window.innerWidth - win.offsetWidth) + 'px';
    if (win.offsetTop < snap) win.style.top = '0px';
  });
  document.addEventListener('pointerup', () => {
    if (dragging) {
      dragging = false;
      win.style.transition = '';
      saveWindows();
    }
  });

  // resizing (bottom-right)
  let resizing = false, startW = 0, startH = 0, startX = 0, startY = 0;
  resizer.addEventListener('pointerdown', (e) => {
    resizing = true;
    resizer.setPointerCapture(e.pointerId);
    startW = win.offsetWidth; startH = win.offsetHeight; startX = e.clientX; startY = e.clientY;
  });
  document.addEventListener('pointermove', (e) => {
    if (!resizing) return;
    const nw = Math.max(240, startW + (e.clientX - startX));
    const nh = Math.max(140, startH + (e.clientY - startY));
    win.style.width = nw + 'px';
    win.style.height = nh + 'px';
  });
  document.addEventListener('pointerup', () => {
    if (resizing) {
      resizing = false;
      saveWindows();
    }
  });

  
  btnClose.addEventListener('click', () => closeWindow(id));
  btnMin.addEventListener('click', () => {
    win.style.display = 'none';
    win.dataset.minimized = 'true';
    updateTaskbarButton(id, true);
    saveWindows();
  });
  btnMax.addEventListener('click', () => {
    const maximized = win.dataset.maximized === 'true';
    const statusHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--status-height') || '36', 10);
    if (maximized) {
      win.style.left = win.dataset.prevX || '120px';
      win.style.top = win.dataset.prevY || '80px';
      win.style.width = win.dataset.prevW || '640px';
      win.style.height = win.dataset.prevH || '360px';
      win.dataset.maximized = 'false';
    } else {
      win.dataset.prevX = win.style.left;
      win.dataset.prevY = win.style.top;
      win.dataset.prevW = win.style.width;
      win.dataset.prevH = win.style.height;
      win.style.left = '0px';
      win.style.top = `${statusHeight}px`;
      win.style.width = `${window.innerWidth}px`;
      win.style.height = `${window.innerHeight - statusHeight}px`;
      win.dataset.maximized = 'true';
    }
    saveWindows();
  });

  
  win.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeWindow(id);
    if (e.ctrlKey && e.key.toLowerCase() === 'm') {
      win.style.display = 'none';
      updateTaskbarButton(id, true);
      saveWindows();
    }
  });

  
  header.addEventListener('dblclick', () => btnMax.click());

  
  loadAppContent(appName, body, id);

  saveWindows();
  return id;
}

function closeWindow(id) {
  const win = windows.get(id);
  if (!win) return;
  win.classList.add('hidden');
  setTimeout(() => {
    win.remove();
    windows.delete(id);
    removeTaskbarButton(id);
    saveWindows();
  }, 220);
}


function saveWindows() {
  try {
    const arr = [];
    windows.forEach((el, id) => {
      arr.push({
        id,
        app: el.querySelector('.win-title')?.textContent || 'app',
        x: el.offsetLeft, y: el.offsetTop, w: el.offsetWidth, h: el.offsetHeight,
        visible: el.style.display !== 'none'
      });
    });
    localStorage.setItem(STORAGE.WINDOWS, JSON.stringify(arr));
  } catch (e) {
    console.warn('Failed to save windows', e);
  }
}
function restoreWindows() {
  try {
    const raw = localStorage.getItem(STORAGE.WINDOWS);
    if (!raw) return;
    const arr = JSON.parse(raw);
    arr.forEach(w => {
      createWindow(w.app, { id: w.id, x: w.x, y: w.y, w: w.w, h: w.h });
      const el = document.getElementById(w.id);
      if (el && !w.visible) {
        el.style.display = 'none';
        updateTaskbarButton(w.id, true);
      }
    });
  } catch (e) {
    console.warn('Failed to restore windows', e);
  }
}


function loadAppContent(appName, container, winId) {
  
  container.innerHTML = '';
  const loader = create('div', { textContent: `Loading ${appName}…` });
  container.appendChild(loader);

  
  setTimeout(() => {
    container.innerHTML = '';
    const name = appName.toLowerCase();

    if (name.includes('explorer')) {
      const tpl = $('#tpl-explorer').content.cloneNode(true);
      
      $$('[data-file]', tpl).forEach(node => {
        node.addEventListener('click', () => openTextFile(node.dataset.file));
        node.addEventListener('keydown', (e) => { if (e.key === 'Enter') openTextFile(node.dataset.file); });
      });
      container.appendChild(tpl);
    } else if (name.includes('browser')) {
      const urlBar = create('div', { className: 'browser-bar' });
      const input = create('input', { type: 'url', value: 'https://example.com', placeholder: 'Type a web address and press Enter' });
      input.setAttribute('aria-label', 'Enter URL');
      const goBtn = create('button', { type: 'button', textContent: 'Go' });
      urlBar.append(input, goBtn);

      const links = create('div', { className: 'browser-links' });
      ['https://example.com', 'https://news.ycombinator.com', 'https://wikipedia.org'].forEach(url => {
        const btn = create('button', { type: 'button', textContent: url.replace('https://', '') });
        btn.addEventListener('click', () => { frame.src = url; input.value = url; });
        links.appendChild(btn);
      });

      const frame = create('iframe', { src: 'https://example.com', style: 'width:100%;height:calc(100% - 100px);border:0;border-radius:18px;overflow:hidden' });
      frame.setAttribute('sandbox', 'allow-scripts allow-forms');

      const navigate = () => {
        const val = input.value.trim();
        try {
          const u = new URL(val.includes('://') ? val : `https://${val}`);
          frame.src = u.href;
        } catch (err) {
          alert('Invalid URL');
        }
      };
      input.addEventListener('keydown', (e) => { if (e.key === 'Enter') navigate(); });
      goBtn.addEventListener('click', navigate);

      container.appendChild(urlBar);
      container.appendChild(links);
      container.appendChild(frame);
    } else if (name.includes('notes')) {
      const toolbar = create('div', { className: 'notes-toolbar' });
      const saveBtn = create('button', { type: 'button', textContent: 'Save note' });
      const clearBtn = create('button', { type: 'button', textContent: 'Clear' });
      const count = create('span', { className: 'note-count', textContent: '0 chars' });
      toolbar.append(saveBtn, clearBtn, count);

      const ta = create('textarea', { style: 'width:100%;height:calc(100% - 64px);resize:none', value: localStorage.getItem(STORAGE.NOTES) || '' });
      const updateCount = () => { count.textContent = `${ta.value.length} chars`; };
      updateCount();
      ta.addEventListener('input', () => { localStorage.setItem(STORAGE.NOTES, ta.value); updateCount(); });
      saveBtn.addEventListener('click', () => { localStorage.setItem(STORAGE.NOTES, ta.value); alert('Notes saved'); });
      clearBtn.addEventListener('click', () => { ta.value = ''; updateCount(); localStorage.setItem(STORAGE.NOTES, ''); });
      container.appendChild(toolbar);
      container.appendChild(ta);
    } else if (name.includes('weather')) {
      const weatherCard = create('div', { className: 'weather-card' });
      weatherCard.innerHTML = `
        <header>
          <div>
            <div class="condition">Sunny</div>
            <div>San Francisco</div>
          </div>
          <div class="temp">24°C</div>
        </header>
        <div>Feels like 25°C – clear skies throughout the day.</div>
        <div>Humidity: 58% · Wind: 10 km/h · UV: Moderate</div>
      `;
      container.appendChild(weatherCard);
    } else if (name.includes('calculator')) {
      const calc = create('div', { className: 'calculator' });
      const display = create('input', { className: 'calc-display', type: 'text', value: '0', readOnly: true });
      calc.appendChild(display);
      const buttons = [
        '7','8','9','/',
        '4','5','6','*',
        '1','2','3','-',
        '0','.','=','+',
        'C','⌫','(',')'
      ];
      const grid = create('div', { className: 'calc-grid' });
      buttons.forEach(label => {
        const btn = create('button', { className: `calc-button${label === '=' ? ' equals' : ''}${label === '0' ? ' wide' : ''}`, type: 'button', textContent: label });
        btn.addEventListener('click', () => {
          if (label === 'C') {
            display.value = '0';
            return;
          }
          if (label === '⌫') {
            display.value = display.value.slice(0, -1) || '0';
            return;
          }
          if (label === '=') {
            try {
              const sanitized = display.value.replace(/×/g, '*').replace(/÷/g, '/');
              if (!/^[0-9+\-*/(). ]+$/.test(sanitized)) throw new Error('Invalid expression');
              
              display.value = String(new Function(`return ${sanitized}`)());
              
            } catch (err) {
              display.value = 'Error';
            }
            return;
          }
          if (display.value === '0' && label !== '.') display.value = label;
          else display.value += label;
        });
        grid.appendChild(btn);
      });
      calc.appendChild(grid);
      container.appendChild(calc);
    } else if (name.includes('settings')) {
      const tpl = $('#tpl-settings').content.cloneNode(true);

     
      $$('input[name="theme"]', tpl).forEach(r => {
        if (r.value === settings.theme) r.checked = true;
        r.addEventListener('change', (e) => {
          settings.theme = e.target.value;
          saveSettings(settings);
          applySettings();
        });
      });

      
      $$('button[data-wall]', tpl).forEach(b => b.addEventListener('click', (e) => {
        settings.wallpaper = e.currentTarget.dataset.wall;
        delete settings.customWallpaper;
        saveSettings(settings);
        applySettings();
      }));
      const lockToggle = tpl.querySelector('#lockWallpaperToggle');
      if (lockToggle) {
        lockToggle.checked = settings.lockWallpaper !== false;
        lockToggle.addEventListener('change', (e) => {
          settings.lockWallpaper = e.target.checked;
          saveSettings(settings);
          applySettings();
        });
      }

      
      const upload = tpl.querySelector('#wall-upload');
      upload.addEventListener('change', (e) => {
        const f = e.target.files[0];
        if (!f) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          settings.customWallpaper = ev.target.result;
          saveSettings(settings);
          applySettings();
        };
        reader.readAsDataURL(f);
      });

      
      $$('input[name="dockpos"]', tpl).forEach(r => {
        if (r.value === settings.dock) r.checked = true;
        r.addEventListener('change', (e) => {
          settings.dock = e.target.value;
          saveSettings(settings);
          applySettings();
        });
      });

      
      tpl.querySelector('#resetDefaults').addEventListener('click', () => {
        localStorage.removeItem(STORAGE.SETTINGS);
        localStorage.removeItem(STORAGE.WINDOWS);
        localStorage.removeItem(STORAGE.NOTES);
        location.reload();
      });

      container.appendChild(tpl);
    } else {
      container.textContent = 'App not implemented';
    }
  }, 180);
}


function openTextFile(filename) {
  const id = createWindow('Text Viewer');
  const win = document.getElementById(id);
  const body = win.querySelector('.win-body');
  const files = {
    'hello.txt': 'Hello from WebOS prototype!\n\nThis is a fake text file.',
    'readme.md': '# Readme\nThis is a demo file.',
    'sunset.jpg': '[image file]'
  };
  body.innerHTML = `<pre style="white-space:pre-wrap">${escapeHtml(files[filename] || 'File not found')}</pre>`;
}


$$('#icons-grid [data-app], #dock [data-app]').forEach(el => {
  el.addEventListener('click', () => createWindow(el.dataset.app));
  el.addEventListener('keydown', (e) => { if (e.key === 'Enter') createWindow(el.dataset.app); });
});


document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && !e.shiftKey && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createWindow('Notes');
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 's') {
    e.preventDefault();
    createWindow('Settings');
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'c') {
    e.preventDefault();
    createWindow('Calculator');
  }
  if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'w') {
    e.preventDefault();
    createWindow('Weather');
  }
  if (e.key === 'Escape') {
    closeStartPanel();
  }
});


document.addEventListener('focusin', (e) => {
  const win = e.target.closest('.win');
  if (win) win.style.zIndex = ++zCounter;
});


function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}


window.addEventListener('beforeunload', () => saveSettings(settings));


window.__webos = {
  createWindow,
  closeWindow,
  saveWindows,
  loadSettings,
  saveSettings
};


