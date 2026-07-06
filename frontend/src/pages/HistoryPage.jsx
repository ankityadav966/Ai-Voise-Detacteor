import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { usePlayer } from '../context/PlayerContext';
import {
  fetchRecordings,
  setSearchQuery,
  setFolderFilter,
  toggleFavorite,
  deleteRecording,
  renameRecording,
  updateFolder,
  selectFilteredHistory,
  selectFoldersList,
} from '../redux/historySlice';
import {
  MdArrowBack,
  MdSearch,
  MdPlayArrow,
  MdPause,
  MdStar,
  MdStarBorder,
  MdMoreVert,
  MdFolderOpen,
  MdFolder,
  MdEdit,
  MdDeleteOutline,
  MdClose,
  MdMicOff,
} from 'react-icons/md';

const HistoryPage = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const filteredHistory = useSelector(selectFilteredHistory);
  const folders = useSelector(selectFoldersList);
  const activeFolder = useSelector((state) => state.history.folderFilter);
  const activeFavorite = useSelector((state) => state.history.favoriteFilter);

  const { currentRecording, isPlaying, play, pause, resume } = usePlayer();

  const [localSearch, setLocalSearch] = useState('');
  
  // Modals & popover menu triggers
  const [selectedRec, setSelectedRec] = useState(null);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [renameText, setRenameText] = useState('');
  const [showFolderModal, setShowFolderModal] = useState(false);

  useEffect(() => {
    dispatch(fetchRecordings());
  }, [dispatch]);

  const handleSearchChange = (e) => {
    const text = e.target.value;
    setLocalSearch(text);
    dispatch(setSearchQuery(text));
  };

  const handlePlayToggle = (rec) => {
    const isCurrent = currentRecording && currentRecording.id === rec.id;
    if (isCurrent) {
      if (isPlaying) {
        pause();
      } else {
        resume();
      }
    } else {
      play(rec);
    }
  };

  const handleOpenActionMenu = (rec, e) => {
    e.stopPropagation();
    setSelectedRec(rec);
    setRenameText(rec.title);
    setShowActionMenu(true);
  };

  const handleDeleteConfirm = () => {
    if (!selectedRec) return;
    setShowActionMenu(false);
    const confirm = window.confirm('Delete this recording permanently?');
    if (confirm) {
      dispatch(deleteRecording(selectedRec.id));
      setSelectedRec(null);
    }
  };

  const handleRenameSave = (e) => {
    e.preventDefault();
    if (!selectedRec || !renameText.trim()) return;
    dispatch(renameRecording({ id: selectedRec.id, title: renameText.trim() }));
    setShowRenameModal(false);
    setSelectedRec(null);
  };

  const handleMoveFolder = (folderName) => {
    if (!selectedRec) return;
    dispatch(updateFolder({ id: selectedRec.id, folder: folderName }));
    setShowFolderModal(false);
    setSelectedRec(null);
  };

  const formatDuration = (seconds) => {
    if (isNaN(seconds) || seconds < 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <button onClick={() => navigate('/home')} style={styles.headerBtn} aria-label="Back">
          <MdArrowBack size={24} />
        </button>
        <span style={styles.headerTitle}>
          {activeFavorite ? 'Favorite Recordings' : 'Recordings History'}
        </span>
        <div style={{ width: '40px' }} />
      </div>

      {/* Search Container */}
      <div style={styles.searchContainer}>
        <div style={styles.searchBar}>
          <MdSearch size={22} color="#94A3B8" style={{ marginRight: '10px' }} />
          <input
            type="text"
            placeholder="Search title, tags, or words..."
            value={localSearch}
            onChange={handleSearchChange}
            style={styles.searchInput}
          />
        </div>
      </div>

      {/* Folder Filters Chips */}
      {!activeFavorite && (
        <div style={styles.chipsContainer}>
          <div style={styles.chipsScroll}>
            {['All', ...folders].map((f) => {
              const isSelected = activeFolder === f;
              return (
                <button
                  key={f}
                  onClick={() => dispatch(setFolderFilter(f))}
                  style={{
                    ...styles.chip,
                    backgroundColor: isSelected ? '#6366F1' : '#151C33',
                    color: isSelected ? '#FFFFFF' : '#94A3B8',
                  }}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* History List */}
      <div style={styles.content}>
        {filteredHistory.length === 0 ? (
          <div style={styles.emptyState}>
            <MdMicOff size={48} color="rgba(255, 255, 255, 0.05)" />
            <p style={styles.emptyText}>No recordings found matching criteria.</p>
          </div>
        ) : (
          <div style={styles.list}>
            {filteredHistory.map((rec) => {
              const isCurrent = currentRecording && currentRecording.id === rec.id;
              return (
                <div
                  key={rec.id}
                  style={styles.card}
                  onClick={() => navigate(`/transcript/${rec.id}`, { state: { recording: rec } })}
                >
                  {/* Play Button Toggle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePlayToggle(rec);
                    }}
                    style={{
                      ...styles.playBtnCircle,
                      backgroundColor: isCurrent && isPlaying ? 'rgba(99, 102, 241, 0.15)' : '#090D1A',
                    }}
                  >
                    {isCurrent && isPlaying ? (
                      <MdPause size={22} color="#6366F1" />
                    ) : (
                      <MdPlayArrow size={22} color="#6366F1" />
                    )}
                  </button>

                  {/* Card Content info */}
                  <div style={styles.cardInfo}>
                    <h4 style={styles.cardTitle}>{rec.title}</h4>
                    <div style={styles.cardMeta}>
                      <span>{formatDate(rec.createdAt || rec.dateTime)}</span>
                      <span style={styles.cardMetaDot} />
                      <span>{formatDuration(rec.durationInSeconds)}</span>
                      {rec.folder && rec.folder !== 'General' && (
                        <>
                          <span style={styles.cardMetaDot} />
                          <span style={styles.folderBadge}>{rec.folder}</span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Right Actions */}
                  <div style={styles.cardActions}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        dispatch(toggleFavorite(rec.id));
                      }}
                      style={styles.actionIconBtn}
                    >
                      {rec.isFavorite ? (
                        <MdStar size={20} color="#F59E0B" />
                      ) : (
                        <MdStarBorder size={20} color="#94A3B8" />
                      )}
                    </button>
                    <button
                      onClick={(e) => handleOpenActionMenu(rec, e)}
                      style={styles.actionIconBtn}
                    >
                      <MdMoreVert size={20} color="#94A3B8" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Action Menu Modal */}
      {showActionMenu && selectedRec && (
        <div style={styles.modalOverlay} onClick={() => setShowActionMenu(false)}>
          <div style={styles.actionMenu} onClick={(e) => e.stopPropagation()}>
            <div style={styles.actionMenuHeader}>
              <span style={styles.actionMenuTitle}>{selectedRec.title}</span>
              <button onClick={() => setShowActionMenu(false)} style={styles.closeBtn}>
                <MdClose size={20} />
              </button>
            </div>
            <div style={styles.modalDivider} />

            <button
              onClick={() => {
                setShowActionMenu(false);
                navigate(`/transcript/${selectedRec.id}`, { state: { recording: selectedRec } });
              }}
              style={styles.menuItem}
            >
              <MdFolderOpen size={18} color="#6366F1" style={{ marginRight: '12px' }} />
              <span>Open Transcript</span>
            </button>

            <button
              onClick={() => {
                setShowActionMenu(false);
                setShowRenameModal(true);
              }}
              style={styles.menuItem}
            >
              <MdEdit size={18} color="#6366F1" style={{ marginRight: '12px' }} />
              <span>Rename</span>
            </button>

            <button
              onClick={() => {
                setShowActionMenu(false);
                setShowFolderModal(true);
              }}
              style={styles.menuItem}
            >
              <MdFolder size={18} color="#6366F1" style={{ marginRight: '12px' }} />
              <span>Move Folder</span>
            </button>

            <button onClick={handleDeleteConfirm} style={styles.menuItem}>
              <MdDeleteOutline size={18} color="#EF4444" style={{ marginRight: '12px' }} />
              <span style={{ color: '#EF4444' }}>Delete Recording</span>
            </button>
          </div>
        </div>
      )}

      {/* Rename Dialog Modal */}
      {showRenameModal && selectedRec && (
        <div style={styles.modalOverlay}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>Rename Recording</h3>
            <form onSubmit={handleRenameSave}>
              <input
                type="text"
                value={renameText}
                onChange={(e) => setRenameText(e.target.value)}
                style={styles.dialogInput}
                required
              />
              <div style={styles.dialogActions}>
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameModal(false);
                    setSelectedRec(null);
                  }}
                  style={styles.dialogCancel}
                >
                  Cancel
                </button>
                <button type="submit" style={styles.dialogSave}>
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Move Folder Dialog Modal */}
      {showFolderModal && selectedRec && (
        <div style={styles.modalOverlay}>
          <div style={styles.dialog}>
            <h3 style={styles.dialogTitle}>Move to Folder</h3>
            <div style={styles.folderList}>
              {folders.map((folderName) => (
                <button
                  key={folderName}
                  onClick={() => handleMoveFolder(folderName)}
                  style={styles.folderListItem}
                >
                  <span>{folderName}</span>
                  {selectedRec.folder === folderName && <MdFolder size={18} color="#6366F1" />}
                </button>
              ))}
            </div>
            <button
              onClick={() => {
                setShowFolderModal(false);
                setSelectedRec(null);
              }}
              style={{ ...styles.dialogCancel, float: 'right', marginTop: '12px' }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#090D1A',
    color: '#FFFFFF',
    paddingBottom: '100px',
  },
  header: {
    height: '64px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '0 16px',
  },
  headerBtn: {
    color: '#FFFFFF',
    padding: '8px',
  },
  headerTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
  },
  searchContainer: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '12px 24px',
  },
  searchBar: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: '12px',
    padding: '10px 16px',
  },
  searchInput: {
    flex: 1,
    backgroundColor: 'transparent',
    border: 'none',
    color: '#FFFFFF',
    fontSize: '14px',
    outline: 'none',
  },
  chipsContainer: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '0 24px 16px 24px',
    overflowX: 'auto',
  },
  chipsScroll: {
    display: 'flex',
    gap: '10px',
  },
  chip: {
    padding: '8px 16px',
    borderRadius: '20px',
    fontSize: '13px',
    fontWeight: 'bold',
    border: 'none',
    whiteSpace: 'nowrap',
  },
  content: {
    maxWidth: '960px',
    margin: '0 auto',
    padding: '0 24px',
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '8px',
    padding: '60px 0',
  },
  emptyText: {
    fontSize: '14px',
    color: '#94A3B8',
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },
  card: {
    display: 'flex',
    alignItems: 'center',
    backgroundColor: '#151C33',
    borderRadius: '16px',
    padding: '12px 16px',
    border: '1px solid rgba(255, 255, 255, 0.02)',
    cursor: 'pointer',
  },
  playBtnCircle: {
    width: '44px',
    height: '44px',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: '12px',
    border: 'none',
  },
  cardInfo: {
    flex: 1,
  },
  cardTitle: {
    fontSize: '15px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '4px',
  },
  cardMeta: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    fontSize: '12px',
    color: '#94A3B8',
  },
  cardMetaDot: {
    width: '4px',
    height: '4px',
    borderRadius: '50%',
    backgroundColor: '#6366F1',
  },
  folderBadge: {
    backgroundColor: 'rgba(99, 102, 241, 0.15)',
    color: '#8B5CF6',
    borderRadius: '4px',
    padding: '2px 6px',
    fontSize: '10px',
    fontWeight: 'bold',
  },
  cardActions: {
    display: 'flex',
    gap: '8px',
  },
  actionIconBtn: {
    padding: '6px',
    display: 'flex',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0,0,0,0.6)',
    display: 'flex',
    alignItems: 'flex-end',
    justifyContent: 'center',
    zIndex: 9999,
  },
  actionMenu: {
    width: '100%',
    maxWidth: '500px',
    backgroundColor: '#151C33',
    borderTopLeftRadius: '20px',
    borderTopRightRadius: '20px',
    padding: '24px',
    display: 'flex',
    flexDirection: 'column',
  },
  actionMenuHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionMenuTitle: {
    fontSize: '16px',
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  closeBtn: {
    color: '#94A3B8',
    padding: '4px',
  },
  modalDivider: {
    height: '1px',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    margin: '12px 0',
  },
  menuItem: {
    display: 'flex',
    alignItems: 'center',
    padding: '14px 0',
    color: '#FFFFFF',
    fontSize: '15px',
    fontWeight: '500',
    textAlign: 'left',
  },
  dialog: {
    backgroundColor: '#151C33',
    borderRadius: '16px',
    border: '1px solid rgba(255,255,255,0.04)',
    padding: '24px',
    width: '320px',
    margin: 'auto',
  },
  dialogTitle: {
    fontSize: '18px',
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginBottom: '16px',
  },
  dialogInput: {
    width: '100%',
    height: '44px',
    backgroundColor: '#090D1A',
    border: '1px solid rgba(255, 255, 255, 0.08)',
    borderRadius: '8px',
    color: '#FFFFFF',
    padding: '0 12px',
    fontSize: '14px',
    marginBottom: '20px',
  },
  dialogActions: {
    display: 'flex',
    justifyContent: 'flex-end',
    gap: '12px',
  },
  dialogCancel: {
    color: '#94A3B8',
    fontSize: '14px',
    padding: '8px 12px',
  },
  dialogSave: {
    backgroundColor: '#6366F1',
    color: '#FFFFFF',
    borderRadius: '8px',
    padding: '8px 16px',
    fontWeight: 'bold',
    fontSize: '14px',
  },
  folderList: {
    maxHeight: '200px',
    overflowY: 'auto',
    display: 'flex',
    flexDirection: 'column',
  },
  folderListItem: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '12px 0',
    borderBottom: '1px solid rgba(255,255,255,0.04)',
    color: '#FFFFFF',
    fontSize: '14px',
  },
};

export default HistoryPage;
