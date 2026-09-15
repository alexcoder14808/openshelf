import { useState } from 'react';
import { X } from 'lucide-react';
import { useLibrary } from '../../context/LibraryContext';

export default function LibraryReauthModal({ library, onClose, onUnlocked }) {
  const { verifyCardPinToUnlock } = useLibrary();
  const [cardNumber, setCardNumber] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyCardPinToUnlock(library.id, cardNumber.trim(), pin.trim());
      onUnlocked();
    } catch (err) {
      setError(err.message || 'Invalid card number or PIN.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="slide-panel-overlay" onClick={onClose}>
      <div className="slide-panel" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <div className="slide-panel-header">
          <h3>Log back into {library.name}</h3>
          <button className="slide-panel-close" onClick={onClose} aria-label="Close">
            <X size={20} />
          </button>
        </div>
        <div className="slide-panel-body">
          <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 16px' }}>
            You're still signed into OpenShelf, but you logged out of this specific library.
            Enter its card number and PIN to get back in.
          </p>
          {error && <p className="form-error">{error}</p>}
          <form onSubmit={handleSubmit}>
            <div className="form-field">
              <label>Card number</label>
              <input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                required
                autoFocus
                value={cardNumber}
                onChange={(e) => setCardNumber(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <div className="form-field">
              <label>PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                required
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              />
            </div>
            <button className="form-submit" type="submit" disabled={loading}>
              {loading ? 'Checking…' : 'Log in'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
