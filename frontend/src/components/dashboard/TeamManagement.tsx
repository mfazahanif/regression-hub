'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export function TeamManagement({ initialUsers, initialRoles, initialStatuses }: { initialUsers: any[], initialRoles: any[], initialStatuses: any[] }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('users');
  const [users, setUsers] = useState(initialUsers);
  const [roles, setRoles] = useState(initialRoles);
  const [statuses, setStatuses] = useState(initialStatuses);
  
  const [currentUser, setCurrentUser] = useState<any>(null); // from local storage token info
  
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  const [editingItem, setEditingItem] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const authData = localStorage.getItem('auth');
    if (authData) {
      const parsed = JSON.parse(authData);
      setCurrentUser(parsed.user);
    }
  }, []);

  const isAdmin = currentUser?.role === 'Super Admin';
  const isLeader = ['Tech Lead', 'BA'].includes(currentUser?.role);
  const canEditUser = isAdmin || isLeader;

  const refreshData = async () => {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers = { 'Authorization': `Bearer ${authData.access_token}` };
    const [uRes, rRes, sRes] = await Promise.all([
      fetch(`${baseUrl}/master/users`, { headers }),
      fetch(`${baseUrl}/master/roles`, { headers }),
      fetch(`${baseUrl}/master/statuses`, { headers }),
    ]);
    if (uRes.ok) setUsers((await uRes.json()).data);
    if (rRes.ok) setRoles((await rRes.json()).data);
    if (sRes.ok) setStatuses((await sRes.json()).data);
  };

  const handleSaveUser = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data: any = Object.fromEntries(formData);
    data.isActive = data.isActive === 'true';

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authData.access_token}`
    };

    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `${baseUrl}/master/users/${editingItem.id}` : `${baseUrl}/master/users`;

    // Tech Leads and BAs can only send isActive, but for simplicity we send what form gives. API will process or fail based on guard.
    // Wait, leader can only update. We shouldn't send password if empty.
    if (!data.password) delete data.password;

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if (res.ok) {
      setIsUserModalOpen(false);
      refreshData();
    } else {
      alert('Action failed');
    }
  };

  const handleDeleteUser = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    await fetch(`${baseUrl}/master/users/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${authData.access_token}` }
    });
    refreshData();
  };

  const handleSaveRole = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.access_token}` };

    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `${baseUrl}/master/roles/${editingItem.id}` : `${baseUrl}/master/roles`;

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if (res.ok) {
      setIsRoleModalOpen(false);
      refreshData();
    }
  };

  const handleSaveStatus = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData);

    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';
    const authData = JSON.parse(localStorage.getItem('auth') || '{}');
    const headers = { 'Content-Type': 'application/json', 'Authorization': `Bearer ${authData.access_token}` };

    const method = editingItem ? 'PUT' : 'POST';
    const url = editingItem ? `${baseUrl}/master/statuses/${editingItem.id}` : `${baseUrl}/master/statuses`;

    const res = await fetch(url, { method, headers, body: JSON.stringify(data) });
    if (res.ok) {
      setIsStatusModalOpen(false);
      refreshData();
    }
  };

  const filteredUsers = users
    .filter((u: any) => {
      // Hide Super Admin if current user is not Super Admin or a delegated lead
      if (u.role?.name === 'Super Admin' && !isAdmin) return false;
      return u.name.toLowerCase().includes(searchQuery.toLowerCase()) || u.email.toLowerCase().includes(searchQuery.toLowerCase());
    })
    .sort((a: any, b: any) => {
      const leadRoles = ['Tech Lead', 'BA'];
      if (leadRoles.includes(a.role?.name) && !leadRoles.includes(b.role?.name)) return -1;
      if (!leadRoles.includes(a.role?.name) && leadRoles.includes(b.role?.name)) return 1;
      return a.name.localeCompare(b.name);
    });
  const filteredRoles = roles.filter((r: any) => r.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const filteredStatuses = statuses.filter((s: any) => s.name.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <section data-testid="team-management-container" className="bg-slate-900  border border-slate-700 p-8 rounded-[2rem] shadow-sm relative overflow-hidden">
      
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 border-b border-slate-800 pb-4 relative z-10">
        <div className="flex gap-4">
          <button id="team-tab-users" data-testid="team-tab-users" onClick={() => {setActiveTab('users'); setSearchQuery('');}} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'users' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>Users</button>
          <button id="team-tab-roles" data-testid="team-tab-roles" onClick={() => {setActiveTab('roles'); setSearchQuery('');}} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'roles' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>Roles</button>
          <button id="team-tab-statuses" data-testid="team-tab-statuses" onClick={() => {setActiveTab('statuses'); setSearchQuery('');}} className={`px-4 py-2 font-bold rounded-lg transition-colors ${activeTab === 'statuses' ? 'bg-white/20 text-white' : 'text-white/60 hover:text-white'}`}>Statuses</button>
        </div>
        <div className="relative w-full sm:w-auto sm:min-w-[300px]">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
          <input 
            id="team-search-input"
            data-testid="team-search-input"
            type="text" 
            placeholder={`Search ${activeTab}...`} 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-800 border border-slate-800 rounded-xl py-2 pl-10 pr-4 text-white placeholder:text-white/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 "
          />
        </div>
      </div>

      <div className="relative z-10">
        {activeTab === 'users' && (
          <div data-testid="team-users-section">
            {canEditUser && (
              <button 
                id="team-add-user-btn"
                data-testid="team-add-user-btn"
                onClick={() => { setEditingItem(null); setIsUserModalOpen(true); }} 
                className="mb-6 px-4 py-2 bg-indigo-600 rounded-xl font-bold text-white shadow-sm hover: "
              >
                + Add User
              </button>
            )}
            {(() => {
              const admins = filteredUsers.filter((u: any) => u.role?.name === 'Super Admin');
              const leaders = filteredUsers.filter((u: any) => ['Tech Lead', 'BA'].includes(u.role?.name));
              const qaMembers = filteredUsers.filter((u: any) => u.role?.name === 'QA Member');
              const others = filteredUsers.filter((u: any) => !['Super Admin', 'Tech Lead', 'BA', 'QA Member'].includes(u.role?.name));

              const renderGroup = (groupUsers: any[], title: string) => {
                if (groupUsers.length === 0) return null;
                return (
                  <div className="mb-8 last:mb-0">
                    <h3 className="text-xl font-bold text-white/80 mb-4 px-2">{title}</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                      {groupUsers.map((user: any) => (
                        <div key={user.id} data-testid={`team-user-card-${user.id}`} className={`bg-gradient-to-b from-white/5 to-transparent border p-6 rounded-[2rem] hover:bg-white/5 transition-colors group relative overflow-hidden flex flex-col ${currentUser?.id === user.id ? 'border-indigo-500/40 border-l-4 border-l-indigo-500' : 'border-slate-800'}`}>
                          <div className="flex justify-between items-start mb-6">
                            <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center border-2 border-slate-800 shadow-sm ${user.isActive ? 'bg-indigo-600' : 'bg-slate-700 grayscale'}`}>
                              <span className="text-xl font-black text-white">{user.name.substring(0,2).toUpperCase()}</span>
                            </div>
                            <div className="flex flex-row items-center gap-3">
                              <span data-testid={`team-user-role-${user.id}`} className={`px-3 py-1 rounded-full text-[10px] uppercase tracking-wider font-bold border ${['Tech Lead', 'BA'].includes(user.role?.name) ? 'bg-amber-500/20 border-amber-500/30 text-amber-300' : user.role?.name === 'Super Admin' ? 'bg-rose-500/20 border-rose-500/30 text-rose-300' : 'bg-cyan-500/20 border-cyan-500/30 text-cyan-300'}`}>
                                {user.role?.name}
                              </span>
                              <div className="flex items-center gap-1.5">
                                <div className={`w-2 h-2 rounded-full ${user.isActive ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                                <span data-testid={`team-user-status-${user.id}`} className={`text-xs font-bold ${user.isActive ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {user.isActive ? 'Active' : 'Inactive'}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mb-6 flex-1">
                            <div className="flex items-center gap-2">
                              <h3 data-testid={`team-user-name-${user.id}`} className="font-bold text-xl text-white tracking-tight">{user.name}</h3>
                              {currentUser?.id === user.id && (
                                <span className="px-2 py-0.5 rounded-md text-[10px] uppercase tracking-wider font-black bg-indigo-500 text-white">You</span>
                              )}
                            </div>
                            <p data-testid={`team-user-email-${user.id}`} className="text-indigo-200/60 text-sm font-medium mt-1">{user.email}</p>
                          </div>
                          
                          {(isAdmin || (isLeader && user.role?.name === 'QA Member')) && (
                            <div className="flex gap-2 mt-auto border-t border-slate-800 pt-4">
                              <button 
                                id={`team-user-edit-btn-${user.id}`}
                                data-testid={`team-user-edit-btn-${user.id}`}
                                onClick={() => { setEditingItem(user); setIsUserModalOpen(true); }} 
                                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-slate-900 text-white font-medium text-sm transition-colors"
                              >
                                Edit
                              </button>
                              <button 
                                id={`team-user-delete-btn-${user.id}`}
                                data-testid={`team-user-delete-btn-${user.id}`}
                                onClick={() => handleDeleteUser(user.id)} 
                                className="flex-1 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 font-medium text-sm transition-colors border border-rose-500/20"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              return (
                <>
                  {renderGroup(admins, 'Super Admin')}
                  {renderGroup(leaders, 'Tech Lead / BA')}
                  {renderGroup(qaMembers, 'QA Member')}
                  {renderGroup(others, 'Other Roles')}
                </>
              );
            })()}
          </div>
        )}

        {activeTab === 'roles' && (
          <div data-testid="team-roles-section">
            {isAdmin && (
              <button 
                id="team-add-role-btn"
                data-testid="team-add-role-btn"
                onClick={() => { setEditingItem(null); setIsRoleModalOpen(true); }} 
                className="mb-6 px-4 py-2 bg-indigo-600 rounded-xl font-bold text-white shadow-sm "
              >
                + Add Role
              </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredRoles.map((role: any) => (
                <div key={role.id} data-testid={`team-role-card-${role.id}`} className="bg-slate-800 border border-slate-800 p-6 rounded-2xl flex justify-between items-center">
                  <span className="font-bold text-lg">{role.name}</span>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        id={`team-role-edit-btn-${role.id}`}
                        data-testid={`team-role-edit-btn-${role.id}`}
                        onClick={() => { setEditingItem(role); setIsRoleModalOpen(true); }} 
                        className="text-cyan-400"
                      >
                        Edit
                      </button>
                      <button 
                        id={`team-role-delete-btn-${role.id}`}
                        data-testid={`team-role-delete-btn-${role.id}`}
                        onClick={() => { if(confirm('Sure?')) { /* delete */ } }} 
                        className="text-red-400"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'statuses' && (
          <div data-testid="team-statuses-section">
            {isAdmin && (
              <button 
                id="team-add-status-btn"
                data-testid="team-add-status-btn"
                onClick={() => { setEditingItem(null); setIsStatusModalOpen(true); }} 
                className="mb-6 px-4 py-2 bg-indigo-600 rounded-xl font-bold text-white shadow-sm "
              >
                + Add Status
              </button>
            )}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredStatuses.map((status: any) => (
                <div key={status.id} data-testid={`team-status-card-${status.id}`} className="bg-slate-800 border border-slate-800 p-6 rounded-2xl flex justify-between items-center">
                  <span className="font-bold text-lg">{status.name}</span>
                  {isAdmin && (
                    <div className="flex gap-2">
                      <button 
                        id={`team-status-edit-btn-${status.id}`}
                        data-testid={`team-status-edit-btn-${status.id}`}
                        onClick={() => { setEditingItem(status); setIsStatusModalOpen(true); }} 
                        className="text-cyan-400"
                      >
                        Edit
                      </button>
                      <button 
                        id={`team-status-delete-btn-${status.id}`}
                        data-testid={`team-status-delete-btn-${status.id}`}
                        onClick={() => { if(confirm('Sure?')) { /* delete */ } }} 
                        className="text-red-400"
                      >
                        Del
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {isUserModalOpen && (
        <div data-testid="team-user-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit User' : 'Add User'}</h2>
            <form id="team-user-form" data-testid="team-user-form" onSubmit={handleSaveUser} className="space-y-4">
              {(!editingItem || isAdmin) && (
                <>
                  <div>
                    <label htmlFor="team-user-name-input" className="block text-sm font-medium mb-1">Name</label>
                    <input id="team-user-name-input" data-testid="team-user-name-input" name="name" defaultValue={editingItem?.name} required className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white" />
                  </div>
                  <div>
                    <label htmlFor="team-user-email-input" className="block text-sm font-medium mb-1">Email</label>
                    <input id="team-user-email-input" data-testid="team-user-email-input" name="email" type="email" defaultValue={editingItem?.email} required className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white" />
                  </div>
                  <div>
                    <label htmlFor="team-user-password-input" className="block text-sm font-medium mb-1">Password {editingItem && '(leave blank to keep)'}</label>
                    <input id="team-user-password-input" data-testid="team-user-password-input" name="password" type="password" required={!editingItem} className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white" />
                  </div>
                  <div>
                    <label htmlFor="team-user-role-select" className="block text-sm font-medium mb-1">Role</label>
                    <select id="team-user-role-select" data-testid="team-user-role-select" name="roleId" defaultValue={editingItem?.roleId || roles.find((r: any) => r.name === 'QA Member')?.id} className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white">
                      {(isLeader ? roles.filter((r: any) => r.name === 'QA Member') : roles).map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                </>
              )}
              <div>
                <label htmlFor="team-user-status-select" className="block text-sm font-medium mb-1">Status</label>
                <select id="team-user-status-select" data-testid="team-user-status-select" name="isActive" defaultValue={editingItem ? (editingItem.isActive ? 'true' : 'false') : 'true'} className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white">
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button id="team-user-cancel-btn" data-testid="team-user-cancel-btn" type="button" onClick={() => setIsUserModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-white/20">Cancel</button>
                <button id="team-user-save-btn" data-testid="team-user-save-btn" type="submit" className="px-4 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-600 font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isRoleModalOpen && (
        <div data-testid="team-role-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Role' : 'Add Role'}</h2>
            <form onSubmit={handleSaveRole} className="space-y-4">
              <div>
                <label htmlFor="team-role-name-input" className="block text-sm font-medium mb-1">Name</label>
                <input id="team-role-name-input" data-testid="team-role-name-input" name="name" defaultValue={editingItem?.name} required className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button id="team-role-cancel-btn" data-testid="team-role-cancel-btn" type="button" onClick={() => setIsRoleModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-white/20">Cancel</button>
                <button id="team-role-save-btn" data-testid="team-role-save-btn" type="submit" className="px-4 py-2 rounded-lg bg-purple-500 hover:bg-purple-600 font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isStatusModalOpen && (
        <div data-testid="team-status-modal" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 ">
          <div className="bg-slate-800 p-8 rounded-2xl border border-slate-800 w-full max-w-md">
            <h2 className="text-2xl font-bold mb-6">{editingItem ? 'Edit Status' : 'Add Status'}</h2>
            <form onSubmit={handleSaveStatus} className="space-y-4">
              <div>
                <label htmlFor="team-status-name-input" className="block text-sm font-medium mb-1">Name</label>
                <input id="team-status-name-input" data-testid="team-status-name-input" name="name" defaultValue={editingItem?.name} required className="w-full bg-black/30 border border-slate-800 rounded-lg p-2 text-white" />
              </div>
              <div className="flex justify-end gap-2 mt-6">
                <button id="team-status-cancel-btn" data-testid="team-status-cancel-btn" type="button" onClick={() => setIsStatusModalOpen(false)} className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-white/20">Cancel</button>
                <button id="team-status-save-btn" data-testid="team-status-save-btn" type="submit" className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-600 font-bold">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
