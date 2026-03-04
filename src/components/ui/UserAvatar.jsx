import React from 'react';
import { useGamification } from '@/components/hooks/useGamification';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerFooter, DrawerClose } from "@/components/ui/drawer";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { motion } from "framer-motion";
import { Flame, Lock, Star, Zap } from 'lucide-react';
import { CustomButton } from "@/components/ui/CustomButton";
import { useIsMobile } from "@/hooks/use-mobile";

export const UserAvatar = ({ size = "sm" }) => {
  const isMobile = useIsMobile();
  const { user } = useAuth();
  const { level, progress, currentExp, nextLevelExp, streak, isLoading } = useGamification();

  if (isLoading) return <div className="w-8 h-8 rounded-full bg-muted/50 animate-pulse" />;

  // Configuration for the SVG Circle
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  const Trigger = (
    <div className="relative cursor-pointer group select-none">
      {/* Progress Ring Container */}
      <div className="relative w-10 h-10 flex items-center justify-center">
        {/* Background Ring */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <circle
            cx="20" cy="20" r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            className="text-muted/20"
          />
        </svg>

        {/* Animated Progress Ring */}
        <svg className="absolute w-full h-full transform -rotate-90">
          <motion.circle
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1, ease: "easeOut" }}
            cx="20" cy="20" r={radius}
            stroke="currentColor"
            strokeWidth="3"
            fill="transparent"
            strokeLinecap="round"
            strokeDasharray={circumference}
            className="text-primary drop-shadow-[0_0_2px_rgba(var(--primary),0.5)]"
          />
        </svg>

        {/* The Actual Avatar */}
        <Avatar className="w-7 h-7 border-2 border-background">
          <AvatarImage src={user?.picture} alt={user?.name} />
          <AvatarFallback className="text-[10px] font-bold bg-primary/10 text-primary">
            {user?.name?.substring(0, 2).toUpperCase() || 'BW'}
          </AvatarFallback>
        </Avatar>

        {/* Level Badge (Tiny Pill) */}
        <div className="absolute -bottom-1 bg-background border border-border rounded-full px-1 py-[1px] flex items-center justify-center shadow-sm">
          <span className="text-[8px] font-bold text-foreground leading-none">
            {level}
          </span>
        </div>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer>
        <DrawerTrigger asChild>
          {Trigger}
        </DrawerTrigger>
        <DrawerContent>
          <div className="mx-auto w-full max-w-sm">
            <DrawerHeader className="flex flex-col items-center pt-8 pb-4">
              <StatsHeader user={user} level={level} />
            </DrawerHeader>

            <div className="px-6 pb-8 space-y-6">
              <StatsBody
                streak={streak}
                currentExp={currentExp}
                progress={progress}
                level={level}
                nextLevelExp={nextLevelExp}
              />
            </div>

            <DrawerFooter>
              <DrawerClose asChild>
                <CustomButton variant="outline" className="w-full">Close</CustomButton>
              </DrawerClose>
            </DrawerFooter>
          </div>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        {Trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader className="flex flex-col items-center pt-4 pb-2">
          <StatsHeader user={user} level={level} />
        </DialogHeader>

        <div className="px-2 pb-2 space-y-6">
          <StatsBody
            streak={streak}
            currentExp={currentExp}
            progress={progress}
            level={level}
            nextLevelExp={nextLevelExp}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StatsHeader = ({ user, level }) => (
  <>
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className="relative mb-4"
    >
      <div className="absolute inset-0 bg-primary/20 blur-xl rounded-full" />
      <Avatar className="w-24 h-24 border-4 border-background shadow-xl relative z-10">
        <AvatarImage src={user?.picture} />
        <AvatarFallback className="text-2xl font-bold">
          {user?.name?.substring(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-3 py-1 rounded-full border-2 border-background shadow-sm z-20">
        Lvl {level}
      </div>
    </motion.div>

    <h2 className="text-2xl font-bold text-center">{user?.name}</h2>
    <p className="text-muted-foreground text-sm text-center">Budget Master</p>
  </>
);

const StatsBody = ({ streak, currentExp, progress, level, nextLevelExp }) => (
  <>
    {/* Main Stats Grid */}
    <div className="grid grid-cols-2 gap-4">
      <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border border-border/50">
        <Flame className="w-6 h-6 text-orange-500 fill-orange-500/20" />
        <div>
          <span className="block text-2xl font-bold">{streak}</span>
          <span className="text-xs text-muted-foreground">Day Streak</span>
        </div>
      </div>
      <div className="bg-muted/30 rounded-xl p-4 flex flex-col items-center justify-center text-center gap-2 border border-border/50">
        <Star className="w-6 h-6 text-yellow-500 fill-yellow-500/20" />
        <div>
          <span className="block text-2xl font-bold">{currentExp}</span>
          <span className="text-xs text-muted-foreground">Total XP</span>
        </div>
      </div>
    </div>

    {/* Progress Section */}
    <div className="space-y-2">
      <div className="flex justify-between text-sm font-medium">
        <span>Progress to Level {level + 1}</span>
        <span className="text-muted-foreground">{Math.floor(progress)}%</span>
      </div>
      <Progress value={progress} className="h-3" />
      <p className="text-xs text-muted-foreground text-center pt-1">
        {nextLevelExp - currentExp} XP needed for next level
      </p>
    </div>

    {/* Unlocks Teaser */}
    <div className="space-y-3 pt-2">
      <h4 className="text-sm font-semibold flex items-center gap-2">
        <Zap className="w-4 h-4 text-primary" />
        Next Unlocks
      </h4>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        <div className="min-w-[100px] h-24 rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-2 p-2 opacity-50">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-center text-muted-foreground">Dark Gold Theme</span>
        </div>
        <div className="min-w-[100px] h-24 rounded-lg border border-border bg-card flex flex-col items-center justify-center gap-2 p-2 opacity-50">
          <Lock className="w-5 h-5 text-muted-foreground" />
          <span className="text-xs text-center text-muted-foreground">Pro Charts</span>
        </div>
      </div>
    </div>
  </>
);
