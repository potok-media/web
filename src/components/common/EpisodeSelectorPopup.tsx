import React from "react";
import { Overlay } from "./Overlay";
import { EpisodeSelectorContent } from "./EpisodeSelectorContent";
import type { EpisodeSelectorPopupProps } from "./episodeSelector/types";

export type { GenericEpisodeItem } from "./episodeSelector/types";

export const EpisodeSelectorPopup: React.FC<EpisodeSelectorPopupProps> = ({
  accessibleModal = false,
  ...contentProps
}) => (
  <Overlay
    accessibleModal={accessibleModal}
    ariaLabel={contentProps.title}
    open={contentProps.isOpen}
    onClose={contentProps.onClose}
    styled={false}
    backdropClassName="modal-overlay"
    className="modal-container modal-container-files episode-selector-modal"
  >
    <EpisodeSelectorContent {...contentProps} />
  </Overlay>
);

export default EpisodeSelectorPopup;
