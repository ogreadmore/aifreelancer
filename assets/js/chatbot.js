// AI Freelancer shared chat widget loader
if (window.AF_CHAT_WIDGET_LOADED) {
  console.warn('AF chat widget already loaded');
} else {
  window.AF_CHAT_WIDGET_LOADED = true;
  console.log('AFCHAT: assets/js/chatbot.js loaded and executing');

  // Ensure CSS is present
  if (!document.querySelector('link[data-afchat-css]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    // Use relative path so the asset loads correctly on GitHub Pages
    l.href = 'assets/css/chatbot.css?v=20260215c';
    l.setAttribute('data-afchat-css', '');
    document.head.appendChild(l);
  }

  // Inject HTML container + modals
  const html = `
    <!-- AI Chatbot (injected) -->
    <div class="chatbot-container">
        <button id="chatbot-launcher" type="button" class="chatbot-launcher gemini-gradient-bg pulse" aria-label="Open AI chat assistant">
            <svg class="chatbot-launcher-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <path d="M4 5.75A1.75 1.75 0 0 1 5.75 4h12.5A1.75 1.75 0 0 1 20 5.75v8.5A1.75 1.75 0 0 1 18.25 16H9.7l-4.95 3.45A.5.5 0 0 1 4 19.04V16.2A1.75 1.75 0 0 1 2.25 14.5V5.75A1.75 1.75 0 0 1 4 4Z" fill="currentColor"/>
            </svg>
        </button>
        
        <div id="chatbot-window" class="chatbot-window hidden" aria-hidden="true" style="display:none; opacity:0; transform:scale(.95);">
            <div class="chatbot-header gemini-gradient-bg">
                <h3 class="chatbot-title">AI Assistant</h3>
                <div class="chatbot-header-actions">
                    <button id="clear-chatbot" class="chatbot-clear-btn" aria-label="Clear chat history">Clear</button>
                    <button id="close-chatbot" class="chatbot-close-btn" aria-label="Close chat">&times;</button>
                </div>
            </div>
            
            <div id="chatbot-messages" aria-live="polite">
                <div class="af-message-wrapper justify-start">
                    <div class="chat-bubble chat-bubble-bot">
                        <p>Welcome. I am here to help with calm, practical guidance for business optimization and AI.</p>
                        <p class="chat-intro-label">You can ask me about:</p>
                        <ul>
                            <li>What we can optimize</li>
                            <li>How to start your project</li>
                            <li>Pricing and nonprofit support</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="chatbot-input-wrap">
                <form id="chatbot-form">
                    <input type="text" id="chatbot-input" placeholder="Ask me anything..." aria-label="Type your message">
                    <button type="submit" class="chatbot-send gemini-gradient-bg" aria-label="Send message">
                        <svg class="chatbot-send-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                            <path d="M3.4 11.2 20 3.8a.7.7 0 0 1 .96.78L18.2 19.9a.7.7 0 0 1-1.18.35l-4.2-4.2-3.9 2.1a.7.7 0 0 1-1.02-.67l.3-4.9-4-1.6a.7.7 0 0 1-.8-.67.7.7 0 0 1 .4-.12Z" fill="currentColor"/>
                        </svg>
                    </button>
                </form>
            </div>
        </div>
    </div>

<div id="thank-you-modal" class="hidden chatbot-modal">
    <div class="chatbot-modal-card" id="modal-content">
        <div class="chatbot-check-wrap gemini-gradient-bg">
            <span class="chatbot-check" aria-hidden="true">&#10003;</span>
        </div>
        <h2 class="chatbot-modal-title">Thank You!</h2>
        <p class="chatbot-modal-copy">Your message has been sent successfully. We'll be in touch shortly.</p>
        <button id="close-modal-button" class="chatbot-modal-close">
            Close
        </button>
    </div>
</div>
<div id="scheduler-modal" class="hidden chatbot-modal">
    <div class="chatbot-scheduler-card" id="scheduler-modal-content">
        <div class="chatbot-scheduler-head">
            <h3>Schedule a Consultation</h3>
            <button id="close-scheduler-modal" class="chatbot-scheduler-close" aria-label="Close scheduler">&times;</button>
        </div>
        <div id="scheduler-iframe-container"></div>
    </div>
</div>
`;
  try {
    if (!document.body) console.warn('AFCHAT: document.body is not present');
    document.body.insertAdjacentHTML('beforeend', html);
    console.log('AFCHAT: injected chatbot HTML into document.body');
  } catch (err) {
    console.error('AFCHAT: failed to inject chatbot HTML', err);
  }

  // Developer debug helper: if URL includes ?afdebug=1 show a test button
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get('afdebug') === '1') {
      const dbg = document.createElement('button');
      dbg.textContent = 'AF Test Submit';
      dbg.style.position = 'fixed';
      dbg.style.right = '2rem';
      dbg.style.bottom = '8rem';
      dbg.style.zIndex = '10001';
      dbg.style.padding = '10px 14px';
      dbg.style.borderRadius = '8px';
      dbg.style.background = 'rgba(59,130,246,0.95)';
      dbg.style.color = '#fff';
      dbg.style.border = 'none';
      dbg.style.cursor = 'pointer';
      dbg.title = 'Trigger a test Formspree submission';
      dbg.addEventListener('click', async () => {
        console.log('AFCHAT: debug button clicked — performing test submit');
        AFChatState.leadData = {
          name: 'Debug Tester',
          email: 'debug@example.com',
          phone: '(000) 000-0000',
          company: 'Debug Co',
          message: 'This is a test submission triggered from the debug button.\n\nPlease ignore.'
        };
        try {
          await afSubmitLeadToFormspree();
        } catch (e) { console.error('AFCHAT: debug submit error', e); }
      });
      document.body.appendChild(dbg);
      console.log('AFCHAT: debug button appended (use ?afdebug=1 in URL to enable)');
    }
  } catch (e) { /* debug helper init suppressed in production */ }

  // --- Begin original chat widget script (extracted) ---
