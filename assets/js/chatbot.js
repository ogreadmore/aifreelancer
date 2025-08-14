// AI Freelancer shared chat widget loader
if (window.AF_CHAT_WIDGET_LOADED) {
  console.warn('AF chat widget already loaded');
} else {
  window.AF_CHAT_WIDGET_LOADED = true;

  // Ensure CSS is present
  if (!document.querySelector('link[data-afchat-css]')) {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.href = '/assets/css/chatbot.css';
    l.setAttribute('data-afchat-css', '');
    document.head.appendChild(l);
  }

  // Inject HTML container + modals
  const html = `
    <!-- AI Chatbot (injected) -->
    <div class="chatbot-container">
        <div id="chatbot-launcher" class="chatbot-launcher gemini-gradient-bg pulse" aria-label="Open AI chat assistant">
            <i class="fa-solid fa-robot text-xl"></i>
        </div>
        
        <div id="chatbot-window" class="chatbot-window hidden" aria-hidden="true">
            <div class="gemini-gradient-bg p-4 text-white flex justify-between items-center">
                <h3 class="font-bold">AI Assistant</h3>
                <div>
                    <button id="clear-chatbot" class="text-white mr-2 text-sm opacity-70 hover:opacity-100" aria-label="Clear chat history">
                        <i class="fa-solid fa-trash-can mr-1"></i> Clear
                    </button>
                    <button id="close-chatbot" class="text-white" aria-label="Close chat">
                        <i class="fa-solid fa-times"></i>
                    </button>
                </div>
            </div>
            
            <div id="chatbot-messages" class="flex-1 p-4 overflow-y-auto" aria-live="polite">
                <div class="flex mb-4">
                    <div class="chat-bubble-bot p-3">
                        <p>Hi there!  I'm your AI assistant. How can I help you today?</p>
                        <p class="mt-2">You can ask me about:</p>
                        <ul class="list-disc pl-5 mt-1 space-y-1">
                            <li>Our AI solutions</li>
                            <li>Implementation process</li>
                            <li>Pricing options</li>
                        </ul>
                    </div>
                </div>
            </div>
            
            <div class="p-4 border-t border-gray-200">
                <form id="chatbot-form" class="flex gap-2">
                    <input type="text" id="chatbot-input" placeholder="Ask me anything..." class="flex-1 border border-gray-300 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent" aria-label="Type your message">
                    <button type="submit" class="w-10 h-10 rounded-full gemini-gradient-bg text-white flex items-center justify-center" aria-label="Send message">
                        <i class="fa-solid fa-paper-plane"></i>
                    </button>
                </form>
            </div>
        </div>
    </div>

<div id="thank-you-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-60 z-[100] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl p-8 md:p-12 text-center max-w-md mx-auto transform transition-all scale-95 opacity-0" id="modal-content">
        <div class="w-20 h-20 mx-auto mb-6 gemini-gradient-bg rounded-full flex items-center justify-center">
            <i class="fa-solid fa-check text-white text-4xl"></i>
        </div>
        <h2 class="text-3xl font-bold text-gray-900 mb-3">Thank You!</h2>
        <p class="text-gray-600 text-lg mb-8">Your message has been sent successfully. We'll be in touch shortly.</p>
        <button id="close-modal-button" class="bg-gray-200 text-gray-800 font-semibold py-3 px-8 rounded-full hover:bg-gray-300 transition-all">
            Close
        </button>
    </div>
</div>
<div id="scheduler-modal" class="hidden fixed inset-0 bg-gray-900 bg-opacity-60 z-[100] flex items-center justify-center p-4">
    <div class="bg-white rounded-2xl shadow-2xl max-w-4xl w-full h-[90vh] max-h-[700px] flex flex-col transform transition-all scale-95 opacity-0" id="scheduler-modal-content">
        <div class="p-4 border-b flex justify-between items-center">
            <h3 class="font-bold text-lg text-gray-800">Schedule a Consultation</h3>
            <button id="close-scheduler-modal" class="text-gray-500 hover:text-gray-900" aria-label="Close scheduler">
                <i class="fa-solid fa-times text-2xl"></i>
            </button>
        </div>
        <div id="scheduler-iframe-container" class="flex-1 w-full h-full">
            </div>
    </div>
</div>
`;
  document.body.insertAdjacentHTML('beforeend', html);

  // --- Begin original chat widget script (extracted) ---
/* ---------- CONFIG ---------- */
const AF_CHAT_ENDPOINTS = [
  '/api/chat',
  'https://aifreelancerchatbotvercelthing.vercel.app/api/chat'
];

// if you ever stand up a second backend you can push another item into the array
//   e.g. AF_CHAT_ENDPOINTS.push('https://backup.my‑domain.com/api/chat');

const AF_CHAT_CONFIG_ENDPOINT = '/api/chat-config'; 

const AF_CHAT_DEFAULT_CONFIG = {
  brand: 'AI Freelancer',
  greeting: "Hey! I'm the AI assistant for AI Freelancer. What can I help with today? ",
  suggestions: [
    "Pricing options",
    "Schedule a consultation",
    "What do you automate?"
  ]
};

/* ---------- COMMON RESPONSES (pretty “solutions” list) ---------- */
const COMMON_RESPONSES = {
  pricing: {
    keywords: [
      'price','pricing','cost','fee','charge',
      'how much','expensive','rate','rates'
    ],
    response:
`Every solution has two clear parts: a pocket‑friendly monthly fee **plus** a one‑time kickoff charge.\n\n• **AI\u00a0Website\u00a0Chatbot** — *$99\u00a0/\u00a0mo*\u00a0+\u00a0$499\u00a0setup  \n+* **Internal\u00a0Process\u00a0Automation** — *$999\u00a0/\u00a0mo*\u00a0+\u00a0$999\u00a0build  \n+* **Sales\u00a0&\u00a0CRM\u00a0Automation** — *$599\u00a0/\u00a0mo*\u00a0+\u00a0$599\u00a0integration  \n+* **AI\u00a0Data\u00a0&\u00a0Analytics** — *$899\u00a0/\u00a0mo*\u00a0+\u00a0$999\u00a0setup  \n+* **Automated\u00a0Customer\u00a0Support** — *$599\u00a0/\u00a0mo*\u00a0+\u00a0$599\u00a0integration  \n+* **AI\u00a0Social\u00a0Media\u00a0Manager** — *$499\u00a0/\u00a0mo*\u00a0+\u00a0$999\u00a0strategy  \n+* **Creative\u00a0&\u00a0Development** — *from\u00a0$1,999\u00a0per\u00a0project* (retainer optional)  \n+* **AI‑Powered\u00a0Team\u00a0Training** — *$599\u00a0/\u00a0mo*\u00a0+\u00a0$299\u00a0setup  \n+* **Full‑Scale\u00a0Transformation** — *custom* (starts\u00a0≈\u00a0$3,500\u00a0/\u00a0mo)  \n+\n+Let me know which line item you’d like to explore!`

