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
  
  // Debug utilities
  function debugLog(message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = '🤖 UltaAI Widget DEBUG';
    
    if (level === 'error') {
      console.error(`${prefix} [${timestamp}] ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} [${timestamp}] ${message}`, data || '');
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`, data || '');
    }
  }
  
  function debugAnalysis(title, analysis) {
    console.group(`🔍 ${title} - Debug Analysis`);
    Object.entries(analysis).forEach(([key, value]) => {
      console.log(`📊 ${key}:`, value);
    });
    console.groupEnd();
  }
  
  function debugPerformance(label, startTime) {
    const endTime = performance.now();
    const duration = endTime - startTime;
    debugLog(`Performance: ${label} completed in ${duration.toFixed(2)}ms`, { startTime, endTime, duration });
  }

  // Enhanced debug configuration analysis
  function analyzeConfiguration(config) {
    if (!config.debug) return;
    
    const analysis = {
      'Widget ID': config.widgetId,
      'Site Key': config.siteKey?.substring(0, 10) + '...',
      'Position': config.position,
      'Dimensions': `${config.width} x ${config.height}`,
      'Auto Open': config.autoOpen,
      'Hide on Mobile': config.hideOnMobile,
      'Show Badge': config.showBadge,
      'Theme Properties': Object.keys(config.theme || {}).length,
      'User Data Available': !!(config.userId || config.userEmail || config.userName),
      'Event Callbacks': {
        onReady: typeof config.onReady === 'function',
        onOpen: typeof config.onOpen === 'function', 
        onClose: typeof config.onClose === 'function',
        onMessage: typeof config.onMessage === 'function'
      },
      'Browser Info': {
        userAgent: navigator.userAgent,
        platform: navigator.platform,
        language: navigator.language,
        cookieEnabled: navigator.cookieEnabled,
        onLine: navigator.onLine
      },
      'Page Info': {
        url: window.location.href,
        origin: window.location.origin,
        protocol: window.location.protocol,
        referrer: document.referrer || 'direct',
        title: document.title
      },
      'Viewport': {
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth <= 768
      },
      'DOM State': document.readyState,
      'Timestamp': new Date().toISOString()
    };
    
    debugAnalysis('Widget Configuration', analysis);
  }

  // Enhanced theme analysis
  function analyzeTheme(theme, config) {
    if (!config?.debug) return;
    
    const themeAnalysis = {
      'Total Properties': Object.keys(theme).length,
      'Color Properties': Object.keys(theme).filter(key => key.includes('color')).length,
      'Typography Properties': Object.keys(theme).filter(key => key.includes('font')).length,
      'Layout Properties': Object.keys(theme).filter(key => 
        key.includes('radius') || key.includes('spacing')).length,
      'Branding': {
        hasLogo: !!theme.logo_url,
        hasWelcomeText: !!theme.welcome_text,
        primaryColor: theme.color_primary || 'default'
      },
      'Applied Styles': theme
    };
    
    debugAnalysis('Theme Configuration', themeAnalysis);
  }
  function generateId() {
    return 'ultaai-widget-' + Math.random().toString(36).substr(2, 9);
  }
  
  function createWidgetHTML(config) {
    const startTime = performance.now();
    
    if (config.debug) {
      debugLog('Starting HTML generation', { widgetId: config.widgetId });
      analyzeConfiguration(config);
    }
    
    // Calculate positioning based on config.position
    let positionStyles = '';
    switch(config.position) {
      case 'center':
        positionStyles = `
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
        `;
        break;
      case 'top-left':
        positionStyles = `
          top: 20px;
          left: 20px;
        `;
        break;
      case 'top-right':
        positionStyles = `
          top: 20px;
          right: 20px;
        `;
        break;
      case 'bottom-left':
        positionStyles = `
          bottom: 20px;
          left: 20px;
        `;
        break;
      case 'bottom-right':
      default:
        positionStyles = `
          bottom: 20px;
          right: 20px;
        `;
        break;
    }

    if (config.debug) {
      debugLog('Position calculation complete', { 
        position: config.position, 
        styles: positionStyles.trim() 
      });
    }

    // Get custom dimensions or use defaults
    const chatWidth = config.width || '350px';
    const chatHeight = config.height || '500px';
    
    if (config.debug) {
      debugLog('Dimensions configured', { width: chatWidth, height: chatHeight });
      analyzeTheme(config.theme, config);
    }

    const html = `
      <div id="${config.containerId}" class="ultaai-widget-container" style="
        position: fixed;
        ${positionStyles}
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
          ${config.position === 'center' ? 'display: none;' : ''}
          ${!config.showBadge ? 'display: none;' : ''}
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .5-.1.7-.3L14.5 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
        </button>
        
        <!-- Widget Chat Interface -->
        <div id="${config.chatId}" class="ultaai-chat" style="
          position: ${config.position === 'center' ? 'fixed' : 'absolute'};
          ${config.position === 'center' ? `${positionStyles}` : `
            bottom: 80px;
            right: 0;
          `}
          width: ${chatWidth};
          height: ${chatHeight};
          background: white;
          border-radius: 12px;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
          display: ${config.autoOpen ? 'flex' : 'none'};
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
    
    if (config.debug) {
      debugPerformance('HTML generation', startTime);
      debugLog('HTML structure created', {
        containerElements: ['launcher', 'chat', 'header', 'messages', 'input'],
        totalHTMLLength: html.length,
        autoOpenState: config.autoOpen,
        showBadgeState: config.showBadge
      });
    }
    
    return html;
  }
  
  // Widget functionality
  function createWidget(siteKey, options = {}) {
    const startTime = performance.now();
    
    if (options.debug) {
      debugLog('Creating widget with options', options);
    }
    
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
      position: options.position || 'bottom-right',
      width: options.width || '350px',
      height: options.height || '500px',
      autoOpen: options.autoOpen || false,
      hideOnMobile: options.hideOnMobile || false,
      showBadge: options.showBadge !== false,
      debug: options.debug || false,
      userId: options.userId,
      userEmail: options.userEmail,
      userName: options.userName,
      onReady: options.onReady,
      onOpen: options.onOpen,
      onClose: options.onClose,
      onMessage: options.onMessage
    };
    
    if (config.debug) {
      debugLog('Widget configuration finalized', {
        widgetId,
        configKeys: Object.keys(config),
        hasUserData: !!(config.userId || config.userEmail || config.userName),
        hasCallbacks: {
          onReady: typeof config.onReady === 'function',
          onOpen: typeof config.onOpen === 'function',
          onClose: typeof config.onClose === 'function',
          onMessage: typeof config.onMessage === 'function'
        }
      });
    }
    
    // Check if should hide on mobile
    if (config.hideOnMobile && window.innerWidth <= 768) {
      if (config.debug) {
        debugLog('Widget hidden on mobile device', { 
          screenWidth: window.innerWidth,
          isMobile: true,
          hideOnMobile: config.hideOnMobile 
        });
      }
      return widgetId; // Still return ID but don't create widget
    }
    
    try {
      const htmlStartTime = performance.now();
      
      // Create and inject widget HTML
      const widgetContainer = document.createElement('div');
      widgetContainer.innerHTML = createWidgetHTML(config);
      const widgetElement = widgetContainer.firstElementChild;
      
      if (!widgetElement) {
        throw new Error('Failed to create widget HTML element');
      }
      
      if (config.debug) {
        debugPerformance('HTML creation and parsing', htmlStartTime);
        debugLog('Widget DOM element created', {
          elementType: widgetElement.tagName,
          elementId: widgetElement.id,
          childElements: widgetElement.children.length,
          innerHTML: widgetElement.innerHTML.length
        });
      }
      
      const injectStartTime = performance.now();
      document.body.appendChild(widgetElement);
      
      if (config.debug) {
        debugPerformance('DOM injection', injectStartTime);
        debugLog('Widget HTML injected into DOM', {
          parentElement: document.body.tagName,
          position: 'body > appendChild',
          zIndex: getComputedStyle(widgetElement).zIndex
        });
      }
      
      // Add event listeners
      const eventsStartTime = performance.now();
      setupWidgetEvents(config);
      
      if (config.debug) {
        debugPerformance('Event listener setup', eventsStartTime);
      }
      
      // Store instance
      widgetInstances[widgetId] = {
        config,
        isOpen: config.autoOpen || false,
        messages: [],
        createdAt: Date.now(),
        interactions: 0
      };
      
      if (config.debug) {
        debugLog('Widget instance stored', {
          widgetId,
          totalInstances: Object.keys(widgetInstances).length,
          instanceData: {
            isOpen: widgetInstances[widgetId].isOpen,
            messageCount: widgetInstances[widgetId].messages.length,
            createdAt: new Date(widgetInstances[widgetId].createdAt).toISOString()
          }
        });
      }
      
      // Call onReady callback if provided
      if (typeof config.onReady === 'function') {
        setTimeout(() => {
          if (config.debug) {
            debugLog('Executing onReady callback');
          }
          config.onReady();
        }, 100);
      }
      
      if (config.debug) {
        debugPerformance('Total widget creation', startTime);
        debugLog('Widget creation completed successfully', {
          widgetId,
          totalCreationTime: performance.now() - startTime,
          readyState: 'initialized'
        });
      }
      
      return widgetId;
    } catch (error) {
      if (options.debug) {
        debugLog('Widget creation failed', {
          error: error.message,
          stack: error.stack,
          widgetId,
          siteKey: siteKey?.substring(0, 10) + '...'
        }, 'error');
      }
      throw error;
    }
  }
  
  function setupWidgetEvents(config) {
    const startTime = performance.now();
    
    if (config.debug) {
      debugLog('Setting up widget event listeners');
    }
    
    const launcher = document.getElementById(config.launcherId);
    const closeBtn = document.getElementById(config.closeId);
    const input = document.getElementById(config.inputId);
    const sendBtn = document.getElementById(config.sendId);
    const chat = document.getElementById(config.chatId);
    
    if (config.debug) {
      const elementStatus = {
        launcher: !!launcher,
        closeBtn: !!closeBtn,
        input: !!input,
        sendBtn: !!sendBtn,
        chat: !!chat
      };
      debugLog('DOM elements found for event binding', elementStatus);
    }
    
    // Toggle chat visibility
    launcher?.addEventListener('click', () => {
      if (config.debug) {
        debugLog('Launcher button clicked', { widgetId: config.widgetId });
      }
      toggleChat(config.widgetId);
    });
    
    closeBtn?.addEventListener('click', () => {
      if (config.debug) {
        debugLog('Close button clicked', { widgetId: config.widgetId });
      }
      closeChat(config.widgetId);
    });
    
    // Send message on enter key or send button
    input?.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        if (config.debug) {
          debugLog('Enter key pressed in input', { 
            widgetId: config.widgetId,
            inputValue: e.target.value?.substring(0, 20) + '...'
          });
        }
        sendMessage(config.widgetId);
      }
    });
    
    sendBtn?.addEventListener('click', () => {
      if (config.debug) {
        debugLog('Send button clicked', { widgetId: config.widgetId });
      }
      sendMessage(config.widgetId);
    });
    
    // Enhanced launcher interactions with debug
    launcher?.addEventListener('mouseenter', () => {
      if (config.debug) {
        debugLog('Launcher hover start', { widgetId: config.widgetId });
      }
      launcher.style.transform = 'scale(1.05)';
    });
    
    launcher?.addEventListener('mouseleave', () => {
      if (config.debug) {
        debugLog('Launcher hover end', { widgetId: config.widgetId });
      }
      launcher.style.transform = 'scale(1)';
    });
    
    // Input focus/blur debugging
    input?.addEventListener('focus', () => {
      if (config.debug) {
        debugLog('Input field focused', { widgetId: config.widgetId });
      }
    });
    
    input?.addEventListener('blur', () => {
      if (config.debug) {
        debugLog('Input field blurred', { widgetId: config.widgetId });
      }
    });
    
    if (config.debug) {
      debugPerformance('Event listeners setup', startTime);
      debugLog('All event listeners attached successfully', {
        widgetId: config.widgetId,
        eventsAttached: ['click', 'keypress', 'mouseenter', 'mouseleave', 'focus', 'blur']
      });
    }
  }
  
  function toggleChat(widgetId) {
    const instance = widgetInstances[widgetId];
    if (!instance) return;
    
    const chat = document.getElementById(instance.config.chatId);
    if (!chat) return;
    
    const wasOpen = instance.isOpen;
    instance.isOpen = !instance.isOpen;
    chat.style.display = instance.isOpen ? 'flex' : 'none';
    
    if (instance.isOpen) {
      // Focus input when opening
      const input = document.getElementById(instance.config.inputId);
      setTimeout(() => input?.focus(), 100);
      
      // Call onOpen callback if provided
      if (typeof instance.config.onOpen === 'function') {
        instance.config.onOpen();
      }
    } else {
      // Call onClose callback if provided
      if (typeof instance.config.onClose === 'function') {
        instance.config.onClose();
      }
    }
    
    if (instance.config.debug) {
      console.log(`🤖 UltaAI Widget - Chat ${instance.isOpen ? 'opened' : 'closed'}`, { widgetId });
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
    
    // Store message in instance
    instance.messages.push({ text: message, sender: 'user', timestamp: Date.now() });
    
    // Add user message to chat
    addMessageToChat(widgetId, message, 'user');
    input.value = '';
    
    // Call onMessage callback if provided
    if (typeof instance.config.onMessage === 'function') {
      instance.config.onMessage(message, 'user');
    }
    
    if (instance.config.debug) {
      console.log('🤖 UltaAI Widget - User message sent:', { message, widgetId });
      console.log('🤖 UltaAI Widget - User data:', {
        userId: instance.config.userId,
        userEmail: instance.config.userEmail,
        userName: instance.config.userName
      });
    }
    
    // Show typing indicator
    addTypingIndicator(widgetId);
    
    // Send to backend (simulate for now)
    setTimeout(() => {
      removeTypingIndicator(widgetId);
      const response = "Thanks for your message! Our team will get back to you soon.";
      instance.messages.push({ text: response, sender: 'assistant', timestamp: Date.now() });
      addMessageToChat(widgetId, response, 'assistant');
      
      // Call onMessage callback for assistant response
      if (typeof instance.config.onMessage === 'function') {
        instance.config.onMessage(response, 'assistant');
      }
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
    console.log('🤖 UltaAI Widget - Load function called with:', { siteKey: siteKey?.substring(0, 10) + '...', options });
    
    // Immediate debug test
    if (options.debug) {
      console.log('🤖 UltaAI Widget DEBUG MODE ENABLED - You should see detailed logs now');
    }
    
    if (isLoaded) {
      console.warn('🤖 UltaAI Widget is already loaded');
      return;
    }
    
    if (!siteKey) {
      console.error('🤖 UltaAI Widget: Site key is required');
      return;
    }
    
    console.log('🤖 UltaAI Widget - DOM ready state:', document.readyState);
    
    // Wait for DOM to be ready
    if (document.readyState === 'loading') {
      console.log('🤖 UltaAI Widget - DOM loading, waiting for DOMContentLoaded');
      document.addEventListener('DOMContentLoaded', () => {
        console.log('🤖 UltaAI Widget - DOMContentLoaded fired, initializing widget');
        initializeWidget(siteKey, options);
      });
    } else {
      console.log('🤖 UltaAI Widget - DOM ready, initializing widget immediately');
      initializeWidget(siteKey, options);
    }
  };
  
  function initializeWidget(siteKey, options) {
    try {
      // Fetch widget configuration
      fetchWidgetConfig(siteKey, options.debug)
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
  
  async function fetchWidgetConfig(siteKey, debugFromOptions = false) {
    const startTime = performance.now();
    const apiUrl = `${CONFIG.API_BASE_URL}${CONFIG.WIDGET_API_ENDPOINT}`;
    const requestData = {
      action: 'get_config',
      site_key: siteKey,
      domain: window.location.origin
    };
    
    // Enable debug mode if passed in options or in existing widget instances
    const debugMode = debugFromOptions || Object.values(widgetInstances).some(instance => instance.config?.debug);
    
    if (debugMode) {
      debugLog('Starting widget configuration fetch', {
        apiUrl,
        siteKey: siteKey?.substring(0, 10) + '...',
        domain: window.location.origin,
        requestData
      });
    }
    
    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestData)
      });
      
      if (debugMode) {
        debugLog('API response received', {
          status: response.status,
          statusText: response.statusText,
          ok: response.ok,
          headers: Object.fromEntries(response.headers.entries())
        });
      }
      
      if (response.ok) {
        const data = await response.json();
        
        if (debugMode) {
          debugLog('API response parsed successfully', {
            success: data.success,
            hasWidget: !!data.widget,
            widgetProperties: data.widget ? Object.keys(data.widget) : [],
            responseSize: JSON.stringify(data).length
          });
          
          if (data.widget) {
            analyzeTheme(data.widget.theme || {}, { debug: true });
          }
        }
        
        if (data.success) {
          if (debugMode) {
            debugPerformance('Widget config fetch', startTime);
          }
          return data.widget;
        } else {
          if (debugMode) {
            debugLog('API returned error response', {
              error: data.error,
              code: data.code,
              details: data.details || data
            }, 'error');
          }
          return null;
        }
      } else {
        const errorText = await response.text();
        if (debugMode) {
          debugLog('HTTP error response', {
            status: response.status,
            statusText: response.statusText,
            body: errorText
          }, 'error');
        }
      }
    } catch (error) {
      if (debugMode) {
        debugLog('Network/fetch error occurred', {
          name: error.name,
          message: error.message,
          stack: error.stack,
          apiUrl,
          duration: performance.now() - startTime
        }, 'error');
      }
    }
    
    return null;
  }
  
  // Enhanced auto-load functionality - supports all configuration options via data attributes
  function autoLoad() {
    const scripts = document.querySelectorAll('script[data-ultaai-site-key]');
    
    if (scripts.length === 0) {
      debugLog('No auto-load scripts found');
      return;
    }

    debugLog(`Found ${scripts.length} auto-load script(s)`);

    scripts.forEach((script, index) => {
      try {
        const siteKey = script.getAttribute('data-ultaai-site-key');
        if (!siteKey) {
          console.warn('UltaAI Widget: Script tag missing data-ultaai-site-key attribute');
          return;
        }

        debugLog(`Processing auto-load script ${index + 1}:`, script);

        // Extract all configuration options from data attributes
        const config = parseDataAttributes(script);
        
        // Validate configuration
        const validationResult = validateAutoLoadConfig(config, siteKey);
        if (!validationResult.isValid) {
          console.error('UltaAI Widget Auto-load Validation Error:', validationResult.errors);
          if (config.debug) {
            console.group('🔍 Auto-load Configuration Debug');
            console.log('Script element:', script);
            console.log('Parsed config:', config);
            console.log('Validation errors:', validationResult.errors);
            console.groupEnd();
          }
          return;
        }

        debugLog('Auto-loading widget with configuration:', {
          siteKey: siteKey.substring(0, 10) + '...',
          config,
          scriptElement: script
        });

        // Initialize widget with parsed configuration
        window.UltaAIWidget.load(siteKey, config);

      } catch (error) {
        console.error('UltaAI Widget Auto-load Error:', error);
        debugLog('Auto-load error details:', {
          error,
          script,
          index
        });
      }
    });
  }

  // Parse all data attributes from script tag into configuration object
  function parseDataAttributes(script) {
    const config = {};
    const attributes = script.attributes;

    debugLog('Parsing data attributes from script:', script);

    for (let i = 0; i < attributes.length; i++) {
      const attr = attributes[i];
      if (attr.name.startsWith('data-ultaai-')) {
        const configKey = attr.name.replace('data-ultaai-', '').replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
        
        if (configKey === 'siteKey') continue; // Already handled separately

        let value = attr.value;

        // Type conversion for known configuration options
        if (['debug', 'hideOnMobile', 'showBadge', 'autoOpen'].includes(configKey)) {
          value = value === 'true' || value === '1';
        } else if (['position', 'size', 'width', 'height'].includes(configKey)) {
          // Keep as string
        } else if (configKey === 'user') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.warn(`UltaAI Widget: Invalid JSON in data-ultaai-user: ${value}`);
            continue;
          }
        } else if (configKey === 'theme') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            console.warn(`UltaAI Widget: Invalid JSON in data-ultaai-theme: ${value}`);
            continue;
          }
        } else if (configKey === 'allowedDomains') {
          try {
            value = JSON.parse(value);
          } catch (e) {
            // Try comma-separated values
            value = value.split(',').map(d => d.trim()).filter(d => d);
          }
        } else if (configKey.startsWith('user')) {
          // Handle user properties like userId, userEmail, userName
          // Keep as string
        }

        config[configKey] = value;
        debugLog(`Parsed data attribute: ${attr.name} = ${configKey} =`, value);
      }
    }

    return config;
  }

  // Validate auto-load configuration
  function validateAutoLoadConfig(config, siteKey) {
    const errors = [];

    // Validate site key
    if (!siteKey || typeof siteKey !== 'string' || siteKey.length < 10) {
      errors.push('Invalid site key: must be a non-empty string with at least 10 characters');
    }

    // Validate position
    if (config.position && !['bottom-right', 'bottom-left', 'top-right', 'top-left', 'center'].includes(config.position)) {
      errors.push(`Invalid position: ${config.position}. Must be one of: bottom-right, bottom-left, top-right, top-left, center`);
    }

    // Validate size
    if (config.size && !['small', 'medium', 'large'].includes(config.size)) {
      errors.push(`Invalid size: ${config.size}. Must be one of: small, medium, large`);
    }

    // Validate dimensions
    if (config.width && !/^\d+px$/.test(config.width)) {
      errors.push(`Invalid width: ${config.width}. Must be in pixels (e.g., "350px")`);
    }

    if (config.height && !/^\d+px$/.test(config.height)) {
      errors.push(`Invalid height: ${config.height}. Must be in pixels (e.g., "500px")`);
    }

    // Validate user object
    if (config.user && typeof config.user !== 'object') {
      errors.push('Invalid user: must be a valid JSON object');
    }

    // Validate theme object
    if (config.theme && typeof config.theme !== 'object') {
      errors.push('Invalid theme: must be a valid JSON object');
    }

    // Validate allowedDomains
    if (config.allowedDomains && !Array.isArray(config.allowedDomains)) {
      errors.push('Invalid allowedDomains: must be an array or comma-separated string');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
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
  
  window.UltaAIWidget.open = function(widgetId) {
    if (widgetId && widgetInstances[widgetId]) {
      if (!widgetInstances[widgetId].isOpen) {
        toggleChat(widgetId);
      }
    } else {
      // Open first available instance
      const firstId = Object.keys(widgetInstances)[0];
      if (firstId && !widgetInstances[firstId].isOpen) {
        toggleChat(firstId);
      }
    }
  };
  
  window.UltaAIWidget.close = function(widgetId) {
    if (widgetId && widgetInstances[widgetId]) {
      if (widgetInstances[widgetId].isOpen) {
        closeChat(widgetId);
      }
    } else {
      // Close all instances
      Object.keys(widgetInstances).forEach(id => {
        if (widgetInstances[id].isOpen) {
          closeChat(id);
        }
      });
    }
  };
  
  window.UltaAIWidget.sendMessage = function(message, widgetId) {
    if (!message || typeof message !== 'string') {
      console.error('🤖 UltaAI Widget - sendMessage requires a string message');
      return;
    }
    
    if (widgetId && widgetInstances[widgetId]) {
      // Send to specific widget
      const input = document.getElementById(widgetInstances[widgetId].config.inputId);
      if (input) {
        input.value = message;
        sendMessage(widgetId);
      }
    } else {
      // Send to first available instance
      const firstId = Object.keys(widgetInstances)[0];
      if (firstId) {
        const input = document.getElementById(widgetInstances[firstId].config.inputId);
        if (input) {
          input.value = message;
          sendMessage(firstId);
        }
      }
    }
  };

  window.UltaAIWidget.show = function(widgetId) {
    Object.keys(widgetInstances).forEach(id => {
      if (!widgetId || id === widgetId) {
        const container = document.getElementById(widgetInstances[id].config.containerId);
        if (container) container.style.display = 'block';
      }
    });
  };

  window.UltaAIWidget.hide = function(widgetId) {
    Object.keys(widgetInstances).forEach(id => {
      if (!widgetId || id === widgetId) {
        const container = document.getElementById(widgetInstances[id].config.containerId);
        if (container) container.style.display = 'none';
      }
    });
  };
  
})();