/* ---------- CONFIG ---------- */
// Prefer the remote hosted endpoint first to avoid hitting a disabled local /api/chat
const AF_CHAT_ENDPOINTS = [
  'https://aifreelancerchatbotvercelthing.vercel.app/api/chat',
  '/api/chat'
];

// if you ever stand up a second backend you can push another item into the array
//   e.g. AF_CHAT_ENDPOINTS.push('https://backup.my‑domain.com/api/chat');

const AF_CHAT_CONFIG_ENDPOINT = '/api/chat-config'; 

const AF_CHAT_DEFAULT_CONFIG = {
  brand: 'AI Freelancer',
  greeting: "Welcome. I am the AI assistant for AI Freelancer. How can I support you today?",
  suggestions: [
    "What can you optimize?",
    "Tell me about AI Freelancer",
    "I run a nonprofit",
    "Schedule a consultation",
    "Ask the team"
  ]
};

const AF_CONTACT_LINE = "If you prefer direct contact, call (440) 941-1785 or email hello@aifreelancer.co.";

const AF_ASSISTANT_INSTRUCTIONS = [
  "Voice and tone: calm, kind, compassionate, and professional, with clear international business English.",
  "Business model: AI Freelancer accepts broad business optimization and AI engagements across functions.",
  "Pricing policy: do not volunteer pricing unless asked directly. If asked, state $250 USD/hour, negotiable. Nonprofits may be free (pro bono) depending on fit and capacity.",
  "Conversion goal: guide visitors toward direct contact (email, phone, or scheduling) in a helpful, non-pushy way.",
  "Company facts: founded end of 2023, based in Cleveland, Ohio, global associates with developers primarily in Asia.",
  "Founder facts: Taylor Oliphant (O-L-I-P-H-A-N-T), graduated high school at 15, web development background in Silicon Valley, MBA from Purdue University (4.0), AI certifications from University of Pennsylvania and Lund University, plus credentials from Intel, Google, and Harvard University.",
  "Founder philosophy: pro-science and pro-human outcomes, helpful with AI, but skeptical about concentration of power and rushed deployment by very large AI companies."
].join("\n");

/* ---------- COMMON RESPONSES ---------- */
const COMMON_RESPONSES = {
  capabilities: {
    keywords: [
      'what can you do', 'what do you do', 'what do you optimize', 'what can you optimize',
      'services', 'service', 'offer', 'help with', 'can you help', 'can you do',
      'business optimization', 'ai work', 'automation', 'optimize',
      'google ads', 'facebook ads', 'meta ads', 'shopify', 'magento', 'woocommerce',
      'wordpress', 'ecommerce', 'tax prep', 'accounting', 'hr', 'team training'
    ],
    response:
`In short: if it improves a business, we will usually take it on.

We support Google Ads and Facebook Ads optimization, ecommerce builds and upgrades (Shopify, Magento, WooCommerce, WordPress), business process optimization, team training, HR optimization, AI workflow design, and custom AI implementation. We are also expanding accounting and tax preparation support.

If your project sits anywhere in business optimization or AI, we would be glad to discuss it. ${AF_CONTACT_LINE}`
  },

  pricing: {
    keywords: [
      'price', 'pricing', 'cost', 'fee', 'charge', 'how much', 'rate', 'rates', 'hourly', 'budget'
    ],
    response:
`Our standard rate is **$250 USD per hour**.
It is negotiable based on scope, and we often provide **free work for nonprofits** when the project aligns and capacity allows.

If you share your goal and timeline, I can help you choose a practical next step. ${AF_CONTACT_LINE}`
  },

  nonprofit: {
    keywords: [
      'nonprofit', 'non-profit', 'charity', 'ngo', 'foundation', 'mission-driven'
    ],
    response:
`We care deeply about nonprofit work.

For nonprofits, we often offer pro bono or reduced-fee support depending on scope and current capacity. If you share your mission and what you need, we can discuss the best path with care. ${AF_CONTACT_LINE}`
  },

  company: {
    keywords: [
      'about', 'company', 'who are you', 'who is ai freelancer', 'background', 'history'
    ],
    response:
`AI Freelancer was founded at the end of **2023** and is now in its third year.
We are based in **Cleveland, Ohio**, mobile in how we work, and supported by associates around the world. Our developers are primarily in Asia.

We focus mostly on small and medium-sized businesses, and we also love helping sole proprietors, nonprofits, and larger organizations when there is a good fit.`
  },

  founder: {
    keywords: [
      'taylor', 'oliphant', 'founder', 'owner', 'who runs', 'leadership', 'ceo'
    ],
    response:
`The founder is **Taylor Oliphant** (O-L-I-P-H-A-N-T).

Taylor graduated high school at 15, began web development work in Silicon Valley with notable pioneers, has traveled widely, and completed an MBA at Purdue University with a 4.0.
He also holds AI certifications from the University of Pennsylvania and Lund University, plus certifications from Intel, Google, and Harvard University.

He loves science and helping people with AI, while staying thoughtful and skeptical about concentrated power and rushed deployment by very large AI companies.`
  },

  process: {
    keywords: [
      'how it works', 'process', 'implementation', 'timeline', 'onboard', 'rollout', 'steps', 'start'
    ],
    response:
`We keep the process simple:
- Understand your goals, constraints, and desired outcomes.
- Prioritize the highest-impact optimization first.
- Execute quickly, measure results, and refine.

If you want, we can start with a short consultation and map your best first move. ${AF_CONTACT_LINE}`
  },

  contact: {
    keywords: [
      'contact', 'call', 'phone', 'email', 'reach you', 'talk to team', 'speak with someone'
    ],
    response:
`Of course. You can reach us directly at:
- **Phone:** (440) 941-1785
- **Email:** hello@aifreelancer.co

If you prefer, I can also collect your details here and pass them to the team.`
  }
};

