import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { LibraryProvider } from './context/LibraryContext';
import { AudioPlayerProvider } from './context/AudioPlayerContext';
import { LendingProvider } from './context/LendingContext';

import Navbar from './components/Navbar/Navbar';
import MiniPlayer from './components/AudioPlayer/MiniPlayer';
import RequireAuth from './components/RequireAuth';

import Home from './pages/Home';
import Browse from './pages/Browse';
import Search from './pages/Search';
import About from './pages/About';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import LibraryCard from './pages/LibraryCard';
import LibraryDirectory from './pages/LibraryDirectory';
import Loans from './pages/Loans';
import Listen from './pages/Listen';
import Read from './pages/Read';
import BookDetails from './pages/BookDetails';
import NotFound from './pages/NotFound';

import AdminDashboard from './pages/admin/AdminDashboard';
import CreateLibrary from './pages/admin/CreateLibrary';
import ManageBooks from './pages/admin/ManageBooks';
import AddBook from './pages/admin/AddBook';
import EditBook from './pages/admin/EditBook';
import LibrarySettings from './pages/admin/LibrarySettings';

export default function App() {
  return (
    <AuthProvider>
      <LibraryProvider>
        <LendingProvider>
        <AudioPlayerProvider>
          <div className="app-shell">
            <Navbar />
            <main className="app-main">
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/browse" element={<Browse />} />
                <Route path="/search" element={<Search />} />
                <Route path="/about" element={<About />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />
                <Route path="/libraries" element={<LibraryDirectory />} />

                <Route path="/dashboard" element={<RequireAuth><Dashboard /></RequireAuth>} />
                <Route path="/library-card" element={<RequireAuth><LibraryCard /></RequireAuth>} />
                <Route path="/loans" element={<RequireAuth><Loans /></RequireAuth>} />

                <Route path="/book/:id" element={<BookDetails />} />
                <Route path="/listen/:id" element={<RequireAuth><Listen /></RequireAuth>} />
                <Route path="/read/:id" element={<RequireAuth><Read /></RequireAuth>} />

                {/* ---- Library admin (per-library, not platform-wide) ---- */}
                <Route path="/admin" element={<RequireAuth><AdminDashboard /></RequireAuth>} />
                <Route path="/admin/create-library" element={<RequireAuth><CreateLibrary /></RequireAuth>} />
                <Route path="/admin/:libraryId" element={<RequireAuth><ManageBooks /></RequireAuth>} />
                <Route path="/admin/:libraryId/add-book" element={<RequireAuth><AddBook /></RequireAuth>} />
                <Route path="/admin/:libraryId/edit-book/:id" element={<RequireAuth><EditBook /></RequireAuth>} />
                <Route path="/admin/:libraryId/settings" element={<RequireAuth><LibrarySettings /></RequireAuth>} />

                <Route path="*" element={<NotFound />} />
              </Routes>
            </main>
            <MiniPlayer />
          </div>
        </AudioPlayerProvider>
        </LendingProvider>
      </LibraryProvider>
    </AuthProvider>
  );
}
