import { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Plus, 
  Mic, 
  FileAudio, 
  Link as LinkIcon, 
  X,
  Volume2
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";

export default function VoiceNotes() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 tracking-tight">Voice Notes</h1>
          <p className="text-slate-500 mt-1">Turn your voice notes into engaging LinkedIn content</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger asChild>
            <Button className="bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-full px-6 gap-2">
              <Plus className="w-5 h-5" />
              Add Voice Note
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden rounded-2xl border-none shadow-2xl">
            <DialogHeader className="p-6 pb-0 flex flex-row items-center justify-between">
              <DialogTitle className="text-2xl font-bold text-slate-900">Add Voice Note</DialogTitle>
            </DialogHeader>
            
            <div className="p-8 pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="hover-elevate cursor-pointer border-slate-100 group transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#00a0dc] group-hover:bg-[#00a0dc] group-hover:text-white transition-colors">
                    <Mic className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Record your Voice</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Tap to begin capturing your thoughts—speak freely!
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer border-slate-100 group transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#00a0dc] group-hover:bg-[#00a0dc] group-hover:text-white transition-colors">
                    <Plus className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Upload Audio File</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Select an audio file from your device to share your message.
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="hover-elevate cursor-pointer border-slate-100 group transition-all">
                <CardContent className="p-6 flex flex-col items-center text-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-blue-50 flex items-center justify-center text-[#00a0dc] group-hover:bg-[#00a0dc] group-hover:text-white transition-colors">
                    <LinkIcon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900">Share a Link</h3>
                    <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                      Create public links for recording the audio.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="mt-20 flex flex-col items-center justify-center text-center py-20 bg-slate-50/50 rounded-3xl border-2 border-dashed border-slate-200">
        <div className="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Volume2 className="w-10 h-10 text-slate-300" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">No voice notes created yet!!</h2>
        <p className="text-slate-500 mt-2 max-w-sm">Convert voice notes to Linkedin posts</p>
        
        <Button 
          className="mt-8 bg-[#00a0dc] hover:bg-[#008dbf] text-white rounded-full px-8 h-12 gap-2 shadow-lg shadow-blue-500/20"
          onClick={() => setIsOpen(true)}
        >
          <Plus className="w-5 h-5" />
          Add Voice Note
        </Button>
      </div>
    </div>
  );
}