/* ---------- STATE ---------- */
const AFChatState = {
  initialized: false,
  sending: false,
  history: [],
  config: { ...AF_CHAT_DEFAULT_CONFIG },
  messageCount: 0,
  sessionStart: Date.now(),
  collectingInfo: false,
  leadData: {
    name: '',
    email: '',
    phone: '',
    company: '',
    message: ''
  },
  currentField: null,
  conversationSummary: [],
  detectedLeadIntent: false,
  waitingForLeadConfirmation: false
};

/* ---------- DOM LOOKUPS ---------- */
const afEls = {
  container:         document.querySelector('.chatbot-container'),
  launcher:          document.getElementById('chatbot-launcher'),
  window:            document.getElementById('chatbot-window'),
  closeBtn:          document.getElementById('close-chatbot'),
  clearBtn:          document.getElementById('clear-chatbot'),
  form:              document.getElementById('chatbot-form'),
  input:             document.getElementById('chatbot-input'),
  messages:          document.getElementById('chatbot-messages'),
  contactForm:       document.getElementById('contact-form'),
  thankYouModal:     document.getElementById('thank-you-modal'),
  closeModalButton:  document.getElementById('close-modal-button'),
  header:            document.getElementById('header'),
  mobileMenuButton:  document.getElementById('mobile-menu-button'),
  mobileMenu:        document.getElementById('mobile-menu'),
  videoOverlay:      document.getElementById('video-overlay')
};

/* ---------- UTIL: safe gtag ---------- */
function afGtag(eventName, params = {}) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName, {
      event_category: 'chat',
      message_count:  AFChatState.messageCount,
      session_duration: Date.now() - AFChatState.sessionStart,
      ...params
    });
  }
}

/* ---------- LEAD CAPTURE FUNCTIONS ---------- */
function afStartLeadCapture() {
  AFChatState.collectingInfo = true;
  AFChatState.currentField = 'name';
  const summary = AFChatState.history
    .filter(msg => msg.role === 'user')
    .map(msg => msg.content)
    .join(' | ');
  AFChatState.leadData.message = `Chat conversation summary: ${summary}`;
  console.log('AFCHAT: starting lead capture, summary=', summary);
  afAddBotMessage("Of course. I will pass your message to the team with care. May I have your name? (You can type 'cancel' at any time.)");
}

function afCheckCancellation(value) {
  const cancelWords = ['cancel', 'nevermind', 'never mind', 'stop', 'no thanks', 'not now', 'maybe later', 'forget it'];
  return cancelWords.some(word => value.toLowerCase().includes(word));
}

function afCancelLeadCapture() {
  AFChatState.collectingInfo = false;
  AFChatState.currentField = null;
  AFChatState.leadData = { name: '', email: '', phone: '', company: '', message: '' };
  afAddBotMessage("No problem at all. We can continue whenever you are ready.");
}

function afProcessLeadField(value) {
  if (afCheckCancellation(value)) { afCancelLeadCapture(); return; }
  const field = AFChatState.currentField;
  console.log('AFCHAT: processing lead field', { field, value });

  if (field === 'name') {
    AFChatState.leadData.name = value;
    AFChatState.currentField = 'email';
    afAddBotMessage(`Thank you, ${value}. What is the best email to reach you?`);
  } else if (field === 'email') {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) { afAddBotMessage("I may have misread that email. Could you share it again? (Or type 'cancel' to stop.)"); return; }
    AFChatState.leadData.email = value;
    AFChatState.currentField = 'phone';
    afAddBotMessage("Thank you. What is your phone number? (Optional; type 'skip' if you prefer.)");
  } else if (field === 'phone') {
    if (value.toLowerCase() !== 'skip') AFChatState.leadData.phone = value;
    AFChatState.currentField = 'company';
    afAddBotMessage("What company are you with? (Optional; type 'skip' if not applicable.)");
  } else if (field === 'company') {
    if (value.toLowerCase() !== 'skip') AFChatState.leadData.company = value;
    AFChatState.currentField = 'additional';
    afAddBotMessage("Is there anything else you would like us to know about your goals?");
  } else if (field === 'additional') {
    if (!['skip','no'].includes(value.toLowerCase())) {
      AFChatState.leadData.message += `\n\nAdditional info: ${value}`;
    }
    afSubmitLeadToFormspree();
  }
}

