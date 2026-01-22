export const carouselTemplates = [
  {
    id: "basic_001",
    name: "Basic #1",
    type: "carousel",
    status: "active",
    slidesCount: 1,
    thumbnail: "https://images.unsplash.com/photo-1611162617213-7d7a39e9b1d7?auto=format&fit=crop&w=400&q=80",
    layout: "basic_cover",
    fields: ["title", "description", "authorName", "authorHandle"],
    defaults: {
      title: "Your Title Here",
      description: "Your description here"
    },
    isPublic: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "basic_002",
    name: "Basic #2",
    type: "carousel",
    status: "active",
    slidesCount: 5,
    thumbnail: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=400&q=80",
    layout: "basic_modern",
    fields: ["title", "description", "authorName", "authorHandle"],
    defaults: {
      title: "Strategic Insight",
      description: "Leadership is about taking care of those in your charge."
    },
    isPublic: true,
    createdAt: new Date().toISOString()
  }
];
