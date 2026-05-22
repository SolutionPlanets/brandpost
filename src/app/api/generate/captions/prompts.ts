export const getCaptionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => {
  const brandContext = brandDetails ? `
  Brand Name: ${brandDetails.businessName}
  Brand Description: ${brandDetails.brandDescription}
  Tone: ${brandDetails.brandTone}
  ` : `
  NO BRAND KIT SELECTED. Keep the caption professional and engaging, avoiding specific brand names.
  `;

  return `
  You are an expert Social Media Copywriter. Create 1 highly engaging, creative caption for a ${contentType} post about "${topic}".
  Target Platform: ${platform === 'both' ? 'Facebook & Instagram' : platform}
  ${brandContext}
  Post Description (CRITICAL PRIORITY): "${extraInstructions || 'No specific post description provided.'}"
  
  Writing Guidelines:
  - The caption must be creative and attention-grabbing. Use a strong hook at the beginning.
  - If the platform is "both" or includes Instagram, use formatting suitable for both (e.g., clean spacing, emojis used tastefully).
  - Strongly adhere to any offers, details, tone, or specific hashtags mentioned in the "Post Description".
  - Include 3-6 relevant, high-performing hashtags at the bottom.
  - Avoid overly robotic or generic AI language. Sound human, authentic, and on-brand.
  
  Format the response STRICTLY as a JSON object with a "captions" array containing exactly 1 string.
  Example: {"captions": ["Your highly engaging caption goes here\\n\\n#Hashtag1 #Hashtag2"]}
  `;
};
