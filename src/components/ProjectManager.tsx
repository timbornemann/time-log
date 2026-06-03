import React, { useState } from 'react';
import { useTimeTracker } from '../context/TimeTrackerContext';
import { Plus, Trash2, Edit2, Check, X, FolderKanban } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

const PRESET_COLORS = [
  '#8C9472', // Sage Green (Theme accent)
  '#6B705C', // Olive
  '#CC7722', // Terracotta
  '#B88B4A', // Warm Amber
  '#9B7E6B', // Taupe/Hazelnut
  '#5C747A', // Soft Muted Blue
  '#806E7D', // Dusty Lavender
  '#4A4A40', // Deep Earthy Charcoal
];

interface ProjectManagerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const ProjectManager: React.FC<ProjectManagerProps> = ({ isOpen, onClose }) => {
  const { projects, addProject, editProject, deleteProject } = useTimeTracker();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Form States
  const [newName, setNewName] = useState('');
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');
  
  // Custom delete confirmation state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    addProject(newName.trim(), newColor);
    setNewName('');
    setIsAdding(false);
  };

  const handleStartEdit = (id: string, currentName: string, currentColor: string) => {
    setEditingId(id);
    setEditName(currentName);
    setEditColor(currentColor);
    setConfirmDeleteId(null);
  };

  const handleSaveEdit = (e: React.FormEvent, id: string) => {
    e.preventDefault();
    if (!editName.trim()) return;
    editProject(id, editName.trim(), editColor);
    setEditingId(null);
  };

  const handleDeleteWithCheck = (id: string) => {
    deleteProject(id);
    setConfirmDeleteId(null);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-[#2D2D28]/45 backdrop-blur-xs"
          />

          {/* Modal Container */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", duration: 0.4 }}
            className="relative bg-white rounded-3xl border border-brand-border p-6 shadow-xl w-full max-w-lg z-10 max-h-[85vh] overflow-y-auto flex flex-col"
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 bg-brand-sage-light text-brand-sage-dark rounded-xl">
                  <FolderKanban id="pm-icon" size={18} />
                </div>
                <div>
                  <h2 id="pm-title" className="font-serif italic text-text-primary text-xl leading-snug">Projekte & Themen</h2>
                  <p id="pm-desc" className="text-xs text-text-muted">Organisiere deine Fokusthemen</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!isAdding && (
                  <button
                    id="btn-add-project-toggle"
                    onClick={() => setIsAdding(true)}
                    className="flex items-center gap-1.5 text-xs font-bold text-brand-sage-dark hover:text-text-primary bg-brand-sage-light hover:bg-[#E2E5D4] px-3.5 py-1.8 rounded-xl transition-all cursor-pointer border border-[#D0D4C2]"
                  >
                    <Plus size={14} /> Neu
                  </button>
                )}
                <button
                  id="btn-close-pm-modal"
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-text-primary hover:bg-brand-sand rounded-xl transition cursor-pointer"
                  title="Schließen"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="popLayout">
              {isAdding && (
                <motion.form
                  id="project-creation-form"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2 }}
                  onSubmit={handleCreate}
                  className="mb-6 p-4.5 bg-brand-sand/50 rounded-2xl border border-brand-border overflow-hidden"
                >
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider mb-3">Neues Thema anlegen</h3>
                  
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs text-text-muted mb-1.5 font-medium">Projektname / Thema</label>
                      <input
                        id="input-new-project-name"
                        type="text"
                        placeholder="z.B. Master Thesis, Design System..."
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        className="w-full text-xs px-3.5 py-2.5 bg-white border border-brand-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-sage/20 focus:border-brand-sage transition-all text-text-primary placeholder:text-text-muted"
                        maxLength={32}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-text-muted mb-2 font-medium">Farbe wählen</label>
                      <div className="flex flex-wrap gap-2">
                        {PRESET_COLORS.map((color) => (
                          <button
                            id={`color-preset-${color.replace('#', '')}`}
                            key={color}
                            type="button"
                            onClick={() => setNewColor(color)}
                            className={`w-6 h-6 rounded-full border transition-transform relative cursor-pointer ${
                              newColor === color ? 'scale-110 border-text-secondary ring-2 ring-brand-sage/20' : 'border-transparent'
                            }`}
                            style={{ backgroundColor: color }}
                          >
                            {newColor === color && (
                              <Check id={`check-${color}`} size={12} className="text-white absolute inset-0 m-auto" />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end gap-2 pt-2.5 border-t border-brand-border">
                      <button
                        id="btn-cancel-add-project"
                        type="button"
                        onClick={() => setIsAdding(false)}
                        className="px-3.5 py-1.8 text-xs text-text-muted hover:text-text-primary bg-transparent rounded-xl transition-all cursor-pointer"
                      >
                        Abbrechen
                      </button>
                      <button
                        id="btn-confirm-add-project"
                        type="submit"
                        className="px-4 py-1.8 text-xs text-white bg-brand-sage hover:bg-brand-sage-dark rounded-xl font-semibold shadow-sm transition-all cursor-pointer"
                      >
                        Erstellen
                      </button>
                    </div>
                  </div>
                </motion.form>
              )}
            </AnimatePresence>

            <div id="project-list-container" className="space-y-2.5 overflow-y-auto pr-1 flex-1 max-h-[400px]">
              {projects.length === 0 ? (
                <div id="no-projects-view" className="text-center py-6 text-text-muted text-xs">
                  Keine Projekte angelegt. Füge oben ein Projekt hinzu.
                </div>
              ) : (
                projects.map((project) => {
                  const isEditing = editingId === project.id;
                  const isConfirmingDelete = confirmDeleteId === project.id;

                  return (
                    <div
                      id={`project-card-${project.id}`}
                      key={project.id}
                      className={`p-3.5 rounded-2xl border transition-all ${
                        isEditing
                          ? 'bg-brand-sage-light/20 border-brand-border-dark shadow-xs'
                          : isConfirmingDelete
                          ? 'bg-red-50/50 border-red-100 shadow-xs'
                          : 'bg-brand-sand/30 hover:bg-brand-sand/60 border-brand-border/40'
                      }`}
                    >
                      {isEditing ? (
                        <form onSubmit={(e) => handleSaveEdit(e, project.id)} className="space-y-3.5">
                          <input
                            id={`edit-p-name-${project.id}`}
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="w-full text-xs px-2.5 py-2 bg-white border border-brand-border-dark rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-sage/20 text-text-primary"
                            maxLength={32}
                            required
                          />
                          
                          <div className="flex gap-2.5 items-center justify-between">
                            <div className="flex gap-1.5">
                              {PRESET_COLORS.map((color) => (
                                <button
                                  id={`edit-color-${project.id}-${color.replace('#', '')}`}
                                  key={color}
                                  type="button"
                                  onClick={() => setEditColor(color)}
                                  className={`w-5.5 h-5.5 rounded-full border transition-transform relative cursor-pointer ${
                                    editColor === color ? 'scale-110 border-text-secondary ring-2 ring-brand-sage/10' : 'border-transparent'
                                  }`}
                                  style={{ backgroundColor: color }}
                                >
                                  {editColor === color && (
                                    <Check id={`edit-check-${project.id}-${color}`} size={10} className="text-white absolute inset-0 m-auto" />
                                  )}
                                </button>
                              ))}
                            </div>

                            <div className="flex gap-1.5">
                              <button
                                id={`btn-cancel-edit-${project.id}`}
                                type="button"
                                onClick={() => setEditingId(null)}
                                className="p-1 text-text-muted hover:text-text-primary transition-all cursor-pointer"
                                title="Abbrechen"
                              >
                                <X size={15} />
                              </button>
                              <button
                                id={`btn-save-edit-${project.id}`}
                                type="submit"
                                className="p-1 text-brand-sage-dark hover:text-text-primary transition-all font-semibold cursor-pointer"
                                title="Speichern"
                              >
                                <Check size={15} />
                              </button>
                            </div>
                          </div>
                        </form>
                      ) : isConfirmingDelete ? (
                        <div className="flex flex-col gap-2">
                          <p className="text-xs text-red-700 font-medium leading-normal">
                            Sicher? Alle Zeit-Logbucheinträge für dieses Projekt werden ebenfalls gelöscht.
                          </p>
                          <div className="flex justify-end gap-2">
                            <button
                              id={`btn-cancel-delete-${project.id}`}
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-3 py-1 text-[10px] font-bold text-text-muted hover:bg-gray-100 rounded-lg cursor-pointer"
                            >
                              Abbrechen
                            </button>
                            <button
                              id={`btn-confirm-delete-${project.id}`}
                              onClick={() => handleDeleteWithCheck(project.id)}
                              className="px-3 py-1 text-[10px] font-bold text-white bg-red-650 hover:bg-red-700 rounded-lg transition cursor-pointer"
                            >
                              Ja, Löschen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-between group">
                          <div className="flex items-center gap-3 min-w-0">
                            <div
                              id={`proj-color-indicator-${project.id}`}
                              className="w-3.5 h-3.5 rounded-full flex-shrink-0"
                              style={{ backgroundColor: project.color }}
                            />
                            <span className="text-xs font-semibold text-text-secondary group-hover:text-text-primary truncate">
                              {project.name}
                            </span>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              id={`btn-trigger-edit-${project.id}`}
                              onClick={() => handleStartEdit(project.id, project.name, project.color)}
                              className="p-1.5 text-text-muted hover:text-text-primary hover:bg-[#E8E2D9]/30 rounded-lg cursor-pointer"
                              title="Bearbeiten"
                            >
                              <Edit2 size={12} />
                            </button>
                            <button
                              id={`btn-trigger-delete-${project.id}`}
                              onClick={() => setConfirmDeleteId(project.id)}
                              className="p-1.5 text-text-muted hover:text-red-650 hover:bg-red-50/50 rounded-lg cursor-pointer"
                              title="Löschen"
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
