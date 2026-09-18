import { Link } from 'react-router-dom';
import './pages.css';

export default function NotFound() {
  return (
    <div className="page">
      <div className="empty-state">
        <h1 style={{ fontSize: '2rem', margin: 0 }}>404</h1>
        <p>This page doesn't exist.</p>
        <Link to="/">Back to OpenShelf</Link>
      </div>
    </div>
  );
}