async function afSubmitLeadToFormspree() {
  afAddBotMessage("Thank you. I am sending this to the team now.");
  const formData = new FormData();
  formData.append('name', AFChatState.leadData.name);
  formData.append('email', AFChatState.leadData.email);
  formData.append('phone', AFChatState.leadData.phone || '');
  formData.append('company', AFChatState.leadData.company || '');
  formData.append('message', AFChatState.leadData.message);
  formData.append('_subject', 'New Lead from AI Chatbot');
  // NOTE: avoid CCing personal addresses from client-side code (privacy & spam risk)
  // formData.append('_cc', 'tayloroliphant@gmail.com');

  try {
    // Primary attempt: FormData POST
    const response = await fetch('https://formspree.io/f/mldlebob', {
      method: 'POST',
      body: formData,
      headers: { 'Accept': 'application/json' }
    });
    const text = await response.text().catch(()=>'');
    console.log('AFCHAT: formspree primary response', {status: response.status, ok: response.ok, text: text.slice(0,400)});
    if (response.ok) {
      afAddBotMessage("Thank you. Your information has been sent, and someone from our team will contact you within 24 hours.");
      // Avoid sending raw email addresses to analytics; send only presence and domain for segmentation
      const email = AFChatState.leadData.email || '';
      const emailDomain = (email.includes('@') ? email.split('@')[1] : '').toLowerCase();
      afGtag('chat_lead_captured', {
        has_email: !!email,
        email_domain: emailDomain,
        has_phone: !!AFChatState.leadData.phone,
        has_company: !!AFChatState.leadData.company
      });
      AFChatState.collectingInfo = false;
      AFChatState.currentField = null;
      AFChatState.leadData = { name: '', email: '', phone: '', company: '', message: '' };
      return;
    }

    // Secondary attempt: send JSON payload (some CORS setups accept JSON)
    const payload = {
      name: AFChatState.leadData.name,
      email: AFChatState.leadData.email,
      phone: AFChatState.leadData.phone || '',
      company: AFChatState.leadData.company || '',
      message: AFChatState.leadData.message,
      _subject: 'New Lead from AI Chatbot',
      _cc: 'tayloroliphant@gmail.com'
    };
    try {
      const r2 = await fetch('https://formspree.io/f/mldlebob', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      });
      const t2 = await r2.text().catch(()=>'');
      console.log('AFCHAT: formspree json fallback response', {status: r2.status, ok: r2.ok, text: t2.slice(0,400)});
      if (r2.ok) {
        afAddBotMessage("Thank you. Your information has been sent, and someone from our team will contact you within 24 hours.");
      // Avoid sending raw email addresses to analytics; send only presence and domain for segmentation
      const email2 = AFChatState.leadData.email || '';
      const emailDomain2 = (email2.includes('@') ? email2.split('@')[1] : '').toLowerCase();
      afGtag('chat_lead_captured', {
        has_email: !!email2,
        email_domain: emailDomain2,
        has_phone: !!AFChatState.leadData.phone,
        has_company: !!AFChatState.leadData.company
      });
        AFChatState.collectingInfo = false;
        AFChatState.currentField = null;
        AFChatState.leadData = { name: '', email: '', phone: '', company: '', message: '' };
        return;
      }
    } catch (err2) {
      console.error('AFCHAT: formspree json fallback error', err2);
    }

    // If we get here both attempts failed
    console.warn('AFCHAT: Formspree submission failed (both attempts)');
    afAddBotMessage("I am sorry, there was an issue submitting your information. Please use the contact form below or call us at (440) 941-1785.");
  } catch (error) {
    console.error('AFCHAT: Lead submission error (primary attempt)', error);
    afAddBotMessage("I am sorry, there was an issue submitting your information. Please use the contact form below or call us at (440) 941-1785.");
  }
}

/* ---------- CHECK FOR LEAD INTENT ---------- */
function afCheckLeadIntent(message) {
  const leadKeywords = [
    'contact', 'call', 'demo', 'consultation', 'consult', 'meeting',
    'schedule', 'talk to team', 'speak with someone', 'interested', 'quote', 'proposal',
    'more information', 'get started', 'sign up', 'book a call', 'reach out'
  ];
  const lower = message.toLowerCase();
  return leadKeywords.some(k => lower.includes(k));
}

/* ---------- SCHEDULER MODAL FUNCTIONS ---------- */
const schedulerModal = document.getElementById('scheduler-modal');
const schedulerModalContent = document.getElementById('scheduler-modal-content');
const closeSchedulerBtn = document.getElementById('close-scheduler-modal');
const schedulerIframeContainer = document.getElementById('scheduler-iframe-container');

function afCheckScheduleIntent(message) {
  const keywords = ['schedule','book','meeting','call','consultation','calendar','appointment','talk to someone','pick a time'];
  const lower = message.toLowerCase();
  return keywords.some(k => lower.includes(k));
}

function afShowCalendar() {
  if (!schedulerModal || !schedulerIframeContainer) return;
  schedulerIframeContainer.innerHTML = '';
  const iframe = document.createElement('iframe');
  iframe.src = "https://aifreelancer.fillout.com/meet-with-taylor?embed=true&transparentBackground=true";
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "none";
  iframe.loading = "lazy";
  schedulerIframeContainer.appendChild(iframe);
  schedulerModal.classList.remove('hidden');
  requestAnimationFrame(() => {
    schedulerModalContent.style.transform = 'scale(1)';
    schedulerModalContent.style.opacity = '1';
  });
  afGtag('calendar_shown');
}

function afHideCalendar() {
  if (!schedulerModal) return;
  schedulerModalContent.style.transform = 'scale(0.95)';
  schedulerModalContent.style.opacity = '0';
  setTimeout(() => {
    schedulerModal.classList.add('hidden');
    schedulerIframeContainer.innerHTML = '';
  }, 300);
}

if (closeSchedulerBtn) closeSchedulerBtn.addEventListener('click', afHideCalendar);
if (schedulerModal) {
  schedulerModal.addEventListener('click', e => { if (e.target === schedulerModal) afHideCalendar(); });
}

