import Navbar from "@/components/landing/Navbar";
import { useCallback, useEffect, useLayoutEffect } from "react";
import TopNoticeBar from "@/components/notices/TopNoticeBar";
import AchievementBanner from "@/components/landing/AchievementBanner";
import HeroSection from "@/components/landing/HeroSection";
import AboutSection from "@/components/landing/AboutSection";
import GoalsSection from "@/components/landing/GoalsSection";
import FeaturesTeaserSection from "@/components/landing/FeaturesTeaserSection";
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
import { LandingRgbroAmbience } from "@/components/landing/LandingRgbroAmbience";
import { useLandingContent } from "@/hooks/useLandingContent";
import AutoRepairBoundary from "@/components/ui/AutoRepairBoundary";
import { peekFreshLandingNavTarget } from "@/lib/landingNavIntent";

function landingHrefToScrollId(href: string) {
  if (href === "#community") return "academics";
  return href.replace("#", "");
}

const Index = () => {
  const { data: content } = useLandingContent();
  const applyLandingTarget = useCallback((targetHref: string) => {
    const id = landingHrefToScrollId(targetHref);
    let frame = 0;
    const maxFrames = 24;
    const applyTarget = () => {
      const prevScrollBehavior = document.documentElement.style.scrollBehavior;
      document.documentElement.style.scrollBehavior = "auto";
      if (!id) {
        window.scrollTo(0, 0);
        document.documentElement.style.scrollBehavior = prevScrollBehavior;
        window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
        return;
      }
      const el = document.getElementById(id);
      if (!el && frame < maxFrames) {
        frame += 1;
        requestAnimationFrame(applyTarget);
        return;
      }
      if (el) {
        const y = Math.max(0, el.getBoundingClientRect().top + window.scrollY - 72);
        window.scrollTo(0, y);
      }
      document.documentElement.style.scrollBehavior = prevScrollBehavior;
      window.history.replaceState({}, "", `${window.location.pathname}${window.location.search}`);
    };
    applyTarget();
  }, []);

  useLayoutEffect(() => {
    if (typeof window === "undefined") return;
    const targetHref = peekFreshLandingNavTarget();
    if (!targetHref) return;
    applyLandingTarget(targetHref);
  }, [applyLandingTarget]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onTarget = (event: Event) => {
      const custom = event as CustomEvent<string>;
      const href = typeof custom.detail === "string" ? custom.detail : "";
      if (!href) return;
      // Do not consume here: intent must stay set until route scroll persistence
      // runs so session restore does not overwrite navbar-driven section scroll.
      applyLandingTarget(href);
    };
    window.addEventListener("hpc:landing-nav-target", onTarget as EventListener);
    return () => {
      window.removeEventListener("hpc:landing-nav-target", onTarget as EventListener);
    };
  }, []);

  return (
    <div className="landing-metaverse-page min-h-screen overflow-x-hidden bg-[#0a051b] text-foreground antialiased">
      <Navbar landingMetaverse />

      {/*
        Everything below is normal document flow.
        pt-12 clears the fixed navbar height.
        TopNoticeBar renders here when a notice is active; it pushes
        AchievementBanner and all content down automatically.
        When no notice exists (returns null) there is zero extra space.
      */}
      <div className="pt-12">
        <AutoRepairBoundary title="Top notice bar">
          <TopNoticeBar />
        </AutoRepairBoundary>
        <AutoRepairBoundary title="Achievement banner">
          <AchievementBanner />
        </AutoRepairBoundary>
      </div>

      <main
        id="landing-main"
        className="landing-copy-scale landing-rgbro landing-metaverse isolate min-w-0"
      >
        <LandingRgbroAmbience />
        <HeroSection content={content?.hero} />
        <AboutSection content={content?.about} />
        <GoalsSection content={content?.goals} />
        <FeaturesTeaserSection content={content?.features} />
        <AutoRepairBoundary title="Committee section">
          <CommitteeSection />
        </AutoRepairBoundary>
        <AutoRepairBoundary title="Achievements section">
          <AchievementsSection />
        </AutoRepairBoundary>
        <AutoRepairBoundary title="Notices section">
          <NoticesSection content={content?.notices} />
        </AutoRepairBoundary>
        <MemoriesSection />
        <AcademicsSection content={content?.academics} />
        <CampusSection content={content?.campus} />
        <CommunitySection content={content?.community} />
        <JoinSection content={content?.join} />
        <ContactSection content={content?.contact} />
        <Footer content={content?.footer} warmLanding />
      </main>
    </div>
  );
};

export default Index;
