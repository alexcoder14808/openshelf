import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: '1px solid #eef0f3',
        padding: '20px',
        textAlign: 'center',
        fontSize: '0.78rem',
        color: '#9aa0ab',
        marginTop: 'auto',
      }}
    >
      <span>&copy; {new Date().getFullYear()} OpenShelf</span>
      <span style={{ margin: '0 8px' }}>&middot;</span>
      <Link to="/terms" style={{ color: '#9aa0ab' }}>Terms of Service</Link>
      <span style={{ margin: '0 8px' }}>&middot;</span>
      <Link to="/privacy" style={{ color: '#9aa0ab' }}>Privacy Policy</Link>
    </footer>
  );
}
