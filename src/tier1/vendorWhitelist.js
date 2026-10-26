import { config } from '../config.js';

/**
 * Calculates Levenshtein distance between two strings with safety length bounds
 */
function levenshteinDistance(a, b) {
  // Cap length to prevent ReDoS / CPU starvation on algorithmic complexity attacks
  if (a.length > 80 || b.length > 80) return 999;

  const matrix = Array.from({ length: a.length + 1 }, () => []);
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }
  return matrix[a.length][b.length];
}

/**
 * Checks for common typo-squatting homoglyphs:
 * e.g., '0' instead of 'o', '1' instead of 'l', 'vv' instead of 'w'
 */
function normalizeHomoglyphs(str) {
  return str
    .toLowerCase()
    .replace(/0/g, 'o')
    .replace(/1/g, 'l')
    .replace(/3/g, 'e')
    .replace(/5/g, 's')
    .replace(/@/g, 'a')
    .replace(/rn/g, 'm')
    .replace(/vv/g, 'w');
}

/**
 * Vendor Whitelist & Anti-Typo-squatting Validator
 * Fast in-memory exact regex check + homoglyph typo-squatting detector (<1ms)
 */
class VendorWhitelistRegistry {
  constructor(vendors = config.approvedVendors) {
    this.vendors = vendors;
  }

  /**
   * Validate recipient against whitelist
   * @param {string} recipientEmail
   * @returns {{ allowed: boolean, vendor?: object, isTypoSquat?: boolean, reason?: string }}
   */
  evaluate(recipientEmail) {
    if (!recipientEmail || typeof recipientEmail !== 'string') {
      return {
        allowed: false,
        reason: 'Missing or invalid recipient email identifier'
      };
    }

    const cleanEmail = recipientEmail.trim().toLowerCase();

    // Guard against multiple @ or invalid domain structure
    const emailParts = cleanEmail.split('@');
    if (emailParts.length !== 2) {
      return {
        allowed: false,
        reason: 'Malformed recipient email address structure'
      };
    }

    const recipientUser = emailParts[0];
    const recipientDomain = emailParts[1];

    // 1. Direct Regex Whitelist Match (with strict ^ and $ anchors)
    for (const vendor of this.vendors) {
      if (vendor.regex.test(cleanEmail)) {
        return {
          allowed: true,
          vendor
        };
      }
    }

    // 2. Anti-Typo-squatting & Subdomain Spoofing Heuristic Analysis
    const normalizedDomain = normalizeHomoglyphs(recipientDomain);

    for (const vendor of this.vendors) {
      const vendorDomain = vendor.domain.toLowerCase();

      // Check for subdomain spoofing e.g. openai.com.attacker.com or billing-figma.com
      const isSubdomainSpoof = recipientDomain.endsWith(`.${vendorDomain}`) ||
                               recipientDomain.includes(`${vendorDomain}.`) ||
                               (recipientDomain.includes(vendorDomain) && recipientDomain !== vendorDomain);

      // Check if domain resembles an approved vendor's domain via homoglyphs or Levenshtein distance
      const isDomainHomoglyph = normalizedDomain.includes(vendorDomain) && recipientDomain !== vendorDomain;
      const domainDistance = levenshteinDistance(recipientDomain, vendorDomain);

      const looksLikeVendorSpoof =
        isSubdomainSpoof ||
        isDomainHomoglyph ||
        (domainDistance > 0 && domainDistance <= 3) ||
        (cleanEmail.includes(vendor.name.toLowerCase().split(' ')[0]) && recipientDomain !== vendorDomain);

      if (looksLikeVendorSpoof) {
        return {
          allowed: false,
          isTypoSquat: true,
          suspectedTarget: vendor.name,
          reason: `Typo-squatting / Domain spoofing detected: '${recipientEmail}' closely mimics approved vendor '${vendor.name}' (${vendor.domain})`
        };
      }
    }

    return {
      allowed: false,
      isTypoSquat: false,
      reason: `Recipient '${recipientEmail}' is not on the enterprise approved vendor whitelist`
    };
  }

  /**
   * Get all approved vendors
   */
  getAllVendors() {
    return this.vendors.map(v => ({
      id: v.id,
      name: v.name,
      email: v.email,
      domain: v.domain,
      category: v.category
    }));
  }
}

export const vendorWhitelist = new VendorWhitelistRegistry();
