export function buildCarouselEmbeddingText(doc: any): string {
  const parts: string[] = [];

  if (doc.title) {
    parts.push(`Title: ${doc.title}`);
  }

  if (doc.description) {
    parts.push(`Description: ${doc.description}`);
  }

  if (doc.category) {
    parts.push(`Category: ${doc.category}`);
  }

  if (doc.slides && Array.isArray(doc.slides)) {
    const slideTexts = doc.slides
      .map((slide: any, index: number) => {
        const slideContent: string[] = [];
        
        if (slide.rawText) slideContent.push(slide.rawText);
        if (slide.finalText) slideContent.push(slide.finalText);
        if (slide.placeholder?.title) slideContent.push(slide.placeholder.title);
        if (slide.placeholder?.subtitle) slideContent.push(slide.placeholder.subtitle);
        if (slide.placeholder?.body) slideContent.push(slide.placeholder.body);
        if (slide.content) slideContent.push(slide.content);
        if (slide.text) slideContent.push(slide.text);
        
        return slideContent.length > 0 ? `Slide ${index + 1}: ${slideContent.join(" ")}` : null;
      })
      .filter(Boolean);

    if (slideTexts.length > 0) {
      parts.push(slideTexts.join(" | "));
    }
  }

  if (doc.postContent) {
    parts.push(`Post: ${doc.postContent}`);
  }

  if (doc.hook) {
    parts.push(`Hook: ${doc.hook}`);
  }

  if (doc.tags && Array.isArray(doc.tags)) {
    parts.push(`Tags: ${doc.tags.join(", ")}`);
  }

  return parts.join("\n").trim() || "Untitled carousel";
}

export function buildTemplateEmbeddingText(doc: any): string {
  const parts: string[] = [];

  const name = doc.templateName || doc.name || doc.title;
  if (name) {
    parts.push(`Name: ${name}`);
  }

  if (doc.description) {
    parts.push(`Description: ${doc.description}`);
  }

  if (doc.category) {
    parts.push(`Category: ${doc.category}`);
  }

  if (doc.tags && Array.isArray(doc.tags)) {
    parts.push(`Tags: ${doc.tags.join(", ")}`);
  }

  if (doc.style) {
    parts.push(`Style: ${doc.style}`);
  }

  if (doc.theme) {
    if (typeof doc.theme === "string") {
      parts.push(`Theme: ${doc.theme}`);
    } else if (doc.theme.name) {
      parts.push(`Theme: ${doc.theme.name}`);
    }
  }

  if (doc.layout) {
    parts.push(`Layout: ${doc.layout}`);
  }

  if (doc.slides && Array.isArray(doc.slides)) {
    const slideTexts = doc.slides
      .map((slide: any, index: number) => {
        const slideContent: string[] = [];
        if (slide.placeholder?.title) slideContent.push(slide.placeholder.title);
        if (slide.placeholder?.body) slideContent.push(slide.placeholder.body);
        return slideContent.length > 0 ? `Slide ${index + 1}: ${slideContent.join(" ")}` : null;
      })
      .filter(Boolean);

    if (slideTexts.length > 0) {
      parts.push(slideTexts.join(" | "));
    }
  }

  return parts.join("\n").trim() || "Untitled template";
}

export function buildEmbeddingText(collection: string, doc: any): string {
  if (collection === "carousels") {
    return buildCarouselEmbeddingText(doc);
  } else {
    return buildTemplateEmbeddingText(doc);
  }
}
