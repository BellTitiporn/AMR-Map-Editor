import { useEffect } from 'react';
import { ExternalLink, FileText, X } from 'lucide-react';
import manualUrl from '../../assets/AMR_Map_Editor_User_Manual_v0.11.0_Updated.pdf?url';

export function HelpDialog({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return <div className="modalback helpback" onMouseDown={event => {
    if (event.target === event.currentTarget) onClose();
  }}>
    <div className="helpdialog" role="dialog" aria-modal="true" aria-label="AMR Map Editor User Manual">
      <header className="helpdialog-head">
        <div className="helpdialog-title">
          <FileText />
          <div>
            <h3>Help / User Manual</h3>
            <small>AMR Map Editor v0.11.0</small>
          </div>
        </div>
        <div className="helpdialog-actions">
          <a className="help-open-button" href={manualUrl} target="_blank" rel="noreferrer">
            <ExternalLink /> Open in new tab
          </a>
          <button className="help-close-button" title="Close" onClick={onClose}><X /></button>
        </div>
      </header>

      <div className="helpdialog-note">
        User manual: Import, map editing, navigation objects, path connectivity, RMF building geometry, reference coordinates, export formats, validation, and troubleshooting.
      </div>

      <div className="help-pdf-frame">
        <object data={`${manualUrl}#view=FitH`} type="application/pdf" className="help-pdf-object">
          <div className="help-pdf-error">
            <FileText />
            <b>PDF preview is not supported by this browser.</b>
            <span>You can still open the complete AMR Map Editor User Manual.</span>
            <a className="help-open-button" href={manualUrl} target="_blank" rel="noreferrer">
              <ExternalLink /> Open User Manual
            </a>
          </div>
        </object>
      </div>
    </div>
  </div>;
}
