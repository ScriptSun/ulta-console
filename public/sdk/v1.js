(function() {
  'use strict';
  
  // Create the UltaAIWidget global object
  window.UltaAIWidget = window.UltaAIWidget || {};
  
  // Configuration
  const CONFIG = {
    API_BASE_URL: 'https://lfsdqyvvboapsyeauchm.supabase.co',
    WIDGET_API_ENDPOINT: '/functions/v1/widget-api'
  };
  
  // Widget state management
  let widgetInstances = {};
  let isLoaded = false;
  
  // Utility functions
  function generateId() {
    return 'ultaai-widget-' + Math.random().toString(36).substr(2, 9);
  }
  
  function createWidgetHTML(config) {
    return `
      <div id="${config.containerId}" class="ultaai-widget-container" style="
        position: fixed;
        bottom: 20px;
        right: 20px;
        z-index: 2147483647;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <!-- Widget Launcher Button -->
        <button id="${config.launcherId}" class="ultaai-launcher" style="
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: ${config.theme?.color_primary || '#007bff'};
          border: none;
          cursor: pointer;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          display: flex;
          align-items: center;
          justify-content: center;
          transition: all 0.3s ease;
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .5-.1.7-.3L14.5 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
        
        <!-- Widget Chat Interface -->
        <div id="${config.chatId}" class="ultaai-chat" style="
          position: absolute;
          bottom: 80px;
          right: 0;
          width: 350px;
          height: 500px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          display: none;
          flex-direction: column;
          overflow: hidden;
        ">
          <!-- Chat Header -->
          <div class="ultaai-header" style="
            background: ${config.theme?.header_bg || config.theme?.color_primary || '#007bff'};
            color: ${config.theme?.header_text || 'white'};
            padding: 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
          ">
            <div style="display: flex; align-items: center; gap: 8px;">
              ${config.theme?.logo_url ? `<img src="${config.theme.logo_url}" alt="Logo" style="width: 24px; height: 24px; border-radius: 4px;">` : ''}
              <span style="font-weight: 600;">Chat Support</span>
            </div>
            <button id="${config.closeId}" style="
              background: none;
              border: none;
              color: inherit;
              cursor: pointer;
              padding: 4px;
              border-radius: 4px;
            ">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M12.854 3.146a.5.5 0 0 0-.708 0L8 7.293 3.854 3.147a.5.5 0 1 0-.708.708L7.293 8l-4.147 4.146a.5.5 0 0 0 .708.708L8 8.707l4.146 4.147a.5.5 0 0 0 .708-.708L8.707 8l4.147-4.146a.5.5 0 0 0 0-.708z"/>
              </svg>
            </button>
          </div>
          
          <!-- Chat Messages -->
          <div id="${config.messagesId}" class="ultaai-messages" style="
            flex: 1;
            padding: 16px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 12px;
          ">
            <div class="ultaai-message assistant" style="
              background: ${config.theme?.assistant_bubble_bg || '#f1f3f4'};
              color: ${config.theme?.assistant_bubble_text || '#333'};
              padding: 12px;
              border-radius: 12px;
              max-width: 80%;
              align-self: flex-start;
            ">
              ${config.theme?.welcome_text || 'Hello! How can I help you today?'}
            </div>
          </div>
          
          <!-- Chat Input -->
          <div class="ultaai-input-area" style="
            padding: 16px;
            border-top: 1px solid #e0e0e0;
            display: flex;
            gap: 8px;
          ">
            <input 
              id="${config.inputId}" 
              type="text" 
              placeholder="Type your message..."
              style="
                flex: 1;
                padding: 10px 12px;
                border: 1px solid #ddd;
                border-radius: 20px;
                outline: none;
                font-size: 14px;
              "
            />
            <button id="${config.sendId}" style="
              background: ${config.theme?.button_primary_bg || config.theme?.color_primary || '#007bff'};
              color: ${config.theme?.button_primary_text || 'white'};
              border: none;
              border-radius: 50%;
              width: 40px;
              height: 40px;
              cursor: pointer;
              display: flex;
              align-items: center;
              justify-content: center;
            ">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                <path d="M15.854.146a.5.5 0 0 1 .11.54L13.026 8.4a.5.5 0 0 1-.708.132L8.707 5.707a.5.5 0 0 0-.708.708L10.825 9.24a.5.5 0 0 1-.132.708L2.9 12.974a.5.5 0 0 1-.54-.11l-.1-.114L7.854.146a.5.5 0 0 1 .792 0L15.854.146z"/>
              </svg>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  
  // Widget functionality
  function createWidget(siteKey, options = {}) {
    const widgetId = generateId();
    const config = {
      widgetId,
      siteKey,
      containerId: widgetId + '-container',
      launcherId: widgetId + '-launcher',
      chatId: widgetId + '-chat',
      closeId: widgetId + '-close',
      messagesId: widgetId + '-messages',
      inputId: widgetId + '-input',
      sendId: widgetId + '-send',
      theme: options.theme || {},
      position: options.position || 'bottom-right'
    };
    
    // Create and inject widget HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = createWidgetHTML(config);
    document.body.appendChild(widgetContainer.firstElementChild);
    
    // Add event listeners
    setupWidgetEvents(config);
    
    // Store instance
    widgetInstances[widgetId] = {
      config,
      isOpen: false,
      messages: []
    };
    
    return widgetId;
  }
  
  function setupWidgetEvents(config) {
    const launcher = document.getElementById(config.launcherId);
    const closeBtn = document.getElementById(config.closeId);
    const input = document.getElementById(config.inputId);
    const sendBtn = document.getElementById(config.sendId);
    const chat = document.getElementById(config.chatId);
    
    // Toggle chat visibility
    launcher?.addEventListener('click', () => toggleChat(config.widgetId));
    closeBtn?.addEventListener('click', () => closeChat(config.widgetId));
    
    // Send message on enter key or send button
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') sendMessage(config.widgetId);
    });
    sendBtn?.addEventListener('click', () => sendMessage(config.widgetId));
    
    // Launcher hover effect
    launcher?.addEventListener('mouseenter', () => {
      launcher.style.transform = 'scale(1.05)';
    });
    launcher?.addEventListener('mouseleave', () => {
      launcher.style.transform = 'scale(1)';
    });
  }
  
  function toggleChat(widgetId) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const chat = document.getElementById(instance.config.chatId);
    if (!chat) return;
    
    instance.isOpen = !instance.isOpen;
    chat.style.display = instance.isOpen ? 'flex' : 'none';
    
    if (instance.isOpen) {
      // Focus input when opening
      const input = document.getElementById(instance.config.inputId);
      setTimeout(() => input?.focus(), 100);
    }
  }
  
  function closeChat(widgetId) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const chat = document.getElementById(instance.config.chatId);
    if (chat) {
      chat.style.display = 'none';
      instance.isOpen = false;
    }
  }
  
  function sendMessage(widgetId) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const input = document.getElementById(instance.config.inputId);
    const message = input?.value?.trim();
    
    if (!message) return;
    
    // Add user message to chat
    addMessageToChat(widgetId, message, 'user');
    input.value = '';
    
    // Show typing indicator
    addTypingIndicator(widgetId);
    
    // Send to backend (simulate for now)
    setTimeout(() => {
      removeTypingIndicator(widgetId);
      addMessageToChat(widgetId, "Thanks for your message! Our team will get back to you soon.", 'assistant');
    }, 1500);
  }
  
  function addMessageToChat(widgetId, message, sender) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const messagesContainer = document.getElementById(instance.config.messagesId);
    if (!messagesContainer) return;
    
    const messageDiv = document.createElement('div');
    messageDiv.className = `ultaai-message ${sender}`;
    messageDiv.textContent = message;
    
    const isUser = sender === 'user';
    messageDiv.style.cssText = `
      background: ${isUser 
        ? (instance.config.theme?.user_bubble_bg || instance.config.theme?.color_primary || '#007bff')
        : (instance.config.theme?.assistant_bubble_bg || '#f1f3f4')};
      color: ${isUser 
        ? (instance.config.theme?.user_bubble_text || 'white')
        : (instance.config.theme?.assistant_bubble_text || '#333')};
      padding: 12px;
      border-radius: 12px;
      max-width: 80%;
      align-self: ${isUser ? 'flex-end' : 'flex-start'};
      margin-bottom: 8px;
      font-size: 14px;
      line-height: 1.4;
    `;
    
    messagesContainer.appendChild(messageDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
  }
  
  function addTypingIndicator(widgetId) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const messagesContainer = document.getElementById(instance.config.messagesId);
    if (!messagesContainer) return;
    
    const typingDiv = document.createElement('div');
    typingDiv.id = `${widgetId}-typing`;
    typingDiv.className = 'ultaai-message assistant typing';
    typingDiv.innerHTML = `
      <div style="display: flex; gap: 4px; align-items: center;">
        <div style="width: 8px; height: 8px; background: #999; border-radius: 50%; animation: ultaai-typing 1.4s infinite ease-in-out;"></div>
        <div style="width: 8px; height: 8px; background: #999; border-radius: 50%; animation: ultaai-typing 1.4s infinite ease-in-out 0.2s;"></div>
        <div style="width: 8px; height: 8px; background: #999; border-radius: 50%; animation: ultaai-typing 1.4s infinite ease-in-out 0.4s;"></div>
      </div>
    `;
    typingDiv.style.cssText = `
      background: ${instance.config.theme?.assistant_bubble_bg || '#f1f3f4'};
      color: ${instance.config.theme?.assistant_bubble_text || '#333'};
      padding: 12px;
      border-radius: 12px;
      max-width: 80%;
      align-self: flex-start;
      margin-bottom: 8px;
    `;
    
    messagesContainer.appendChild(typingDiv);
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
    
    // Add CSS animation if not already added
    if (!document.getElementById('ultaai-styles')) {
      const style = document.createElement('style');
      style.id = 'ultaai-styles';
      style.textContent = `
        @keyframes ultaai-typing {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.5; }
          30% { transform: translateY(-10px); opacity: 1; }
        }
      `;
      document.head.appendChild(style);
    }
  }
  
  function removeTypingIndicator(widgetId) {
    const typingDiv = document.getElementById(`${widgetId}-typing`);
    if (typingDiv) {
      typingDiv.remove();
    }
  }
  
  // Main load function
  window.UltaAIWidget.load = function(siteKey, options = {}) {
    if (isLoaded) {
      console.warn('UltaAI Widget is already loaded');
      return;
    }
    
    if (!siteKey) {
      console.error('UltaAI Widget: Site key is required');
      return;
    }
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initializeWidget(siteKey, options);
      });
    } else {
      initializeWidget(siteKey, options);
    }
  };
  
  function initializeWidget(siteKey, options) {
    try {
      // Fetch widget configuration
      fetchWidgetConfig(siteKey)
        .then(config => {
          if (config) {
            // Merge theme from config with options
            const mergedOptions = {
              ...options,
              theme: { ...config.theme, ...options.theme }
            };
            
            createWidget(siteKey, mergedOptions);
            isLoaded = true;
            console.log('UltaAI Widget loaded successfully');
          } else {
            console.error('UltaAI Widget: Invalid site key or widget not found');
          }
        })
        .catch(error => {
          console.error('UltaAI Widget: Failed to load configuration', error);
          // Fallback: create widget with basic configuration
          createWidget(siteKey, options);
          isLoaded = true;
        });
    } catch (error) {
      console.error('UltaAI Widget: Initialization failed', error);
    }
  }
  
  async function fetchWidgetConfig(siteKey) {
    const apiUrl = `${CONFIG.API_BASE_URL}${CONFIG.WIDGET_API_ENDPOINT}`;
    const requestData = {
      action: 'get_config',
      site_key: siteKey,
      domain: window.location.origin
    };
    
    console.log('UltaAI Widget - Fetching config:', { apiUrl, requestData });
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      console.log('UltaAI Widget - API response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('UltaAI Widget - Response data:', data);
        
        if (data.success) {
          return data.widget;
        } else {
          console.error('UltaAI Widget - API returned error:', {
            error: data.error,
            code: data.code,
            details: data.details || data
          });
          return null;
        }
      } else {
        const errorText = await response.text();
        console.error('UltaAI Widget - HTTP error:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
      }
    } catch (error) {
      console.error('UltaAI Widget - Network/fetch error:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
    }
    
    return null;
  }
  
  // Auto-load widget if data attributes are present
  function autoLoad() {
    const script = document.querySelector('script[data-ultaai-site-key]');
    if (script) {
      const siteKey = script.getAttribute('data-ultaai-site-key');
      const options = {};
      
      // Parse data attributes
      const attrs = script.attributes;
      for (let i = 0; i < attrs.length; i++) {
        const attr = attrs[i];
        if (attr.name.startsWith('data-ultaai-') && attr.name !== 'data-ultaai-site-key') {
          const key = attr.name.replace('data-ultaai-', '').replace(/-([a-z])/g, (g) => g[1].toUpperCase());
          options[key] = attr.value;
        }
      }
      
      window.UltaAIWidget.load(siteKey, options);
    }
  }
  
  // Initialize auto-load check
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
  } else {
    autoLoad();
  }
  
  // Expose utility functions
  window.UltaAIWidget.destroy = function(widgetId) {
    if (widgetId && widgetInstances[widgetId]) {
      const container = document.getElementById(widgetInstances[widgetId].config.containerId);
      if (container) container.remove();
      delete widgetInstances[widgetId];
    } else {
      // Destroy all instances
      Object.keys(widgetInstances).forEach(id => {
        const container = document.getElementById(widgetInstances[id].config.containerId);
        if (container) container.remove();
      });
      widgetInstances = {};
      isLoaded = false;
    }
  };
  
  window.UltaAIWidget.show = function(widgetId) {
    Object.keys(widgetInstances).forEach(id => {
      if (!widgetId || id === widgetId) {
        toggleChat(id);
      }
    });
  };
  
  window.UltaAIWidget.hide = function(widgetId) {
    Object.keys(widgetInstances).forEach(id => {
      if (!widgetId || id === widgetId) {
        closeChat(id);
      }
    });
  };
  
})();