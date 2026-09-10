import { useState } from 'react';
import { Eye, EyeOff, RotateCw } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useLibrary } from '../../context/LibraryContext';
import './LibraryCardFlip.css';

/**
 * A tap-to-flip virtual library card. Front: library branding + member name
 * + status. Back: card number + PIN (fetched fresh via reveal_my_card_pin
 * on first flip, not stored decrypted in state longer than necessary).
 */
export default function LibraryCardFlip({ membership }) {
  const { profile } = useAuth();
  const { revealCardPin } = useLibrary();
  const [flipped, setFlipped] = useState(false);
  const [pin, setPin] = useState(null);
  const [pinVisible, setPinVisible] = useState(false);
  const [pinError, setPinError] = useState('');
  const [loadingPin, setLoadingPin] = useState(false);

  const { library, card_number: cardNumber, status } = membership;

  const handleFlip = async () => {
    const next = !flipped;
    setFlipped(next);
    if (next && pin === null && !loadingPin) {
      setLoadingPin(true);
      setPinError('');
      try {
        const value = await revealCardPin(membership.id);
        setPin(value);
      } catch (err) {
        console.error(err);
        setPinError('Could not load PIN.');
      } finally {
        setLoadingPin(false);
      }
    }
  };

  return (
    <div className="library-flip-card-wrap">
      <div className={`library-flip-card ${flipped ? 'library-flip-card--flipped' : ''}`}>
        <div className="library-flip-card-face library-flip-card-front">
          <div className="library-flip-card-top">
            {library.logo_url ? (
              <img src={library.logo_url} alt="" className="library-flip-card-logo" />
            ) : (
              <div className="library-flip-card-logo library-flip-card-logo--placeholder">{library.name?.[0]}</div>
            )}
            <span className={`status-pill status-pill--${status === 'active' ? 'active' : 'pending'}`}>
              {status === 'active' ? 'Active' : 'Pending'}
            </span>
          </div>
          <div className="library-flip-card-bottom">
            <p className="library-flip-card-library-name">{library.name}</p>
            <p className="library-flip-card-member-name">{profile?.display_name || 'Member'}</p>
          </div>
          <button className="library-flip-card-flip-btn" onClick={handleFlip} aria-label="Flip card">
            <RotateCw size={16} />
          </button>
        </div>

        <div className="library-flip-card-face library-flip-card-back">
          <div className="library-flip-card-stripe" />
          <div className="library-flip-card-details">
            <div>
              <span className="library-flip-card-label">Card number</span>
              <span className="library-flip-card-value">{cardNumber}</span>
            </div>
            <div>
              <span className="library-flip-card-label">PIN</span>
              <span className="library-flip-card-value library-flip-card-pin">
                {loadingPin ? '····' : pinError ? '—' : pinVisible ? pin || '····' : '••••'}
                {!loadingPin && !pinError && (
                  <button
                    type="button"
                    className="library-flip-card-eye"
                    onClick={(e) => {
                      e.stopPropagation();
                      setPinVisible((v) => !v);
                    }}
                    aria-label={pinVisible ? 'Hide PIN' : 'Show PIN'}
                  >
                    {pinVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                )}
              </span>
              {pinError && <span className="library-flip-card-error">{pinError}</span>}
            </div>
          </div>
          <button className="library-flip-card-flip-btn" onClick={handleFlip} aria-label="Flip card">
            <RotateCw size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
