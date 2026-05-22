# \* BrandPost AI – Image Generation Quality Improvement Plan

This document builds upon the existing \`BrandPost\_AI\_Image\_Generation\_Inference\_DataFlow.imd\` and proposes concrete, prioritized improvements to achieve **\*\*marketing‑grade, on‑brand Instagram images\*\*** with better text legibility, composition control, and reliability.

\---

# 1\. Critical Gaps (Must‑Fix for Production Quality)

## 🔴 1.1 Negative Prompt Baseline

**\*\*Problem:\*\*** The pipeline sends only a positive prompt. AI models often produce blurry text, deformed elements, watermarks, or visual noise that ruin marketing posts.    
**\*\*Solution:\*\*** Introduce a mandatory, well‑crafted negative prompt in every inference call.

**\*\*Implementation:\*\***  
\- Add a constant \`NEGATIVE\_PROMPT\_BASELINE\` to your API route.  
\- Append it to the model call (if the API supports \`negativePrompt\`) or inject it into the system instruction of the expansion LLM.  
\- For **\*\*Imagen\*\***, use the \`negativePrompt\` field in the config.  
\- For **\*\*Gemini image modality\*\***, prepend the negative constraints to the expanded prompt.

\`\`\`typescript  
// Example – add to route.ts

const NEGATIVE\_PROMPT\_BASELINE \= \`blurry, low quality, pixelated, jpeg artifacts, poorly drawn, deformed, extra limbs, fused fingers, bad anatomy, watermark, text artifacts, cropped text, illegible writing, misspelled words, oversaturated, harsh lighting, messy composition, cluttered background\`;

Expected impact: Eliminates \~70% of low‑quality outputs, especially text readability and unwanted artifacts.

---

### **🔴 1.2 Seed Storage & Iteration**

Problem: No way to regenerate an image while keeping the composition. Users can’t tweak a near‑perfect result.  
Solution:

* Save the seed (if returned by the model) and the exact expandedPrompt in the posts table.  
* Add a “Regenerate with same layout” button that resends the identical prompt and seed.

Database additions:

sql

ALTER TABLE posts ADD COLUMN generation\_seed BIGINT;  
ALTER TABLE posts ADD COLUMN expanded\_prompt TEXT;  
ALTER TABLE posts ADD COLUMN negative\_prompt TEXT;  
ALTER TABLE posts ADD COLUMN model\_used TEXT;

ALTER TABLE posts ADD COLUMN generation\_config JSONB;

Frontend/API flow:

* POST /api/generate/images/{postId}/remix – reuse expanded\_prompt, negative\_prompt, and seed.

Expected impact: Enables rapid refinement, drastically improving user satisfaction.

---

### **🔴 1.3 Brand Logo Integration (Actual Visual Ingestion)**

Problem: The expansion prompt says “integrate the visual style of this logo: \[URL\]”. AI models cannot fetch URLs. The instruction is ignored.  
Solution (2‑step):

1. Pre‑process the logo using Gemini’s vision to get a text description.  
2. Inject that description into the expansion prompt as a concrete visual instruction.

typescript

*// In route.ts, before calling the image model*  
if (brandDetails?.logo) {  
  const logoDescription \= await ai.models.generateContent({  
    model: 'gemini-2.5-flash',  
    contents: \[{  
      role: 'user',  
      parts: \[  
        { text: "Describe this logo in extreme detail: shape, colors, typography, iconography, style. Be specific enough to recreate its essence." },  
        { fileData: { mimeType: 'image/png', fileUri: brandDetails.logo } }  
      \]  
    }\]  
  });  
  *// Pass logoDescription.text into the expansion prompt*

}

Fallback (if vision not feasible): Manually extract brand colors and business name and rely on those.

Expected impact: The generated poster will actually reflect the brand’s visual identity, not just generic styling.

---

### **🔴 1.4 Platform‑Aware Aspect Ratios**

Problem: aspectRatio: '1:1' is hardcoded, but Instagram posts can be 1:1, 4:5, or 9:16. Facebook prefers 1:1 or 4:5. Incorrect ratios lead to cropping/distortion.  
Solution: Map platform to optimal dimensions and aspect ratios.

typescript

const PLATFORM\_RATIOS: Record\<string, string\> \= {  
  instagram: '1:1',      *// safe default*  
  facebook: '4:5',  
  both: '1:1',           *// square works everywhere*  
};

*// Also generate two images if both platforms selected, using Promise.all*

Store image dimensions in the post record for front‑end display.

Expected impact: Images fit perfectly in feeds/stories, no automatic cropping surprises.

---

### **🔴 1.5 Text Legibility Guard**

Problem: AI‑generated text on posters often contains gibberish, spelling errors, or unreadable small print. This destroys credibility.  
Solution: After generation, run a quick vision‑language check. If text is illegible, auto‑retry with stronger text emphasis.

typescript

const checkTextLegibility \= async (base64Image: string) \=\> {  
  const result \= await ai.models.generateContent({  
    model: 'gemini-2.5-flash',  
    contents: \[{  
      role: 'user',  
      parts: \[  
        { text: "Is all text in this image sharp, correctly spelled, and clearly readable? Answer JSON: {legible: boolean, issues: string}" },  
        { inlineData: { mimeType: 'image/png', data: base64Image } }  
      \]  
    }\]  
  });  
  return JSON.parse(result.text).legible;

};

Retry up to 2 times if illegible.

Expected impact: Virtually eliminates posts with unreadable text, making output truly marketing‑ready.

---

### **🔴 1.6 Error Recovery & Retry Logic**

Problem: Network hiccups or model overloads cause failures without fallback.  
Solution: Wrap the generation call in a retry function with exponential backoff and prompt emphasis on retries.

typescript

async function generateWithRetry(prompt: string, retries \= 3): Promise\<Buffer\> {  
  for (let i \= 0; i \< retries; i\++) {  
    try {  
      return await callImageModel(prompt);  
    } catch (err) {  
      if (i \=== retries \- 1) throw err;  
      prompt \= \`HIGHER QUALITY, SHARPER. ${prompt}\`;  
      await new Promise(r \=\> setTimeout(r, 2000 \* (i \+ 1)));  
    }  
  }

}

Expected impact: \>99% generation success rate, even under load.

---

## **2\. Important Enhancements (Strongly Recommended)**

### **🟡 2.1 Content‑Type Specific Instructions**

Problem: The expansion prompt treats festive, offer, and informational posts similarly.  
Solution: Inject a block of instructions tailored to contentType:

typescript

const CONTENT\_TYPE\_GUIDE: Record\<string, string\> \= {  
  offer: "BOLD discount text, clear CTA, high contrast, urgent but premium feel.",  
  festive: "Festive decorations, warm lighting, celebratory mood, rich colors.",  
  informational: "Editorial layout, plenty of whitespace, authoritative tone.",

};

Expected impact: Much more relevant visual mood and layout per post type.

---

### **🟡 2.2 Extended Metadata for Remixing**

Problem: No way to recreate an image or allow users to tweak one aspect.  
Solution: Store expandedPrompt, negativePrompt, seed, model, and full config in the database (already described in 1.2). Expose a remix API endpoint.

Expected impact: Users can iterate on a post without starting from scratch, dramatically improving the editing experience.

---

### **🟡 2.3 Intelligent Upscaling**

Problem: “Ultra‑HD” claims may not match actual output resolution.  
Solution: Post‑process all generated images with sharp to upscale to 2048×2048 (or the target platform’s native resolution) using Lanczos resampling and mild sharpening.

typescript

const upscaled \= await sharp(buffer)  
  .resize(2048, 2048, { kernel: 'lanczos3', fit: 'contain', background: { r: 255, g: 255, b: 255 } })  
  .sharpen()  
  .png({ quality: 100 })

  .toBuffer();

Expected impact: Crisp, print/feed‑ready quality without sacrificing generation speed.

---

### **🟡 2.4 User Feedback Loop**

Problem: No data on which outputs users actually use/download.  
Solution: Add a user\_rating column (1‑5) to the posts table and a simple 👍/👎 in the UI. Use this to fine‑tune prompts and model selection over time.

Expected impact: Continuous improvement of output quality based on real preferences.

---

## **3\. Implementation Priority Matrix**

| Priority | Improvement | Effort (hrs) | Quality Impact | User Impact |
| :---- | :---- | :---- | :---- | :---- |
| 🔴 P0 | Negative prompt baseline | 1 | \*\*\*\*\*  | High |
| 🔴 P0 | Seed storage & iteration | 2 | \*\*\*\*  | High |
| 🔴 P0 | Platform aspect ratios | 1.5 | \*\*\*\*  | High |
| 🔴 P0 | Error recovery/retry | 2 | \*\*\*  | Medium |
| 🔴 P0 | Brand logo description (vision) | 3 | \*\*\*\*\*  | Critical |
| 🟡 P1 | Text legibility guard | 4 | \*\*\*\*\*  | Critical |
| 🟡 P1 | Content‑type templates | 1.5 | \*\*\*  | Medium |
| 🟡 P1 | Extended metadata (remix API) | 2 | \*\*\*\*  | High |
| 🟢 P2 | Upscaling | 2 | \*\*  | Low |
| 🟢 P3 | User rating system | 3 | \*\* (long term)  | Low |

---

## **4\. Updated Architecture Touchpoints**

The existing flow remains, but with these injections:

1. Before Expansion Prompt:  
   * If logo URL exists → run vision description.  
   * Append NEGATIVE\_PROMPT\_BASELINE to the system instruction (or pass separately).  
2. During Expansion Prompt:  
   * Inject brand logo description.  
   * Inject content‑type specific design rules.  
   * Inject platform aspect ratio requirement.  
3. Model Inference:  
   * Use platform‑specific aspectRatio and dimensions.  
   * Pass negativePrompt if API supports it.  
   * Save seed and full prompt after generation.  
4. Post‑Generation:  
   * Text legibility check → retry if needed.  
   * Upscale to target resolution.  
   * Save extended metadata to DB.  
5. New Endpoints:  
   * POST /api/generate/images/{postId}/remix – regeneration with same seed/prompt.  
   * POST /api/posts/{postId}/rate – capture user feedback.

---

## **5\. Final Notes**

All improvements are backward‑compatible with your current schema and can be rolled out incrementally. The highest‑impact, lowest‑effort items (negative prompt, seed storage, aspect ratios) can be implemented in a single sprint and will immediately elevate the output quality to a level suitable for professional brand marketing on Instagram.

*Reference: Original inference document –* BrandPost\_AI\_Image\_Generation\_Inference\_DataFlow.imd

text

This \`.md\` file is ready to be shared with your development team. It clearly explains \*\*what\*\* needs to change, \*\*why\*\*, and \*\*how\*\* to implement it, with code snippets and a priority roadmap tailored for Instagram brand posts.

## 6\. Advanced Prompt Engineering for the Expansion LLM

These refinements target the \`getImageExpansionPrompt\` function (the system instructions you send to Gemini 2.5 Flash). They ensure the expanded prompt is optimally structured for the image model and produces on‑brand, high‑impact posters every time.

### 6.1 Structured Output with JSON Schema

**Why:** The current prompt asks for \`{"expandedPrompts": \[...\]}\` but doesn’t enforce a schema, risking malformed JSON or missing fields.  
**Enhancement:** Supply a strict JSON schema in the system prompt and instruct the LLM to always return valid JSON. Example:

```json
{
  "expandedPrompts": [
    "string" // exactly one prompt
  ],
  "design_rationale": "string", // for debugging
  "keywords_used": ["string"]
}
```

### 6.2 Few‑Shot Examples

**Why:** Without examples, the LLM may default to generic, low‑contrast descriptions.  
**Enhancement:** Include 2‑3 high‑quality example prompts in the system message that match different content types (e.g., an offer post, a festive post). Show the LLM the expected level of detail and vocabulary.  
*Example Offer Prompt:* "An ultra-premium, 8k marketing poster for a modern clothing brand. Deep obsidian background (\#1A1A1A). A golden spotlight illuminates a neatly folded stack of luxury apparel. Bold, razor-sharp white sans-serif text at the top: 'EXCLUSIVE DIWALI OFFER'. In the center, a large gold badge with clean serif text: '30% OFF'. Bottom footer: 'Use Code DIWALI30' in small, crisp gold letters. Cinematic depth of field, no clutter, minimalist luxury aesthetic."

### 6.3 Chain‑of-Thought Visual Reasoning

**Why:** A single‑shot prompt may miss important details or produce an unbalanced composition.  
**Enhancement:** Ask the LLM to first reason about the visual hierarchy, then generate the prompt.  
*Step 1:* Decide the visual hierarchy (what should the eye see first, second, third). *Step 2:* Plan the color zones and typography placement. *Step 3:* Write the final prompt using vivid, concrete visual terms.

### 6.4 Explicit Text Placement & Anchoring

**Why:** Marketing text (brand name, offer, CTA) often gets jumbled or misplaced.  
**Enhancement:** Force the LLM to describe exact positions and typography for every text element:

* Business name: Always placed at the very top or very bottom, in bold white/gold, large font.  
* Main offer text: Centered, occupying at least 30% of the image height.  
* Coupon code: Bottom centre, clean monospace or sans‑serif, clearly legible.  
* Add phrases like “perfectly centred”, “bottom‑left”, “prominent and unmissable”.

### 6.5 Style Library Based on Brand Tone

**Why:** “Elegant, luxury, minimalist” should map to concrete artistic styles that Imagen understands.  
**Enhancement:** Create a lookup table and inject the corresponding style keywords into the expansion prompt.

| Brand Tone | Injected Style Keywords |
| :---- | :---- |
| elegant, luxury | “cinematic lighting, high‑end fashion editorial, deep shadows, metallic accents” |
| playful, fun | “vibrant pop art, bold flat colors, dynamic composition, playful typography” |
| trustworthy, corporate | “clean corporate memphis design, soft gradients, professional, ample negative space” |

### 6.6 Negative Prompt Generation

**Why:** The expansion LLM can also anticipate what should NOT appear.  
**Enhancement:** Request the LLM to output a corresponding negativePrompt tailored to the specific image.

```json
{
  "expandedPrompts": ["..."],
  "negativePrompt": "cluttered background, deformed text, low contrast, cheap sales stickers, ..."
}
```

This can be merged with the baseline negative prompt you already maintain.

### 6.7 Temperature & Creativity Control

**Why:** Too high a temperature \= creative but unpredictable; too low \= generic.  
**Enhancement:** Use temperature: 0.8 for the expansion step (high enough for fresh ideas) but drop to 0.4 when re‑generating with a locked seed for fine‑tuning.

### 6.8 Dynamic Emphasis on extraInstructions

**Why:** The “Post Description” is critical but can be diluted by other context.  
**Enhancement:** In the system prompt, explicitly mark the extraInstructions as “HIGHEST PRIORITY – must be visually prominent”. Consider wrapping them in quotes to signal to the image model that these are literal text strings.

# 7\. Updated Expansion Prompt Template (with Enhancements)

Below is a revised skeleton for getImageExpansionPrompt. It incorporates the above techniques.

```
You are an Elite Creative Strategist and Graphic Designer. Your task is to generate ONE detailed, high‑impact image prompt for a marketing poster. You MUST output a JSON object with exactly the following structure:
{ "expandedPrompts": ["prompt text"], "negativePrompt": "string", "design_rationale": "string" }
Follow this step‑by‑step reasoning before writing the prompt:
1. Identify the visual hierarchy (what catches the eye first, second, third).
2. Assign brand colors (#primary, #secondary, #accent) to specific zones.
3. Plan typography: business name location, offer size/position, coupon code placement.
4. Select artistic style keywords based on brand tone (use table: elegant→cinematic lighting, ...).
5. Write the prompt using ultra‑specific visual descriptors (lighting, materials, camera angle).
The prompt MUST:
- Place business name at the top in bold, high‑contrast font.
- Make the offer/coupon code from the Post Description the largest, most prominent text.
- Use the exact brand colors provided.
- Include negative prompt entries that exclude common artifacts.
Post Description (HIGHEST PRIORITY): """{{extraInstructions}}"""
Brand Tone: {{brandTone}}
Color Palette: Primary {{primary}}, Secondary {{secondary}}, Accent {{accent}}
Example of a top‑quality prompt: "(Insert few‑shot example here)"
Now generate the JSON.
```

Add these sections to your existing improvement document under a new heading “Prompt Engineering Upgrades” and link them to the expansion phase in the architecture flow.  
This extension gives your team a concrete, repeatable way to squeeze much higher quality out of the same LLM \+ Imagen pipeline. If you’d like, I can also provide the actual TypeScript/JavaScript code changes to \`prompts.ts\` that implement these additions.  
