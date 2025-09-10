/**
 * Facebook Pixel Manager com Prevenção de Duplicação
 * 
 * Este arquivo gerencia todos os eventos do Facebook Pixel e previne duplicações
 * usando flags no objeto window para rastrear eventos já enviados.
 */

declare global {
  interface Window {
    fbq: any;
    _fbq: any;
    // Flags para prevenção de duplicação de eventos
    __fbqEventsSent: {
      pageViews: Set<string>;
      initiateCheckouts: Set<string>;
      pixGerados: Set<string>;
      purchases: Set<string>;
      registrations: Set<string>;
    };
  }
}

class FacebookPixel {
  private initialized = false;

  /**
   * Inicializa o Facebook Pixel
   * Executado apenas uma vez, nunca reinicializado
   */
  init() {
    // Se já foi inicializado, não faz nada
    if (this.initialized) {
      return;
    }

    // Verifica se o fbq está disponível
    if (typeof window !== 'undefined' && window.fbq) {
      this.initialized = true;
      
      // Inicializa estrutura de controle de duplicação se não existir
      if (!window.__fbqEventsSent) {
        window.__fbqEventsSent = {
          pageViews: new Set(),
          initiateCheckouts: new Set(),
          pixGerados: new Set(),
          purchases: new Set(),
          registrations: new Set()
        };
      }
    } else {
      // Retry após um delay se o script ainda não carregou
      setTimeout(() => {
        if (typeof window !== 'undefined' && window.fbq && !this.initialized) {
          this.initialized = true;
          
          // Inicializa estrutura de controle se não existir
          if (!window.__fbqEventsSent) {
            window.__fbqEventsSent = {
              pageViews: new Set(),
              initiateCheckouts: new Set(),
              pixGerados: new Set(),
              purchases: new Set(),
              registrations: new Set()
            };
          }
        }
      }, 1000);
    }
  }

  /**
   * Gera um ID único para cada tipo de evento baseado em seus dados
   */
  private generateEventId(eventType: string, data?: any): string {
    const baseId = `${eventType}_${Date.now()}`;
    
    // Para eventos com dados específicos, cria IDs mais precisos
    if (data) {
      if (data.orderId) return `${eventType}_${data.orderId}`;
      if (data.transactionId) return `${eventType}_${data.transactionId}`;
      if (data.plan && data.value) return `${eventType}_${data.plan}_${data.value}`;
    }
    
    return baseId;
  }

  /**
   * Track PageView - com prevenção de duplicação por página
   */
  trackPageView(pagePath?: string) {
    if (!this.initialized || !window.fbq) return;

    // Usa o path atual ou o fornecido
    const path = pagePath || window.location.pathname;
    
    // Verifica se já enviamos PageView para esta página
    if (window.__fbqEventsSent?.pageViews.has(path)) {
      console.log(`[FB Pixel] PageView já enviado para: ${path}`);
      return;
    }

    // Envia o evento
    window.fbq('track', 'PageView');
    
    // Marca como enviado
    if (window.__fbqEventsSent) {
      window.__fbqEventsSent.pageViews.add(path);
    }

    console.log(`[FB Pixel] PageView enviado para: ${path}`);
  }

  /**
   * Limpa o flag de PageView quando muda de página
   * Permite reenviar PageView se o usuário voltar à mesma página
   */
  clearPageView(pagePath?: string) {
    const path = pagePath || window.location.pathname;
    if (window.__fbqEventsSent?.pageViews) {
      window.__fbqEventsSent.pageViews.delete(path);
    }
  }

  /**
   * Track ViewContent - sem deduplicação (pode ser enviado múltiplas vezes)
   */
  trackViewContent(content?: { 
    content_name?: string; 
    content_category?: string; 
    content_ids?: string[]; 
    content_type?: string; 
    value?: number; 
    currency?: string 
  }) {
    if (!this.initialized || !window.fbq) return;
    
    window.fbq('track', 'ViewContent', content || {});
    console.log('[FB Pixel] ViewContent enviado:', content?.content_name || 'genérico');
  }