/* ---------- FIXED: Robust Markdown to HTML ---------- */
function afMarkdownToHtml(md) {
  // Sanitize input by escaping any raw HTML first to prevent XSS.
  // Then run a limited markdown -> HTML transform (links, bold, emphasis, lists, headings).
  let html = md
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-blue-800">$1</a>');
  html = html
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.+?)__/g, '<strong>$1</strong>')
    .replace(/\*([^*]+?)\*/g, '<em>$1</em>')
    .replace(/_([^_]+?)_/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h3 class="font-bold text-lg mt-2 mb-1">$1</h3>')
    .replace(/^## (.+)$/gm, '<h4 class="font-bold text-md mt-2 mb-1">$1</h4>')
    .replace(/^\* (.+)$/gm, '<li>$1</li>')
    .replace(/^- (.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\s*)+/g, m => `<ul class="list-disc pl-5 my-2 space-y-1">${m}</ul>`);
  // convert bare newlines to <br> while avoiding inside tags (we escaped raw tags above)
  html = html.replace(/\n(?![^<]*>)/g, '<br>');
  html = html.replace(
    /(?<!href=["'])(https?:\/\/(?:www\.)?[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b(?:[-a-zA-Z0-9()@:%_\+.~#?&\/\/=]*))(?![^<]*>)(?![^<]*<\/a>)/gi,
    '<a href="$1" target="_blank" rel="noopener noreferrer" class="underline text-blue-600 hover:text-blue-800">$1</a>'
  );

  // If DOMPurify is available, run the resulting HTML through it to enforce a whitelist.
  try {
    if (window.DOMPurify && typeof DOMPurify.sanitize === 'function') {
      const clean = DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['a','strong','em','ul','li','br','h3','h4','p','div','span'],
        ALLOWED_ATTR: ['href','target','rel','class']
      });
      return clean;
    }
  } catch (e) {
    console.warn('AFCHAT: DOMPurify sanitize failed, falling back to raw html', e);
  }

  return html;
}

// Dynamically load DOMPurify if not present. Returns a Promise that resolves when ready.
function ensureDomPurify(timeout = 5000) {
  return new Promise((resolve, reject) => {
    if (window.DOMPurify && typeof DOMPurify.sanitize === 'function') return resolve(window.DOMPurify);
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/dompurify@2.4.0/dist/purify.min.js';
    script.async = true;
    let settled = false;
    const t = setTimeout(() => {
      if (!settled) { settled = true; reject(new Error('DOMPurify load timeout')); }
    }, timeout);
    script.onload = () => {
      clearTimeout(t);
      settled = true;
      if (window.DOMPurify) resolve(window.DOMPurify); else reject(new Error('DOMPurify not available after load'));
    };
    script.onerror = (err) => { clearTimeout(t); if (!settled) { settled = true; reject(err); } };
    document.head.appendChild(script);
  });
}

// Kick off DOMPurify load early (non-blocking)
ensureDomPurify().catch(()=>{/* non-fatal, we'll fallback to escaping */});

/* ---------- UTIL ---------- */
async function simulateTyping(duration = 1000) { return new Promise(r => setTimeout(r, duration)); }
function afGetTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/* ---------- COMMON QUESTIONS ---------- */
function checkCommonQuestions(message) {
  const lower = message.toLowerCase();
  for (const [, data] of Object.entries(COMMON_RESPONSES)) {
    if (data.keywords.some(k => lower.includes(k))) return data.response;
  }
  return null;
}

function afCanonicalContactNudge() {
  return "If you want, I can connect you with the team now and help you choose the fastest next step.";
}

function afNormalizeBotReply(reply, userMessage = '') {
  const raw = String(reply || '');
  const lowerReply = raw.toLowerCase();
  const lowerUser = String(userMessage || '').toLowerCase();

  const legacySignals = [
    'ai website chatbot',
    'internal process automation',
    'sales & crm automation',
    'ai data & analytics',
    'automated customer support',
    'ai social media manager',
    'fractional chief ai officer',
    'nine-solution',
    'line-up',
    '$99',
    '$499',
    '$599',
    '$899',
    '$999',
    '$1499',
    '$1,499',
    '$4,999'
  ];

  if (legacySignals.some(sig => lowerReply.includes(sig.toLowerCase()))) {
    if (/(price|pricing|cost|rate|fee|budget|hourly)/i.test(lowerUser)) {
      return `${COMMON_RESPONSES.pricing.response}\n\n${afCanonicalContactNudge()}`;
    }
    return `${COMMON_RESPONSES.capabilities.response}\n\n${afCanonicalContactNudge()}`;
  }

  return raw;
}

/* ---------- RENDER: messages ---------- */
function afAddBotMessage(text, skipAnimation = false) {
  const timestamp = afGetTimestamp();
  const wrapper = document.createElement('div');
  wrapper.className = 'af-message-wrapper justify-start';
  if (!skipAnimation) { wrapper.style.opacity = '0'; wrapper.style.transform = 'translateY(10px)'; }
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-bot af-chat-msg';
  bubble.innerHTML = afMarkdownToHtml(text) + `<div class="chat-msg-time bot-time">${timestamp}</div>`;
  wrapper.appendChild(bubble);
  afEls.messages.appendChild(wrapper);
  if (!skipAnimation) {
    requestAnimationFrame(() => {
      wrapper.style.transition = 'all 0.3s ease-out';
      wrapper.style.opacity = '1';
      wrapper.style.transform = 'translateY(0)';
    });
  }
  afScrollMessages();
}

function afAddUserMessage(text) {
  const timestamp = afGetTimestamp();
  const wrapper = document.createElement('div');
  wrapper.className = 'af-message-wrapper justify-end';
  wrapper.style.opacity = '0'; wrapper.style.transform = 'translateY(10px)';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-user af-chat-msg';
  const escaped = text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  bubble.innerHTML = escaped + `<div class="chat-msg-time user-time">${timestamp}</div>`;
  wrapper.appendChild(bubble);
  afEls.messages.appendChild(wrapper);
  requestAnimationFrame(() => {
    wrapper.style.transition = 'all 0.3s ease-out';
    wrapper.style.opacity = '1';
    wrapper.style.transform = 'translateY(0)';
  });
  afScrollMessages();
  AFChatState.messageCount++;
}

function afAddThinking() {
  const thinking = document.createElement('div');
  thinking.className = 'af-message-wrapper justify-start af-thinking';
  thinking.innerHTML = `
    <div class="chat-bubble chat-bubble-bot">
      <div class="thinking-row">
        <span class="thinking-dot"></span><span class="thinking-dot"></span><span class="thinking-dot"></span>
      </div>
      <p class="chat-thinking-label">AI is thinking...</p>
    </div>`;
  afEls.messages.appendChild(thinking);
  afScrollMessages();
  return thinking;
}

function afRenderChips() {
  const { suggestions=[] } = AFChatState.config;
  if (!suggestions.length) return;
  const chipRow = document.createElement('div');
  chipRow.className = 'chat-chip-row';
  chipRow.style.opacity = '0';
  suggestions.forEach((label, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'af-quick-chip';
    btn.textContent = label;
    btn.style.opacity = '0';
    btn.style.transform = 'translateY(5px)';
    btn.addEventListener('click', () => {
      const key = (label || '').toLowerCase();
      // Special handling for chips that map to actions rather than simple messages
      if (key === 'ask the team') {
        // Immediately start lead capture flow
        afStartLeadCapture();
        return;
      }
      if (key.includes('schedule') || key.includes('consult')) {
        afShowCalendar();
        return;
      }
      afEls.input.value = label; afSubmitMessage();
    });
    chipRow.appendChild(btn);
    setTimeout(() => {
      btn.style.transition = 'all 0.3s ease-out';
      btn.style.opacity = '1';
      btn.style.transform = 'translateY(0)';
    }, 100 * i);
  });
  const wrapper = document.createElement('div');
  wrapper.className = 'af-message-wrapper justify-start';
  const bubble = document.createElement('div');
  bubble.className = 'chat-bubble chat-bubble-bot chip-bubble';
  bubble.appendChild(chipRow);
  wrapper.appendChild(bubble);
  afEls.messages.appendChild(wrapper);
  requestAnimationFrame(() => { chipRow.style.transition = 'opacity 0.3s ease-out'; chipRow.style.opacity = '1'; });
  afScrollMessages();
}

function afRenderGreeting() {
  const { greeting } = AFChatState.config;
  afEls.messages.innerHTML = '';
  afAddBotMessage(greeting);
  setTimeout(() => afRenderChips(), 300);
}

function afScrollMessages() {
  afEls.messages.scrollTo({ top: afEls.messages.scrollHeight, behavior: 'smooth' });
}

/* ---------- CLEAR CHAT ---------- */
function afClearChat() {
  AFChatState.history = [];
  AFChatState.messageCount = 0;
  AFChatState.collectingInfo = false;
  AFChatState.currentField = null;
  AFChatState.leadData = { name: '', email: '', phone: '', company: '', message: '' };
  AFChatState.detectedLeadIntent = false;
  AFChatState.waitingForLeadConfirmation = false;
  afRenderGreeting();
  afGtag('chat_clear');
}

/* ---------- MESSAGE SUBMIT FLOW ---------- */
async function afSubmitMessage() {
  if (AFChatState.sending) return;
  let userMessage = afEls.input.value.trim();
  if (!userMessage || userMessage.length > 500) { afEls.input.value = ''; return; }
  afEls.input.value = '';
  afAddUserMessage(userMessage);

  // scheduling intent first
  if (afCheckScheduleIntent(userMessage)) {
    await simulateTyping(600);
    afAddBotMessage("Certainly. I have opened the calendar so you can choose a time that works.");
    afShowCalendar();
    return;
  }

  // lead confirmation follow‑up
  if (AFChatState.waitingForLeadConfirmation) {
    AFChatState.waitingForLeadConfirmation = false;
    const positive = ['yes','yeah','sure','ok','okay','definitely','please','yep','absolutely'];
    if (positive.some(r => userMessage.toLowerCase().includes(r))) {
      await simulateTyping(600);
      afAddBotMessage("Wonderful. I have opened the calendar for you. Please choose any convenient time.");
      afShowCalendar();
      return;
    } else {
      AFChatState.history.push({ role:'user', content:userMessage });
      const thinkingNode = afAddThinking();
      afSetSending(true);
      afSendToAI(userMessage, thinkingNode);
      return;
    }
  }

  // lead capture flow
  if (AFChatState.collectingInfo) {
    await simulateTyping(600);
    afProcessLeadField(userMessage);
    return;
  }

  AFChatState.history.push({ role:'user', content:userMessage });

  if (afCheckLeadIntent(userMessage)) {
    // If user explicitly asks to leave details, start client-side lead capture immediately
    const explicitCapture = [
      'take my info','collect my info','i want to leave my details','give my contact','take my details','here is my email','contact me','i want to be contacted','send my info',
      'ask the team','ask the team a question','i want to ask the team','i have a question','i want to ask','ask a question','i would like to ask','i want to talk to the team'
    ];
    const lower = userMessage.toLowerCase();
    if (explicitCapture.some(p => lower.includes(p))) {
      AFChatState.detectedLeadIntent = true;
      afStartLeadCapture();
      return;
    }

    const thinkingNode = afAddThinking();
    afSetSending(true);
    AFChatState.detectedLeadIntent = true;
    afSendToAI(userMessage, thinkingNode);
    return;
  }

  const commonResponse = checkCommonQuestions(userMessage);
  if (commonResponse) {
    await simulateTyping(800);
    afAddBotMessage(commonResponse);
    AFChatState.history.push({ role:'assistant', content:commonResponse });
    if (
      /(pric|cost|rate|budget|service|optimiz|nonprofit|about|founder|project|help)/i.test(userMessage)
    ) {
      await simulateTyping(1000);
      afAddBotMessage("If you would like, we can schedule a short consultation. Just say 'yes' and I will open the calendar or collect your details.");
      AFChatState.waitingForLeadConfirmation = true;
    }
    return;
  }

  const thinkingNode = afAddThinking();
  afSetSending(true);
  afSendToAI(userMessage, thinkingNode);
}

/* ---------- SEND TO AI ---------- */
async function afSendToAI(userMessage, thinkingNode) {
  let lastErr;
  
  // only keep the last ~10 messages for context
  const payloadHistory = AFChatState.history.slice(-10);

  for (const url of AF_CHAT_ENDPOINTS) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // simple request => no CORS pre‑flight
        body: JSON.stringify({ 
          message: userMessage,
          history: payloadHistory,
          assistant_instructions: AF_ASSISTANT_INSTRUCTIONS
        })
      });

      if (!res.ok) {
        console.warn(`[AFChat] ${url} → ${res.status}`);
        lastErr = new Error(`HTTP ${res.status}`);
        continue; // try next endpoint (there’s only one right now)
      }

  const data = await res.json();
  const rawReply = data.reply ?? data.message ?? data.content ?? '';
  const botReply = afNormalizeBotReply(rawReply, userMessage);
      console.log('AFCHAT: botReply received', { botReply: botReply.slice(0,400), detectedLeadIntent: AFChatState.detectedLeadIntent });
      if (!botReply) throw new Error('Empty reply from server');

      // tidy up the “thinking…” indicator
      if (thinkingNode?.remove) thinkingNode.remove();

      // mild typing delay
      await simulateTyping(Math.min(botReply.length * 10, 1500));

      afAddBotMessage(botReply);
      AFChatState.history.push({ role: 'assistant', content: botReply });
      // If we previously detected lead intent but the AI refused to collect PII,
      // start client-side lead capture so we can still gather visitor contact info.
      const lowerReply = (botReply || '').toLowerCase();
      // Heuristic: if reply contains a negation and words about collecting/relaying personal info, treat as a refusal
      const negWords = ["can't","cannot","cant","cannot","unable","not able","don't","do not","unable to","sorry"];
      const infoWords = ['collect','personal','information','relay','contact','email','details','private'];
      const containsNeg = negWords.some(n => lowerReply.includes(n));
      const containsInfo = infoWords.some(n => lowerReply.includes(n));
      console.log('AFCHAT: refusal heuristic check', { lowerReply, containsNeg, containsInfo, detectedLeadIntent: AFChatState.detectedLeadIntent });
      // If we previously detected lead intent, and the assistant mentions being unable
      // or mentions contact/personal info, start our client-side capture so we can collect details.
      if (AFChatState.detectedLeadIntent && (containsNeg || containsInfo)) {
        console.log('AFCHAT: AI refusal heuristic triggered (loose mode); starting client capture', {lowerReply, containsNeg, containsInfo});
        afAddBotMessage("Of course. I can pass this to the team with care. May I have your name? (You can type 'cancel' to stop.)");
        AFChatState.collectingInfo = true;
        AFChatState.currentField = 'name';
      }
      afSetSending(false);
      afGtag('chat_bot_reply');
      return;                                          // ✅ success, stop here
    } catch (err) {
      lastErr = err;
      console.warn('[AFChat] error calling', url, err);
      // loop continues (will exit after last endpoint)
    }
  }

  /* ---- every endpoint failed ---- */
  if (thinkingNode?.remove) thinkingNode.remove();
  afAddBotMessage(
    "I am having trouble connecting right now. Please use the contact form below, call (440) 941-1785, or email hello@aifreelancer.co."
  );
  afSetSending(false);
  console.error('[AFChat] all endpoints failed', lastErr);
}

