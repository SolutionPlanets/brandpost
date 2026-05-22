export const getImageExpansionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => {
  const brandContext = brandDetails ? `
  BRAND DATABASE (STRICTLY ADHERE TO THESE):
  - Business Name: "${brandDetails.businessName}"
  - Logo Reference: ${brandDetails.logo ? `Perfectly integrate the visual style of this logo: ${brandDetails.logo}` : 'Use premium professional typography for branding.'}
  - Palette: Primary ${brandDetails.colors.primary}, Secondary ${brandDetails.colors.secondary}, Accent ${brandDetails.colors.accent}
  - Tone: ${brandDetails.brandTone}
  
  BRAND STRUCTURE:
  1. TOP: Premium branding area with "${brandDetails.businessName}".
  2. BOTTOM: Clean footer area.
  ` : `
  DESIGN FREEDOM: No specific brand kit is selected. Rely entirely on the user's Post Description and Topic to determine the design, colors, and typography.
  `;

  return `
  You are an Elite Creative Strategist and Graphic Designer. 
  Your goal is to design exactly ONE BESPOKE AND HIGH-IMPACT marketing poster.

  CRITICAL: QUALITY & TEXT
  - IMAGE QUALITY: Ultra-HD, 8k resolution, photorealistic, sharp focus, NO BLUR.
  - TEXT CLARITY: Every letter MUST be sharp, crisp, and perfectly legible.
  - LANGUAGE: All text in the image MUST be in CLEAR, FLUENT ENGLISH.

  USER INPUTS:
  - Topic: "${topic}"
  - Goal: "${contentType}"
  - Platform: "${platform}"
  - Post Description (HIGHEST WEIGHTAGE): "${extraInstructions || 'No specific post description provided.'}"

  CRITICAL PRIORITY: The "Post Description" dictates the core content, text, and visual elements. You MUST visually represent the details, offers, or context mentioned in the Post Description.
  ${brandContext}

  DESIGN SPECIFICATIONS:
  Describe a SINGLE, ISOLATED poster with a clean, high-contrast layout, razor-sharp typography, and a cinematic focal visual representing the Post Description and Topic.

  Respond with a JSON object: {"expandedPrompts": ["detailed prompt for the SINGLE poster"]}
  `;
};
