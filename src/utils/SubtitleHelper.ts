/**
 * Subtitle parsing and HTML5 native video track helper utilities.
 */

/**
 * Converts standard SRT subtitle content to WebVTT format on the fly.
 * Replaces comma decimal separators with dots and prepends the WEBVTT header.
 */
export function convertSrtToVtt(srtContent: string): string {
  let vtt = srtContent.trim();
  if (!vtt.startsWith("WEBVTT")) {
    vtt = "WEBVTT\n\n" + vtt;
  }
  // Convert timestamps from 00:00:00,000 to 00:00:00.000
  return vtt.replace(/(\d{2}:\d{2}:\d{2}),(\d{3})/g, "$1.$2");
}

/**
 * Appends a custom subtitle file to the native video element as a WebVTT track.
 */
export function loadExternalSubtitle(
  video: HTMLVideoElement,
  file: File,
  onLoaded: (trackIndex: number, url: string) => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    const content = e.target?.result as string;
    const isSrt = file.name.toLowerCase().endsWith(".srt");
    const vttContent = isSrt ? convertSrtToVtt(content) : content;

    const blob = new Blob([vttContent], { type: "text/vtt" });
    const url = URL.createObjectURL(blob);

    const track = document.createElement("track");
    track.kind = "subtitles";
    track.label = file.name.replace(/\.(srt|vtt)$/i, "") + " (Загруженные)";
    track.srclang = "custom";
    track.src = url;
    track.default = true;

    video.appendChild(track);

    // Wait a brief tick for the browser to register the track
    setTimeout(() => {
      let registeredIndex = -1;
      for (let i = 0; i < video.textTracks.length; i++) {
        if (video.textTracks[i].label === track.label) {
          registeredIndex = i;
          // Set showing
          video.textTracks[i].mode = "showing";
        } else {
          video.textTracks[i].mode = "disabled";
        }
      }
      onLoaded(registeredIndex, url);
    }, 100);
  };
  reader.readAsText(file);
}
