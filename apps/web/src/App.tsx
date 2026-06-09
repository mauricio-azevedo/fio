import { useCallback, useEffect, useMemo, useState } from 'react';
import type { FormEvent } from 'react';
import { ApiError, FioApiClient } from './api.js';
import type {
  PreferredChannel,
  RelationshipCircle,
  RelationshipView,
  RelationshipWriteRequest,
} from './api.js';
import {
  clearStoredSession,
  completeSignInFromUrl,
  readStoredSession,
  startSignIn,
} from './auth.js';
import type { AuthClientConfig, AuthSession } from './auth.js';
import { browserSettings } from './settings.js';

type LoadState = 'idle' | 'loading' | 'loaded';

interface RelationshipFormState {
  name: string;
  circle: RelationshipCircle;
  preferredChannel: PreferredChannel;
  cadenceDays: string;
  lastContactOn: string;
  pausedUntil: string;
}

const emptyForm: RelationshipFormState = {
  name: '',
  circle: 'close',
  preferredChannel: 'message',
  cadenceDays: '30',
  lastContactOn: '',
  pausedUntil: '',
};

const circleLabels: Record<RelationshipCircle, string> = {
  core: 'Core',
  close: 'Close',
  casual: 'Casual',
  professional: 'Professional',
  family: 'Family',
};

const channelLabels: Record<PreferredChannel, string> = {
  message: 'Message',
  call: 'Call',
  in_person: 'In person',
  email: 'Email',
};

