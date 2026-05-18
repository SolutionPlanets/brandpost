export const getCaptionPrompt = (brandDetails: any, topic: string, contentType: string, platform: string, extraInstructions: string) => `
  Create 1 highly engaging social media caption for a ${contentType} post about "${topic}".
  Platform: ${platform}
  Brand Name: ${brandDetails.businessName}
  Brand Description: ${brandDetails.brandDescription}
  Tone: ${brandDetails.brandTone}
  Extra Instructions (HIGH WEIGHTAGE): "${extraInstructions}"
  
  CRITICAL: Prioritize the "Extra Instructions" above all else. If the user provided specific details, tone, or hashtags, they MUST be included in the caption.
  
  Format the response as a JSON object with a "captions" array of exactly 1 string.
  Example: {"captions": ["Your perfect caption here"]}
`;
