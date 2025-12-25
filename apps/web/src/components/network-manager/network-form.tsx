import { createForm } from "@tanstack/solid-form";
import { client } from "@/api";
import { CheckboxField } from "@/components/ui/checkbox-field";
import { TextField } from "@/components/ui/text-field";

type NetworkFormValues = {
  network: string;
  host: string;
  port: number;
  tls: boolean;
  rejectUnauthorized: boolean;
  password: string;
  nick: string;
  username: string;
  gecos: string;
  autoReconnect: boolean;
  autoReconnectMaxRetries: number;
  autoJoin: string;
  quitMessage: string;
  enabled: boolean;
};

type NetworkFormProps = {
  initialValues?: Partial<NetworkFormValues>;
  isEdit?: boolean;
  onSuccess: () => void;
  onCancel: () => void;
};

const defaultValues: NetworkFormValues = {
  network: "",
  host: "",
  port: 6667,
  tls: false,
  rejectUnauthorized: true,
  password: "",
  nick: "",
  username: "",
  gecos: "",
  autoReconnect: true,
  autoReconnectMaxRetries: 30,
  autoJoin: "",
  quitMessage: "",
  enabled: true,
};

export function NetworkForm(props: NetworkFormProps) {
  const form = createForm(() => ({
    defaultValues: { ...defaultValues, ...props.initialValues },
    onSubmit: async ({ value }) => {
      const config = {
        network: value.network,
        host: value.host,
        port: value.port,
        tls: value.tls,
        rejectUnauthorized: value.rejectUnauthorized,
        password: value.password || undefined,
        nick: value.nick,
        username: value.username || undefined,
        gecos: value.gecos || undefined,
        autoReconnect: value.autoReconnect,
        autoReconnectMaxRetries: value.autoReconnectMaxRetries,
        autoJoin: value.autoJoin
          ? value.autoJoin
              .split(",")
              .map((c) => c.trim())
              .filter(Boolean)
          : [],
        quitMessage: value.quitMessage || undefined,
        enabled: value.enabled,
      };
      await client.networks.put({ config });
      props.onSuccess();
    },
  }));

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* * Connection Section */}
      <div class="mb-4">
        <h3 class="mb-2 font-medium text-[var(--color-accent-secondary)] text-sm">
          Connection
        </h3>

        <form.Field name="network">
          {(field) => (
            <TextField
              disabled={props.isEdit}
              label="Network Name"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              placeholder="libera"
              value={field().state.value}
            />
          )}
        </form.Field>

        <form.Field name="host">
          {(field) => (
            <TextField
              label="Host"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              placeholder="irc.libera.chat"
              value={field().state.value}
            />
          )}
        </form.Field>

        <form.Field name="port">
          {(field) => (
            <TextField
              label="Port"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={(v) => field().handleChange(Number(v) || 6667)}
              type="number"
              value={String(field().state.value)}
            />
          )}
        </form.Field>

        <form.Field name="tls">
          {(field) => (
            <CheckboxField
              checked={field().state.value}
              label="Use TLS/SSL"
              onChange={field().handleChange}
            />
          )}
        </form.Field>

        <form.Field name="rejectUnauthorized">
          {(field) => (
            <CheckboxField
              checked={field().state.value}
              description="Disable for self-signed certificates"
              label="Reject Unauthorized Certificates"
              onChange={field().handleChange}
            />
          )}
        </form.Field>

        <form.Field name="password">
          {(field) => (
            <TextField
              label="Server Password (optional)"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              type="password"
              value={field().state.value}
            />
          )}
        </form.Field>
      </div>

      {/* * Identity Section */}
      <div class="mb-4">
        <h3 class="mb-2 font-medium text-[var(--color-accent-secondary)] text-sm">
          Identity
        </h3>

        <form.Field name="nick">
          {(field) => (
            <TextField
              label="Nickname"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              placeholder="zirc_user"
              value={field().state.value}
            />
          )}
        </form.Field>

        <form.Field name="username">
          {(field) => (
            <TextField
              label="Username (optional)"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              placeholder="Defaults to nickname"
              value={field().state.value}
            />
          )}
        </form.Field>

        <form.Field name="gecos">
          {(field) => (
            <TextField
              label="Real Name / GECOS (optional)"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              value={field().state.value}
            />
          )}
        </form.Field>
      </div>

      {/* * Behavior Section */}
      <div class="mb-4">
        <h3 class="mb-2 font-medium text-[var(--color-accent-secondary)] text-sm">
          Behavior
        </h3>

        <form.Field name="enabled">
          {(field) => (
            <CheckboxField
              checked={field().state.value}
              description="Auto-connect on server startup"
              label="Enabled"
              onChange={field().handleChange}
            />
          )}
        </form.Field>

        <form.Field name="autoReconnect">
          {(field) => (
            <CheckboxField
              checked={field().state.value}
              description="Reconnect automatically if disconnected"
              label="Auto-Reconnect"
              onChange={field().handleChange}
            />
          )}
        </form.Field>

        <form.Field name="autoReconnectMaxRetries">
          {(field) => (
            <TextField
              label="Max Reconnect Retries"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={(v) => field().handleChange(Number(v) || 30)}
              type="number"
              value={String(field().state.value)}
            />
          )}
        </form.Field>

        <form.Field name="autoJoin">
          {(field) => (
            <TextField
              label="Auto-Join Channels"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              placeholder="#channel1, #channel2"
              value={field().state.value}
            />
          )}
        </form.Field>

        <form.Field name="quitMessage">
          {(field) => (
            <TextField
              label="Quit Message (optional)"
              name={field().name}
              onBlur={field().handleBlur}
              onChange={field().handleChange}
              value={field().state.value}
            />
          )}
        </form.Field>
      </div>

      {/* * Actions */}
      <div class="mt-6 flex justify-end gap-2">
        <button
          class="rounded px-4 py-2 text-[var(--color-text-secondary)] text-sm hover:bg-[var(--color-bg-hover)] hover:text-[var(--color-text-primary)]"
          onClick={props.onCancel}
          type="button"
        >
          Cancel
        </button>
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button
              class="rounded bg-[var(--color-accent-primary)] px-4 py-2 text-[var(--color-bg-primary)] text-sm hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSubmitting()}
              type="submit"
            >
              {isSubmitting()
                ? "Saving..."
                : props.isEdit
                  ? "Update Network"
                  : "Add Network"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