export function App() {
  const [session, setSession] = useState<AuthSession | null>(() =>
    typeof window === 'undefined' ? null : readStoredSession(),
  );
  const [authError, setAuthError] = useState<string | null>(null);
  const [relationships, setRelationships] = useState<RelationshipView[]>([]);
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mutationError, setMutationError] = useState<string | null>(null);
  const [form, setForm] = useState<RelationshipFormState>(emptyForm);
  const [editingRelationshipId, setEditingRelationshipId] = useState<string | null>(null);
  const [confirmingDeleteRelationshipId, setConfirmingDeleteRelationshipId] = useState<
    string | null
  >(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingRelationshipId, setDeletingRelationshipId] = useState<string | null>(null);

  const authConfig = useMemo<AuthClientConfig | null>(() => {
    if (typeof window === 'undefined') {
      return null;
    }

    return {
      issuer: browserSettings.oidcIssuer,
      clientId: browserSettings.oidcClientId,
      redirectUri: `${window.location.origin}${window.location.pathname}`,
    };
  }, []);

  const apiClient = useMemo(() => {
    if (session === null) {
      return null;
    }

    return new FioApiClient(browserSettings.apiBaseUrl, session.accessToken);
  }, [session]);

  const resetAuthenticatedState = useCallback(() => {
    clearStoredSession();
    setSession(null);
    setRelationships([]);
    setLoadState('idle');
    setLoadError(null);
    setMutationError(null);
    setEditingRelationshipId(null);
    setConfirmingDeleteRelationshipId(null);
    setForm(emptyForm);
  }, []);

  const expireSession = useCallback(() => {
    resetAuthenticatedState();
    setAuthError('Your session expired. Sign in again to continue.');
  }, [resetAuthenticatedState]);

  const loadRelationships = useCallback(
    async (client: FioApiClient) => {
      setLoadState('loading');
      setLoadError(null);

      try {
        setRelationships(await client.listRelationships());
        setLoadState('loaded');
      } catch (error) {
        if (isSessionExpiredError(error)) {
          expireSession();
          return;
        }

        setLoadError(toUserMessage(error));
        setLoadState('loaded');
      }
    },
    [expireSession],
  );

  useEffect(() => {
    if (authConfig === null) {
      return;
    }

    let isActive = true;

    completeSignInFromUrl(authConfig)
      .then((callbackSession) => {
        if (!isActive) {
          return;
        }

        setSession(callbackSession ?? readStoredSession());
        setAuthError(null);
      })
      .catch((error: unknown) => {
        if (!isActive) {
          return;
        }

        resetAuthenticatedState();
        setAuthError(toUserMessage(error));
      });

    return () => {
      isActive = false;
    };
  }, [authConfig, resetAuthenticatedState]);

  useEffect(() => {
    if (apiClient === null) {
      return;
    }

    void loadRelationships(apiClient);
  }, [apiClient, loadRelationships]);

  const signIn = async () => {
    if (authConfig === null) {
      return;
    }

    await startSignIn(authConfig);
  };

  const signOut = () => {
    resetAuthenticatedState();
    setAuthError(null);
  };

  const refreshRelationships = () => {
    if (apiClient === null) {
      return;
    }

    void loadRelationships(apiClient);
  };

  const saveRelationship = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (apiClient === null) {
      return;
    }

    setIsSaving(true);
    setMutationError(null);

    try {
      const request = toRelationshipWriteRequest(form);
      const savedRelationship =
        editingRelationshipId === null
          ? await apiClient.createRelationship(request)
          : await apiClient.updateRelationship(editingRelationshipId, request);

      setRelationships((currentRelationships) =>
        sortRelationships(upsertRelationship(currentRelationships, savedRelationship)),
      );
      setEditingRelationshipId(null);
      setForm(emptyForm);
    } catch (error) {
      if (isSessionExpiredError(error)) {
        expireSession();
        return;
      }

      setMutationError(toUserMessage(error));
    } finally {
      setIsSaving(false);
    }
  };

  const startEditing = (relationship: RelationshipView) => {
    setEditingRelationshipId(relationship.id);
    setConfirmingDeleteRelationshipId(null);
    setMutationError(null);
    setForm({
      name: relationship.name,
      circle: relationship.circle,
      preferredChannel: relationship.preferredChannel,
      cadenceDays: String(relationship.cadenceDays),
      lastContactOn: relationship.lastContactOn ?? '',
      pausedUntil: relationship.pausedUntil ?? '',
    });
  };

  const cancelEditing = () => {
    setEditingRelationshipId(null);
    setMutationError(null);
    setForm(emptyForm);
  };

  const requestDeleteConfirmation = (relationshipId: string) => {
    setMutationError(null);
    setConfirmingDeleteRelationshipId(relationshipId);
  };

  const cancelDeleteConfirmation = () => {
    setConfirmingDeleteRelationshipId(null);
  };

  const deleteRelationship = async (relationshipId: string) => {
    if (apiClient === null) {
      return;
    }

    setDeletingRelationshipId(relationshipId);
    setMutationError(null);

    try {
      await apiClient.deleteRelationship(relationshipId);
      setRelationships((currentRelationships) =>
        currentRelationships.filter((relationship) => relationship.id !== relationshipId),
      );
      setConfirmingDeleteRelationshipId(null);

      if (editingRelationshipId === relationshipId) {
        cancelEditing();
      }
    } catch (error) {
      if (isSessionExpiredError(error)) {
        expireSession();
        return;
      }

      setMutationError(toUserMessage(error));
    } finally {
      setDeletingRelationshipId(null);
    }
  };

  return (
    <main className="min-h-screen bg-base-100 text-base-content">
      <section className="mx-auto flex min-h-screen max-w-6xl flex-col px-6 py-10">
        <header className="flex flex-col gap-6 border-b border-base-300 pb-8 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="mb-3 text-sm font-medium uppercase tracking-[0.28em] text-neutral-500">
              Fio
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight md:text-6xl">
              Keep important relationships from fading by inertia.
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-7 text-neutral-600">
              A private relationship-care workspace for concrete gestures, follow-ups, and promises.
            </p>
          </div>
          <div className="flex gap-3">
            {session === null ? (
              <button className="btn btn-neutral" onClick={() => void signIn()} type="button">
                Enter Fio
              </button>
            ) : (
              <button className="btn btn-ghost" onClick={signOut} type="button">
                Sign out
              </button>
            )}
          </div>
        </header>

        {authError === null ? null : <Alert title="Sign-in failed" message={authError} />}

        {session === null ? (
          <AnonymousState />
        ) : (
          <section className="grid gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_24rem]">
            <div>
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight">People</h2>
                  <p className="mt-2 text-sm leading-6 text-neutral-600">
                    Your list is private to your account. The server owns authorization and account
                    scope.
                  </p>
                </div>
                <button
                  className="btn btn-outline btn-sm"
                  disabled={apiClient === null || loadState === 'loading'}
                  onClick={refreshRelationships}
                  type="button"
                >
                  Refresh
                </button>
              </div>

              {loadError === null ? null : (
                <Alert title="Could not load relationships" message={loadError} />
              )}

              <RelationshipList
                confirmingDeleteRelationshipId={confirmingDeleteRelationshipId}
                deletingRelationshipId={deletingRelationshipId}
                isLoading={loadState === 'loading'}
                onCancelDelete={cancelDeleteConfirmation}
                onConfirmDelete={(relationshipId) => void deleteRelationship(relationshipId)}
                onEdit={startEditing}
                onRequestDelete={requestDeleteConfirmation}
                relationships={relationships}
              />
            </div>

            <aside className="rounded-box border border-base-300 bg-base-200 p-5">
              <h2 className="text-xl font-semibold tracking-tight">
                {editingRelationshipId === null ? 'Add a person' : 'Edit person'}
              </h2>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                Capture the cadence and channel Fio should respect when prioritizing attention.
              </p>

              {mutationError === null ? null : (
                <Alert title="Could not save relationship" message={mutationError} />
              )}

              <RelationshipForm
                form={form}
                isEditing={editingRelationshipId !== null}
                isSaving={isSaving}
                onCancel={cancelEditing}
                onChange={setForm}
                onSubmit={(event) => void saveRelationship(event)}
              />
            </aside>
          </section>
        )}
      </section>
    </main>
  );
}

