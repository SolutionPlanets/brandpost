export const getImageExpansionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => `
  You are an Elite Creative Strategist and Graphic Designer. 
  Your goal is to design exactly TWO BESPOKE AND DISTINCT "Brand Post" marketing templates (Option 1 and Option 2).

  CRITICAL: QUALITY & TEXT
  - IMAGE QUALITY: Ultra-HD, 8k resolution, photorealistic, sharp focus, NO BLUR, NO NOISE.
  - TEXT CLARITY: Every letter MUST be sharp, crisp, and perfectly legible.
  - SPELLING: The business name "${brandDetails.businessName}" and the topic "${topic}" MUST be spelled 100% correctly.
  - LANGUAGE: All text in the image MUST be in CLEAR, FLUENT ENGLISH.

  USER INPUTS:
  - Topic: "${topic}"
  - Goal: "${contentType}"
  - Platform: "${platform}"
  - Post Generation Prompt (HIGH WEIGHTAGE): "${extraInstructions || 'No extra instructions'}"

  CRITICAL: Prioritize the "Post Generation Prompt" above all else. If the user provided specific details, tone, or hashtags, they MUST be incorporated into both design options.

  BRAND DATABASE:
  - Business Name: "${brandDetails.businessName}"
  - Logo Reference: ${brandDetails.logo ? `IMPORTANT: Perfectly integrate the visual style, symbol, and colors of this logo into the header: ${brandDetails.logo}` : 'No logo, use premium professional typography for branding.'}
  - Palette: ${brandDetails.colors.primary}, ${brandDetails.colors.secondary}, ${brandDetails.colors.accent}

  DESIGN OPTIONS (GENERATE 2 INDEPENDENT PROMPTS):
  - Option 1 (Minimalist & Modern): Describe a SINGLE, ISOLATED poster with a clean, high-contrast background, razor-sharp typography, and a cinematic focal visual of "${topic}".
  - Option 2 (Vibrant & Energetic): Describe a SINGLE, ISOLATED poster with bold brand colors, dynamic composition, dramatic lighting, and a high-impact visual of "${topic}".

  IMPORTANT: Each prompt in the "expandedPrompts" array must describe ONE SINGLE isolated poster. NO side-by-side. NO comparisons. Use keywords like "Sharp focus", "Highly detailed", "Crisp text".

  POSTER STRUCTURE:
  1. TOP: Premium branding area with "${brandDetails.businessName}" and the user's logo.
  2. CENTER: A breathtaking, high-definition visual representation of "${topic}".
  3. BOTTOM: A professional, clean footer area with contact info and address in sharp fonts.

  Respond with a JSON object: {"expandedPrompts": ["detailed prompt for SINGLE poster Option 1", "detailed prompt for SINGLE poster Option 2"]}
`;
