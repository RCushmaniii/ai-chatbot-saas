import { SANITIZERS_JS } from "@/lib/embed/sanitize";

/**
 * The JavaScript served by /api/embed, which runs on the CUSTOMER'S page.
 *
 * Rules this file holds to — each one is a hole that existed before:
 *
 *   1. Nothing from the request is pasted into the source. The script used to
 *      start with `const BOT_ID = '${id}'` taken straight from ?id=, so
 *      /api/embed?id=x';alert(1)// served `const BOT_ID = 'x';alert(1)//';` —
 *      script of the requester's choosing, from our origin. Verified on
 *      production 2026-10-14. BOT_ID was never read, so it is gone, and the only
 *      interpolated value left (the app URL, from our own env) goes through
 *      JSON.stringify.
 *   2. Every attribute is validated before it reaches the DOM (SANITIZERS_JS,
 *      shared with the server — see lib/embed/sanitize.ts). An invalid value
 *      falls back to the default; it is never "fixed up".
 *   3. Elements are BUILT, never parsed from HTML strings. No innerHTML, so no
 *      value — valid or not — can become markup on a customer's site.
 */
export function buildEmbedScript(appUrl: string): string {
	return `
(function() {
  'use strict';
${SANITIZERS_JS}
  var CHAT_APP_URL = ${JSON.stringify(appUrl)};
  var DEFAULT_COLOR = '#4f46e5';

  var scriptTag = document.currentScript;
  function attr(name) { return scriptTag ? scriptTag.getAttribute(name) : null; }
  function firstAttr(names) {
    for (var i = 0; i < names.length; i++) {
      var v = attr(names[i]);
      if (v !== null) return v;
    }
    return null;
  }

  var rawColor = firstAttr(['data-button-color', 'buttonColor']);
  var rawGif = attr('welcomeGif');
  var config = {
    welcomeMessage: attr('welcomeMessage') || '👋 Hey... ask questions here!',
    welcomeGif: isAllowedImageUrl(rawGif) ? rawGif : '',
    showWelcomeMessage: attr('showWelcomeMessage') !== 'false',
    buttonColor: isHexColor(rawColor) ? rawColor : DEFAULT_COLOR,
    buttonSize: clampNumber(attr('buttonSize'), 0.5, 2, 1),
    position: safePosition(attr('position')),
    openDelay: clampNumber(attr('openDelay'), 0, 60000, 5000),
    autoOpen: attr('open') === 'true',
    language: attr('language') === 'es' ? 'es' : 'en',
    placeholder: (attr('placeholder') || '').slice(0, 200),
  };
  var side = config.position === 'bottom-left' ? 'left' : 'right';

  var iframeId = 'nyenglish-chat-iframe';
  var buttonId = 'nyenglish-chat-button';
  var welcomeId = 'nyenglish-chat-welcome';
  var isOpen = false;

  function fadeIn(el, delay) {
    el.style.display = el.id === buttonId ? 'flex' : 'block';
    setTimeout(function() { el.style.opacity = '1'; el.style.transform = 'translateY(0)'; }, delay || 0);
  }

  function fadeOut(el) {
    el.style.opacity = '0';
    el.style.transform = 'translateY(10px)';
    setTimeout(function() { el.style.display = 'none'; }, 200);
  }

  window.addEventListener('message', function(event) {
    if (event.data === 'close-chat' && event.origin === CHAT_APP_URL) {
      var iframe = document.getElementById(iframeId);
      var button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    }
  });

  function openChat() {
    var iframe = document.getElementById(iframeId);
    var button = document.getElementById(buttonId);
    var welcome = document.getElementById(welcomeId);
    if (iframe) { fadeIn(iframe); isOpen = true; }
    if (welcome) fadeOut(welcome);
    if (window.matchMedia('(max-width: 475px)').matches && button) fadeOut(button);
  }

  function toggleChat() {
    if (isOpen) {
      var iframe = document.getElementById(iframeId);
      var button = document.getElementById(buttonId);
      if (iframe) { fadeOut(iframe); isOpen = false; }
      if (button) fadeIn(button);
    } else {
      openChat();
    }
  }

  function chatIcon() {
    var NS = 'http://www.w3.org/2000/svg';
    var svg = document.createElementNS(NS, 'svg');
    var props = { width: '28', height: '28', viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor',
      'stroke-width': '2', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' };
    for (var k in props) svg.setAttribute(k, props[k]);
    svg.style.display = 'block';
    var path = document.createElementNS(NS, 'path');
    path.setAttribute('d', 'M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z');
    svg.appendChild(path);
    return svg;
  }

  function init() {
    var iframe = document.createElement('iframe');
    iframe.id = iframeId;
    var src = CHAT_APP_URL + '/embed/chat?language=' + encodeURIComponent(config.language);
    if (config.placeholder) src += '&placeholder=' + encodeURIComponent(config.placeholder);
    iframe.src = src;
    iframe.title = 'Chat';
    iframe.style.cssText = 'display:none;opacity:0;position:fixed;border:none;z-index:2147483647;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);transition:opacity 200ms,transform 200ms;transform:translateY(10px);';
    if (window.matchMedia('(max-width: 475px)').matches) {
      iframe.style.cssText += 'width:100vw;height:100vh;bottom:0;right:0;left:0;border-radius:0;';
    } else {
      iframe.style.cssText += 'width:400px;max-width:80vw;height:600px;max-height:80vh;border-radius:20px;bottom:80px;';
      iframe.style[side] = '20px';
    }
    document.body.appendChild(iframe);

    if (config.showWelcomeMessage) {
      var welcome = document.createElement('div');
      welcome.id = welcomeId;
      welcome.style.cssText = 'display:none;opacity:0;position:fixed;font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;width:280px;border-radius:12px;box-shadow:0 10px 15px -3px rgba(0,0,0,0.1);padding:1rem 2rem 1rem 1rem;font-size:0.9rem;line-height:1.5;background:#fff;color:#000;z-index:2147483647;cursor:pointer;transition:opacity 200ms,transform 200ms;transform:translateY(10px);bottom:80px;';
      welcome.style[side] = '90px';
      welcome.onclick = openChat;

      if (config.welcomeGif) {
        var gif = document.createElement('img');
        gif.src = config.welcomeGif;
        gif.alt = '';
        gif.style.cssText = 'width:100%;max-width:150px;height:auto;margin-bottom:0.5rem;border-radius:8px;';
        welcome.appendChild(gif);
      }

      var text = document.createElement('div');
      text.textContent = config.welcomeMessage;
      welcome.appendChild(text);

      var closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.textContent = '×';
      closeBtn.setAttribute('aria-label', config.language === 'es' ? 'Cerrar' : 'Close');
      closeBtn.style.cssText = 'position:absolute;top:0.5rem;right:0.5rem;background:transparent;border:none;font-size:1.5rem;cursor:pointer;color:#6B7280;padding:0;width:24px;height:24px;border-radius:50%;';
      closeBtn.onclick = function(e) { e.stopPropagation(); fadeOut(welcome); };
      welcome.appendChild(closeBtn);
      document.body.appendChild(welcome);
      setTimeout(function() { fadeIn(welcome); }, 1000);
    }

    var button = document.createElement('button');
    button.id = buttonId;
    button.type = 'button';
    button.setAttribute('aria-label', config.language === 'es' ? 'Abrir chat' : 'Open chat');
    button.appendChild(chatIcon());
    button.style.cssText = 'display:flex;align-items:center;justify-content:center;opacity:1;position:fixed;z-index:2147483647;width:60px;height:60px;border-radius:50%;color:white;border:none;cursor:pointer;box-shadow:0 4px 12px rgba(0,0,0,0.15);transition:transform 200ms,box-shadow 200ms;bottom:20px;padding:0;';
    button.style.backgroundColor = config.buttonColor;
    button.style.transform = 'scale(' + config.buttonSize + ')';
    button.style.transformOrigin = 'bottom ' + side;
    button.style[side] = '20px';
    button.onmouseover = function() { button.style.transform = 'scale(' + (config.buttonSize * 1.1) + ')'; button.style.boxShadow = '0 6px 16px rgba(0,0,0,0.2)'; };
    button.onmouseout = function() { button.style.transform = 'scale(' + config.buttonSize + ')'; button.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)'; };
    button.onclick = toggleChat;
    document.body.appendChild(button);

    if (config.autoOpen) setTimeout(openChat, config.openDelay);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
`;
}
