import React, { useState, useEffect } from 'react';
import { Upload, Film, FileText, Clock, Calendar, CheckCircle2, AlertCircle, Loader, Link, HardDrive, Trash2, Pencil, X, Settings, Star } from 'lucide-react';

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

interface AdminDashboardProps {
  onClose: () => void;
  onUploadSuccess: () => void;
  apiUrl?: string;
  userId?: string;
}

type Mode = 'upload' | 'url' | 'manage';

export const AdminDashboard: React.FC<AdminDashboardProps> = ({ onClose, onUploadSuccess, apiUrl = 'http://localhost:5000', userId }) => {
  const [mode, setMode] = useState<Mode>('url'); // Default to URL mode for cloud deployments

  // Shared metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Fantasy');
  const [duration, setDuration] = useState('');
  const [year, setYear] = useState(new Date().getFullYear().toString());
  const [trending, setTrending] = useState(false);

  // URL mode
  const [videoUrl, setVideoUrl] = useState('');
  const [thumbnailUrl, setThumbnailUrl] = useState('');

  // Upload mode
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);

  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Manage mode
  const [movies, setMovies] = useState<Movie[]>([]);
  const [moviesLoading, setMoviesLoading] = useState(false);
  const [editingMovie, setEditingMovie] = useState<Movie | null>(null);
  const [editForm, setEditForm] = useState({
    title: '', description: '', category: '', duration: '', year: '', rating: '', trending: false, videoUrl: '', thumbnailUrl: ''
  });

  const fetchMovies = async () => {
    setMoviesLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/movies`);
      const data = await response.json();
      setMovies(data);
    } catch (err) {
      console.error('Error fetching movies:', err);
    } finally {
      setMoviesLoading(false);
    }
  };

  useEffect(() => {
    if (mode === 'manage') {
      fetchMovies();
    }
  }, [mode]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, type: 'video' | 'thumbnail') => {
    if (e.target.files && e.target.files[0]) {
      if (type === 'video') {
        setVideoFile(e.target.files[0]);
      } else {
        setThumbnailFile(e.target.files[0]);
      }
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Fantasy');
    setDuration('');
    setYear(new Date().getFullYear().toString());
    setTrending(false);
    setVideoUrl('');
    setThumbnailUrl('');
    setThumbnailFile(null);
    setVideoFile(null);
    const videoInput = document.getElementById('admin-video-input') as HTMLInputElement;
    const thumbnailInput = document.getElementById('admin-thumb-input') as HTMLInputElement;
    if (videoInput) videoInput.value = '';
    if (thumbnailInput) thumbnailInput.value = '';
  };

  const handleSubmitUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim() || !videoUrl.trim() || !thumbnailUrl.trim()) {
      setError('Please fill in all fields including both URLs.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${apiUrl}/api/admin/add-url`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
        body: JSON.stringify({ title, description, category, duration, year, trending, videoUrl, thumbnailUrl }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to add movie');

      setSuccess('Movie added successfully via URL!');
      onUploadSuccess();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Connection error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!title.trim() || !description.trim() || !thumbnailFile || !videoFile) {
      setError('Please fill in all details and select files.');
      return;
    }

    setLoading(true);
    setUploadProgress(10);

    const formData = new FormData();
    formData.append('title', title);
    formData.append('description', description);
    formData.append('category', category);
    formData.append('duration', duration || '10:00');
    formData.append('year', year || new Date().getFullYear().toString());
    formData.append('trending', trending ? 'true' : 'false');
    formData.append('thumbnail', thumbnailFile);
    formData.append('video', videoFile);

    try {
      const interval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) { clearInterval(interval); return 90; }
          return prev + 15;
        });
      }, 500);

      const response = await fetch(`${apiUrl}/api/admin/upload`, {
        method: 'POST',
        headers: { 'x-user-id': userId || '' },
        body: formData,
      });

      clearInterval(interval);
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to upload movie');

      setUploadProgress(100);
      setSuccess('Movie uploaded and registered in database successfully!');
      onUploadSuccess();
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Connection error. Movie upload failed.');
    } finally {
      setLoading(false);
    }
  };

  // --- Manage Mode Handlers ---

  const handleDeleteMovie = async (movieId: string) => {
    if (!window.confirm('Are you sure you want to delete this movie? This action cannot be undone.')) return;

    try {
      const response = await fetch(`${apiUrl}/api/admin/movies/${movieId}`, { method: 'DELETE', headers: { 'x-user-id': userId || '' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to delete');
      setSuccess('Movie deleted successfully!');
      onUploadSuccess();
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'Failed to delete movie.');
    }
  };

  const handleStartEdit = (movie: Movie) => {
    setEditingMovie(movie);
    setEditForm({
      title: movie.title,
      description: movie.description,
      category: movie.category,
      duration: movie.duration,
      year: movie.year,
      rating: movie.rating,
      trending: movie.trending,
      videoUrl: movie.videoUrl,
      thumbnailUrl: movie.thumbnail,
    });
    setError('');
    setSuccess('');
  };

  const handleCancelEdit = () => {
    setEditingMovie(null);
  };

  const handleSaveEdit = async () => {
    if (!editingMovie) return;
    setError('');
    setSuccess('');

    try {
      const response = await fetch(`${apiUrl}/api/admin/movies/${editingMovie.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'x-user-id': userId || '' },
        body: JSON.stringify(editForm),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.message || 'Failed to update');

      setSuccess('Movie updated successfully!');
      setEditingMovie(null);
      onUploadSuccess();
      fetchMovies();
    } catch (err: any) {
      setError(err.message || 'Failed to update movie.');
    }
  };

  const getAssetUrl = (url: string) => {
    if (url && url.startsWith('/uploads')) {
      return `${apiUrl}${url}`;
    }
    return url;
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '0.75rem 1rem',
    background: '#0a0c10',
    border: '1px solid var(--border-light)',
    borderRadius: '6px',
    color: '#fff',
    fontSize: '0.9rem',
    outline: 'none',
    boxSizing: 'border-box',
  };

  const labelStyle: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    gap: '0.3rem',
    fontSize: '0.75rem',
    textTransform: 'uppercase',
    color: 'var(--text-muted)',
    fontWeight: 700,
    marginBottom: '0.5rem',
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content"
        style={{ maxWidth: mode === 'manage' ? '900px' : '700px', padding: '2.5rem', transition: 'max-width 0.3s ease' }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ fontSize: '1.8rem', fontWeight: 800, marginBottom: '0.5rem' }}>
          Admin Upload Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          Add new movies to your StreamFlix library using Google Drive URLs or direct file uploads.
        </p>

        {/* Mode Tabs */}
        <div style={{ display: 'flex', gap: '0', marginBottom: '2rem', background: '#0a0c10', borderRadius: '10px', padding: '4px', border: '1px solid var(--border-light)' }}>
          {([
            { id: 'url', label: 'Google Drive / URL', icon: <Link size={14} /> },
            { id: 'upload', label: 'File Upload', icon: <HardDrive size={14} /> },
            { id: 'manage', label: 'Manage Movies', icon: <Settings size={14} /> },
          ] as { id: Mode; label: string; icon: React.ReactNode }[]).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => { setMode(tab.id); setError(''); setSuccess(''); setEditingMovie(null); }}
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.4rem',
                padding: '0.6rem 1rem',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                border: 'none',
                transition: 'all 0.2s',
                background: mode === tab.id ? 'var(--accent)' : 'transparent',
                color: mode === tab.id ? '#000' : 'var(--text-muted)',
              }}
            >
              {tab.icon} {tab.label}
            </button>
          ))}
        </div>

        {error && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.25)', color: '#ef4444', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.25)', color: '#10b981', padding: '0.75rem 1rem', borderRadius: '6px', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
            <CheckCircle2 size={16} />
            <span>{success}</span>
          </div>
        )}

        {loading && (
          <div style={{ background: '#10131c', border: '1px solid var(--border-light)', padding: '1.25rem', borderRadius: '8px', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem', marginBottom: '0.75rem' }}>
              <Loader size={18} className="animate-spin" style={{ color: 'var(--accent)' }} />
              <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                {mode === 'upload' ? 'Uploading media assets...' : 'Saving movie to database...'}
              </span>
            </div>
            {mode === 'upload' && (
              <>
                <div style={{ height: '6px', background: '#25293a', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', background: 'var(--gradient-gold)', width: `${uploadProgress}%`, transition: 'width 0.4s ease' }} />
                </div>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginTop: '0.4rem', textAlign: 'right' }}>
                  {uploadProgress}% Completed
                </span>
              </>
            )}
          </div>
        )}

        {/* ==================== MANAGE MODE ==================== */}
        {mode === 'manage' && (
          <div>
            {moviesLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '3rem 0' }}>
                <div className="spinner" />
              </div>
            ) : editingMovie ? (
              /* ---------- Edit Form ---------- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                  <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: 0 }}>
                    <Pencil size={16} style={{ marginRight: '0.5rem', verticalAlign: 'middle' }} />
                    Editing: {editingMovie.title}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.4rem' }}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}><Film size={12} /> Movie Title</label>
                    <input type="text" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}>Genre / Category</label>
                    <select value={editForm.category} onChange={(e) => setEditForm({ ...editForm, category: e.target.value })} style={{ ...inputStyle, cursor: 'pointer' }}>
                      <option value="Fantasy">Fantasy</option>
                      <option value="Sci-Fi">Sci-Fi</option>
                      <option value="Animation">Animation</option>
                      <option value="Action">Action</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label style={labelStyle}><FileText size={12} /> Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} style={{ ...inputStyle, resize: 'vertical' }} />
                </div>

                <div className="admin-grid-3" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1.25rem' }}>
                  <div>
                    <label style={labelStyle}><Clock size={12} /> Duration</label>
                    <input type="text" value={editForm.duration} onChange={(e) => setEditForm({ ...editForm, duration: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}><Calendar size={12} /> Release Year</label>
                    <input type="text" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}><Star size={12} /> Rating</label>
                    <input type="text" value={editForm.rating} onChange={(e) => setEditForm({ ...editForm, rating: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px dashed var(--border-light)', padding: '1.25rem', borderRadius: '8px', background: '#08090d' }}>
                  <div>
                    <label style={labelStyle}><Link size={12} /> Video URL</label>
                    <input type="text" value={editForm.videoUrl} onChange={(e) => setEditForm({ ...editForm, videoUrl: e.target.value })} style={inputStyle} />
                  </div>
                  <div>
                    <label style={labelStyle}><Link size={12} /> Thumbnail URL</label>
                    <input type="text" value={editForm.thumbnailUrl} onChange={(e) => setEditForm({ ...editForm, thumbnailUrl: e.target.value })} style={inputStyle} />
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <input type="checkbox" id="edit-trending" checked={editForm.trending} onChange={(e) => setEditForm({ ...editForm, trending: e.target.checked })}
                    style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
                  <label htmlFor="edit-trending" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                    Feature this movie in the Hero Banner (Trending)
                  </label>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
                  <button type="button" onClick={handleCancelEdit} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px' }}>
                    Cancel
                  </button>
                  <button type="button" onClick={handleSaveEdit} className="btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <CheckCircle2 size={16} /> Save Changes
                  </button>
                </div>
              </div>
            ) : movies.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', color: 'var(--text-muted)' }}>
                No movies found. Add some movies first!
              </div>
            ) : (
              /* ---------- Movies List ---------- */
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', maxHeight: '450px', overflowY: 'auto', paddingRight: '0.5rem' }}>
                {movies.map((movie) => (
                  <div
                    key={movie.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1rem',
                      padding: '0.75rem 1rem',
                      background: '#0e1015',
                      border: '1px solid var(--border-light)',
                      borderRadius: '8px',
                      transition: 'border-color 0.2s',
                    }}
                    onMouseOver={(e) => (e.currentTarget.style.borderColor = 'rgba(212, 175, 55, 0.3)')}
                    onMouseOut={(e) => (e.currentTarget.style.borderColor = 'var(--border-light)')}
                  >
                    {/* Thumbnail */}
                    <img
                      src={getAssetUrl(movie.thumbnail)}
                      alt={movie.title}
                      style={{
                        width: '70px',
                        height: '45px',
                        objectFit: 'cover',
                        borderRadius: '4px',
                        flexShrink: 0,
                      }}
                    />

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {movie.title}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'flex', gap: '0.5rem', marginTop: '0.2rem' }}>
                        <span>{movie.category}</span>
                        <span>•</span>
                        <span>{movie.year}</span>
                        <span>•</span>
                        <span>★ {movie.rating}</span>
                        {movie.trending && (
                          <>
                            <span>•</span>
                            <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Trending</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                      <button
                        onClick={() => handleStartEdit(movie)}
                        style={{
                          background: 'rgba(212, 175, 55, 0.1)',
                          border: '1px solid rgba(212, 175, 55, 0.25)',
                          color: 'var(--accent)',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.2)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(212, 175, 55, 0.1)')}
                      >
                        <Pencil size={13} /> Edit
                      </button>
                      <button
                        onClick={() => handleDeleteMovie(movie.id)}
                        style={{
                          background: 'rgba(239, 68, 68, 0.1)',
                          border: '1px solid rgba(239, 68, 68, 0.25)',
                          color: '#ef4444',
                          cursor: 'pointer',
                          borderRadius: '6px',
                          padding: '0.5rem 0.75rem',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.35rem',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          transition: 'all 0.2s',
                        }}
                        onMouseOver={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.2)')}
                        onMouseOut={(e) => (e.currentTarget.style.background = 'rgba(239, 68, 68, 0.1)')}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ==================== URL / UPLOAD FORM ==================== */}
        {(mode === 'url' || mode === 'upload') && (
          <form onSubmit={mode === 'url' ? handleSubmitUrl : handleSubmitUpload} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

            <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}><Film size={12} /> Movie Title</label>
                <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Inception" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>Genre / Category</label>
                <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
                  <option value="Fantasy">Fantasy</option>
                  <option value="Sci-Fi">Sci-Fi</option>
                  <option value="Animation">Animation</option>
                  <option value="Action">Action</option>
                </select>
              </div>
            </div>

            <div>
              <label style={labelStyle}><FileText size={12} /> Description</label>
              <textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Provide a plot summary..." rows={3}
                style={{ ...inputStyle, resize: 'vertical' }} />
            </div>

            <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div>
                <label style={labelStyle}><Clock size={12} /> Duration</label>
                <input type="text" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="e.g. 2:18 or 14:48" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}><Calendar size={12} /> Release Year</label>
                <input type="text" value={year} onChange={(e) => setYear(e.target.value)} placeholder="e.g. 2026" style={inputStyle} />
              </div>
            </div>

            {/* URL Mode Fields */}
            {mode === 'url' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', border: '1px dashed var(--border-light)', padding: '1.25rem', borderRadius: '8px', background: '#08090d' }}>
                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.6 }}>
                  <strong style={{ color: 'var(--accent)' }}>Google Drive Instructions:</strong> Upload your file to Drive → right-click → Share → "Anyone with the link" → copy the link.
                  Then convert: <code style={{ background: '#1a1d2a', padding: '1px 6px', borderRadius: '3px' }}>drive.google.com/file/d/<strong>FILE_ID</strong>/view</code>
                  {' → '}
                  <code style={{ background: '#1a1d2a', padding: '1px 6px', borderRadius: '3px' }}>docs.google.com/uc?export=download&confirm=no&id=<strong>FILE_ID</strong></code>
                </p>
                <div>
                  <label style={labelStyle}><Link size={12} /> Video URL (Google Drive or direct MP4 link)</label>
                  <input type="url" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} placeholder="https://docs.google.com/uc?export=download&confirm=no&id=FILE_ID" style={inputStyle} />
                </div>
                <div>
                  <label style={labelStyle}><Link size={12} /> Thumbnail / Poster URL (image link)</label>
                  <input type="url" value={thumbnailUrl} onChange={(e) => setThumbnailUrl(e.target.value)} placeholder="https://your-image-host.com/poster.jpg" style={inputStyle} />
                </div>
              </div>
            )}

            {/* File Upload Mode Fields */}
            {mode === 'upload' && (
              <div className="admin-grid-2" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem', border: '1px dashed var(--border-light)', padding: '1.25rem', borderRadius: '8px', background: '#08090d' }}>
                <div>
                  <label style={labelStyle}>Poster Image</label>
                  <input id="admin-thumb-input" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'thumbnail')} style={{ fontSize: '0.8rem', color: '#8e95a5' }} />
                </div>
                <div>
                  <label style={labelStyle}>Video File (.mp4)</label>
                  <input id="admin-video-input" type="file" accept="video/mp4" onChange={(e) => handleFileChange(e, 'video')} style={{ fontSize: '0.8rem', color: '#8e95a5' }} />
                </div>
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <input type="checkbox" id="admin-trending" checked={trending} onChange={(e) => setTrending(e.target.checked)}
                style={{ width: '16px', height: '16px', accentColor: 'var(--accent)', cursor: 'pointer' }} />
              <label htmlFor="admin-trending" style={{ fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                Feature this movie in the Hero Banner (Trending)
              </label>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '0.5rem' }}>
              <button type="button" onClick={onClose} className="btn-secondary" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px' }}>
                Cancel
              </button>
              <button type="submit" disabled={loading} className="btn-primary" style={{ padding: '0.75rem 1.75rem', borderRadius: '6px' }}>
                {mode === 'url' ? <Link size={16} /> : <Upload size={16} />}
                {mode === 'url' ? 'Add Movie' : 'Upload Movie'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
