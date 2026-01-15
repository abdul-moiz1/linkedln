import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { 
  Plus, 
  Image as ImageIcon, 
  Trash2, 
  Upload,
  User,
  Palette,
  Type
} from "lucide-react";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function CarouselSidebar({ carousel, setCarousel }) {
  const updateProfile = (field, value) => {
    setCarousel({
      ...carousel,
      profile: { ...carousel.profile, [field]: value }
    });
  };

  const updateTheme = (field, value) => {
    setCarousel({
      ...carousel,
      theme: { ...carousel.theme, [field]: value }
    });
  };

  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        updateProfile('avatar', reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const colors = [
    "#27115F", "#1e293b", "#0f172a", "#00a0dc", 
    "#f43f5e", "#10b981", "#6366f1", "#ffffff"
  ];

  const fonts = ["Onest", "Inter", "Poppins", "Roboto", "Montserrat"];

  return (
    <aside className="w-80 h-[calc(100vh-65px)] overflow-y-auto border-r bg-white p-6 space-y-8 scrollbar-thin">
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-1.5 bg-blue-50 rounded-lg">
            <Plus className="w-4 h-4 text-blue-600" />
          </div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Brand Kit</h2>
        </div>
        <Card className="p-4 bg-slate-50/50 border-dashed border-2 flex flex-col items-center text-center space-y-3">
          <div className="p-3 bg-white rounded-full shadow-sm border">
            <ImageIcon className="w-6 h-6 text-slate-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900">No brand kit found</p>
            <p className="text-xs text-slate-500 mt-1">Select brand kit to get your brand details automatically applied.</p>
          </div>
          <Button variant="outline" size="sm" className="w-full text-blue-600 border-blue-200 hover:bg-blue-50">
            <Plus className="w-4 h-4 mr-1" />
            Create Brand Kit
          </Button>
        </Card>
      </section>

      <div className="h-px bg-slate-100" />

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <User className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Profile</h2>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600">Your Name</Label>
            <Input 
              value={carousel.profile.name} 
              onChange={(e) => updateProfile('name', e.target.value)}
              className="rounded-lg h-10"
            />
          </div>

          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-600">Profile Pic</Label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-full border-2 border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden shrink-0 shadow-inner">
                {carousel.profile.avatar ? (
                  <img src={carousel.profile.avatar} className="w-full h-full object-cover" alt="Profile" />
                ) : (
                  <User className="w-8 h-8 text-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <Button variant="outline" size="sm" className="relative h-9 px-4 font-semibold">
                  <Upload className="w-3.5 h-3.5 mr-2" />
                  Upload
                  <input 
                    type="file" 
                    className="absolute inset-0 opacity-0 cursor-pointer" 
                    accept="image/*"
                    onChange={handleAvatarUpload}
                  />
                </Button>
                {carousel.profile.avatar && (
                  <Button variant="ghost" size="sm" onClick={() => updateProfile('avatar', '')} className="text-red-500 hover:text-red-600 hover:bg-red-50 h-9 px-4 font-semibold">
                    <Trash2 className="w-3.5 h-3.5 mr-2" />
                    Remove
                  </Button>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600">Handle</Label>
            <Input 
              value={carousel.profile.handle} 
              onChange={(e) => updateProfile('handle', e.target.value)}
              placeholder="@username"
              className="rounded-lg h-10"
            />
          </div>
        </div>
      </section>

      <div className="h-px bg-slate-100" />

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Palette className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Theme</h2>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600">Background</Label>
            <Tabs value={carousel.theme.backgroundMode} onValueChange={(v) => updateTheme('backgroundMode', v)} className="w-full">
              <TabsList className="grid w-full grid-cols-2 p-1 bg-slate-100 rounded-lg">
                <TabsTrigger value="solid" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Solid</TabsTrigger>
                <TabsTrigger value="image" className="rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm text-xs font-bold">Image</TabsTrigger>
              </TabsList>
            </Tabs>
            
            {carousel.theme.backgroundMode === 'solid' ? (
              <div className="space-y-3 pt-2">
                <div className="grid grid-cols-4 gap-2">
                  {colors.map(color => (
                    <button
                      key={color}
                      className={`w-full aspect-square rounded-lg border-2 transition-all ${carousel.theme.backgroundColor === color ? 'border-blue-500 scale-110 shadow-md' : 'border-transparent shadow-sm hover:scale-105'}`}
                      style={{ backgroundColor: color }}
                      onClick={() => updateTheme('backgroundColor', color)}
                    />
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input 
                    value={carousel.theme.backgroundColor} 
                    onChange={(e) => updateTheme('backgroundColor', e.target.value)}
                    className="flex-1 font-mono uppercase h-10"
                  />
                  <div className="w-10 h-10 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: carousel.theme.backgroundColor }} />
                </div>
              </div>
            ) : (
              <div className="pt-2">
                <Card className="p-4 border-dashed border-2 flex flex-col items-center justify-center text-center bg-slate-50 hover:bg-slate-100/50 transition-colors">
                  <Upload className="w-6 h-6 text-slate-400 mb-2" />
                  <p className="text-[10px] font-bold text-slate-500 uppercase">Click to upload bg image</p>
                </Card>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Primary</Label>
              <div className="flex gap-2">
                <Input 
                  value={carousel.theme.primaryColor} 
                  onChange={(e) => updateTheme('primaryColor', e.target.value)}
                  className="font-mono uppercase text-xs px-2 h-9"
                />
                <div className="w-9 h-9 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: carousel.theme.primaryColor }} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-600">Secondary</Label>
              <div className="flex gap-2">
                <Input 
                  value={carousel.theme.secondaryColor} 
                  onChange={(e) => updateTheme('secondaryColor', e.target.value)}
                  className="font-mono uppercase text-xs px-2 h-9"
                />
                <div className="w-9 h-9 rounded-lg border shadow-sm shrink-0" style={{ backgroundColor: carousel.theme.secondaryColor }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="h-px bg-slate-100" />

      <section className="space-y-6">
        <div className="flex items-center gap-2 mb-4">
          <Type className="w-4 h-4 text-slate-600" />
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-800">Typography</h2>
        </div>
        
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600">Primary Font (Titles)</Label>
            <Select value={carousel.theme.primaryFont} onValueChange={(v) => updateTheme('primaryFont', v)}>
              <SelectTrigger className="rounded-lg h-10 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map(font => <SelectItem key={font} value={font} className="font-medium">{font}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-600">Secondary Font (Body)</Label>
            <Select value={carousel.theme.secondaryFont} onValueChange={(v) => updateTheme('secondaryFont', v)}>
              <SelectTrigger className="rounded-lg h-10 font-medium">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fonts.map(font => <SelectItem key={font} value={font} className="font-medium">{font}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>
    </aside>
  );
}
