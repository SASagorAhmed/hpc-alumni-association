import Navbar from "@/components/landing/Navbar";
import TopNoticeBar from "@/components/notices/TopNoticeBar";
import AchievementBanner from "@/components/landing/AchievementBanner";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import GoalsSection from "@/components/landing/GoalsSection";
import CommitteeSection from "@/components/landing/CommitteeSection";
import AcademicsSection from "@/components/landing/AcademicsSection";
import CampusSection from "@/components/landing/CampusSection";
import CommunitySection from "@/components/landing/CommunitySection";
import JoinSection from "@/components/landing/JoinSection";
import AchievementsSection from "@/components/landing/AchievementsSection";
import NoticesSection from "@/components/landing/NoticesSection";
import MemoriesSection from "@/components/landing/MemoriesSection";
import ContactSection from "@/components/landing/ContactSection";
import Footer from "@/components/landing/Footer";
import { useLandingContent } from "@/hooks/useLandingContent";

const Index = () => {
  const { data: content } = useLandingContent();

  return (
    <div className="min-h-screen bg-background text-foreground antialiased">
      {/* Fixed navbar — always sits at top-0 */}
      <Navbar />

      {/*
        Everything below is normal document flow.
        pt-10/lg:pt-11 clears the fixed navbar height.
        TopNoticeBar renders here when a notice is active; it pushes
        AchievementBanner and all content down automatically.
        When no notice exists (returns null) there is zero extra space.
      */}
      <div className="pt-10 lg:pt-11">
        <TopNoticeBar />
        <AchievementBanner />
      </div>

      <div className="landing-copy-scale min-w-0">
        <HeroSection content={content?.hero} />
        <AboutSection content={content?.about} />
        <GoalsSection content={content?.goals} />
        <CommitteeSection />
        <AchievementsSection />
        <NoticesSection content={content?.notices} />
        <MemoriesSection />
        <AcademicsSection content={content?.academics} />
        <CampusSection content={content?.campus} />
        <CommunitySection content={content?.community} />
        <JoinSection content={content?.join} />
        <ContactSection content={content?.contact} />
        <Footer content={content?.footer} />
      </div>
    </div>
  );
};

export default Index;
