import { db } from "../lib/firebase.ts";
import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  deleteDoc,
  serverTimestamp 
} from "firebase/firestore";

/**
 * Generates a premium Supergrow-style SVG thumbnail
 */
function generateThumbnailSvg(templateName, layout, slidesCount) {
  const layouts = {
    cover_bold: { bg: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", accent: "#38bdf8" },
    cover_minimal: { bg: "#ffffff", accent: "#0f172a", text: "#0f172a" },
    cover_split: { bg: "linear-gradient(90deg, #0ea5e9 0%, #0ea5e9 50%, #ffffff 50%, #ffffff 100%)", accent: "#ffffff" },
    cover_quote: { bg: "#f8fafc", accent: "#0ea5e9", text: "#0f172a" },
    cover_stats: { bg: "#0f172a", accent: "#10b981" },
    cover_story: { bg: "linear-gradient(135deg, #f43f5e 0%, #fb7185 100%)", accent: "#ffffff" },
    framework_grid: { bg: "#ffffff", accent: "#0ea5e9" },
    howto_steps: { bg: "#f0fdf4", accent: "#10b981" },
    mistakes_warning: { bg: "#fef2f2", accent: "#ef4444" },
    stats_clean: { bg: "#ffffff", accent: "#6366f1" }
  };

  const style = layouts[layout] || layouts.cover_bold;
  const isDark = style.bg.includes("#0f172a") || style.bg.includes("#1e293b") || style.bg.includes("#f43f5e");
  const textColor = style.text || (isDark ? "#ffffff" : "#0f172a");
  const secondaryColor = isDark ? "rgba(255,255,255,0.6)" : "rgba(15,23,42,0.6)";

  const svg = `
    <svg width="400" height="500" viewBox="0 0 400 500" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          ${style.bg.includes("gradient") ? 
            `<stop offset="0%" style="stop-color:${style.bg.match(/#[a-f0-9]{6}/gi)[0]}" />
             <stop offset="100%" style="stop-color:${style.bg.match(/#[a-f0-9]{6}/gi)[1]}" />` :
            `<stop offset="0%" style="stop-color:${style.bg}" />
             <stop offset="100%" style="stop-color:${style.bg}" />`
          }
        </linearGradient>
      </defs>
      
      <rect width="400" height="500" fill="url(#bgGrad)" rx="12" />
      
      <!-- Decorations based on layout -->
      ${layout === 'framework_grid' ? `
        <rect x="40" y="280" width="150" height="80" fill="${style.accent}" fill-opacity="0.1" rx="8" />
        <rect x="210" y="280" width="150" height="80" fill="${style.accent}" fill-opacity="0.1" rx="8" />
      ` : ''}

      ${layout === 'howto_steps' ? `
        <circle cx="60" cy="300" r="15" fill="${style.accent}" />
        <rect x="90" y="295" width="200" height="10" fill="${style.accent}" fill-opacity="0.2" rx="5" />
      ` : ''}

      <!-- Header area -->
      <circle cx="50" cy="50" r="15" fill="${style.accent}" fill-opacity="0.2" />
      <rect x="75" y="42" width="100" height="8" fill="${textColor}" fill-opacity="0.2" rx="4" />
      <rect x="75" y="55" width="60" height="6" fill="${textColor}" fill-opacity="0.1" rx="3" />

      <!-- Main Content -->
      <text x="40" y="160" font-family="system-ui, sans-serif" font-weight="800" font-size="36" fill="${textColor}" style="line-height:1.2">
        <tspan x="40" dy="0">${templateName.split(' ')[0]}</tspan>
        <tspan x="40" dy="45">${templateName.split(' ').slice(1).join(' ') || 'Strategy'}</tspan>
      </text>

      <text x="40" y="260" font-family="system-ui, sans-serif" font-weight="500" font-size="16" fill="${secondaryColor}">
        Learn the proven framework
      </text>

      <!-- Swipe Indicator -->
      <g transform="translate(320, 440)">
        <text x="0" y="0" font-family="system-ui, sans-serif" font-weight="700" font-size="12" fill="${textColor}" text-anchor="end">Swipe</text>
        <path d="M5 0 L15 0 M10 -5 L15 0 L10 5" stroke="${style.accent}" stroke-width="2" fill="none" />
      </g>

      <!-- Author Footer -->
      <rect x="40" y="440" width="30" height="30" fill="${style.accent}" rx="15" />
      <text x="80" y="452" font-family="system-ui, sans-serif" font-weight="700" font-size="12" fill="${textColor}">Your Name</text>
      <text x="80" y="465" font-family="system-ui, sans-serif" font-weight="500" font-size="10" fill="${secondaryColor}">@handle</text>
    </svg>
  `.trim().replace(/\s+/g, ' ');

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export async function resetAndReseedTemplates() {
  const templatesRef = collection(db, "templates");
  try {
    const snapshot = await getDocs(templatesRef);
    console.log(`Deleting \${snapshot.size} templates...`);
    const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
    await Promise.all(deletePromises);
    
    return await seedCarouselTemplates();
  } catch (error) {
    console.error("Error resetting templates:", error);
    throw error;
  }
}

export async function seedCarouselTemplates() {
  const templates = [
    { id: "cover_bold_001", name: "Bold Authority", slidesCount: 5, layout: "cover_bold", isNew: true,
      slideLayouts: ["cover", "bullets", "steps", "proof", "cta"],
      theme: { primaryColor: "#38bdf8", backgroundColor: "#0f172a", textColor: "#ffffff", secondaryTextColor: "rgba(255,255,255,0.7)", cardBg: "rgba(255,255,255,0.05)", accentColor: "#10b981", isDark: true }
    },
    { id: "minimal_001", name: "Minimalist Guide", slidesCount: 7, layout: "cover_minimal",
      slideLayouts: ["cover", "bullets", "bullets", "steps", "steps", "proof", "cta"],
      theme: { primaryColor: "#0f172a", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false }
    },
    { id: "split_001", name: "The Split Contrast", slidesCount: 5, layout: "cover_split", isNew: true,
      slideLayouts: ["cover", "bullets", "quote", "bullets", "cta"],
      theme: { primaryColor: "#0ea5e9", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false }
    },
    { id: "quote_001", name: "Viral Quotes", slidesCount: 3, layout: "cover_quote",
      slideLayouts: ["cover", "quote", "cta"],
      theme: { primaryColor: "#0ea5e9", backgroundColor: "#f8fafc", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#ffffff", accentColor: "#0ea5e9", isDark: false }
    },
    { id: "stats_001", name: "Data Insights", slidesCount: 6, layout: "cover_stats",
      slideLayouts: ["cover", "proof", "proof", "bullets", "bullets", "cta"],
      theme: { primaryColor: "#10b981", backgroundColor: "#0f172a", textColor: "#ffffff", secondaryTextColor: "rgba(255,255,255,0.7)", cardBg: "rgba(255,255,255,0.05)", accentColor: "#10b981", isDark: true }
    },
    { id: "story_001", name: "Personal Story", slidesCount: 8, layout: "cover_story",
      slideLayouts: ["cover", "bullets", "bullets", "quote", "bullets", "bullets", "proof", "cta"],
      theme: { primaryColor: "#fb7185", backgroundColor: "#0f172a", textColor: "#ffffff", secondaryTextColor: "rgba(255,255,255,0.7)", cardBg: "rgba(255,255,255,0.05)", accentColor: "#fb7185", isDark: true }
    },
    { id: "framework_001", name: "Framework Grid", slidesCount: 5, layout: "framework_grid", isNew: true,
      slideLayouts: ["cover", "bullets", "bullets", "proof", "cta"],
      theme: { primaryColor: "#0ea5e9", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false }
    },
    { id: "howto_001", name: "Step-by-Step", slidesCount: 6, layout: "howto_steps",
      slideLayouts: ["cover", "steps", "steps", "steps", "proof", "cta"],
      theme: { primaryColor: "#10b981", backgroundColor: "#f0fdf4", textColor: "#0f172a", secondaryTextColor: "#166534", cardBg: "#ffffff", accentColor: "#10b981", isDark: false }
    },
    { id: "mistakes_001", name: "Mistakes Alert", slidesCount: 5, layout: "mistakes_warning",
      slideLayouts: ["cover", "bullets", "bullets", "proof", "cta"],
      theme: { primaryColor: "#ef4444", backgroundColor: "#fef2f2", textColor: "#991b1b", secondaryTextColor: "#b91c1c", cardBg: "#ffffff", accentColor: "#ef4444", isDark: false }
    },
    { id: "stats_clean_001", name: "Growth Charts", slidesCount: 5, layout: "stats_clean",
      slideLayouts: ["cover", "proof", "proof", "bullets", "cta"],
      theme: { primaryColor: "#6366f1", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#4f46e5", cardBg: "#f8fafc", accentColor: "#6366f1", isDark: false }
    },
    { id: "pro_master_001", name: "The Masterclass", slidesCount: 10, layout: "cover_bold", isNew: true,
      slideLayouts: ["cover", "bullets", "bullets", "steps", "steps", "quote", "bullets", "proof", "proof", "cta"],
      theme: { primaryColor: "#38bdf8", backgroundColor: "#0f172a", textColor: "#ffffff", secondaryTextColor: "rgba(255,255,255,0.7)", cardBg: "rgba(255,255,255,0.05)", accentColor: "#10b981", isDark: true }
    },
    { id: "simple_pro_001", name: "Simple Professional", slidesCount: 5, layout: "cover_minimal",
      slideLayouts: ["cover", "bullets", "bullets", "proof", "cta"],
      theme: { primaryColor: "#0f172a", backgroundColor: "#ffffff", textColor: "#0f172a", secondaryTextColor: "#64748b", cardBg: "#f8fafc", accentColor: "#0ea5e9", isDark: false }
    }
  ];

  const commonFields = ["title", "description", "authorName", "authorHandle"];
  const templatesRef = collection(db, "templates");

  try {
    const existingDocs = await getDocs(templatesRef);
    if (existingDocs.size > 0) {
      console.log("Templates already exist. Skipping seed.");
      return { success: true, count: 0, message: "Templates already exist." };
    }

    console.log("Seeding premium templates into Firestore...");
    let count = 0;

    for (const t of templates) {
      try {
        const templateData = {
          name: t.name,
          type: "carousel",
          slidesCount: t.slidesCount,
          layout: t.layout,
          slideLayouts: t.slideLayouts || [],
          theme: t.theme || null,
          thumbnail: generateThumbnailSvg(t.name, t.layout, t.slidesCount),
          fields: commonFields,
          defaults: {
            title: t.name,
            description: "A professional LinkedIn carousel template.",
            authorName: "Your Name",
            authorHandle: "@yourhandle"
          },
          status: "active",
          isPublic: true,
          isNew: !!t.isNew,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        };

        await setDoc(doc(db, "templates", t.id), templateData);
        count++;
      } catch (e) {
        console.error(`Failed to seed \${t.id}:`, e);
      }
    }

    console.log(`Successfully seeded \${count} premium templates.`);
    return { success: true, count, message: `Successfully seeded \${count} premium templates.` };
  } catch (error) {
    console.error("Error seeding templates:", error);
    throw error;
  }
}