/* ---------- SENDING STATE UI ---------- */
function afSetSending(isSending) {
  AFChatState.sending = isSending;
  const btn = afEls.form?.querySelector('button[type="submit"]');
  if (btn) {
    btn.disabled = isSending;
    btn.classList.toggle('opacity-50', isSending);
    btn.classList.toggle('cursor-not-allowed', isSending);
  }
}

/* ---------- INPUT & FORM ---------- */
if (afEls.input) {
  afEls.input.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); afSubmitMessage(); }
  });
}
if (afEls.form) {
  afEls.form.addEventListener('submit', e => { e.preventDefault(); afSubmitMessage(); });
}

/* ---------- CHAT WINDOW TOGGLE with mobile optimization ---------- */
function afToggleChat(show) {
  const win = afEls.window;
  const container = afEls.container;
  if (!win) return;
  const isMobile = window.innerWidth < 768;
  // ensure inline display toggled for reliable show/hide across pages
  if (show) {
    win.style.display = 'flex';
  }
  if (isMobile) {
    win.style.width = '100vw';
    win.style.height = '100vh';
    win.style.bottom = '0';
    win.style.right = '0';
    win.style.left = '0';
    win.style.top = 'auto';
    win.style.borderRadius = '0';
    win.style.maxHeight = '100vh';
  } else {
    // Clear mobile-only inline overrides so desktop CSS controls layout.
    win.style.width = '';
    win.style.height = '';
    win.style.bottom = '';
    win.style.right = '';
    win.style.left = '';
    win.style.top = '';
    win.style.borderRadius = '';
    win.style.maxHeight = '';
  }
  if (show) {
    if (container) container.classList.add('is-open');
    win.classList.remove('hidden');
    win.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = isMobile ? 'hidden' : '';
    requestAnimationFrame(() => { win.style.transform = 'scale(1)'; win.style.opacity = '1'; afEls.input.focus(); });
    if (!AFChatState.initialized) {
      AFChatState.initialized = true;
      AFChatState.sessionStart = Date.now();
      afRenderGreeting();
      afGtag('chat_open');
    }
  } else {
    if (container) container.classList.remove('is-open');
    win.style.transform = isMobile ? 'translateY(100%)' : 'scale(0.95)';
    win.style.opacity = isMobile ? '1' : '0';
    document.body.style.overflow = '';
    setTimeout(() => {
      win.classList.add('hidden');
      win.setAttribute('aria-hidden', 'true');
      AFChatState.history = [];
      AFChatState.initialized = false;
      AFChatState.messageCount = 0;
      AFChatState.collectingInfo = false;
      AFChatState.currentField = null;
      AFChatState.detectedLeadIntent = false;
      AFChatState.waitingForLeadConfirmation = false;
      // hide via inline style to ensure it's not visible on other pages
      win.style.display = 'none';
    }, 300);
    afGtag('chat_close');
  }
}

