import './pages.css';

export default function About() {
  return (
    <div className="page">
      <div className="page-header">
        <h1>About OpenShelf</h1>
        <p>A network of independent libraries, unified under one reading app.</p>
      </div>
      <div style={{ maxWidth: 680, color: '#40444c', lineHeight: 1.7, fontSize: '0.95rem' }}>
        <p>
          OpenShelf works like the network model behind services such as OverDrive/Libby: the app
          itself is a single network you sign up to once, and inside it are many independently
          run libraries, each with their own logo, name, and catalog of audiobooks and ebooks.
        </p>
        <p>
          Anyone can start their own library on OpenShelf. As a library admin you get your own
          branded space to upload and manage a private collection — your members hold a card at
          your library specifically, separate from any other library on the network.
        </p>
        <p>
          A reader can hold cards at as many libraries as they like, switching between them from
          the library picker in the navigation bar.
        </p>
      </div>
    </div>
  );
}
