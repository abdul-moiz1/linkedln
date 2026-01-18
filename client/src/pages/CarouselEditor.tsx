import { useState, useEffect } from "react";
import CarouselHeader from "@/components/CarouselHeader";
import CarouselSidebar from "@/components/CarouselSidebar";
import SlideEditor from "@/components/SlideEditor";
import CarouselPreview from "@/components/CarouselPreview";
import SlideNavigation from "@/components/SlideNavigation";
import { useToast } from "@/hooks/use-toast";

const INITIAL_STATE = {
  meta: {
    title: "Basic #22",
    lastSaved: "Jan 15, 2026, 10:14 AM",
  },
  profile: {
    name: "Jon Snow",
    handle: "@jon-snow",
    avatar: "",
  },
  theme: {
    backgroundMode: "solid",
    backgroundColor: "#27115F",
    primaryColor: "#D9D6FE",
    secondaryColor: "#FFFFFF",
    primaryFont: "Onest",
    secondaryFont: "Inter",
  },
  slides: [
    { title: "The Title of Your Visual Post Here", description: "Lorem ipsum: Lorem ipsum dolor sit amet, consetetur sadipscing." },
    { title: "Slide 2 Title", description: "This is slide 2 description." },
    { title: "Slide 3 Title", description: "This is slide 3 description." },
    { title: "Slide 4 Title", description: "This is slide 4 description." },
    { title: "Slide 5 Title", description: "This is slide 5 description." },
  ],
};

export default function CarouselEditor() {
  const { toast } = useToast();
  const [carousel, setCarousel] = useState(INITIAL_STATE);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  useEffect(() => {
    const saved = localStorage.getItem("carousel_editor_data");
    if (saved) {
      try {
        setCarousel(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to load carousel data", e);
      }
    }
  }, []);

  const handleSave = () => {
    const now = new Date().toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "numeric",
    });
    const updatedCarousel = {
      ...carousel,
      meta: { ...carousel.meta, lastSaved: now }
    };
    setCarousel(updatedCarousel);
    localStorage.setItem("carousel_editor_data", JSON.stringify(updatedCarousel));
    toast({
      title: "Saved!",
      description: "Draft saved to local storage."
    });
  };

  const handleContinue = () => {
    toast({
      title: "Success",
      description: "Carousel saved. Ready to publish!"
    });
  };

  const updateSlideContent = (field, value) => {
    const newSlides = [...carousel.slides];
    newSlides[currentSlideIndex] = {
      ...newSlides[currentSlideIndex],
      [field]: value
    };
    setCarousel({ ...carousel, slides: newSlides });
  };

  return (
    <div className="min-h-screen bg-white flex flex-col overflow-hidden text-[#1a1a1a]">
      <CarouselHeader 
        title={carousel.meta.title}
        lastSaved={carousel.meta.lastSaved}
        onSave={handleSave}
        onContinue={handleContinue}
      />
      
      <main className="flex flex-1 relative h-[calc(100vh-65px-64px)] bg-[#f8fafc]">
        <div className="w-[320px] border-r bg-white overflow-y-auto scrollbar-none">
          <CarouselSidebar 
            carousel={carousel} 
            setCarousel={setCarousel} 
          />
        </div>
        
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto p-8 flex justify-center scrollbar-none">
            <div className="w-full max-w-2xl">
              <SlideEditor 
                slide={carousel.slides[currentSlideIndex]}
                index={currentSlideIndex}
                onUpdate={updateSlideContent}
              />
            </div>
          </div>
          
          <div className="flex-1 bg-[#f1f5f9] border-l overflow-y-auto hidden lg:flex items-center justify-center p-8 scrollbar-none">
            <CarouselPreview 
              carousel={carousel}
              currentSlideIndex={currentSlideIndex}
            />
          </div>
        </div>
      </main>

      <div className="h-16 border-t bg-white flex items-center justify-center">
        <SlideNavigation 
          currentIndex={currentSlideIndex}
          totalSlides={carousel.slides.length}
          onPrev={() => setCurrentSlideIndex(Math.max(0, currentSlideIndex - 1))}
          onNext={() => setCurrentSlideIndex(Math.min(carousel.slides.length - 1, currentSlideIndex + 1))}
        />
      </div>
    </div>
  );
}
