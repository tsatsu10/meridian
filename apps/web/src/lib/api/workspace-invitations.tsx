onSuccess: (data) => {
  toast.success(data.message || `Welcome to ${data.workspaceName}!`);
  queryClient.invalidateQueries({ queryKey: ["workspaces"] });
  queryClient.invalidateQueries({ queryKey: ["workspace-invitations"] });
  
  // Redirect to the main dashboard after successful acceptance
  window.location.href = "/dashboard";
}, 