if (afEls.launcher) afEls.launcher.addEventListener('click', () => {
  const isHidden = afEls.window.classList.contains('hidden');
  afToggleChat(isHidden);
});
if (afEls.closeBtn) afEls.closeBtn.addEventListener('click', () => afToggleChat(false));
if (afEls.clearBtn) afEls.clearBtn.addEventListener('click', afClearChat);

/* ---------- LOAD REMOTE CONFIG ---------- */
async function afLoadRemoteConfig() {
  try {
    const res = await fetch(AF_CHAT_CONFIG_ENDPOINT, { method:'GET' });
    if (!res.ok) return;
    const data = await res.json();
    // Keep core tone/content settings local so behavior stays consistent.
    if (data && typeof data.brand === 'string' && data.brand.trim()) {
      AFChatState.config.brand = data.brand.trim();
    }
  } catch (_) {}
}

/* ---------- HEADER / MOBILE MENU / VIDEO ---------- */
function afHeaderMobileEtc(){
  const { mobileMenuButton, mobileMenu, header, videoOverlay } = afEls;

  if (mobileMenuButton && mobileMenu) {
    mobileMenuButton.addEventListener('click', () => mobileMenu.classList.toggle('hidden'));
    document.querySelectorAll('#mobile-menu a').forEach(link => {
      link.addEventListener('click', () => mobileMenu.classList.add('hidden'));
    });
  }

  if (header) {
    const applyHeaderState = () => {
      if (window.scrollY > 50) header.classList.add('bg-white','backdrop-blur-sm','shadow-md');
      else header.classList.remove('bg-white','backdrop-blur-sm','shadow-md');
    };
    // Apply immediately on load (covers reloads when not at top)
    applyHeaderState();
    // Update on scroll
    window.addEventListener('scroll', applyHeaderState, { passive: true });
  }

  const ytFrame = document.getElementById('intro-video');
  if (ytFrame && videoOverlay) {
    videoOverlay.addEventListener('click', () => {
      const base = ytFrame.getAttribute('data-src') || '';
      if (base) {
        const src = base + (base.includes('?') ? '&' : '?') + 'autoplay=1';
        ytFrame.setAttribute('src', src);
      }
      videoOverlay.style.opacity = '0';
      videoOverlay.style.pointerEvents = 'none';
    });
  }
}

