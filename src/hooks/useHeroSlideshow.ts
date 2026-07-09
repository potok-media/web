import { useState, useEffect, useRef } from "react";
import type { HeroItem } from "../network/ApiTypes";

export function useHeroSlideshow(heroItems: HeroItem[]) {
  const [slideState, setSlideState] = useState({
    activeIndex: 0,
    prevIndex: null as number | null,
    displayedIndex: 0,
  });
  const [loadedImages, setLoadedImages] = useState<Record<number, boolean>>({});
  const requestedImagesRef = useRef<Set<number>>(new Set());

  const { activeIndex, prevIndex, displayedIndex } = slideState;
  const activeItem = heroItems[displayedIndex];

  const changeActiveIndex = (nextIndex: number | ((prev: number) => number)) => {
    setSlideState((prev) => {
      const idx = typeof nextIndex === "function" ? nextIndex(prev.activeIndex) : nextIndex;
      if (idx === prev.activeIndex) return prev;
      return { ...prev, activeIndex: idx };
    });
  };

  useEffect(() => {
    if (heroItems.length <= 1) return;
    const interval = setInterval(() => {
      changeActiveIndex((prev) => (prev + 1) % heroItems.length);
    }, 15000);
    return () => clearInterval(interval);
  }, [heroItems.length]);

  useEffect(() => {
    if (heroItems.length === 0) return;

    const indicesToLoad = [activeIndex];
    if (heroItems.length > 1) {
      indicesToLoad.push((activeIndex + 1) % heroItems.length);
    }

    indicesToLoad.forEach((index) => {
      if (requestedImagesRef.current.has(index)) return;
      requestedImagesRef.current.add(index);

      const item = heroItems[index];
      const markLoaded = () => {
        setLoadedImages((prev) => {
          if (prev[index]) return prev;
          return { ...prev, [index]: true };
        });
      };

      if (item?.card?.backdropSrc) {
        const img = new Image();
        img.src = item.card.backdropSrc;
        img.onload = markLoaded;
        img.onerror = markLoaded;
        if (typeof img.decode === "function") {
          img.decode().then(markLoaded).catch(markLoaded);
        }
      } else {
        markLoaded();
      }

      if (item?.card?.logoSrc) {
        const logoImg = new Image();
        logoImg.src = item.card.logoSrc;
        if (typeof logoImg.decode === "function") {
          logoImg.decode().catch(() => {});
        }
      }
    });
  }, [activeIndex, heroItems]);

  useEffect(() => {
    if (loadedImages[activeIndex]) {
      if (displayedIndex !== activeIndex) {
        setSlideState((prev) => ({
          ...prev,
          prevIndex: prev.displayedIndex,
          displayedIndex: prev.activeIndex,
        }));

        const timer = setTimeout(() => {
          setSlideState((prev) => ({ ...prev, prevIndex: null }));
        }, 850);
        return () => clearTimeout(timer);
      }
    }
  }, [activeIndex, loadedImages, displayedIndex]);

  const markImageLoaded = (index: number) => {
    setLoadedImages((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: true };
    });
  };

  return {
    activeIndex,
    prevIndex,
    displayedIndex,
    activeItem,
    loadedImages,
    changeActiveIndex,
    markImageLoaded,
  };
}