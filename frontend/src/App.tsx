import { useEffect, useState } from 'react';
import { Search, Play, X, Star, Film, Clock, Calendar, Plus, Check, LogOut, Shield } from 'lucide-react';
import { VideoPlayer } from './components/VideoPlayer';
import { Logo } from './components/Logo';
import { AuthPortal } from './components/AuthPortal';
import { AdminDashboard } from './components/AdminDashboard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';


interface Movie {
  id: string;
  title: string;
  description: string;
  category: string;
  thumbnail: string;
  videoUrl: string;
  duration: string;
  rating: string;
  year: string;
  trending: boolean;
}

const CATEGORIES = ['All', 'Fantasy', 'Sci-Fi', 'Animation', 'Action'];

function App() {
  const [movies, setMovies] = useState<Movie[]>([]);
  const [filteredMovies, setFilteredMovies] = useState<Movie[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<Movie | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [heroMovie, setHeroMovie] = useState<Movie | null>(null);

  // Authentication & Watchlist states
  const [user, setUser] = useState<{ id: string; username: string } | null>(null);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  const fetchMovies = async () => {
    try {
      const response = await fetch(`${API_URL}/api/movies`);
      const data = await response.json();
      setMovies(data);
      setFilteredMovies(data);

      // Set the latest trending movie as the hero movie
      const trending = [...data].reverse().find((m: Movie) => m.trending);
      if (trending) {
        setHeroMovie(trending);
      } else if (data.length > 0) {
        setHeroMovie(data[data.length - 1]);
      }
    } catch (error) {
      console.error('Error fetching movies:', error);
    }
  };

  const fetchWatchlist = async (userId: string) => {
    try {
      const response = await fetch(`${API_URL}/api/watchlist/${userId}`);
      if (response.ok) {
        const data = await response.json();
        setWatchlist(data);
      }
    } catch (error) {
      console.error('Error fetching watchlist:', error);
    }
  };

  useEffect(() => {
    fetchMovies();
    // Load user session from local storage on mount
    const savedUser = localStorage.getItem('streamflix_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      fetchWatchlist(parsedUser.id);
    }
  }, []);

  // Filter & search logic
  useEffect(() => {
    let result = [...movies];

    if (selectedCategory !== 'All') {
      result = result.filter(
        (m) => m.category.toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    if (searchQuery.trim() !== '') {
      const searchLower = searchQuery.toLowerCase();
      result = result.filter(
        (m) =>
          m.title.toLowerCase().includes(searchLower) ||
          m.description.toLowerCase().includes(searchLower)
      );
    }

    setFilteredMovies(result);
  }, [searchQuery, selectedCategory, movies]);

  const handleOpenDetails = (movie: Movie) => {
    setSelectedMovie(movie);
    setIsPlaying(false);
  };

  const handleCloseModal = () => {
    setSelectedMovie(null);
    setIsPlaying(false);
  };

  const handleAuthSuccess = (userData: { id: string; username: string }) => {
    setUser(userData);
    localStorage.setItem('streamflix_user', JSON.stringify(userData));
    fetchWatchlist(userData.id);
  };

  const handleLogout = () => {
    setUser(null);
    setWatchlist([]);
    localStorage.removeItem('streamflix_user');
  };

  const handleToggleWatchlist = async (movieId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!user) {
      setShowAuth(true);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/api/watchlist/toggle`, {

        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, movieId }),
      });
      if (response.ok) {
        fetchWatchlist(user.id);
      }
    } catch (error) {
      console.error('Error toggling watchlist:', error);
    }
  };

  const isMovieInWatchlist = (movieId: string) => {
    return watchlist.some((m) => m.id.toString() === movieId.toString());
  };

  const getAssetUrl = (url: string) => {
    if (url && url.startsWith('/uploads')) {
      return `${API_URL}${url}`;
    }
    return url;
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-primary)', paddingBottom: '4rem' }}>
      {/* Navigation Bar */}
      <nav className="glass-nav">
        <div onClick={() => {
          setSelectedCategory('All');
          setSearchQuery('');
        }}>
          <Logo />
        </div>
        <div className="nav-search">
          <Search size={18} color="#8e95a5" />
          <input
            type="text"
            placeholder="Search movies, genres..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        
        {/* User Account Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {user ? (
            <>
              {/* Admin Portal Toggle (For demonstration, any logged-in user can access admin controls) */}
              <button 
                onClick={() => setShowAdmin(true)} 
                className="btn-secondary" 
                style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', borderRadius: '20px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
              >
                <Shield size={14} /> Admin
              </button>
              
              <span style={{ fontSize: '0.85rem', color: '#fff', fontWeight: 600 }}>
                {user.username}
              </span>
              
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  handleLogout();
                }} 
                style={{ 
                  background: 'rgba(229, 62, 62, 0.1)', 
                  border: '1px solid rgba(229, 62, 62, 0.2)', 
                  color: '#ef4444', 
                  cursor: 'pointer', 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  padding: '0.6rem',
                  borderRadius: '50%',
                  outline: 'none',
                  transition: 'background 0.2s'
                }}
                title="Logout"
                onMouseOver={(e) => e.currentTarget.style.background = 'rgba(229, 62, 62, 0.2)'}
                onMouseOut={(e) => e.currentTarget.style.background = 'rgba(229, 62, 62, 0.1)'}
              >
                <LogOut size={16} />
              </button>
            </>
          ) : (
            <button 
              onClick={() => setShowAuth(true)} 
              className="btn-primary" 
              style={{ padding: '0.5rem 1.25rem', fontSize: '0.85rem', borderRadius: '20px' }}
            >
              Sign In
            </button>
          )}
        </div>
      </nav>

      {/* Hero Banner */}
      {heroMovie && selectedCategory === 'All' && searchQuery === '' && (
        <header
          className="hero"
          style={{ backgroundImage: `url(${getAssetUrl(heroMovie.thumbnail)})` }}
        >
          <div className="hero-content">
            <h1 className="hero-title">{heroMovie.title}</h1>
            <div className="hero-meta">
              <span className="rating-badge">★ {heroMovie.rating}</span>
              <span>{heroMovie.year}</span>
              <span>•</span>
              <span>{heroMovie.duration}</span>
              <span>•</span>
              <span style={{ color: 'var(--accent)', fontWeight: 600 }}>{heroMovie.category}</span>
            </div>
            <p className="hero-desc">{heroMovie.description}</p>
            <div className="hero-buttons">
              <button className="btn-primary" onClick={() => handleOpenDetails(heroMovie)}>
                <Play size={18} fill="currentColor" /> Play Now
              </button>
              
              {/* Watchlist Toggle */}
              <button 
                className="btn-secondary" 
                onClick={(e) => handleToggleWatchlist(heroMovie.id, e)}
              >
                {isMovieInWatchlist(heroMovie.id) ? (
                  <>
                    <Check size={18} style={{ color: 'var(--accent)' }} /> Watchlisted
                  </>
                ) : (
                  <>
                    <Plus size={18} /> Watchlist
                  </>
                )}
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Category Selection Filter Bar */}
      <div className="category-bar" style={{ paddingTop: heroMovie && selectedCategory === 'All' && searchQuery === '' ? '2.5rem' : '140px', marginTop: 0 }}>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            className={`category-tab ${selectedCategory === category ? 'active' : ''}`}
            onClick={() => setSelectedCategory(category)}
          >
            {category}
          </button>
        ))}
      </div>

      {/* User's Watchlist Rail (Only shown if user logged in and has items) */}
      {user && watchlist.length > 0 && selectedCategory === 'All' && searchQuery === '' && (
        <section className="movies-row" style={{ paddingBottom: '0' }}>
          <h2>My Watchlist</h2>
          <div className="movies-grid">
            {watchlist.map((movie) => (
              <div
                key={`watchlist-${movie.id}`}
                className="movie-card"
                onClick={() => handleOpenDetails(movie)}
              >
                <img src={getAssetUrl(movie.thumbnail)} alt={movie.title} />
                <div className="movie-card-overlay">
                  <div className="movie-card-title">{movie.title}</div>
                  <div className="movie-card-meta">
                    <span>★ {movie.rating}</span>
                    <span>{movie.year}</span>
                    <span>{movie.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Main Movies Grid */}
      <section className="movies-row">
        <h2>
          {selectedCategory === 'All'
            ? searchQuery
              ? 'Search Results'
              : 'Featured Movies'
            : `${selectedCategory} Movies`}
        </h2>

        {filteredMovies.length === 0 ? (
          <div style={{ padding: '3rem 0', textAlign: 'center', color: 'var(--text-muted)' }}>
            No movies match your filters. Try search or category adjustments.
          </div>
        ) : (
          <div className="movies-grid">
            {filteredMovies.map((movie) => (
              <div
                key={movie.id}
                className="movie-card"
                onClick={() => handleOpenDetails(movie)}
              >
                <img src={getAssetUrl(movie.thumbnail)} alt={movie.title} />
                <div className="movie-card-overlay">
                  <div className="movie-card-title">{movie.title}</div>
                  <div className="movie-card-meta">
                    <span>★ {movie.rating}</span>
                    <span>{movie.year}</span>
                    <span>{movie.duration}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Movie Details & Custom Player Modal */}
      {selectedMovie && (
        <div className="modal-overlay" onClick={handleCloseModal}>
          {/* Fixed close button outside scroll container */}
          <button 
            className="modal-close-btn" 
            style={{ position: 'fixed', top: '2rem', right: '2rem', zIndex: 110 }} 
            onClick={(e) => {
              e.stopPropagation();
              handleCloseModal();
            }}
          >
            <X size={20} />
          </button>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>

            {/* Video Player or Poster Header */}
            {isPlaying ? (
              <div style={{ padding: '1rem' }}>
                <VideoPlayer
                  src={selectedMovie.videoUrl && selectedMovie.videoUrl.startsWith('/uploads') 
                    ? `${API_URL}/api/stream/${selectedMovie.id}`
                    : selectedMovie.videoUrl
                  }
                  poster={getAssetUrl(selectedMovie.thumbnail)}
                  title={selectedMovie.title}
                />
              </div>
            ) : (
              <div
                className="modal-header"
                style={{ backgroundImage: `url(${getAssetUrl(selectedMovie.thumbnail)})` }}
              />
            )}

            {/* Movie Info Section */}
            <div className="modal-body">
              <div className="modal-details-grid">
                <div>
                  <h2 className="modal-title">{selectedMovie.title}</h2>
                  <div className="modal-meta-row">
                    <span className="rating-badge">★ {selectedMovie.rating}</span>
                    <span>{selectedMovie.year}</span>
                    <span>{selectedMovie.duration}</span>
                    <span>•</span>
                    <span style={{ color: 'var(--accent)', fontWeight: 600 }}>
                      {selectedMovie.category}
                    </span>
                  </div>
                  
                  <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1.5rem' }}>
                    <button
                      className="btn-primary"
                      style={{ padding: '0.8rem 2rem', fontSize: '1.05rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                      onClick={() => setIsPlaying(true)}
                    >
                      <Play size={18} fill="currentColor" /> Play Movie
                    </button>

                    <button 
                      className="btn-secondary"
                      onClick={(e) => handleToggleWatchlist(selectedMovie.id, e)}
                      style={{ padding: '0.8rem 1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                    >
                      {isMovieInWatchlist(selectedMovie.id) ? (
                        <Check size={18} style={{ color: 'var(--accent)' }} />
                      ) : (
                        <Plus size={18} />
                      )}
                    </button>
                  </div>
                  
                  <p className="modal-description">{selectedMovie.description}</p>
                </div>

                <div className="modal-sidebar">
                  <div className="sidebar-item">
                    <span className="sidebar-label">
                      <Film size={12} style={{ display: 'inline', marginRight: '4px' }} /> Genre
                    </span>
                    <span className="sidebar-val">{selectedMovie.category}</span>
                  </div>
                  <div className="sidebar-item">
                    <span className="sidebar-label">
                      <Clock size={12} style={{ display: 'inline', marginRight: '4px' }} /> Duration
                    </span>
                    <span className="sidebar-val">{selectedMovie.duration}</span>
                  </div>
                  <div className="sidebar-item">
                    <span className="sidebar-label">
                      <Calendar size={12} style={{ display: 'inline', marginRight: '4px' }} /> Release Year
                    </span>
                    <span className="sidebar-val">{selectedMovie.year}</span>
                  </div>
                  <div className="sidebar-item">
                    <span className="sidebar-label">
                      <Star size={12} style={{ display: 'inline', marginRight: '4px' }} /> Rating
                    </span>
                    <span className="sidebar-val" style={{ color: '#eab308' }}>
                      {selectedMovie.rating} / 5.0
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Auth Portal Modal */}
      {showAuth && (
        <AuthPortal 
          apiUrl={API_URL}
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Admin Upload Portal Modal */}
      {showAdmin && (
        <AdminDashboard 
          apiUrl={API_URL}
          onUploadSuccess={fetchMovies}
          onClose={() => setShowAdmin(false)}
        />

      )}
    </div>
  );
}

export default App;
