// In-memory carousel store for passing data between pages
// This persists across route changes in the SPA but clears on page refresh

interface ProcessedSlide {
  number: number;
  rawText: string;
  finalText: string;
  imagePrompt: string;
  layout: string;
  base64Image?: string;
  imageUrl?: string;
}

interface SlideMessage {
  id: number;
  text: string;
}

interface CarouselData {
  title: string;
  carouselType: string;
  aiProvider: string;
  slides: SlideMessage[];
  processedSlides: ProcessedSlide[];
  step: string;
  savedAt: number;
}

let carouselData: CarouselData | null = null;

export function setCarouselData(data: CarouselData) {
  carouselData = data;
}

export function getCarouselData(): CarouselData | null {
  return carouselData;
}

export function clearCarouselData() {
  carouselData = null;
}

export function hasCarouselImages(): boolean {
  return carouselData?.processedSlides?.some(slide => slide.base64Image) || false;
}
