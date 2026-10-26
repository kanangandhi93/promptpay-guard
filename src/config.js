import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '3000', 10),
  host: process.env.HOST || 'localhost',

  // Google Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
    model: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    threatThreshold: parseInt(process.env.TIER2_THREAT_THRESHOLD || '40', 10),
    timeoutMs: 4000
  },

  // PayPal Sandbox Configuration
  paypal: {
    clientId: process.env.PAYPAL_CLIENT_ID || '',
    clientSecret: process.env.PAYPAL_CLIENT_SECRET || '',
    baseUrl: process.env.PAYPAL_BASE_URL || 'https://api-m.sandbox.paypal.com',
    enableMockFallback: process.env.ENABLE_MOCK_FALLBACK !== 'false'
  },

  // Tier-1 Fast Heuristics Engine Limits
  tier1: {
    maxVelocityPerWindow: parseInt(process.env.TIER1_MAX_VELOCITY_PER_WINDOW || '5', 10),
    velocityWindowSeconds: parseInt(process.env.TIER1_VELOCITY_WINDOW_SECONDS || '60', 10),
    singleTransactionLimit: parseFloat(process.env.TIER1_SINGLE_TRANSACTION_LIMIT || '100.00'),
    dailyCumulativeLimit: parseFloat(process.env.TIER1_DAILY_CUMULATIVE_LIMIT || '500.00'),
    supportedCurrencies: ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY']
  },

  // Approved Vendor Whitelist Registry
  approvedVendors: [
    {
      id: 'VND-PAYPAL-SANDBOX',
      name: 'PayPal Sandbox Merchant',
      email: process.env.PAYPAL_MERCHANT_EMAIL || 'sb-8bbul53467761@business.example.com',
      domain: 'business.example.com',
      regex: /^sb-8bbul53467761@business\.example\.com$/i,
      category: 'Enterprise Sandbox Merchant'
    },
    {
      id: 'VND-FIGMA',
      name: 'Figma Inc.',
      email: 'billing@figma.com',
      domain: 'figma.com',
      regex: /^billing@figma\.com$/i,
      category: 'Design & Prototyping'
    },
    {
      id: 'VND-OPENAI',
      name: 'OpenAI LLC',
      email: 'payments@openai.com',
      domain: 'openai.com',
      regex: /^payments@openai\.com$/i,
      category: 'AI Infrastructure'
    },
    {
      id: 'VND-WIKIMEDIA',
      name: 'Wikimedia Foundation',
      email: 'donations@wikimedia.org',
      domain: 'wikimedia.org',
      regex: /^donations@wikimedia\.org$/i,
      category: 'Non-profit Education'
    },
    {
      id: 'VND-DELL',
      name: 'Dell Technologies',
      email: 'orders@dell.com',
      domain: 'dell.com',
      regex: /^orders@dell\.com$/i,
      category: 'Enterprise Hardware'
    },
    {
      id: 'VND-ANTHROPIC',
      name: 'Anthropic PBC',
      email: 'billing@anthropic.com',
      domain: 'anthropic.com',
      regex: /^billing@anthropic\.com$/i,
      category: 'AI Infrastructure'
    },
    {
      id: 'VND-GITHUB',
      name: 'GitHub Inc.',
      email: 'accounts@github.com',
      domain: 'github.com',
      regex: /^accounts@github\.com$/i,
      category: 'Developer Tooling'
    },
    {
      id: 'VND-GOOGLE',
      name: 'Google LLC',
      email: 'payments@google.com',
      domain: 'google.com',
      regex: /^payments@google\.com$/i,
      category: 'Cloud Services'
    },
    {
      id: 'VND-AMAZON',
      name: 'Amazon Web Services',
      email: 'aws-payments@amazon.com',
      domain: 'amazon.com',
      regex: /^aws-payments@amazon\.com$/i,
      category: 'Cloud Infrastructure'
    }
  ]
};
