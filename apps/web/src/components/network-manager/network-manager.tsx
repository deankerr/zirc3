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
        class="rounded p-1 text-[var(--color-text-secondary)] hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
        onClick={handleOpen}
        title="Manage Networks"
        type="button"
      >
        <Settings size={18} />
      </button>

      <Dialog onOpenChange={setOpen} open={open()} title={modalTitle()}>
        <Switch>
          <Match when={view() === "list"}>
            <div class="mb-4">
              <button
                class="flex w-full items-center justify-center gap-2 rounded border border-[var(--color-border)] border-dashed py-2 text-[var(--color-text-secondary)] text-sm hover:border-[var(--color-accent-primary)] hover:text-[var(--color-accent-primary)]"
                onClick={handleCreateNew}
                type="button"
              >
                <Plus size={16} />
                Add New Network
              </button>
            </div>
            <NetworkList
              networks={networksList()}
              onDelete={handleDelete}
              onEdit={handleEdit}
            />
          </Match>

          <Match when={view() === "create"}>
            <NetworkForm
              onCancel={handleFormCancel}
              onSuccess={handleFormSuccess}
            />
          </Match>

          <Match when={view() === "edit"}>
            <Show when={editingNetwork()}>
              {(network) => (
                <NetworkForm
                  initialValues={getFormInitialValues(network())}
                  isEdit
                  onCancel={handleFormCancel}
                  onSuccess={handleFormSuccess}
                />
              )}
            </Show>
          </Match>
        </Switch>
      </Dialog>
    </>
  );
}
