import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const botId = searchParams.get("id") || "default";

  const embedScript = `
(function() {
  'use strict';
  
  const CHAT_APP_URL = '${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}';
  const BOT_ID = '${botId}';
  
  const scriptTag = document.currentScript;
  const config = {
    welcomeMessage: scriptTag?.getAttribute('welcomeMessage') || '👋 Hey... ask questions here!',
    welcomeGif: scriptTag?.getAttribute('welcomeGif') || '',
    showWelcomeMessage: scriptTag?.getAttribute('showWelcomeMessage') !== 'false',
    buttonColor: scriptTag?.getAttribute('data-button-color') || scriptTag?.getAttribute('buttonColor') || '#4f46e5',
    buttonSize: parseFloat(scriptTag?.getAttribute('buttonSize') || '1'),
    position: scriptTag?.getAttribute('position') || 'bottom-right',
    openDelay: parseInt(scriptTag?.getAttribute('openDelay') || '5000'),
    autoOpen: scriptTag?.getAttribute('open') === 'true',
    language: scriptTag?.getAttribute('language') || 'en',
    placeholder: scriptTag?.getAttribute('placeholder') || 'Type your message...',
  };

  const iframeId = 'nyenglish-chat-iframe';
  const buttonId = 'nyenglish-chat-button';
  const welcomeId = 'nyenglish-chat-welcome';
  let isOpen = false;

  const fadeIn = (el, delay = 0) => {
    // Preserve display type (flex for button, block for others)
    const displayType = el.id === buttonId ? 'flex' : 'block';
    el.style.display = displayType;
    setTimeout(() => { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, delay);
  };

  const fadeOut = (el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(() => { el.style.display = 'none'; }, 200);
  };

  window.addEventListener('message', (event) => {
    if (event.data === 'close-chat' && event.origin === CHAT_APP_URL) {
      const iframe = document.getElementById(iframeId);
      const button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    }
  });

  const openChat = () => {
    const iframe = document.getElementById(iframeId);
    const button = document.getElementById(buttonId);
    const welcome = document.getElementById(welcomeId);
    if (iframe) { fadeIn(iframe); isOpen = true; }
    if (welcome) fadeOut(welcome);
    const mq = window.matchMedia('(max-width: 475px)');
    if (mq.matches && button) fadeOut(button);
  };

  const toggleChat = () => {
    if (isOpen) {
      const iframe = document.getElementById(iframeId);
      const button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    } else {
      openChat();
    }
  };

  const init = () => {
    const iframe = document.createElement('iframe');
    iframe.id = iframeId;
    iframe.src = CHAT_APP_URL + '/embed/chat?language=' + encodeURIComponent(config.language) + '&placeholder=' + encodeURIComponent(config.placeholder);
    iframe.style.cssText = 'display:none;opacity:0;position:fixed;border:none;z-index:2147483647;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);transition:opacity 200ms,transform 200ms;transform:translateY(10px);';
    
    const mq = window.matchMedia('(max-width: 475px)');
    if (mq.matches) {
      iframe.style.cssText += 'width:100vw;height:100vh;bottom:0;right:0;left:0;border-radius:0;';
    } else {
      iframe.style.cssText += 'width:400px;max-width:80vw;height:600px;max-height:80vh;border-radius:20px;bottom:80px;';
      iframe.style[config.position === 'bottom-right' ? 'right' : 'left'] = '20px';
    }
    document.body.appendChild(iframe);

    if (config.showWelcomeMessage) {
      const welcome = document.createElement('div');
      welcome.id = welcomeId;
      welcome.style.cssText = 'display:none;opacity:0;position:fixed;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:280px;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);padding:1rem 2rem 1rem 1rem;font-size:0.9rem;line-height:1.5;background:#fff;color:#000;z-index:2147483647;cursor:pointer;transition:opacity 200ms,transform 200ms;transform:translateY(10px);bottom:80px;';
      welcome.style[config.position === 'bottom-right' ? 'right' : 'left'] = '90px';
      welcome.onclick = openChat;

      if (config.welcomeGif) {
        const gif = document.createElement('img');
        gif.src = config.welcomeGif;
        gif.style.cssText = 'width:100%;max-width:150px;height:auto;margin-bottom:0.5rem;border-radius:8px;';
        welcome.appendChild(gif);
      }

      const text = document.createElement('div');
      text.textContent = config.welcomeMessage;
      welcome.appendChild(text);

      const closeBtn = document.createElement('button');
      closeBtn.innerHTML = '×';
      closeBtn.style.cssText = 'position:absolute;top:0.5rem;right:0.5rem;background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#6B7280;padding:0;width:24px;height:24px;border-radius:50%;';
      closeBtn.onclick = (e) => { e.stopPropagation(); fadeOut(welcome); };
      welcome.appendChild(closeBtn);
      document.body.appendChild(welcome);
      setTimeout(() => fadeIn(welcome), 1000);
    }

    const button = document.createElement('button');
    button.id = buttonId;
    button.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="display:block;"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>';
    button.style.cssText = 'display:flex;align-items:center;justify-content:center;opacity:1;position:fixed;z-index:2147483647;width:60px;height:60px;border-radius:50%;background-color:' + config.buttonColor + ';color:white;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 200ms,box-shadow 200ms;transform:scale(' + config.buttonSize + ');transform-origin:bottom ' + (config.position === 'bottom-right' ? 'right' : 'left') + ';bottom:20px;padding:0;';
    button.style[config.position === 'bottom-right' ? 'right' : 'left'] = '20px';
    button.onmouseover = () => { button.style.transform = 'scale(' + (config.buttonSize * 1.1) + ')'; button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; };
    button.onmouseout = () => { button.style.transform = 'scale(' + config.buttonSize + ')'; button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    button.onclick = toggleChat;
    document.body.appendChild(button);

    if (config.autoOpen) setTimeout(openChat, config.openDelay);
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;

  return new NextResponse(embedScript, {
    headers: {
      "Content-Type": "application/javascript",
      "Cache-Control": "public, max-age=3600",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET",
    },
  });
}
