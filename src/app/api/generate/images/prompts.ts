export const getImageExpansionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => `
  You are an Elite Creative Strategist and Graphic Designer. 
  Your goal is to design exactly ONE BESPOKE AND HIGH-IMPACT "Brand Post" marketing template.

  CRITICAL: QUALITY & TEXT
  - IMAGE QUALITY: Ultra-HD, 8k resolution, photorealistic, sharp focus, NO BLUR, NO NOISE.
  - TEXT CLARITY: Every letter MUST be sharp, crisp, and perfectly legible.
  - SPELLING: The business name "${brandDetails.businessName}" and the topic "${topic}" MUST be spelled 100% correctly.
  - LANGUAGE: All text in the image MUST be in CLEAR, FLUENT ENGLISH.

  USER INPUTS:
  - Topic: "${topic}"
  - Goal: "${contentType}"
  - Platform: "${platform}"
  - Extra Instructions (HIGH WEIGHTAGE): "${extraInstructions || 'No extra instructions'}"

  CRITICAL: Prioritize the "Extra Instructions" above all else. If the user provided specific details, tone, or hashtags, they MUST be incorporated into the design.

  BRAND DATABASE:
  - Business Name: "${brandDetails.businessName}"
  - Logo Reference: ${brandDetails.logo ? `IMPORTANT: Perfectly integrate the visual style, symbol, and colors of this logo into the header: ${brandDetails.logo}` : 'No logo, use premium professional typography for branding.'}
  - Palette: ${brandDetails.colors.primary}, ${brandDetails.colors.secondary}, ${brandDetails.colors.accent}

  DESIGN SPECIFICATIONS:
  Describe a SINGLE, ISOLATED poster with a clean, high-contrast layout, razor-sharp typography, and a cinematic focal visual of "${topic}". Use keywords like "Sharp focus", "Highly detailed", "Crisp text".

  POSTER STRUCTURE:
  1. TOP: Premium branding area with "${brandDetails.businessName}" and the user's logo.
  2. CENTER: A breathtaking, high-definition visual representation of "${topic}".
  3. BOTTOM: A professional, clean footer area with contact info and address in sharp fonts.

  Respond with a JSON object: {"expandedPrompts": ["detailed prompt for the SINGLE poster"]}
`;
