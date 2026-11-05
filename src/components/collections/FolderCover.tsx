import React, { useState } from "react";
import { FilmOff } from "../common/FilmOff";
import type { FolderCoverCell } from "./mosaicModel";
import { isEmptyCover } from "./mosaicModel";

interface CoverCellProps {
  cell: FolderCoverCell;
}

/** One mosaic quadrant: a poster image, or a muted placeholder tile when no poster resolved. */
const CoverCell: React.FC<CoverCellProps> = ({ cell }) => {
  const [failed, setFailed] = useState(false);
  if (!cell.src || failed) {
    return (
      <div className="collections-cover-cell is-placeholder">
        <FilmOff size="1.25rem" className="collections-cover-placeholder-icon" />
      </div>
    );
  }
  return <img className="collections-cover-cell" src={cell.src} alt="" loading="lazy" onError={() => setFailed(true)} />;
};

interface FolderCoverProps {
  cells: FolderCoverCell[];
}

/** 2×2 poster mosaic; folders without any poster render as one big placeholder tile. */
export const FolderCover: React.FC<FolderCoverProps> = ({ cells }) => {
  if (isEmptyCover(cells)) {
    return (
      <div className="collections-cover is-empty">
        <FilmOff size="2rem" className="collections-cover-placeholder-icon" />
      </div>
    );
  }
  return (
    <div className="collections-cover">
      {Array.from({ length: 4 }, (_, index) => {
        const cell = cells[index];
        return cell ? (
          <CoverCell key={cell.key} cell={cell} />
        ) : (
          <div key={`empty-${index}`} className="collections-cover-cell is-placeholder" />
        );
      })}
    </div>
  );
};

export default FolderCover;
