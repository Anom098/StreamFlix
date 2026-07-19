import { useEffect, useState, useRef, useCallback } from 'react';
import {
  Search, Play, Star, Clock, Calendar, Film,
  Plus, Check, LogOut, Shield, ChevronLeft, Info
} from 'lucide-react';
import { VideoPlayer } from './components/VideoPlayer';
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

// ── Helper ─────────────────────────────────────────────────────────
function getAssetUrl(url: string) {
  if (url && url.startsWith('/uploads')) return `${API_URL}${url}`;
  return url;
}

// ── Components ─────────────────────────────────────────────────────

/** Horizontal scrollable rail of movie cards */
function Rail({
  title,
  movies,
  onSelect,
  onWatchlist,
  isInWatchlist,
}: {
  title: string;
  movies: Movie[];
  onSelect: (m: Movie) => void;
  onWatchlist: (id: string, e: React.MouseEvent) => void;
  isInWatchlist: (id: string) => boolean;
}) {
  if (movies.length === 0) return null;
  return (
    <div className="rail">
      <div className="rail-header">
        <span className="rail-title">{title}</span>
      </div>
      <div className="rail-track">
        {movies.map((movie) => (
          <div
            key={movie.id}
            className="card"
            onClick={() => onSelect(movie)}
            title={movie.title}
          >
            <img
              className="card-thumb"
              src={getAssetUrl(movie.thumbnail)}
              alt={movie.title}
              loading="lazy"
            />
            {/* Watchlist badge */}
            <button
              className={`card-wl-btn ${isInWatchlist(movie.id) ? 'active' : ''}`}
              onClick={(e) => onWatchlist(movie.id, e)}
              title={isInWatchlist(movie.id) ? 'Remove from Watchlist' : 'Add to Watchlist'}
            >
              {isInWatchlist(movie.id) ? <Check size={13} /> : <Plus size={13} />}
            </button>
            <div className="card-info">
              <div className="card-title">{movie.title}</div>
              <div className="card-meta">
                <span className="star">★</span>
                <span>{movie.rating}</span>
                <span>•</span>
                <span>{movie.year}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main App ───────────────────────────────────────────────────────
type View = 'home' | 'watch' | 'search';

function App() {
  // Data
  const [movies, setMovies] = useState<Movie[]>([]);
  const [watchlist, setWatchlist] = useState<Movie[]>([]);

  // View routing
  const [view, setView] = useState<View>('home');
  const [watchMovie, setWatchMovie] = useState<Movie | null>(null);

  // Hero rotation
  const [heroIndex, setHeroIndex] = useState(0);
  const heroMovies = movies.filter((m) => m.trending).slice(0, 5);
  const heroMovie = heroMovies[heroIndex] ?? movies[movies.length - 1] ?? null;

  // Search & filter
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Nav scroll
  const [navScrolled, setNavScrolled] = useState(false);

  // Auth
  const [user, setUser] = useState<{ id: string; username: string; isAdmin: boolean } | null>(null);
  const [showAuth, setShowAuth] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // ── Data fetching ─────────────────────────────────────────────
  const fetchMovies = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/movies`);
      const data: Movie[] = await res.json();
      setMovies(data);
    } catch (e) {
      console.error('Failed to fetch movies', e);
    }
  }, []);

  const fetchWatchlist = useCallback(async (userId: string) => {
    try {
      const res = await fetch(`${API_URL}/api/watchlist/${userId}`);
      if (res.ok) setWatchlist(await res.json());
    } catch (e) {
      console.error('Failed to fetch watchlist', e);
    }
  }, []);

  useEffect(() => {
    fetchMovies();
    const saved = localStorage.getItem('streamflix_user');
    if (saved) {
      const u = JSON.parse(saved);
      setUser(u);
      fetchWatchlist(u.id);
    }
  }, [fetchMovies, fetchWatchlist]);

  // ── Hero rotation ──────────────────────────────────────────────
  useEffect(() => {
    if (heroMovies.length <= 1 || view !== 'home') return;
    const t = setInterval(() => {
      setHeroIndex((i) => (i + 1) % heroMovies.length);
    }, 7000);
    return () => clearInterval(t);
  }, [heroMovies.length, view]);

  // ── Nav scroll ─────────────────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  // ── Auth helpers ───────────────────────────────────────────────
  const handleAuthSuccess = (userData: { id: string; username: string; isAdmin: boolean }) => {
    setUser(userData);
    localStorage.setItem('streamflix_user', JSON.stringify(userData));
    fetchWatchlist(userData.id);
    setShowAuth(false);
  };

  const handleLogout = () => {
    setUser(null);
    setWatchlist([]);
    localStorage.removeItem('streamflix_user');
  };

  // ── Watchlist ──────────────────────────────────────────────────
  const handleToggleWatchlist = async (movieId: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!user) { setShowAuth(true); return; }
    try {
      const res = await fetch(`${API_URL}/api/watchlist/toggle`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, movieId }),
      });
      if (res.ok) fetchWatchlist(user.id);
    } catch (e) {
      console.error('Watchlist toggle error', e);
    }
  };

  const isInWatchlist = (id: string) => watchlist.some((m) => m.id.toString() === id.toString());

  // ── Navigation ─────────────────────────────────────────────────
  const goWatch = (movie: Movie) => {
    setWatchMovie(movie);
    setView('watch');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goHome = () => {
    setView('home');
    setWatchMovie(null);
    setSearchQuery('');
    setSearchOpen(false);
  };

  // Search open/close
  const toggleSearch = () => {
    setSearchOpen((o) => {
      if (!o) {
        setTimeout(() => searchInputRef.current?.focus(), 50);
        setView('search');
      } else {
        setSearchQuery('');
        if (view === 'search') setView('home');
      }
      return !o;
    });
  };

  const handleSearchChange = (q: string) => {
    setSearchQuery(q);
    if (q.trim()) setView('search');
    else setView('home');
  };

  // ── Derived lists ───────────────────────────────────────────────
  const filteredByCategory =
    selectedCategory === 'All'
      ? movies
      : movies.filter((m) => m.category.toLowerCase() === selectedCategory.toLowerCase());

  const searchResults = movies.filter(
    (m) =>
      m.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedByCategory: Record<string, Movie[]> = {};
  CATEGORIES.filter((c) => c !== 'All').forEach((cat) => {
    const list = movies.filter((m) => m.category.toLowerCase() === cat.toLowerCase());
    if (list.length > 0) groupedByCategory[cat] = list;
  });

  const trendingMovies = movies.filter((m) => m.trending);
  const similarMovies = watchMovie
    ? movies.filter((m) => m.category === watchMovie.category && m.id !== watchMovie.id)
    : [];

  // ── Nav bar ─────────────────────────────────────────────────────
  const NavBar = () => (
    <nav className={`nav ${navScrolled || view !== 'home' ? 'scrolled' : ''}`}>
      {/* Watch mode: show back button + movie title instead of logo+links */}
      {view === 'watch' ? (
        <>
          <button className="nav-back-btn" onClick={goHome}>
            <ChevronLeft size={20} />
          </button>
          <div className="nav-logo" onClick={goHome}>
            <span className="nav-logo-mark">SF</span>
            <span className="nav-logo-text">StreamFlix</span>
          </div>
          <span className="nav-watch-title">{watchMovie?.title}</span>
        </>
      ) : (
        <>
          <div className="nav-logo" onClick={goHome}>
            <span className="nav-logo-mark">SF</span>
            <span className="nav-logo-text">StreamFlix</span>
          </div>

          {/* Nav links — only on home */}
          {view === 'home' && (
            <ul className="nav-links">
              <li>
                <button
                  className={selectedCategory === 'All' ? 'active' : ''}
                  onClick={() => setSelectedCategory('All')}
                >
                  Home
                </button>
              </li>
              {CATEGORIES.filter((c) => c !== 'All').map((cat) => (
                <li key={cat}>
                  <button
                    className={selectedCategory === cat ? 'active' : ''}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat}
                  </button>
                </li>
              ))}
              {user && (
                <li>
                  <button
                    className={selectedCategory === '__watchlist__' ? 'active' : ''}
                    onClick={() => setSelectedCategory('__watchlist__')}
                  >
                    My List
                  </button>
                </li>
              )}
            </ul>
          )}
        </>
      )}

      {/* Right side */}
      <div className="nav-right">
        {/* Search */}
        <div className="nav-search-wrap">
          <input
            ref={searchInputRef}
            className={`nav-search-input ${searchOpen ? 'open' : ''}`}
            placeholder="Titles, genres..."
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={(e) => e.key === 'Escape' && toggleSearch()}
          />
          <Search
            size={18}
            className="nav-search-icon"
            onClick={toggleSearch}
            style={{ cursor: 'pointer' }}
          />
        </div>

        {/* User */}
        {user ? (
          <div className="nav-user">
            {user.isAdmin && (
              <button
                className="btn-icon"
                title="Admin"
                onClick={() => setShowAdmin(true)}
              >
                <Shield size={15} />
              </button>
            )}
            <span className="nav-user-name">{user.username}</span>
            <button
              className="btn-icon"
              title="Sign out"
              onClick={handleLogout}
            >
              <LogOut size={15} />
            </button>
          </div>
        ) : (
          <button className="btn-nav" onClick={() => setShowAuth(true)}>
            Sign In
          </button>
        )}
      </div>
    </nav>
  );

  // ── Hero banner ────────────────────────────────────────────────
  const HeroBanner = () => {
    if (!heroMovie) return null;
    return (
      <header className="hero">
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${getAssetUrl(heroMovie.thumbnail)})` }}
        />
        <div className="hero-gradient" />

        <div className="hero-content slide-up">
          <div className="hero-badge">
            <Star size={11} fill="currentColor" /> Trending
          </div>
          <h1 className="hero-title">{heroMovie.title}</h1>
          <div className="hero-meta">
            <span className="rating">★ {heroMovie.rating}</span>
            <span className="dot">•</span>
            <span>{heroMovie.year}</span>
            <span className="dot">•</span>
            <span>{heroMovie.duration}</span>
            <span className="dot">•</span>
            <span>{heroMovie.category}</span>
          </div>
          <p className="hero-desc">{heroMovie.description}</p>
          <div className="hero-actions">
            <button className="btn-play" onClick={() => goWatch(heroMovie)}>
              <Play size={18} fill="currentColor" /> Play
            </button>
            <button className="btn-more" onClick={() => goWatch(heroMovie)}>
              <Info size={18} /> More Info
            </button>
            <button
              className={`btn-watchlist ${isInWatchlist(heroMovie.id) ? 'active' : ''}`}
              onClick={(e) => handleToggleWatchlist(heroMovie.id, e)}
            >
              {isInWatchlist(heroMovie.id) ? <Check size={16} /> : <Plus size={16} />}
              {isInWatchlist(heroMovie.id) ? 'In My List' : 'My List'}
            </button>
          </div>
        </div>

        {/* Dot indicators */}
        {heroMovies.length > 1 && (
          <div className="hero-dots">
            {heroMovies.map((_, i) => (
              <button
                key={i}
                className={`hero-dot ${i === heroIndex ? 'active' : ''}`}
                onClick={() => setHeroIndex(i)}
              />
            ))}
          </div>
        )}
      </header>
    );
  };

  // ── Home View ──────────────────────────────────────────────────
  const HomeView = () => {
    // "My List" shortcut tab
    if (selectedCategory === '__watchlist__') {
      return (
        <div style={{ paddingTop: '80px' }}>
          <div className="filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
            <button
              className={`filter-chip ${selectedCategory === '__watchlist__' ? 'active' : ''}`}
              onClick={() => setSelectedCategory('__watchlist__')}
            >
              My List
            </button>
          </div>
          <div className="rails-section" style={{ paddingTop: '1.5rem' }}>
            <Rail
              title="My Watchlist"
              movies={watchlist}
              onSelect={goWatch}
              onWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
            {watchlist.length === 0 && (
              <div className="empty-state">Your watchlist is empty. Add some movies!</div>
            )}
          </div>
        </div>
      );
    }

    // Category filter active — show filtered grid as a single rail
    if (selectedCategory !== 'All') {
      return (
        <div style={{ paddingTop: '80px' }}>
          <div className="filter-bar">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </button>
            ))}
          </div>
          <div className="rails-section" style={{ paddingTop: '1.5rem' }}>
            <Rail
              title={`${selectedCategory} Movies`}
              movies={filteredByCategory}
              onSelect={goWatch}
              onWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
            {filteredByCategory.length === 0 && (
              <div className="empty-state">No movies in this category yet.</div>
            )}
          </div>
        </div>
      );
    }

    // Full home — hero + rails
    return (
      <>
        {HeroBanner()}
        {/* Category filter chips */}
        <div className="filter-bar" style={{ marginTop: '1.5rem' }}>
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              className={`filter-chip ${selectedCategory === cat ? 'active' : ''}`}
              onClick={() => setSelectedCategory(cat)}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="rails-section" style={{ paddingTop: '1.5rem' }}>
          {/* Trending rail */}
          {trendingMovies.length > 0 && (
            <Rail
              title="🔥 Trending Now"
              movies={trendingMovies}
              onSelect={goWatch}
              onWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )}

          {/* Watchlist rail */}
          {user && watchlist.length > 0 && (
            <Rail
              title="Continue Watching / My List"
              movies={watchlist}
              onSelect={goWatch}
              onWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          )}

          {/* Per-category rails */}
          {Object.entries(groupedByCategory).map(([cat, list]) => (
            <Rail
              key={cat}
              title={cat}
              movies={list}
              onSelect={goWatch}
              onWatchlist={handleToggleWatchlist}
              isInWatchlist={isInWatchlist}
            />
          ))}

          {movies.length === 0 && (
            <div className="empty-state">Loading content...</div>
          )}
        </div>
      </>
    );
  };

  // ── Search View ────────────────────────────────────────────────
  const SearchView = () => (
    <div className="search-section">
      <h2>
        {searchQuery ? `Results for "${searchQuery}"` : 'Browse All'}
      </h2>
      {searchResults.length === 0 ? (
        <div className="empty-state">No results found.</div>
      ) : (
        <div className="search-grid">
          {searchResults.map((movie) => (
            <div
              key={movie.id}
              className="search-card"
              onClick={() => goWatch(movie)}
            >
              <img
                src={getAssetUrl(movie.thumbnail)}
                alt={movie.title}
                loading="lazy"
              />
              <div className="search-card-info">
                <div className="search-card-title">{movie.title}</div>
                <div className="search-card-meta">
                  <span>★ {movie.rating}</span>
                  <span>•</span>
                  <span>{movie.year}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ── Watch View ─────────────────────────────────────────────────
  const WatchView = () => {
    if (!watchMovie) return null;
    const videoSrc = watchMovie.videoUrl && watchMovie.videoUrl.startsWith('/uploads')
      ? `${API_URL}/api/stream/${watchMovie.id}`
      : watchMovie.videoUrl;

    return (
      <div className="watch-page fade-in">

        {/* Movie info header — sits below the fixed nav, above player */}
        <div className="watch-header">
          <h1 className="watch-title">{watchMovie.title}</h1>
          <div className="watch-meta">
            <span className="rating">★ {watchMovie.rating}</span>
            <span>•</span>
            <span>{watchMovie.duration}</span>
            <span>•</span>
            <span>{watchMovie.year}</span>
            <span className="genre-tag">{watchMovie.category}</span>
          </div>
        </div>

        {/* Full-width player */}
        <div className="watch-player-wrap">
          <VideoPlayer
            src={videoSrc}
            poster={getAssetUrl(watchMovie.thumbnail)}
            title={watchMovie.title}
          />
        </div>

        {/* Details below player */}
        <div className="watch-details">
          <h1 className="watch-title">{watchMovie.title}</h1>

          <div className="watch-meta">
            <span className="rating">★ {watchMovie.rating}</span>
            <span>•</span>
            <span>
              <Clock size={13} style={{ display: 'inline', marginRight: 4 }} />
              {watchMovie.duration}
            </span>
            <span>
              <Calendar size={13} style={{ display: 'inline', marginRight: 4 }} />
              {watchMovie.year}
            </span>
            <span className="genre-tag">
              <Film size={11} style={{ display: 'inline', marginRight: 3 }} />
              {watchMovie.category}
            </span>
          </div>

          <div className="watch-actions">
            <button
              className={`btn-watchlist ${isInWatchlist(watchMovie.id) ? 'active' : ''}`}
              onClick={(e) => handleToggleWatchlist(watchMovie.id, e)}
            >
              {isInWatchlist(watchMovie.id) ? <Check size={16} /> : <Plus size={16} />}
              {isInWatchlist(watchMovie.id) ? 'In My List' : 'Add to My List'}
            </button>
          </div>

          <p className="watch-desc">{watchMovie.description}</p>

          {/* Similar movies */}
          {similarMovies.length > 0 && (
            <>
              <hr className="watch-divider" />
              <div className="watch-more-title">More Like This</div>
              <div className="rail-track" style={{ paddingBottom: '1rem' }}>
                {similarMovies.map((m) => (
                  <div
                    key={m.id}
                    className="card"
                    onClick={() => goWatch(m)}
                  >
                    <img
                      className="card-thumb"
                      src={getAssetUrl(m.thumbnail)}
                      alt={m.title}
                      loading="lazy"
                    />
                    <div className="card-info">
                      <div className="card-title">{m.title}</div>
                      <div className="card-meta">
                        <span className="star">★</span>
                        <span>{m.rating}</span>
                        <span>•</span>
                        <span>{m.year}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // ── Render ─────────────────────────────────────────────────────
  return (
    <div className="app-shell">
      {NavBar()}

      {view === 'home'   && HomeView()}
      {view === 'search' && SearchView()}
      {view === 'watch'  && WatchView()}

      {/* Auth modal */}
      {showAuth && (
        <AuthPortal
          apiUrl={API_URL}
          onAuthSuccess={handleAuthSuccess}
          onClose={() => setShowAuth(false)}
        />
      )}

      {/* Admin modal */}
      {showAdmin && (
        <AdminDashboard
          apiUrl={API_URL}
          userId={user?.id}
          onUploadSuccess={fetchMovies}
          onClose={() => setShowAdmin(false)}
        />
      )}
    </div>
  );
}

export default App;