  /**
   * Track CompleteRegistration - com prevenção de duplicação por usuário
   */
  trackCompleteRegistration(userData?: { 
    value?: number; 
    currency?: string; 
    content_name?: string;
    status?: string;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    plan?: string;
    userId?: string;
    utm_source?: string;
    utm_medium?: string;
    utm_campaign?: string;
    utm_term?: string;
    utm_content?: string;
    [key: string]: any;
  }) {
    if (!this.initialized) {
      this.init();
    }
    
    if (!this.initialized || !window.fbq) return;

    // Cria ID único para este registro
    const registrationId = userData?.userId || userData?.email || 'anonymous';
    
    // Verifica se já enviamos registro para este usuário
    if (window.__fbqEventsSent?.registrations.has(registrationId)) {
      console.log(`[FB Pixel] Registration já enviado para: ${registrationId}`);
      return;
    }

    // Prepara dados do evento
    const eventData: any = {
      value: userData?.value || 0,
      currency: userData?.currency || 'BRL',
      content_name: userData?.content_name || 'User Registration',
      status: userData?.status || 'completed',
      plan: userData?.plan || 'free'
    };
    
    // Adiciona dados UTM se disponíveis
    if (userData?.utm_source) eventData.utm_source = userData.utm_source;
    if (userData?.utm_medium) eventData.utm_medium = userData.utm_medium;
    if (userData?.utm_campaign) eventData.utm_campaign = userData.utm_campaign;
    if (userData?.utm_term) eventData.utm_term = userData.utm_term;
    if (userData?.utm_content) eventData.utm_content = userData.utm_content;
    
    // Envia o evento com ID único
    window.fbq('track', 'CompleteRegistration', eventData, {
      eventID: `reg_${registrationId}_${Date.now()}`
    });
    
    // Marca como enviado
    if (window.__fbqEventsSent) {
      window.__fbqEventsSent.registrations.add(registrationId);
    }

    console.log(`[FB Pixel] CompleteRegistration enviado para: ${registrationId}`);
  }

  /**
   * Track InitiateCheckout - com prevenção de duplicação por sessão de checkout
   */
  trackInitiateCheckout(checkoutData?: { 
    value?: number; 
    currency?: string; 
    content_name?: string; 
    content_category?: string; 
    content_ids?: string[]; 
    contents?: any[]; 
    content_type?: string; 
    num_items?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    cpf?: string;
    plan?: string;
    paymentMethod?: string;
  }) {
    if (!this.initialized || !window.fbq) return;

    // Cria ID único para este checkout baseado no plano e valor
    const checkoutId = `${checkoutData?.plan}_${checkoutData?.value}_${Date.now()}`;
    
    // Verifica se já enviamos este checkout recentemente (últimos 5 minutos)
    const recentCheckouts = Array.from(window.__fbqEventsSent?.initiateCheckouts || []);
    const fiveMinutesAgo = Date.now() - (5 * 60 * 1000);
    
    const isDuplicate = recentCheckouts.some(id => {
      const parts = id.split('_');
      const timestamp = parseInt(parts[parts.length - 1]);
      const plan = parts[0];
      const value = parts[1];
      
      return plan === checkoutData?.plan && 
             value === String(checkoutData?.value) && 
             timestamp > fiveMinutesAgo;
    });

    if (isDuplicate) {
      console.log(`[FB Pixel] InitiateCheckout já enviado recentemente para: ${checkoutData?.plan}`);
      return;
    }

    // Prepara dados do evento
    const eventData: any = {
      value: checkoutData?.value || 0,
      currency: checkoutData?.currency || 'BRL',
      content_name: checkoutData?.content_name || 'Plan Upgrade',
      content_category: checkoutData?.content_category || 'subscription',
      content_type: checkoutData?.content_type || 'product',
      num_items: checkoutData?.num_items || 1,
      plan: checkoutData?.plan || '',
      payment_method: checkoutData?.paymentMethod || 'pix'
    };

    if (checkoutData?.content_ids) {
      eventData.content_ids = checkoutData.content_ids;
    }

    // Envia o evento
    window.fbq('track', 'InitiateCheckout', eventData, {
      eventID: checkoutId
    });

    // Marca como enviado
    if (window.__fbqEventsSent) {
      window.__fbqEventsSent.initiateCheckouts.add(checkoutId);
      
      // Limpa checkouts antigos (mais de 5 minutos)
      const toRemove = recentCheckouts.filter(id => {
        const parts = id.split('_');
        const timestamp = parseInt(parts[parts.length - 1]);
        return timestamp <= fiveMinutesAgo;
      });
      
      toRemove.forEach(id => window.__fbqEventsSent.initiateCheckouts.delete(id));
    }

    console.log(`[FB Pixel] InitiateCheckout enviado: ${checkoutData?.plan}`);
  }

