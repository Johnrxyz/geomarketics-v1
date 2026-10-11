"use client";

import React, { useState, useEffect } from 'react';
import { announcementsApi } from '@/lib/api';
import { Plus, Edit3, Trash2, Megaphone, CheckCircle, XCircle } from 'lucide-react';
import AppShell from '@/components/layout/AppShell';

export default function AdminAnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);

  const [formData, setFormData] = useState({
    title: '',
    content: '',
    category: 'general',
    priority: 'medium',
    is_active: true,
    start_date: '',
    end_date: ''
  });

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  const fetchAnnouncements = async () => {
    setIsLoading(true);
    try {
      const data: any = await announcementsApi.list();
      setAnnouncements(data.results || data);
    } catch (error) {
      console.error('Failed to fetch announcements:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenModal = (announcement?: any) => {
    if (announcement) {
      setEditingId(announcement.id);
      setFormData({
        title: announcement.title,
        content: announcement.content,
        category: announcement.category,
        priority: announcement.priority,
        is_active: announcement.is_active,
        start_date: announcement.start_date ? new Date(announcement.start_date).toISOString().slice(0, 16) : '',
        end_date: announcement.end_date ? new Date(announcement.end_date).toISOString().slice(0, 16) : ''
      });
    } else {
      setEditingId(null);
      setFormData({
        title: '',
        content: '',
        category: 'general',
        priority: 'medium',
        is_active: true,
        start_date: '',
        end_date: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        start_date: formData.start_date || null,
        end_date: formData.end_date || null
      };

      if (editingId) {
        await announcementsApi.update(editingId, payload);
      } else {
        await announcementsApi.create(payload);
      }
      handleCloseModal();
      fetchAnnouncements();
    } catch (error) {
      console.error('Failed to save announcement:', error);
    }
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this announcement?')) {
      try {
        await announcementsApi.delete(id);
        fetchAnnouncements();
      } catch (error) {
        console.error('Failed to delete announcement:', error);
      }
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <AppShell pageTitle="Announcements Management" role="admin" userName="Admin" userRole="Administrator">
      <div className="page-header">
        <div className="page-header-left">
          <h2 className="page-title">Market Announcements</h2>
          <p className="page-subtitle">Manage market announcements and advisories</p>
        </div>
        <div className="page-header-actions">
          <button onClick={() => handleOpenModal()} className="btn btn-primary">
            <Plus size={15} /> Create Announcement
          </button>
        </div>
      </div>

      <div className="card">
        {/* DESKTOP TABLE VIEW */}
        <div className="data-table-wrapper desktop-only">
          <table className="data-table">
            <thead>
              <tr>
                <th>Title</th>
                <th>Category</th>
                <th>Priority</th>
                <th>Status</th>
                <th>Author</th>
                <th style={{ textAlign: "right" }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                    Loading announcements...
                  </td>
                </tr>
              ) : announcements.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ textAlign: "center", padding: "var(--space-8)", color: "var(--text-muted)" }}>
                    No announcements found.
                  </td>
                </tr>
              ) : (
                announcements.map((announcement) => (
                  <tr key={announcement.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>{announcement.title}</div>
                      <div style={{ fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>{announcement.content}</div>
                    </td>
                    <td>
                      <span className="badge badge-outline" style={{ textTransform: "capitalize" }}>
                        {announcement.category}
                      </span>
                    </td>
                    <td>
                      <span className={`badge ${announcement.priority === 'high' ? 'badge-error' : announcement.priority === 'medium' ? 'badge-warning' : 'badge-success'}`} style={{ textTransform: "capitalize" }}>
                        {announcement.priority}
                      </span>
                    </td>
                    <td>
                      {announcement.is_active ? (
                        <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <CheckCircle size={12} /> Active
                        </span>
                      ) : (
                        <span className="badge badge-outline" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                          <XCircle size={12} /> Inactive
                        </span>
                      )}
                    </td>
                    <td>{announcement.author_name || 'Market Administrator'}</td>
                    <td style={{ textAlign: "right" }}>
                      <div style={{ display: "inline-flex", gap: "var(--space-2)", alignItems: "center", justifyContent: "flex-end" }}>
                        <button
                          onClick={() => handleOpenModal(announcement)}
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ width: 34, height: 34, color: "var(--color-primary)" }}
                          title="Edit Announcement"
                          aria-label="Edit Announcement"
                        >
                          <Edit3 size={15} />
                        </button>
                        <button
                          onClick={() => handleDelete(announcement.id)}
                          className="btn btn-ghost btn-sm btn-icon"
                          style={{ width: 34, height: 34, color: "var(--color-error)", borderColor: "#FEE2E2" }}
                          title="Delete Announcement"
                          aria-label="Delete Announcement"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* MOBILE CARDS VIEW */}
        <div className="mobile-only" style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)", padding: "var(--space-3)" }}>
          {isLoading ? (
            <p style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)" }}>Loading announcements...</p>
          ) : announcements.length === 0 ? (
            <p style={{ textAlign: "center", padding: "var(--space-6)", color: "var(--text-muted)" }}>No announcements found.</p>
          ) : (
            announcements.map((announcement) => (
              <div
                key={announcement.id}
                style={{
                  background: "var(--bg-secondary, #F9FAFB)",
                  border: "1px solid var(--border-color)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--space-3)",
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-2)",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                    <span className={`badge ${announcement.priority === 'high' ? 'badge-error' : announcement.priority === 'medium' ? 'badge-warning' : 'badge-success'}`} style={{ textTransform: "capitalize" }}>
                      {announcement.priority}
                    </span>
                    <span className="badge badge-outline" style={{ textTransform: "capitalize" }}>
                      {announcement.category}
                    </span>
                  </div>
                  {announcement.is_active ? (
                    <span className="badge badge-success" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <CheckCircle size={12} /> Active
                    </span>
                  ) : (
                    <span className="badge badge-outline" style={{ display: "inline-flex", alignItems: "center", gap: "4px" }}>
                      <XCircle size={12} /> Inactive
                    </span>
                  )}
                </div>

                <div style={{ fontSize: "var(--text-base)", fontWeight: 700, color: "var(--text-primary)" }}>
                  {announcement.title}
                </div>

                <div style={{ fontSize: "var(--text-xs)", color: "var(--text-secondary)", lineHeight: 1.4, background: "#ffffff", padding: "var(--space-2)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-color)" }}>
                  {announcement.content}
                </div>

                <div style={{ fontSize: "11px", color: "var(--text-muted)", display: "flex", justifyContent: "space-between" }}>
                  <span>Author: {announcement.author_name || 'Market Administrator'}</span>
                </div>

                {/* Mobile Action Buttons */}
                <div style={{ display: "flex", gap: "var(--space-2)", marginTop: 4 }}>
                  <button
                    onClick={() => handleOpenModal(announcement)}
                    className="btn btn-secondary btn-sm"
                    style={{ flex: 1, minHeight: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontWeight: 600 }}
                  >
                    <Edit3 size={14} /> Edit
                  </button>
                  <button
                    onClick={() => handleDelete(announcement.id)}
                    className="btn btn-ghost btn-sm"
                    style={{ flex: 1, minHeight: 38, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, color: "var(--color-error)", borderColor: "#FEE2E2", fontWeight: 600 }}
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{ position: 'fixed', inset: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 50, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
          <div style={{ backgroundColor: 'var(--bg-card, white)', borderRadius: '8px', width: '100%', maxWidth: '42rem', display: 'flex', flexDirection: 'column', maxHeight: '90vh', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.1), 0 10px 10px -5px rgba(0,0,0,0.04)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-5) var(--space-6)', borderBottom: '1px solid var(--border-color)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                <Megaphone size={20} style={{ color: 'var(--color-primary)' }} />
                {editingId ? 'Edit Announcement' : 'Create Announcement'}
              </h2>
              <button onClick={handleCloseModal} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 'var(--space-1)', color: 'var(--text-muted)', borderRadius: '50%', display: 'flex', alignItems: 'center' }}>
                <XCircle size={22} />
              </button>
            </div>
            
            <form onSubmit={handleSubmit} style={{padding:"var(--space-6)", overflowY:"auto"}}>
              <div className="form-group">
                <label className="form-label">Title <span style={{color:"var(--color-error)"}}>*</span></label>
                <input required type="text" className="form-input" value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} />
              </div>
              
              <div className="form-group">
                <label className="form-label">Content <span style={{color:"var(--color-error)"}}>*</span></label>
                <textarea required rows={4} className="form-input" style={{resize:"vertical"}} value={formData.content} onChange={e => setFormData({...formData, content: e.target.value})} />
              </div>

              <div className="modal-form-grid" style={{ marginBottom: "var(--space-4)" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Category</label>
                  <select className="form-select" value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})}>
                    <option value="schedule">Schedule Change</option>
                    <option value="holiday">Holiday Closure</option>
                    <option value="inspection">Inspection Date</option>
                    <option value="advisory">Public Advisory</option>
                    <option value="general">General</option>
                  </select>
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Priority</label>
                  <select className="form-select" value={formData.priority} onChange={e => setFormData({...formData, priority: e.target.value})}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              </div>

              <div className="modal-form-grid" style={{ marginBottom: "var(--space-4)" }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Start Date (Optional)</label>
                  <input type="datetime-local" className="form-input" value={formData.start_date} onChange={e => setFormData({...formData, start_date: e.target.value})} />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">End Date (Optional)</label>
                  <input type="datetime-local" className="form-input" value={formData.end_date} onChange={e => setFormData({...formData, end_date: e.target.value})} />
                </div>
              </div>

              <div style={{display:"flex", alignItems:"center", gap:"var(--space-2)", marginTop:"var(--space-4)"}}>
                <input type="checkbox" id="isActive" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{width:16, height:16, accentColor:"var(--color-primary)"}} />
                <label htmlFor="isActive" style={{fontSize:"var(--text-sm)", fontWeight:600, cursor:"pointer"}}>Visible to Consumers (Active)</label>
              </div>

            </form>

            <div style={{padding:"var(--space-4) var(--space-6)", borderTop:"1px solid var(--border-color)", background:"#F9FAFB", display:"flex", justifyContent:"flex-end", gap:"var(--space-3)", borderRadius:"0 0 8px 8px"}}>
              <button type="button" onClick={handleCloseModal} className="btn btn-outline">Cancel</button>
              <button type="submit" onClick={handleSubmit} className="btn btn-primary" style={{display:"flex", alignItems:"center", gap:"8px"}}>
                <CheckCircle size={16} /> {editingId ? 'Save Changes' : 'Create Announcement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
