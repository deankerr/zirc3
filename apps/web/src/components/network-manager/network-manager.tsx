import { Plus, Settings } from "lucide-solid";
import { createMemo, createSignal, Match, Show, Switch } from "solid-js";
import { client } from "@/api";
import { Dialog } from "@/components/ui/dialog";
import { useStore } from "@/store";
import { createActions } from "@/store/actions";
import type { NetworkState } from "@/store/types";
import { NetworkForm } from "./network-form";
import { NetworkList } from "./network-list";

type ModalView = "list" | "create" | "edit";

export function NetworkManager() {
  const { store, setStore } = useStore();
  const actions = createActions(setStore);

  const [open, setOpen] = createSignal(false);
  const [view, setView] = createSignal<ModalView>("list");
  const [editingNetwork, setEditingNetwork] = createSignal<NetworkState | null>(
    null
  );

  // * Convert store networks (Record) to array for the list
  const networksList = createMemo(() => Object.values(store.networks));

  // * Fetch networks and sync to store
  async function fetchAndSyncNetworks() {
    const result = await client.networks.list();
    actions.syncAllNetworks(result);
  }

  function handleOpen() {
    setView("list");
    setEditingNetwork(null);
    fetchAndSyncNetworks();
    setOpen(true);
  }

  function handleCreateNew() {
    setView("create");
  }

  function handleEdit(network: NetworkState) {
    setEditingNetwork(network);
    setView("edit");
  }

  async function handleDelete(networkName: string) {
    await client.networks.delete({ name: networkName });
    actions.removeNetwork(networkName);
  }

  async function handleFormSuccess() {
    await fetchAndSyncNetworks();
    setView("list");
    setEditingNetwork(null);
  }

  function handleFormCancel() {
    setView("list");
    setEditingNetwork(null);
  }

  // * Convert NetworkState config to form values
  function getFormInitialValues(network: NetworkState) {
    return {
      ...network.config,
      autoJoin: network.config.autoJoin.join(", "),
      password: network.config.password ?? "",
      username: network.config.username ?? "",
      gecos: network.config.gecos ?? "",
      quitMessage: network.config.quitMessage ?? "",
    };
  }

  function modalTitle() {
    const v = view();
    if (v === "create") return "Add Network";
    if (v === "edit") {
      const editing = editingNetwork();
      return editing ? `Edit ${editing.name}` : "Edit Network";
    }
    return "Networks";
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        class="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        title="Manage Networks"
      >
        <Settings size={18} />
      </button>

      <Dialog open={open()} onOpenChange={setOpen} title={modalTitle()}>
        <Switch>
          <Match when={view() === "list"}>
            <div class="mb-4">
              <button
                type="button"
                onClick={handleCreateNew}
                class="flex w-full items-center justify-center gap-2 rounded border border-dashed border-[var(--color-border)] py-2 text-sm text-[var(--color-text-secondary)] hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
              >
                <Plus size={16} />
                Add New Network
              </button>
            </div>
            <NetworkList
              networks={networksList()}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          </Match>

          <Match when={view() === "create"}>
            <NetworkForm
              onSuccess={handleFormSuccess}
              onCancel={handleFormCancel}
            />
          </Match>

          <Match when={view() === "edit"}>
            <Show when={editingNetwork()}>
              {(network) => (
                <NetworkForm
                  initialValues={getFormInitialValues(network())}
                  isEdit
                  onSuccess={handleFormSuccess}
                  onCancel={handleFormCancel}
                />
              )}
            </Show>
          </Match>
        </Switch>
      </Dialog>
    </>
  );
}