  /**
   * Track Purchase - com prevenção de duplicação por transação
   */
  trackPurchase(purchaseData: { 
    value: number; 
    currency?: string; 
    content_name?: string; 
    content_category?: string; 
    content_ids?: string[]; 
    contents?: any[]; 
    content_type?: string; 
    num_items?: number;
    email?: string;
    firstName?: string;
    lastName?: string;
    phone?: string;
    transactionId?: string;
    plan?: string;
    paymentMethod?: string;
  }) {
    if (!this.initialized || !window.fbq) return;

    // Usa transaction ID se disponível, senão cria um baseado nos dados
    const purchaseId = purchaseData.transactionId || 
                       `${purchaseData.plan}_${purchaseData.value}_${Date.now()}`;
    
    // Verifica se já enviamos esta compra
    if (window.__fbqEventsSent?.purchases.has(purchaseId)) {
      console.log(`[FB Pixel] Purchase já enviado para transação: ${purchaseId}`);
      return;
    }

    // Prepara dados do evento
    const eventData: any = {
      value: purchaseData.value,
      currency: purchaseData.currency || 'BRL',
      content_name: purchaseData.content_name || 'Plan Purchase',
      content_category: purchaseData.content_category || 'subscription',
      content_type: purchaseData.content_type || 'product',
      num_items: purchaseData.num_items || 1,
      plan: purchaseData.plan || '',
      payment_method: purchaseData.paymentMethod || 'pix',
      transaction_id: purchaseData.transactionId || ''
    };

    if (purchaseData.content_ids) {
      eventData.content_ids = purchaseData.content_ids;
    }

    // Envia o evento
    window.fbq('track', 'Purchase', eventData, {
      eventID: `purchase_${purchaseId}`
    });

    // Marca como enviado
    if (window.__fbqEventsSent) {
      window.__fbqEventsSent.purchases.add(purchaseId);
    }

    console.log(`[FB Pixel] Purchase enviado para transação: ${purchaseId}`);
  }

  /**
   * Track AddToCart - sem deduplicação (pode ser enviado múltiplas vezes)
   */
  trackAddToCart(cartData?: { 
    value?: number; 
    currency?: string; 
    content_name?: string; 
    content_ids?: string[]; 
    content_type?: string;
    plan?: string;
  }) {
    if (!this.initialized || !window.fbq) return;

    window.fbq('track', 'AddToCart', {
      value: cartData?.value || 0,
      currency: cartData?.currency || 'BRL',
      content_name: cartData?.content_name || 'Plan Selection',
      content_type: cartData?.content_type || 'product',
      plan: cartData?.plan || '',
      ...cartData
    });

    console.log(`[FB Pixel] AddToCart enviado: ${cartData?.content_name}`);
  }

  /**
   * Track AddPaymentInfo - sem deduplicação (informativo)
   */
  trackAddPaymentInfo(paymentData?: {
    value?: number;
    currency?: string;
    content_name?: string;
    content_category?: string;
    content_ids?: string[];
    content_type?: string;
    success?: boolean;
  }) {
    if (!this.initialized || !window.fbq) return;

    window.fbq('track', 'AddPaymentInfo', {
      value: paymentData?.value || 0,
      currency: paymentData?.currency || 'BRL',
      content_name: paymentData?.content_name || 'Payment Info',
      content_category: paymentData?.content_category || 'subscription',
      content_type: paymentData?.content_type || 'product',
      success: paymentData?.success !== false,
      ...paymentData
    });

    console.log(`[FB Pixel] AddPaymentInfo enviado: ${paymentData?.content_name}`);
  }
  
  /**
   * Track Lead - sem deduplicação (pode ser enviado múltiplas vezes)
   */
  trackLead(leadData?: { 
    value?: number; 
    currency?: string; 
    content_name?: string; 
    content_category?: string;
    email?: string;
  }) {
    if (!this.initialized || !window.fbq) return;

    window.fbq('track', 'Lead', leadData || {});
    console.log(`[FB Pixel] Lead enviado: ${leadData?.content_name || 'genérico'}`);
  }

  /**
   * Track Custom Event - com prevenção de duplicação para PixGerado
   */
  trackCustom(eventName: string, parameters?: any) {
    if (!this.initialized || !window.fbq) return;

    // Tratamento especial para PixGerado
    if (eventName === 'PixGerado') {
      const pixId = parameters?.orderId || parameters?.pixCode || `${parameters?.plan}_${Date.now()}`;
      
      // Verifica se já enviamos este PIX
      if (window.__fbqEventsSent?.pixGerados.has(pixId)) {
        console.log(`[FB Pixel] PixGerado já enviado para: ${pixId}`);
        return;
      }

      // Envia o evento
      window.fbq('trackCustom', eventName, parameters || {});
      
      // Marca como enviado
      if (window.__fbqEventsSent) {
        window.__fbqEventsSent.pixGerados.add(pixId);
      }
      
      console.log(`[FB Pixel] PixGerado enviado: ${pixId}`);
    } else {
      // Outros eventos customizados sem deduplicação
      window.fbq('trackCustom', eventName, parameters || {});
      console.log(`[FB Pixel] Custom event enviado: ${eventName}`);
    }
  }

  /**
   * Limpa todos os flags de eventos (útil para testes ou reset)
   */
  resetEventFlags() {
    if (window.__fbqEventsSent) {
      window.__fbqEventsSent = {
        pageViews: new Set(),
        initiateCheckouts: new Set(),
        pixGerados: new Set(),
        purchases: new Set(),
        registrations: new Set()
      };
    }
    console.log('[FB Pixel] Flags de eventos resetados');
  }
}

// Exporta instância única do Facebook Pixel
export const fbPixel = new FacebookPixel();