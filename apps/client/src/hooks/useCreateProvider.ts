export const useCreateProvider = () => {
  
  const inviteSupplier = async (data: {
    email: string;
    fullName: string;
    rif: string;
  }) => {
    const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    const response = await fetch(
      `${import.meta.env.VITE_SUPABASE_FUNCTIONS_URL}/invite-supplier`,
      {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${anonKey}`,
          'x-invite-secret': import.meta.env.VITE_INVITE_SECRET,
        },
        body: JSON.stringify(data),
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error);
    }

    return response.json();
  };

  return { inviteSupplier };
};