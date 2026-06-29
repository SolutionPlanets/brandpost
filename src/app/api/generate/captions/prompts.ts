export const getCaptionPrompt = (
  brandDetails: any,
  topic: string,
  contentType: string,
  platform: string,
  extraInstructions: string,
  wordCount?: number,
  hashtagCount?: number,
  campaignExpiry?: string,
  mentionWebsiteInCaption?: boolean
) => {
  const brandContext = brandDetails ? `
  BRAND CONTEXT (strictly follow):
  - Brand Name: "${brandDetails.businessName}"
  - Brand Description: ${brandDetails.brandDescription || 'Not provided'}
  - Tone: ${brandDetails.brandTone || 'Professional'}
  - Industry: ${brandDetails.industry || 'Not specified'}
  - Target Audience: ${brandDetails.brandAudience || 'General audience'}
  - Website: ${brandDetails.websiteUrl || 'Not provided'}
  ${brandDetails.phrasesToInclude ? `- MUST INCLUDE these phrases/words: "${brandDetails.phrasesToInclude}"` : ''}
  ${brandDetails.phrasesToAvoid ? `- MUST AVOID these phrases/words: "${brandDetails.phrasesToAvoid}"` : ''}
  ` : `
  NO BRAND KIT SELECTED. Keep the caption professional and engaging, avoiding specific brand names.
  `;

  const targetWordCount = wordCount || 100;
  const targetHashtagCount = hashtagCount !== undefined ? hashtagCount : 6;

  const fomoContext = campaignExpiry
    ? `\n  URGENCY / FOMO: This campaign expires on ${campaignExpiry}. Weave urgency naturally into the caption (e.g., "Don't miss out!", "Offer ends ${campaignExpiry}", "Limited time only!"). Do NOT make it sound spammy.`
    : '';

  return `
  You are an expert Social Media Copywriter. Create 1 highly engaging, creative caption for a ${contentType} post about "${topic}".
  Target Platform: ${platform === 'both' ? 'Facebook & Instagram' : platform}
  ${brandContext}
  Post Description (CRITICAL PRIORITY): "${extraInstructions || 'No specific post description provided.'}"
  ${fomoContext}

  STRUCTURAL RULES:
  - Target word count: approximately ${targetWordCount} words (±20%).
  - Include exactly ${targetHashtagCount} relevant, high-performing hashtags at the bottom.

  Writing Guidelines:
  - The caption must be creative and attention-grabbing. Use a strong hook at the beginning.
  - If the platform is "both" or includes Instagram, use formatting suitable for both (e.g., clean spacing, emojis used tastefully).
  - Strongly adhere to any offers, details, tone, or specific hashtags mentioned in the "Post Description".
  - If "MUST INCLUDE" phrases are listed above, weave them naturally into the caption body. DO NOT use markdown formatting (such as **bold**) around these phrases.
  - If "MUST AVOID" phrases are listed above, never use those words or synonyms.
  ${mentionWebsiteInCaption && brandDetails?.websiteUrl ? `- CRITICAL LINK RULE: You MUST append the website link "${brandDetails.websiteUrl}" to the end of the caption text (before the hashtags) as a clear call to action.` : ''}
  - Avoid overly robotic or generic AI language. Sound human, authentic, and on-brand.
  
  Format the response STRICTLY as a JSON object with a "captions" array containing exactly 1 string.
  Example: {"captions": ["Your highly engaging caption goes here\\n\\n#Hashtag1 #Hashtag2"]}
  `;
};
