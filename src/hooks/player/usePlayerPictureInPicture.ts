import { useCallback, useEffect, useState, type RefObject } from "react";

// Picture-in-Picture control: tracks the video element's PiP state via the standard
// enter/leave events (so closing the window at the OS level resets the button), and toggles
// PiP on the current player surface. Playback and watch-together sync are untouched — PiP only
// moves the video surface into a floating window.
export function usePlayerPictureInPicture(
  videoRef: RefObject<HTMLVideoElement | null>,
  videoNode: HTMLVideoElement | null,
) {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const supported = typeof document !== "undefined" && document.pictureInPictureEnabled === true;

  // Keyed on videoNode so the listeners re-attach when the portal moves the <video> node.
  useEffect(() => {
    setIsPictureInPicture(false);
    const video = videoNode ?? videoRef.current;
    if (!video) return;
    const onEnter = () => setIsPictureInPicture(true);
    const onLeave = () => setIsPictureInPicture(false);
    video.addEventListener("enterpictureinpicture", onEnter);
    video.addEventListener("leavepictureinpicture", onLeave);
    return () => {
      video.removeEventListener("enterpictureinpicture", onEnter);
      video.removeEventListener("leavepictureinpicture", onLeave);
    };
  }, [videoNode, videoRef]);

  const togglePictureInPicture = useCallback(() => {
    if (typeof document === "undefined" || !supported) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
      return;
    }
    videoRef.current?.requestPictureInPicture().catch(() => {});
  }, [videoRef, supported]);

  return { isPictureInPicture, isPictureInPictureSupported: supported, togglePictureInPicture };
}
