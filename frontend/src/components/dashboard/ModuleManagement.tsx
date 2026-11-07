'use client';

import { useState, useEffect, Fragment } from 'react';
import { ModuleDetail } from './ModuleDetail';

export function ModuleManagement() {
  const [modules, setModules] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<any>(null);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  
  const [selectedModuleId, setSelectedModuleId] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({ name: '', code: '', description: '' });
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [page, setPage] = useState(1);
  const [metadata, setMetadata] = useState<any>({ totalPages: 1 });
  const [moduleToDelete, setModuleToDelete] = useState<any>(null);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      setCurrentUser(JSON.parse(authData).user);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchData();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, page, sortBy, sortOrder]);

  
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortBy !== field) return <svg className="w-3 h-3 text-slate-600 group-hover:text-slate-500 transition-colors" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l4 4a1 1 0 01-1.414 1.414L10 5.414 6.707 8.707a1 1 0 01-1.414-1.414l4-4A1 1 0 0110 3zm0 14a1 1 0 01-.707-.293l-4-4a1 1 0 111.414-1.414L10 14.586l3.293-3.293a1 1 0 111.414 1.414l-4 4A1 1 0 0110 17z" clipRule="evenodd" /></svg>;
    if (sortOrder === 'asc') return <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clipRule="evenodd" /></svg>;
    return <svg className="w-3 h-3 text-indigo-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" /></svg>;
  };

  const SortHeader = ({ label, sortKey, align = 'left' }: { label: string, sortKey: string, align?: 'left' | 'center' }) => {
    return (
      <th 
        data-testid={`module-th-${sortKey}`}
        className={`py-4 px-6 text-indigo-200 font-semibold cursor-pointer hover:bg-slate-700/50 transition-colors select-none group ${align === 'center' ? 'text-center' : 'text-left'}`}
        onClick={() => handleSort(sortKey)}
      >
        <div className={`flex items-center gap-2 ${align === 'center' ? 'justify-center' : ''}`}>
          {label}
          <div className="flex flex-col items-center">
            {renderSortIcon(sortKey)}
          </div>
        </div>
      </th>
    );
  };

  
  const fetchData = async () => {
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      const res = await fetch(`${baseUrl}/modules?page=${page}&limit=12&search=${encodeURIComponent(searchQuery)}&sortBy=${sortBy}&sortOrder=${sortOrder}`, {
        headers: { 'Authorization': `Bearer ${authData.access_token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setModules(json.data);
        setMetadata(json.metadata || { totalPages: 1 });
      }
    } catch(err) {}
  };

  const handleSave = async (e: any) => {
    e.preventDefault();
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      const headers = { 
        'Authorization': `Bearer ${authData.access_token}`,
        'Content-Type': 'application/json'
      };
      
      const method = editingItem ? 'PUT' : 'POST';
      const url = editingItem ? `${baseUrl}/modules/${editingItem.id}` : `${baseUrl}/modules`;
      const body = editingItem
        ? { name: formData.name, description: formData.description }
        : formData;
      
      const res = await fetch(url, { method, headers, body: JSON.stringify(body) });
      if (res.ok) {
        setIsFormOpen(false);
        fetchData();
      } else {
        alert("Failed to save module");
      }
    } catch(err) {}
  };

  const handleDeleteClick = (mod: any, e: any) => {
    e.stopPropagation();
    setModuleToDelete(mod);
  };

  const confirmDelete = async () => {
    if (!moduleToDelete) return;
    try {
      const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
      const authData = JSON.parse(localStorage.getItem('auth') || '{}');
      await fetch(`${baseUrl}/modules/${moduleToDelete.id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${authData.access_token}` }
      });
      setModuleToDelete(null);
      fetchData();
    } catch(err) {}
  };

  const openForm = (item?: any, e?: any) => {
    if (e) e.stopPropagation();
    if (item) {
      setEditingItem(item);
      setFormData({ name: item.name, code: item.code, description: item.description || '' });
    } else {
      setEditingItem(null);
      setFormData({ name: '', code: '', description: '' });
    }
    setIsFormOpen(true);
  };

  const canEdit = ['Super Admin', 'Tech Lead', 'BA'].includes(currentUser?.role);

  if (selectedModuleId) {
    return <ModuleDetail moduleId={selectedModuleId} onBack={() => setSelectedModuleId(null)} />;
  }



  return (
    <div data-testid="module-management-container" className="bg-slate-900 border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden flex flex-col gap-6">
      
      <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="relative w-full md:w-72">
          <svg className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            id="module-mgmt-search-input"
            data-testid="module-mgmt-search-input"
            type="text" 
            placeholder="Search modules..." 
            value={searchQuery}
            onChange={e => {
              setSearchQuery(e.target.value);
              setPage(1);
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-xl py-2 pl-10 pr-4 text-white text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-colors"
          />
        </div>
        
        <div className="flex w-full md:w-auto items-center gap-4">
          <div className="flex bg-slate-800 rounded-xl p-1 border border-slate-800">
            <button
              id="module-mgmt-grid-view-btn"
              data-testid="module-mgmt-grid-view-btn"
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              title="Grid View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"></path></svg>
            </button>
            <button
              id="module-mgmt-list-view-btn"
              data-testid="module-mgmt-list-view-btn"
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-indigo-500 text-white shadow-sm' : 'text-white/50 hover:text-white hover:bg-white/5'}`}
              title="List View"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
            </button>
          </div>
          {canEdit && (
            <button 
              id="module-mgmt-add-btn"
              data-testid="module-mgmt-add-btn"
              onClick={() => openForm()}
              className="px-5 py-2.5 bg-indigo-600 rounded-xl font-bold text-white shadow-sm hover:bg-indigo-500 text-sm whitespace-nowrap transition-colors"
            >
              Add Module
            </button>
          )}
        </div>
      </div>

      {viewMode === 'grid' ? (
        <div data-testid="module-grid-container" className="relative z-10 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {modules.map(mod => (
            <div 
              key={mod.id} 
              data-testid={`module-grid-card-${mod.id}`}
              onClick={() => setSelectedModuleId(mod.id)}
              className="bg-slate-800 border border-slate-800 p-6 rounded-[1.5rem] hover:bg-slate-900 cursor-pointer transition-colors flex flex-col relative"
            >
              <div className="absolute top-4 right-4 text-white/20">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
              </div>
              
              <div className="flex items-center gap-3 mb-4">
                <div data-testid={`module-grid-code-${mod.id}`} className="h-10 px-4 min-w-[3rem] w-auto rounded-xl bg-indigo-500/20 text-indigo-300 flex items-center justify-center font-bold border border-indigo-500/30 text-sm tracking-wider">
                  {mod.code}
                </div>
                <h3 data-testid={`module-grid-name-${mod.id}`} className="text-lg font-bold text-white leading-tight">{mod.name}</h3>
              </div>
              
              <p className="text-sm text-white/50 line-clamp-2 mb-6 flex-1">
                {mod.description || 'No description provided.'}
              </p>
              
              <div className="flex justify-between items-end border-t border-slate-800 pt-4 mt-auto">
                <div className="flex gap-2">
                </div>
                {canEdit && (
                  <div className="flex gap-2">
                    <button 
                      id={`module-grid-edit-btn-${mod.id}`}
                      data-testid={`module-grid-edit-btn-${mod.id}`}
                      onClick={(e) => openForm(mod, e)} 
                      className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                    </button>
                    <button 
                      id={`module-grid-delete-btn-${mod.id}`}
                      data-testid={`module-grid-delete-btn-${mod.id}`}
                      onClick={(e) => handleDeleteClick(mod, e)} 
                      className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
          {modules.length === 0 && (
            <div data-testid="module-grid-empty" className="col-span-full py-12 text-center text-white/50 bg-slate-800 rounded-2xl border border-slate-800">
              No modules found.
            </div>
          )}
        </div>
      ) : (
        <div className="relative z-10 overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/50 shadow-sm">
          <table data-testid="module-list-table" className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-800/50">
                <th className="py-4 px-6 text-indigo-200 font-semibold w-16 text-center">No</th>
                <SortHeader label="Code" sortKey="code" />
                <SortHeader label="Name" sortKey="name" />
                <SortHeader label="Description" sortKey="description" />
                <SortHeader label="Jumlah Testcase" sortKey="testcaseCount" align="center" />
                {canEdit && <th className="py-4 px-6 text-indigo-200 font-semibold text-right">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {modules.map((mod, index) => {
                const no = (page - 1) * 12 + index + 1;
                const tcCount = mod._count?.testcases || 0;
                
                return (
                  <tr 
                    key={mod.id}
                    data-testid={`module-list-row-${mod.id}`}
                    onClick={() => setSelectedModuleId(mod.id)}
                    className="border-b border-slate-800/50 hover:bg-white/5 cursor-pointer transition-colors group"
                  >
                    <td className="py-4 px-6 text-center text-white/50 font-medium">{no}</td>
                    <td className="py-4 px-6">
                      <span data-testid={`module-list-code-${mod.id}`} className="font-bold text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 text-xs tracking-wider">
                        {mod.code}
                      </span>
                    </td>
                    <td data-testid={`module-list-name-${mod.id}`} className="py-4 px-6 font-bold text-white">{mod.name}</td>
                    <td className="py-4 px-6 text-white/50 text-sm truncate max-w-xs">{mod.description || '-'}</td>
                    <td className="py-4 px-6 text-center">
                      <span data-testid={`module-list-count-${mod.id}`} className="inline-flex items-center justify-center min-w-[2rem] h-6 px-2 text-xs font-bold rounded-full bg-slate-900 border border-slate-700 text-indigo-300">
                        {tcCount}
                      </span>
                    </td>
                    {canEdit && (
                      <td className="py-4 px-6 text-right">
                        <div className="flex justify-end gap-2">
                          <button 
                            id={`module-list-edit-btn-${mod.id}`}
                            data-testid={`module-list-edit-btn-${mod.id}`}
                            onClick={(e) => { e.stopPropagation(); openForm(mod); }} 
                            className="p-2 rounded-lg bg-white/5 hover:bg-white/20 text-white transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"></path></svg>
                          </button>
                          <button 
                            id={`module-list-delete-btn-${mod.id}`}
                            data-testid={`module-list-delete-btn-${mod.id}`}
                            onClick={(e) => { e.stopPropagation(); handleDeleteClick(mod, e); }} 
                            className="p-2 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition-colors"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {modules.length === 0 && (
                <tr>
                  <td data-testid="module-list-empty" colSpan={canEdit ? 6 : 5} className="py-12 text-center text-white/50">
                    No modules found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination Controls */}
      {metadata.totalPages > 1 && (
        <div data-testid="module-mgmt-pagination" className="relative z-10 flex justify-center items-center gap-4">
          <button 
            id="module-mgmt-prev-page-btn"
            data-testid="module-mgmt-prev-page-btn"
            disabled={page === 1}
            onClick={() => setPage(p => Math.max(1, p - 1))}
            className="p-2 rounded-xl bg-white/5 hover:bg-slate-900 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7"></path></svg>
          </button>
          <span className="text-white/70 font-medium text-sm">
            Page {page} of {metadata.totalPages}
          </span>
          <button 
            id="module-mgmt-next-page-btn"
            data-testid="module-mgmt-next-page-btn"
            disabled={page >= metadata.totalPages}
            onClick={() => setPage(p => Math.min(metadata.totalPages, p + 1))}
            className="p-2 rounded-xl bg-white/5 hover:bg-slate-900 text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7"></path></svg>
          </button>
        </div>
      )}

      {isFormOpen && (
        <div data-testid="module-form-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-slate-800/50">
              <h2 className="text-xl font-bold text-white">{editingItem ? 'Edit Module' : 'Add Module'}</h2>
              <button id="module-form-close-btn" data-testid="module-form-close-btn" onClick={() => setIsFormOpen(false)} className="text-white/50 hover:text-white">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
            </div>
            <div className="p-6">
              <form id="modForm" data-testid="module-form" onSubmit={handleSave} className="space-y-4">
                <div>
                  <label htmlFor="module-form-name-input" className="block text-sm font-bold text-white/70 mb-2">Module Name *</label>
                  <input 
                    id="module-form-name-input"
                    data-testid="module-form-name-input"
                    type="text" 
                    required 
                    value={formData.name} 
                    onChange={e => setFormData({...formData, name: e.target.value})} 
                    className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
                <div>
                  <label htmlFor="module-form-code-input" className="block text-sm font-bold text-white/70 mb-2">Module Code (Prefix) *</label>
                  <input 
                    id="module-form-code-input"
                    data-testid="module-form-code-input"
                    disabled={!!editingItem} 
                    type="text" 
                    required 
                    value={formData.code} 
                    onChange={e => setFormData({...formData, code: e.target.value.toUpperCase()})} 
                    placeholder="e.g. AUTH" 
                    className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800/80 disabled:text-slate-500 disabled:opacity-70" 
                  />
                </div>
                <div>
                  <label htmlFor="module-form-desc-input" className="block text-sm font-bold text-white/70 mb-2">Description</label>
                  <textarea 
                    id="module-form-desc-input"
                    data-testid="module-form-desc-input"
                    value={formData.description} 
                    onChange={e => setFormData({...formData, description: e.target.value})} 
                    rows={3} 
                    className="w-full bg-black/30 border border-slate-800 rounded-xl px-4 py-2.5 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500" 
                  />
                </div>
              </form>
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
              <button id="module-form-cancel-btn" data-testid="module-form-cancel-btn" onClick={() => setIsFormOpen(false)} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-white/20 text-white font-medium transition-colors">Cancel</button>
              <button id="module-form-submit-btn" data-testid="module-form-submit-btn" type="submit" form="modForm" className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-colors shadow-sm hover:">Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {moduleToDelete && (
        <div data-testid="module-delete-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-slate-900 border border-rose-500/20 rounded-2xl w-full max-w-sm shadow-sm overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-800 flex justify-between items-center bg-rose-500/10">
              <div className="flex items-center gap-3 text-rose-400">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
                <h2 className="text-xl font-bold">Delete Module</h2>
              </div>
            </div>
            <div className="p-6">
              <p className="text-white/80 text-sm mb-2">Are you sure you want to delete module <strong>{moduleToDelete.name}</strong>?</p>
              <p className="text-rose-400/80 text-xs italic">This action cannot be undone. All test cases inside this module might be affected.</p>
            </div>
            <div className="p-6 border-t border-slate-800 bg-slate-800/50 flex justify-end gap-3">
              <button id="module-delete-cancel-btn" data-testid="module-delete-cancel-btn" onClick={() => setModuleToDelete(null)} className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-white/20 text-white font-medium transition-colors">Cancel</button>
              <button id="module-delete-confirm-btn" data-testid="module-delete-confirm-btn" onClick={confirmDelete} className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold transition-colors shadow-sm hover:">Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
