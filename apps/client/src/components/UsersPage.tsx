import React from 'react';
import { Button, DashboardLayout } from './common';
import { PlusIcon } from './icons';
import UsersTable from './UsersTable';
import UserRegistrationModal from './UserRegistrationModal';
import { useGetAllUsers } from '../hooks/useGetAllUsers';
import type { Profile } from '../contexts/AuthContext';

const PAGE_SIZE = 10;

export default function UsersPage() {
  const { users, loading, error, deleteUser, updateUser, refetch } = useGetAllUsers();
  const [modalIsOpen, setModalIsOpen] = React.useState(false);
  const [userToEdit, setUserToEdit] = React.useState<Profile | null>(null);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterType, setFilterType] = React.useState<'name' | 'role'>('name');
  const [page, setPage] = React.useState(0);

  // Resetear a página 0 cuando cambia la búsqueda
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setPage(0);
  };

  const handleEdit = (user: Profile) => {
    setUserToEdit(user);
    setModalIsOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`¿Seguro que deseas eliminar a ${name}?`)) {
      await deleteUser(id);
    }
  };

  return (
    <DashboardLayout title="Gestión de Usuarios" returnTo="/">
      <div className="w-full flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
        <div className="flex bg-white border border-neutral-200 rounded-lg p-1 shadow-sm w-full sm:w-auto">
          <select
            value={filterType}
            onChange={(e) => { setFilterType(e.target.value as any); setPage(0); }}
            className="bg-transparent text-sm font-medium px-3 outline-none border-r border-neutral-200 cursor-pointer text-neutral-600"
          >
            <option value="name">Nombre</option>
            <option value="role">Rol</option>
          </select>
          <input
            type="text"
            placeholder="Buscar..."
            className="text-sm px-3 py-1.5 outline-none w-full sm:w-80"
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
          />
        </div>
        <Button
          icon={<PlusIcon className="size-5" />}
          onClick={() => { setUserToEdit(null); setModalIsOpen(true); }}
        >
          Nuevo Usuario
        </Button>
      </div>

      <UsersTable
        users={users}
        loading={loading}
        error={error}
        searchTerm={searchTerm}
        filterType={filterType}
        onEdit={handleEdit}
        onDelete={handleDelete}
        page={page}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />

      <UserRegistrationModal
        isOpen={modalIsOpen}
        onClose={() => setModalIsOpen(false)}
        userToEdit={userToEdit}
        onUpdate={updateUser}
        onRefresh={refetch}
      />
    </DashboardLayout>
  );
}