function AnonymousState() {
  return (
    <section className="grid flex-1 place-items-center py-16">
      <div className="max-w-xl rounded-box border border-base-300 bg-base-200 p-8">
        <h2 className="text-2xl font-semibold tracking-tight">Enter with your Fio account</h2>
        <p className="mt-4 leading-7 text-neutral-600">
          Fio stores relationship data behind your account boundary. Sign in to manage the people
          you want to keep close.
        </p>
      </div>
    </section>
  );
}

function RelationshipList({
  confirmingDeleteRelationshipId,
  deletingRelationshipId,
  isLoading,
  onCancelDelete,
  onConfirmDelete,
  onEdit,
  onRequestDelete,
  relationships,
}: {
  confirmingDeleteRelationshipId: string | null;
  deletingRelationshipId: string | null;
  isLoading: boolean;
  onCancelDelete: () => void;
  onConfirmDelete: (relationshipId: string) => void;
  onEdit: (relationship: RelationshipView) => void;
  onRequestDelete: (relationshipId: string) => void;
  relationships: RelationshipView[];
}) {
  if (isLoading) {
    return (
      <p className="rounded-box border border-base-300 bg-base-200 p-5">Loading relationships...</p>
    );
  }

  if (relationships.length === 0) {
    return (
      <div className="rounded-box border border-dashed border-base-300 bg-base-200 p-8">
        <h3 className="text-lg font-semibold">No people yet</h3>
        <p className="mt-2 max-w-lg text-sm leading-6 text-neutral-600">
          Add one person with a realistic cadence. Fio starts from a small, deliberate list.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {relationships.map((relationship) => {
        const isConfirmingDelete = confirmingDeleteRelationshipId === relationship.id;
        const isDeleting = deletingRelationshipId === relationship.id;

        return (
          <article
            className="rounded-box border border-base-300 bg-base-200 p-5"
            key={relationship.id}
          >
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
              <div>
                <h3 className="text-xl font-semibold tracking-tight">{relationship.name}</h3>
                <p className="mt-2 text-sm text-neutral-600">
                  {circleLabels[relationship.circle]} ·{' '}
                  {channelLabels[relationship.preferredChannel]} · every {relationship.cadenceDays}{' '}
                  days
                </p>
                <p className="mt-3 text-sm text-neutral-600">
                  Last contact: {relationship.lastContactOn ?? 'not recorded'}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  className="btn btn-ghost btn-sm"
                  onClick={() => onEdit(relationship)}
                  type="button"
                >
                  Edit
                </button>
                {isConfirmingDelete ? (
                  <>
                    <button
                      className="btn btn-error btn-sm"
                      disabled={isDeleting}
                      onClick={() => onConfirmDelete(relationship.id)}
                      type="button"
                    >
                      {isDeleting ? 'Deleting...' : 'Confirm delete'}
                    </button>
                    <button
                      className="btn btn-ghost btn-sm"
                      disabled={isDeleting}
                      onClick={onCancelDelete}
                      type="button"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => onRequestDelete(relationship.id)}
                    type="button"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}

function RelationshipForm({
  form,
  isEditing,
  isSaving,
  onCancel,
  onChange,
  onSubmit,
}: {
  form: RelationshipFormState;
  isEditing: boolean;
  isSaving: boolean;
  onCancel: () => void;
  onChange: (form: RelationshipFormState) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
      <label className="form-control grid gap-2">
        <span className="label-text">Name</span>
        <input
          className="input input-bordered"
          maxLength={160}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
          required
          type="text"
          value={form.name}
        />
      </label>

      <label className="form-control grid gap-2">
        <span className="label-text">Circle</span>
        <select
          className="select select-bordered"
          onChange={(event) =>
            onChange({ ...form, circle: event.target.value as RelationshipCircle })
          }
          value={form.circle}
        >
          {Object.entries(circleLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control grid gap-2">
        <span className="label-text">Preferred channel</span>
        <select
          className="select select-bordered"
          onChange={(event) =>
            onChange({ ...form, preferredChannel: event.target.value as PreferredChannel })
          }
          value={form.preferredChannel}
        >
          {Object.entries(channelLabels).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      <label className="form-control grid gap-2">
        <span className="label-text">Cadence in days</span>
        <input
          className="input input-bordered"
          max={3650}
          min={1}
          onChange={(event) => onChange({ ...form, cadenceDays: event.target.value })}
          required
          type="number"
          value={form.cadenceDays}
        />
      </label>

      <label className="form-control grid gap-2">
        <span className="label-text">Last contact</span>
        <input
          className="input input-bordered"
          onChange={(event) => onChange({ ...form, lastContactOn: event.target.value })}
          type="date"
          value={form.lastContactOn}
        />
      </label>

      <label className="form-control grid gap-2">
        <span className="label-text">Paused until</span>
        <input
          className="input input-bordered"
          onChange={(event) => onChange({ ...form, pausedUntil: event.target.value })}
          type="date"
          value={form.pausedUntil}
        />
      </label>

      <div className="mt-2 flex gap-2">
        <button className="btn btn-neutral" disabled={isSaving} type="submit">
          {isSaving ? 'Saving...' : isEditing ? 'Save changes' : 'Add person'}
        </button>
        {isEditing ? (
          <button className="btn btn-ghost" disabled={isSaving} onClick={onCancel} type="button">
            Cancel
          </button>
        ) : null}
      </div>
    </form>
  );
}

function Alert({ message, title }: { message: string; title: string }) {
  return (
    <div className="alert alert-error mt-6">
      <div>
        <h2 className="font-semibold">{title}</h2>
        <p className="text-sm">{message}</p>
      </div>
    </div>
  );
}

function toRelationshipWriteRequest(form: RelationshipFormState): RelationshipWriteRequest {
  return {
    name: form.name.trim(),
    circle: form.circle,
    preferredChannel: form.preferredChannel,
    cadenceDays: Number(form.cadenceDays),
    lastContactOn: form.lastContactOn.length === 0 ? null : form.lastContactOn,
    pausedUntil: form.pausedUntil.length === 0 ? null : form.pausedUntil,
  };
}

function upsertRelationship(
  relationships: RelationshipView[],
  savedRelationship: RelationshipView,
): RelationshipView[] {
  const existingIndex = relationships.findIndex(
    (relationship) => relationship.id === savedRelationship.id,
  );

  if (existingIndex === -1) {
    return [...relationships, savedRelationship];
  }

  return relationships.map((relationship) =>
    relationship.id === savedRelationship.id ? savedRelationship : relationship,
  );
}

function sortRelationships(relationships: RelationshipView[]): RelationshipView[] {
  return [...relationships].sort(compareRelationshipsByName);
}

function compareRelationshipsByName(left: RelationshipView, right: RelationshipView): number {
  return left.name.localeCompare(right.name);
}

function isSessionExpiredError(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}

function toUserMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return 'Unexpected error.';
}
