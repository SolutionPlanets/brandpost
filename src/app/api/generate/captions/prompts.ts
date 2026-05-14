export const getCaptionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => `
  Create 3 engaging social media captions for a ${contentType} post about "${topic}".
  Platform: ${platform}
  Brand Name: ${brandDetails.businessName}
  Brand Description: ${brandDetails.brandDescription}
  Tone: ${brandDetails.brandTone}
  Post Generation Prompt (HIGH WEIGHTAGE): "${extraInstructions}"
  
  CRITICAL: Prioritize the "Post Generation Prompt" above all else. If the user provided specific details, tone, or hashtags, they MUST be included in the captions.
  
  Format the response as a JSON object with a "captions" array of exactly 3 strings.
  Example: {"captions": ["Caption 1", "Caption 2", "Caption 3"]}
`;