/* Contact form handling moved to `assets/js/contact-form.js` to keep chatbot responsibilities separate. */

/* ---------- INJECT ENHANCED STYLES ---------- */
function afInjectStyles(){
  const css = `
    .af-chat-msg { white-space: pre-line; word-break: break-word; overflow-wrap: anywhere; }
    .thinking-dot { display:inline-block; width:8px; height:8px; border-radius:50%; background-color:#9ca3af; animation:thinking 1.4s infinite ease-in-out both; }
    .thinking-dot:nth-child(1) { animation-delay:-0.32s; }
    .thinking-dot:nth-child(2) { animation-delay:-0.16s; }
    @keyframes thinking { 0%,80%,100% { transform:scale(0); opacity:0.5; } 40% { transform:scale(1); opacity:1; } }
    .af-quick-chip { border:1px solid rgba(0,0,0,0.15); background:#fff; position:relative; overflow:hidden; }
    .af-quick-chip:hover { background:#f3f4f6; border-color:#3b82f6; color:#3b82f6; }
    .af-quick-chip::before { content:''; position:absolute; top:50%; left:50%; width:0; height:0; border-radius:50%; background:rgba(59,130,246,0.1); transform:translate(-50%,-50%); transition: width .3s, height .3s; }
    .af-quick-chip:hover::before { width:200%; height:200%; }
    .chat-bubble-bot strong { font-weight:700; color:#111827; }
    .chat-bubble-bot em { font-style:italic; color:#374151; }
    .chat-bubble-bot ul { list-style-type:disc; padding-left:1.25rem; margin:.5rem 0; }
    .chat-bubble-bot h3 { font-size:1.125rem; font-weight:700; margin:.5rem 0; color:#111827; }
    .chat-bubble-bot a { word-break: break-all; transition: all .2s ease; }
    .af-message-wrapper { animation: slideInUp .3s ease-out; }
    @keyframes slideInUp { from { opacity:0; transform: translateY(10px);} to { opacity:1; transform: translateY(0);} }
    @media (max-width:768px){ .chatbot-window{ position:fixed !important; } #chatbot-messages{ max-height: calc(100vh - 180px);} }
    #chatbot-messages { scroll-behavior: smooth; background:#fff !important; }
    .chatbot-input-wrap { background:#fff !important; }
    .chatbot-window { background:#fff !important; }
  `;
  const tag = document.createElement('style');
  tag.setAttribute('data-afchat','');
  tag.textContent = css;
  document.head.appendChild(tag);
}

// Defer non-critical initializers and background video loading
window.addEventListener('DOMContentLoaded', () => {
  // Initialize header/menu and smooth scroll
  afHeaderMobileEtc();
  // Contact form handlers moved to `assets/js/contact-form.js` (keeps chatbot responsibilities separate)
  // Defer style injection to idle time
  if ('requestIdleCallback' in window) requestIdleCallback(afInjectStyles); else setTimeout(afInjectStyles, 1);

  // Load hero background video only on desktop/tablet widths
  try {
    const video = document.getElementById('hero-video');
    const source = document.getElementById('hero-video-source');
    if (video && source) {
      const isWide = window.matchMedia('(min-width: 768px)').matches;
      const dataSrc = source.getAttribute('data-src');
      if (isWide && dataSrc) {
        source.setAttribute('src', dataSrc);
        // Avoid blocking; let browser schedule decode
        video.load();
        const play = () => video.play().catch(() => {});
        if (document.readyState === 'complete') play(); else window.addEventListener('load', play, { once: true });
      }
    }
  } catch (_) {}
});

/* ---------- INIT ---------- */
(async function afInit(){
  await afLoadRemoteConfig();

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !afEls.window.classList.contains('hidden')) afToggleChat(false);
  });

  // Handle window resize (ignore keyboard height changes)
  let lastWidth = window.innerWidth;
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const currentWidth = window.innerWidth;
      if (currentWidth !== lastWidth) {
        lastWidth = currentWidth;
        if (!afEls.window.classList.contains('hidden')) {
          afToggleChat(false);
          setTimeout(() => afToggleChat(true), 100);
        }
      }
    }, 250);
  });

  // Fillout submission => close modal + confirm in chat
  window.addEventListener('message', (event) => {
    if (event.origin !== 'https://aifreelancer.fillout.com') return;
    if (event.data?.eventName === 'fillout.submitted') {
      afHideCalendar();
      const startTime = event.data?.payload?.startDateTime;
      const friendlyTime = startTime
        ? new Date(startTime).toLocaleString('en-US', { dateStyle: 'long', timeStyle: 'short' })
        : 'the time you selected';
      afAddBotMessage(`✅ Confirmed! Your meeting is booked for **${friendlyTime}**. A calendar invite is on its way. Talk to you soon!`);
      afGtag('calendar_booked');
    }
  });
})();

}

// --- End original chat widget script ---
