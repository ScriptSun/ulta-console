(function() {
  'use strict';
  
  // Create the UltaAIWidget global object
  window.UltaAIWidget = window.UltaAIWidget || {};
  
  console.log('🚀 UltaAI Enhanced Widget SDK v2.0 loaded successfully');
  
  // Configuration
  const CONFIG = {
    API_BASE_URL: 'https://lfsdqyvvboapsyeauchm.supabase.co',
    WIDGET_API_ENDPOINT: '/functions/v1/widget-api',
    ENHANCED_FRAME_URL: '/widget/enhanced-frame.html'
  };
  
  // Widget state management
  let widgetInstances = {};
  let isLoaded = false;
  let realtimeConnection = null;
  
  // Debug utilities
  function debugLog(message, data = null, level = 'info') {
    const timestamp = new Date().toISOString();
    const prefix = '🤖 UltaAI Enhanced Widget';
    
    if (level === 'error') {
      console.error(`${prefix} [${timestamp}] ${message}`, data || '');
    } else if (level === 'warn') {
      console.warn(`${prefix} [${timestamp}] ${message}`, data || '');
    } else {
      console.log(`${prefix} [${timestamp}] ${message}`, data || '');
    }
  }
  
  // Generate unique IDs
  function generateId() {
    return 'ultaai-enhanced-widget-' + Math.random().toString(36).substr(2, 9);
  }
  
  // Create enhanced widget HTML with iframe
  function createEnhancedWidgetHTML(config) {
    const startTime = performance.now();
    
    debugLog('Creating enhanced widget HTML', { widgetId: config.widgetId });
    
    // Calculate positioning
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
        positionStyles = 'top: 20px; left: 20px;';
        break;
      case 'top-right':
        positionStyles = 'top: 20px; right: 20px;';
        break;
      case 'bottom-left':
        positionStyles = 'bottom: 20px; left: 20px;';
        break;
      case 'bottom-right':
      default:
        positionStyles = 'bottom: 20px; right: 20px;';
        break;
    }

    const chatWidth = config.width || '400px';
    const chatHeight = config.height || '600px';
    
    // Build iframe URL with all parameters
    const iframeParams = new URLSearchParams({
      site_key: config.siteKey,
      origin: window.location.origin,
      opts: JSON.stringify({
        theme: config.theme,
        position: config.position,
        width: chatWidth,
        height: chatHeight,
        autoOpen: config.autoOpen,
        debug: config.debug
      })
    });
    
    // Add user identity if provided
    if (config.userId) {
      iframeParams.append('user_id', config.userId);
      iframeParams.append('timestamp', Date.now().toString());
      // In production, you'd generate a proper signature
      iframeParams.append('signature', 'demo-signature');
    }
    
    const iframeUrl = `${CONFIG.ENHANCED_FRAME_URL}?${iframeParams.toString()}`;
    
    const html = `
      <div id="${config.containerId}" class="ultaai-enhanced-widget-container" style="
        position: fixed;
        ${positionStyles}
        z-index: 2147483647;
        font-family: system-ui, -apple-system, sans-serif;
      ">
        <!-- Widget Launcher Button -->
        <button id="${config.launcherId}" class="ultaai-enhanced-launcher" style="
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
          position: relative;
          ${config.position === 'center' ? 'display: none;' : ''}
          ${!config.showBadge ? 'display: none;' : ''}
        ">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="color: white;">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h4v3c0 .6.4 1 1 1h.5c.2 0 .5-.1.7-.3L14.5 18H20c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z" fill="currentColor"/>
          </svg>
          <!-- Unread badge -->
          <div id="${config.unreadBadgeId}" class="unread-badge" style="
            position: absolute;
            top: -5px;
            right: -5px;
            background: #ff4757;
            color: white;
            border-radius: 50%;
            width: 20px;
            height: 20px;
            display: none;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
          "></div>
        </button>
        
        <!-- Enhanced Chat Interface (iframe) -->
        <iframe 
          id="${config.iframeId}"
          src="${iframeUrl}"
          style="
            position: ${config.position === 'center' ? 'fixed' : 'absolute'};
            ${config.position === 'center' ? `${positionStyles}` : `
              bottom: 80px;
              right: 0;
            `}
            width: ${chatWidth};
            height: ${chatHeight};
            border: none;
            border-radius: 12px;
            box-shadow: 0 8px 32px rgba(0,0,0,0.15);
            display: ${config.autoOpen ? 'block' : 'none'};
            background: white;
          "
          allow="microphone; camera; geolocation"
          loading="eager"
        ></iframe>
        
        <!-- Update notification -->
        <div id="${config.notificationId}" class="update-notification" style="
          position: absolute;
          top: -50px;
          right: 0;
          background: #4caf50;
          color: white;
          padding: 8px 12px;
          border-radius: 6px;
          font-size: 12px;
          display: none;
          animation: slideDown 0.3s ease;
        "></div>
      </div>
    `;
    
    debugLog('Enhanced HTML structure created', {
      iframeUrl,
      totalHTMLLength: html.length,
      autoOpenState: config.autoOpen
    });
    
    return html;
  }
  
  // Enhanced widget creation with real-time capabilities
  function createEnhancedWidget(siteKey, options = {}) {
    const startTime = performance.now();
    
    debugLog('Creating enhanced widget', { siteKey: siteKey?.substring(0, 10) + '...', options });
    
    const widgetId = generateId();
    
    const config = {
      widgetId,
      siteKey,
      containerId: widgetId + '-container',
      launcherId: widgetId + '-launcher',
      iframeId: widgetId + '-iframe',
      unreadBadgeId: widgetId + '-unread-badge',
      notificationId: widgetId + '-notification',
      theme: options.theme || {},
      position: options.position || 'bottom-right',
      width: options.width || '400px',
      height: options.height || '600px',
      autoOpen: !!options.autoOpen,
      hideOnMobile: !!options.hideOnMobile,
      showBadge: options.showBadge !== false,
      debug: !!options.debug,
      userId: options.userId,
      userEmail: options.userEmail,
      userName: options.userName,
      onReady: options.onReady,
      onOpen: options.onOpen,
      onClose: options.onClose,
      onMessage: options.onMessage,
      onUpdate: options.onUpdate
    };
    
    // Check mobile hide condition
    if (config.hideOnMobile && window.innerWidth <= 768) {
      debugLog('Widget hidden on mobile device');
      return widgetId;
    }
    
    try {
      // Create and inject widget HTML
      const widgetContainer = document.createElement('div');
      widgetContainer.innerHTML = createEnhancedWidgetHTML(config);
      const widgetElement = widgetContainer.firstElementChild;
      
      if (!widgetElement) {
        throw new Error('Failed to create enhanced widget HTML element');
      }
      
      document.body.appendChild(widgetElement);
      
      // Set up enhanced event handlers
      setupEnhancedWidgetEvents(config);
      
      // Set up real-time updates
      setupRealtimeUpdates(config);
      
      // Store instance with enhanced features
      widgetInstances[widgetId] = {
        config,
        isOpen: config.autoOpen || false,
        messages: [],
        unreadCount: 0,
        createdAt: Date.now(),
        interactions: 0,
        lastUpdate: Date.now(),
        version: '2.0'
      };
      
      // Call onReady callback
      if (typeof config.onReady === 'function') {
        setTimeout(() => {
          debugLog('Executing onReady callback');
          config.onReady();
        }, 100);
      }
      
      debugLog('Enhanced widget creation completed', {
        widgetId,
        totalCreationTime: performance.now() - startTime
      });
      
      return widgetId;
      
    } catch (error) {
      console.error('🤖 Enhanced Widget CRITICAL ERROR:', {
        error: error.message,
        stack: error.stack,
        widgetId,
        siteKey: siteKey?.substring(0, 10) + '...'
      });
      throw error;
    }
  }
  
  // Enhanced event handling with iframe communication
  function setupEnhancedWidgetEvents(config) {
    const launcher = document.getElementById(config.launcherId);
    const iframe = document.getElementById(config.iframeId);
    const unreadBadge = document.getElementById(config.unreadBadgeId);
    
    if (!launcher || !iframe) {
      debugLog('Enhanced widget elements not found', { 
        launcher: !!launcher, 
        iframe: !!iframe 
      }, 'error');
      return;
    }
    
    // Launcher click handler
    launcher.addEventListener('click', () => {
      const instance = widgetInstances[config.widgetId];
      if (!instance) return;
      
      const isCurrentlyOpen = iframe.style.display !== 'none';
      const newState = !isCurrentlyOpen;
      
      iframe.style.display = newState ? 'block' : 'none';
      instance.isOpen = newState;
      
      if (newState) {
        instance.unreadCount = 0;
        unreadBadge.style.display = 'none';
        
        // Focus iframe when opened
        iframe.focus();
      }
      
      // Call callback
      const callback = newState ? config.onOpen : config.onClose;
      if (typeof callback === 'function') {
        callback();
      }
      
      debugLog(`Enhanced widget ${newState ? 'opened' : 'closed'}`);
    });
    
    // Listen to iframe messages
    window.addEventListener('message', (event) => {
      // Verify origin for security
      if (event.origin !== window.location.origin) {
        return;
      }
      
      const data = event.data;
      if (data.type === 'ultaai-widget-message') {
        handleIframeMessage(config, data);
      }
    });
    
    // Iframe load handler
    iframe.addEventListener('load', () => {
      debugLog('Enhanced widget iframe loaded successfully');
      
      // Send configuration to iframe
      iframe.contentWindow.postMessage({
        type: 'ultaai-widget-config',
        config: config
      }, window.location.origin);
    });
  }
  
  // Handle messages from iframe
  function handleIframeMessage(config, data) {
    const instance = widgetInstances[config.widgetId];
    if (!instance) return;
    
    switch (data.action) {
      case 'new-message':
        instance.messages.push(data.message);
        if (!instance.isOpen && data.message.role === 'assistant') {
          instance.unreadCount++;
          updateUnreadBadge(config, instance.unreadCount);
        }
        
        if (typeof config.onMessage === 'function') {
          config.onMessage(data.message);
        }
        break;
        
      case 'widget-ready':
        debugLog('Enhanced widget iframe ready');
        break;
        
      case 'widget-error':
        debugLog('Enhanced widget iframe error', data.error, 'error');
        break;
        
      case 'config-updated':
        debugLog('Widget configuration updated in real-time');
        instance.lastUpdate = Date.now();
        
        if (typeof config.onUpdate === 'function') {
          config.onUpdate(data.newConfig);
        }
        
        showUpdateNotification(config, 'Widget updated');
        break;
    }
  }
  
  // Update unread badge
  function updateUnreadBadge(config, count) {
    const badge = document.getElementById(config.unreadBadgeId);
    if (badge) {
      if (count > 0) {
        badge.textContent = count > 9 ? '9+' : count.toString();
        badge.style.display = 'flex';
      } else {
        badge.style.display = 'none';
      }
    }
  }
  
  // Show update notification
  function showUpdateNotification(config, message) {
    const notification = document.getElementById(config.notificationId);
    if (notification) {
      notification.textContent = message;
      notification.style.display = 'block';
      
      setTimeout(() => {
        notification.style.display = 'none';
      }, 3000);
    }
  }
  
  // Set up real-time updates using WebSocket or polling
  function setupRealtimeUpdates(config) {
    // This would connect to your Supabase realtime for widget config updates
    debugLog('Setting up real-time updates for widget', { widgetId: config.widgetId });
    
    // Placeholder for real-time connection
    // In production, this would use Supabase realtime subscriptions
    const checkForUpdates = setInterval(() => {
      // Check for widget updates every 30 seconds
      checkWidgetUpdates(config);
    }, 30000);
    
    // Store cleanup function
    widgetInstances[config.widgetId].cleanup = () => {
      clearInterval(checkForUpdates);
    };
  }
  
  // Check for widget configuration updates
  async function checkWidgetUpdates(config) {
    try {
      const response = await fetch(`${CONFIG.API_BASE_URL}${CONFIG.WIDGET_API_ENDPOINT}/config/${config.siteKey}`, {
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      if (response.ok) {
        const latestConfig = await response.json();
        const instance = widgetInstances[config.widgetId];
        
        if (instance && latestConfig.updated_at > instance.lastUpdate) {
          debugLog('New widget configuration detected', { 
            lastUpdate: instance.lastUpdate,
            newUpdate: latestConfig.updated_at 
          });
          
          // Send update to iframe
          const iframe = document.getElementById(config.iframeId);
          if (iframe && iframe.contentWindow) {
            iframe.contentWindow.postMessage({
              type: 'ultaai-config-update',
              config: latestConfig
            }, window.location.origin);
          }
          
          instance.lastUpdate = latestConfig.updated_at;
        }
      }
    } catch (error) {
      debugLog('Failed to check for updates', error, 'warn');
    }
  }
  
  // Auto-load functionality with data attributes
  function autoLoad() {
    const scripts = document.querySelectorAll('script[data-ultaai-site-key]');
    
    scripts.forEach(script => {
      const siteKey = script.getAttribute('data-ultaai-site-key');
      if (!siteKey) return;
      
      const options = {
        debug: script.getAttribute('data-ultaai-debug') === 'true',
        position: script.getAttribute('data-ultaai-position') || 'bottom-right',
        width: script.getAttribute('data-ultaai-width') || '400px',
        height: script.getAttribute('data-ultaai-height') || '600px',
        autoOpen: script.getAttribute('data-ultaai-auto-open') === 'true',
        hideOnMobile: script.getAttribute('data-ultaai-hide-on-mobile') === 'true',
        showBadge: script.getAttribute('data-ultaai-show-badge') !== 'false',
        userId: script.getAttribute('data-ultaai-user-id'),
        userEmail: script.getAttribute('data-ultaai-user-email'),
        userName: script.getAttribute('data-ultaai-user-name')
      };
      
      // Parse theme JSON if provided
      const themeStr = script.getAttribute('data-ultaai-theme');
      if (themeStr) {
        try {
          options.theme = JSON.parse(themeStr);
        } catch (error) {
          debugLog('Failed to parse theme JSON', error, 'warn');
        }
      }
      
      debugLog('Auto-loading enhanced widget', { siteKey: siteKey.substring(0, 10) + '...', options });
      
      // Load the enhanced widget
      setTimeout(() => {
        UltaAIWidget.load(siteKey, options);
      }, 100);
    });
  }
  
  // Public API
  UltaAIWidget.load = function(siteKey, options = {}) {
    if (!siteKey) {
      throw new Error('Site key is required');
    }
    
    debugLog('Loading enhanced widget', { siteKey: siteKey.substring(0, 10) + '...', options });
    
    return createEnhancedWidget(siteKey, options);
  };
  
  UltaAIWidget.unload = function(widgetId) {
    if (widgetId && widgetInstances[widgetId]) {
      const instance = widgetInstances[widgetId];
      const element = document.getElementById(instance.config.containerId);
      
      if (element) {
        element.remove();
      }
      
      // Cleanup
      if (instance.cleanup) {
        instance.cleanup();
      }
      
      delete widgetInstances[widgetId];
      debugLog('Enhanced widget unloaded', { widgetId });
    } else {
      // Unload all widgets
      Object.keys(widgetInstances).forEach(id => {
        UltaAIWidget.unload(id);
      });
      debugLog('All enhanced widgets unloaded');
    }
  };
  
  UltaAIWidget.isLoaded = function() {
    return Object.keys(widgetInstances).length > 0;
  };
  
  UltaAIWidget.getInstance = function(widgetId) {
    return widgetInstances[widgetId];
  };
  
  UltaAIWidget.getAllInstances = function() {
    return widgetInstances;
  };
  
  UltaAIWidget.version = '2.0.0';
  
  // Auto-load when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoLoad);
  } else {
    autoLoad();
  }
  
  debugLog('Enhanced Widget SDK v2.0 initialization completed');
  
})();