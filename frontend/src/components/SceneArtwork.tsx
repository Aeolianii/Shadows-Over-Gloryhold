export function GameBackdropArtwork() {
  return (
    <div className="game-art-backdrop" aria-hidden="true">
      <img src="/images/game-investigation-table.png" alt="" />
    </div>
  );
}

export function RoleSelectionArtwork() {
  return (
    <div className="role-selection-art" aria-hidden="true">
      <img src="/images/role-selection-gallery.png" alt="" />
    </div>
  );
}

export function IntelRosterArtwork() {
  return (
    <div className="intel-roster-art" aria-hidden="true">
      <img src="/images/suspect-roster-banner.png" alt="" />
    </div>
  );
}

export function DossierTextureStrip() {
  return (
    <div className="dossier-art-strip" aria-hidden="true">
      <img src="/images/dossier-panel-art.png" alt="" />
    </div>
  );
}

const cast = ["karen", "elias", "morgan", "albert", "linor", "kalon", "vincent"];

export function HomeCharacterCast() {
  return (
    <div className="home-character-cast" aria-hidden="true">
      {cast.map((roleId) => (
        <img key={roleId} src={`/avatars/${roleId}.png`} alt="" />
      ))}
    </div>
  );
}
