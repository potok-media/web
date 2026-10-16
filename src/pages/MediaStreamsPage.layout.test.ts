import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("MediaStreamsPage layout", () => {
  it("restores the poster-left torrent browser inside a centered 1600px shell", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");

    expect(page).toContain("streams-page-shell");
    expect(page).toContain("<StreamSidebar");
    expect(page).toContain("streams-browser-layout");
    expect(page).not.toContain("<StreamMediaHero");
    expect(styles).toContain("--streams-page-max-width: 100rem;");
    expect(styles).toContain("var(--streams-page-max-width)");
    expect(styles).toContain("grid-template-columns: 22.5rem minmax(0, 1fr);");
  });

  it("switches from the persistent torrents block to an inline torrent-files block", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");

    expect(page).toContain('className="torrents-panel"');
    expect(page).toContain("hidden={showRightRail}");
    expect(page).toContain("<TorrentFilesPanel");
    expect(page).not.toContain("<EpisodeSelectorPopup");
    expect(page).not.toContain("saving-overlay--fixed");
  });

  it("reuses the episode selector content in the popup and inline page surface", () => {
    const popup = readFileSync(
      new URL("../components/common/EpisodeSelectorPopup.tsx", import.meta.url),
      "utf8",
    );
    const filesPanel = readFileSync(
      new URL("../components/TorrentFilesPanel.tsx", import.meta.url),
      "utf8",
    );

    expect(popup).toContain("<EpisodeSelectorContent");
    expect(filesPanel).toContain("<EpisodeSelectorContent");
    expect(filesPanel).toContain("torrent-files-panel--co-watch");
    expect(filesPanel).toContain('presentation="playlist"');
    expect(filesPanel).toContain("<WatchTogetherRail queue={queue}");
  });

  it("keeps co-watch playback inline and turns the right side into Chat, Queue, or Participants", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const guestPage = readFileSync(new URL("./WatchTogetherPage.tsx", import.meta.url), "utf8");
    const workspace = readFileSync(
      new URL("../components/watchTogether/WatchTogetherWorkspace.tsx", import.meta.url),
      "utf8",
    );
    const rail = readFileSync(
      new URL("../components/watchTogether/WatchTogetherRail.tsx", import.meta.url),
      "utf8",
    );

    expect(page).toContain("<WatchTogetherRail");
    expect(guestPage).toContain("<WatchTogetherWorkspace");
    expect(guestPage).toContain("sessionActive && activePlayback");
    expect(workspace).toContain("registerPlayerPortalTarget");
    expect(workspace).toContain("streams-page-shell--split");
    expect(workspace).toContain("streams-inline-workspace--split");
    expect(workspace).toContain("streams-media-stage--player");
    expect(workspace).toContain("<WatchTogetherRail");
    expect(page).toContain("handleQueuePlay");
    expect(rail).toContain('t("queue")');
    expect(rail).toContain('t("participantsTab")');
    expect(rail).toContain("<WatchTogetherChatPanel />");
    expect(rail).toContain("<WatchTogetherParticipantsPanel");
    expect(rail).toContain('type RailTab = "chat" | "queue" | "participants"');
    expect(rail).not.toContain("wt.startWatch()");
    expect(rail).not.toContain("wt-rail--lobby");
  });

  it("moves active co-watch room context into the global top bar", () => {
    const topbar = readFileSync(new URL("../components/AppTopBar.tsx", import.meta.url), "utf8");
    const roomHeader = readFileSync(
      new URL("../components/watchTogether/WatchTogetherTopBarRoom.tsx", import.meta.url),
      "utf8",
    );

    expect(topbar).toContain("<WatchTogetherTopBarRoom playback={activePlayback} />");
    expect(topbar).toContain("watchTogether.sessionActive");
    expect(roomHeader).toContain('className="wt-topbar-room__link"');
    expect(roomHeader).toContain('t("onlineCount"');
    expect(roomHeader).toContain("<Switch");
    expect(roomHeader).not.toContain('wt.role === "host" ? (\n          <div className="wt-topbar-room__settings"');
    expect(roomHeader).toContain("disabled={wt.role !== \"host\"}");
    expect(roomHeader).toContain('t("permissions.canControlHint")');
    expect(roomHeader).toContain('wt.role === "host" ? "closeRoom" : "leave"');
    expect(roomHeader).not.toContain("inviteFriends");
  });

  it("closes the persisted player when leaving a co-watch room", () => {
    const roomHeader = readFileSync(
      new URL("../components/watchTogether/WatchTogetherTopBarRoom.tsx", import.meta.url),
      "utf8",
    );
    const playbackContext = readFileSync(
      new URL("../context/PlaybackContext.tsx", import.meta.url),
      "utf8",
    );
    const leaveHandler = roomHeader.match(
      /const handleLeaveRoom = \(navigateBack: boolean\) => \{([\s\S]*?)\n {2}\};/,
    )?.[1] ?? "";
    const stopVideoBody = playbackContext.match(
      /const stopVideo = useCallback\(\(\) => \{([\s\S]*?)\n {2}\}, \[\]\);/,
    )?.[1] ?? "";

    expect(leaveHandler).toContain("wt.leave()");
    expect(leaveHandler).toContain("stopVideo()");
    expect(leaveHandler).toContain("if (navigateBack) navigate(-1)");
    expect(roomHeader).toContain("onClick={() => handleLeaveRoom(true)}");
    expect(roomHeader).toContain("onClick={() => handleLeaveRoom(false)}");
    expect(stopVideoBody).toContain('sessionStorage.removeItem("potok_last_playback")');
  });

  it("activates a room without replaying the current stream and keeps co-watch chrome compact", () => {
    const context = readFileSync(
      new URL("../context/WatchTogetherContext.tsx", import.meta.url),
      "utf8",
    );
    const rail = readFileSync(
      new URL("../components/watchTogether/WatchTogetherRail.tsx", import.meta.url),
      "utf8",
    );
    const player = readFileSync(
      new URL("../components/WebMediaPlayer.tsx", import.meta.url),
      "utf8",
    );
    const chrome = readFileSync(
      new URL("../components/player/PlayerChrome.tsx", import.meta.url),
      "utf8",
    );
    const createRoomBody = context.match(/const createRoom = useCallback\(([\s\S]*?)\n {2}\);/)?.[1] ?? "";
    const startWatchBody = context.match(/const startWatch = useCallback\(\(\) => \{([\s\S]*?)\n {2}\},/)?.[1] ?? "";

    expect(createRoomBody).toContain("sessionActiveRef.current = true");
    expect(createRoomBody).toContain("setSessionActive(true)");
    expect(startWatchBody).not.toContain("playVideo(");
    expect(rail).not.toContain("startWatching");
    expect(player).toContain("hideTopBar={isInline && coWatchSessionActive}");
    expect(chrome).toContain("hideTopBar?: boolean");
    expect(chrome).toContain("{!hideTopBar && (");
  });

  it("keeps the room link bounded and renders quick reactions as explicit buttons", () => {
    const participants = readFileSync(
      new URL("../components/watchTogether/WatchTogetherParticipantsPanel.tsx", import.meta.url),
      "utf8",
    );
    const chat = readFileSync(
      new URL("../components/watchTogether/WatchTogetherChatPanel.tsx", import.meta.url),
      "utf8",
    );
    const styles = readFileSync(new URL("../styles/watch-together.css", import.meta.url), "utf8");
    const variables = readFileSync(new URL("../styles/variables.css", import.meta.url), "utf8");

    expect(participants).toContain('className="wt-participants-panel__share-url"');
    expect(chat).toContain('className="wt-chat__reaction"');
    expect(styles).toContain(".wt-chat__reactions .ui-btn.wt-chat__reaction");
    expect(styles).toContain(".wt-participants-panel__share-url");
    expect(variables).toContain("--border-color:");
  });

  it("turns the hero slot into a split player and playlist workspace", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");

    expect(page).toContain("registerPlayerPortalTarget");
    expect(page).toContain('className="streams-media-stage__surface"');
    expect(page).toContain("streams-page-shell--workspace");
    expect(page).toContain("streams-page-shell--split");
    expect(page).toContain("streams-inline-workspace--split");
    expect(page).toContain('inlinePlaybackActive ? "player" : "preview"');
    expect(styles).toContain(".streams-media-stage--player");
    expect(styles).toContain(".streams-inline-workspace--split");
    expect(styles).toContain("--streams-workspace-height:");
    expect(styles).toContain("height: var(--streams-workspace-height);");
    expect(styles).toContain("grid-template-columns: minmax(0, 1fr) clamp(28rem, 21vw, 32rem);");
    expect(styles).toContain("aspect-ratio: 16 / 9;");
    expect(styles).toContain("padding-block: var(--space-m) var(--space-xxl);");
  });

  it("shows the selected torrent title at the bottom center of the player", () => {
    const page = readFileSync(new URL("./MediaStreamsPage.tsx", import.meta.url), "utf8");
    const styles = readFileSync(new URL("../styles/media.css", import.meta.url), "utf8");

    expect(page).toContain('className="streams-media-stage__release-title"');
    expect(page).toContain('stageMode === "preview" && clickedStream?.title');
    expect(page).toContain("{clickedStream.title}");
    expect(styles).toContain(".streams-media-stage__release-title");
    expect(styles).toContain("left: 50%;");
    expect(styles).toContain("transform: translateX(-50%);");
    expect(styles).toContain("text-align: center;");
    expect(styles).toContain("color: var(--text-tertiary);");
  });

  it("prepares the whole release as a playlist without a separate menu action", () => {
    const content = readFileSync(
      new URL("../components/common/EpisodeSelectorContent.tsx", import.meta.url),
      "utf8",
    );
    const header = readFileSync(
      new URL("../components/common/episodeSelector/EpisodeSelectorHeader.tsx", import.meta.url),
      "utf8",
    );
    const selectorState = readFileSync(
      new URL("../hooks/useEpisodeSelectorState.ts", import.meta.url),
      "utf8",
    );

    expect(content).toContain("handlePlayAsPlaylist");
    expect(selectorState).toContain("potok_playlist_override = playlist");
    expect(header).not.toContain("onOpenAsPlaylist");
    expect(header).not.toContain("openAsPlaylist");
  });

  it("separates the compact watch playlist from explicit mapping repair", () => {
    const content = readFileSync(
      new URL("../components/common/EpisodeSelectorContent.tsx", import.meta.url),
      "utf8",
    );
    const row = readFileSync(
      new URL("../components/common/episodeSelector/EpisodeSelectorRow.tsx", import.meta.url),
      "utf8",
    );

    expect(content).toContain("repairMode");
    expect(content).toContain("handleStartRepairing");
    expect(row).toContain("file-card-row--playlist");
    expect(row).toContain("file-card-row--repair");
  });
});
